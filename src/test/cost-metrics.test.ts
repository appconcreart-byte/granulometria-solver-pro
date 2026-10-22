import { describe, it, expect } from "vitest";
import { buildCostData, getSegmento, summarizeAll, summarizeSegment, type CostAnalysisInput } from "@/lib/cost-metrics";
import { buildPlannedRecipe, buildReceitaReal } from "@/lib/production-recipe";
import { comPrecos, resolvePrecos } from "@/lib/production-cost";

// Cimento R$ 1.000/t · areia R$ 100/t · aço R$ 8/kg
const materials = [
  { id: "cim", nome: "Cimento CP V", tipo: "cimento", ativo: true, custo_valor: 1000, custo_unidade: "tonelada", densidade: 3.15 },
  { id: "areia", nome: "Areia", tipo: "areia_fina", ativo: true, custo_valor: 100, custo_unidade: "tonelada", densidade: 2.65 },
  { id: "aco", nome: "CP-175", tipo: "aco", ativo: true, custo_valor: 8, custo_unidade: "kg" },
];

const mk = (id: string, tipo: string, produto: string | null, data: string, extra: any = {}): CostAnalysisInput => ({
  id,
  codigo: `ANL-${id}`,
  nome: `Traço ${id}`,
  tipo,
  produto,
  status: "liberado",
  data_analise: data,
  created_at: `${data}T10:00:00Z`,
  formData: {
    consumo_alvo_m3: 100, // 100 kg de cimento = R$ 100
    relacao_ac: 0.4,
    volume_m3: 1,
    aditivos_ml: 0,
    aco_material_id: "aco",
    aco_quantidade: 50,
    aco_unidade: "kg",
    materiais_selecionados: [{ material_id: "areia", nome: "Areia", proporcao_kg: 1000, densidade: 2.65 }], // R$ 100
    ...extra,
  },
});
// 1 traço = R$ 200 (cimento 100 + areia 100). Aço previsto da pista = R$ 400.

const analyses = [
  mk("1", "laje", "Laje H12", "2026-10-01"),
  mk("2", "laje", "Laje H16", "2026-09-01"),
  mk("3", "pre_moldado", "Vigota", "2026-10-01"),
  mk("5", "paver", "Paver", "2026-10-01"),
];

function receitaReal(analysis: CostAnalysisInput, n: number, values: Record<string, string>, semPrecoDoAco = false) {
  const planned = buildPlannedRecipe(analysis.formData);
  const precos = resolvePrecos(planned, analysis.formData, materials);
  if (semPrecoDoAco) precos["aco"] = null;
  return comPrecos(buildReceitaReal(planned, n, values)!, precos);
}

const batches = [
  // Lote real da laje: 3 traços, usou 312 kg de cimento, 3100 kg de areia e 52 kg de aço
  {
    id: "B1", analysis_id: "1", batch_code: "L-1", produced_at: "2026-10-03T15:00:00Z", volume_concreto_m3: 12.5, n_tracos: 3,
    receita_real: receitaReal(analyses[0], 3, { cimento: "312", "agregado:areia": "3100", aco: "52" }),
  },
  // Lote da laje SEM receita real: 2 traços → estimado
  { id: "B2", analysis_id: "1", batch_code: "L-2", produced_at: "2026-10-05T15:00:00Z", volume_concreto_m3: 12.4, n_tracos: 2, receita_real: null },
  // Lote real do pré-moldado com aço sem preço → incompleto
  {
    id: "B3", analysis_id: "3", batch_code: "L-3", produced_at: "2026-10-06T15:00:00Z", volume_concreto_m3: 10, n_tracos: 2,
    receita_real: receitaReal(analyses[2], 2, { cimento: "210", "agregado:areia": "2000", aco: "40" }, true),
  },
  // Pré-moldado sem receita real e sem nº de traços → estimado com 1 traço
  { id: "B4", analysis_id: "3", batch_code: "L-4", produced_at: "2026-09-10T15:00:00Z", volume_concreto_m3: null, n_tracos: null, receita_real: null },
  // Lote de paver: fora do relatório
  { id: "B5", analysis_id: "5", batch_code: "L-5", produced_at: "2026-10-06T15:00:00Z", receita_real: null },
];

const NOW = new Date(2026, 9, 15);
const data = buildCostData(analyses, batches, materials);
const out = summarizeAll(data, { year: "2026", month: "00" }, NOW);

describe("segmentos", () => {
  it("só laje e pré-moldado entram", () => {
    expect(getSegmento("laje")).toBe("laje");
    expect(getSegmento("paver")).toBeNull();
    expect(data.lotes).toHaveLength(4);
    expect(data.lotes.some((l) => l.loteCodigo === "L-5")).toBe(false);
  });
  it("lotes de cada segmento não se misturam", () => {
    expect(out.laje.nLotes).toBe(2);
    expect(out.pre_moldado.nLotes).toBe(2);
  });
});

describe("custo REAL do lote", () => {
  const l = data.lotes.find((x) => x.loteCodigo === "L-1")!;

  it("é a soma de quantidade real × preço, e não o custo de 1 traço × nº de traços", () => {
    // 312 kg × R$1 + 3100 kg × R$0,10 + 52 kg × R$8 = 312 + 310 + 416
    expect(l.origem).toBe("real");
    expect(l.custoTotal).toBeCloseTo(1038, 5);
    expect(l.custoTotal).not.toBeCloseTo(200 * 3 + 400, 1); // 1 traço × 3 + aço previsto
    expect(l.completo).toBe(true);
  });

  it("calcula R$/m³ e R$/m de pista", () => {
    expect(l.custoM3).toBeCloseTo(1038 / 12.5, 5);
    expect(l.custoMetro).toBeCloseTo(1038 / 1600, 5);
  });

  it("separa por tipo de componente", () => {
    expect(l.porTipo.cimento).toBeCloseTo(312, 5);
    expect(l.porTipo.agregados).toBeCloseTo(310, 5);
    expect(l.porTipo.aco).toBeCloseTo(416, 5);
  });

  it("item informado sem preço deixa o lote incompleto", () => {
    const inc = data.lotes.find((x) => x.loteCodigo === "L-3")!;
    expect(inc.completo).toBe(false);
    expect(inc.semPreco.length).toBeGreaterThan(0);
  });
});

describe("custo ESTIMADO (lote sem receita real)", () => {
  it("custo de 1 traço × nº de traços + aço previsto", () => {
    const l = data.lotes.find((x) => x.loteCodigo === "L-2")!;
    expect(l.origem).toBe("estimado");
    expect(l.custoTotal).toBeCloseTo(200 * 2 + 400, 5);
    expect(l.baseTracos).toBe(2);
  });
  it("sem nº de traços usa 1 traço", () => {
    const l = data.lotes.find((x) => x.loteCodigo === "L-4")!;
    expect(l.baseTracos).toBe(1);
    expect(l.custoTotal).toBeCloseTo(200 + 400, 5);
    expect(l.custoM3).toBeNull();
  });
  it("nunca é somado ao custo real", () => {
    expect(out.laje.custoReal).toBeCloseTo(1038, 2);
    expect(out.laje.custoEstimado).toBeCloseTo(800, 2);
    expect(out.laje.nLotesReal).toBe(1);
    expect(out.laje.nLotesEstimado).toBe(1);
  });
});

describe("resumo do segmento", () => {
  it("R$/m³ real é ponderado e ignora lotes incompletos", () => {
    expect(out.laje.custoM3Real).toBeCloseTo(1038 / 12.5, 1);
    // pré-moldado: o único lote real está incompleto → sem média
    expect(out.pre_moldado.custoM3Real).toBeNull();
    expect(out.pre_moldado.nLotesIncompletos).toBe(1);
  });

  it("a composição do custo real soma o custo real", () => {
    const soma = out.laje.breakdown.reduce((s, b) => s + b.value, 0);
    expect(soma).toBeCloseTo(out.laje.custoReal, 1);
    expect(out.laje.breakdown.map((b) => b.name)).toEqual(["Cimento", "Agregados", "Aditivo", "Aço"]);
  });

  it("agrupa por produto, separando lotes reais e estimados", () => {
    const h12 = out.laje.porProduto.find((p) => p.produto === "Laje H12")!;
    expect(h12.lotesReal).toBe(1);
    expect(h12.lotesEstimado).toBe(1);
    expect(h12.custoReal).toBeCloseTo(1038, 2);
    expect(h12.custoEstimado).toBeCloseTo(800, 2);
  });

  it("o custo previsto por traço não é multiplicado", () => {
    const t = out.laje.tracos.find((x) => x.codigo === "ANL-1")!;
    expect(t.custoBatelada).toBeCloseTo(200, 5);
  });
});

describe("período", () => {
  const laje = data.lotes.filter((l) => l.segmento === "laje");
  const tracos = data.tracos.filter((t) => t.segmento === "laje");

  it("filtra pela data de PRODUÇÃO do lote", () => {
    const set = summarizeSegment(laje, tracos, { year: "2026", month: "09" }, NOW);
    expect(set.nLotes).toBe(0);
    const out10 = summarizeSegment(laje, tracos, { year: "2026", month: "10" }, NOW);
    expect(out10.nLotes).toBe(2);
  });

  it("'Acumulado do ano' ignora o filtro de mês", () => {
    const so10 = summarizeSegment(laje, tracos, { year: "2026", month: "10" }, NOW);
    expect(so10.custoRealAno).toBeCloseTo(1038, 2);
    expect(so10.custoEstimadoAno).toBeCloseTo(800, 2);
  });

  it("mês atual separa real e estimado; últimos 6 meses", () => {
    expect(out.laje.custoRealMesAtual).toBeCloseTo(1038, 2);
    expect(out.laje.custoEstimadoMesAtual).toBeCloseTo(800, 2);
    expect(out.laje.mensais).toHaveLength(6);
    expect(out.laje.mensais[5].month).toBe("2026-10");
    expect(out.laje.mensais[5].real).toBeCloseTo(1038, 2);
    expect(out.laje.mensais[5].estimado).toBeCloseTo(800, 2);
  });

  it("segmento vazio não quebra", () => {
    const vazio = summarizeSegment([], [], { year: "2026", month: "10" }, NOW);
    expect(vazio.nLotes).toBe(0);
    expect(vazio.custoM3Real).toBeNull();
    expect(vazio.top).toEqual([]);
  });
});
