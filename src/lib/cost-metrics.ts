import { calcularCustoTracoCompleto } from "@/lib/utils";
import { COMPRIMENTO_PISTA_M } from "@/lib/production-loss";
import { calcCustoLote, custoEstimadoLote, custoItem } from "@/lib/production-cost";
import type { ReceitaReal } from "@/lib/production-recipe";

// =============================================================================
// Métricas de custo por segmento (Lajes x Pré-moldados), calculadas por LOTE.
//
// - Custo REAL de um lote = soma de (quantidade real usada × preço gravado no lote)
//   de cada componente. Só existe para lotes com receita real informada.
// - Lotes SEM receita real têm custo ESTIMADO (custo de 1 traço × nº de traços,
//   mais o aço previsto). O estimado NUNCA é somado ao real.
// - O custo previsto POR TRAÇO (da análise) continua disponível à parte.
// =============================================================================

export type Segmento = "laje" | "pre_moldado";

export const SEGMENTOS: { value: Segmento; label: string }[] = [
  { value: "laje", label: "Lajes" },
  { value: "pre_moldado", label: "Pré-moldados" },
];

export const SEM_PRODUTO = "Sem produto";

/** Segmento de custo da análise; null para tipos que não entram no relatório. */
export function getSegmento(tipo?: string | null): Segmento | null {
  return tipo === "laje" || tipo === "pre_moldado" ? tipo : null;
}

export interface CostAnalysisInput {
  id: string;
  codigo: string;
  nome: string;
  tipo: string;
  produto: string | null;
  status: string;
  data_analise?: string | null;
  created_at: string;
  formData: any;
}

export interface CostBatchInput {
  id: string;
  analysis_id: string;
  batch_code: string;
  status?: string;
  produced_at: string;
  volume_concreto_m3?: number | null;
  n_tracos?: number | null;
  receita_real?: ReceitaReal | null;
}

export type Origem = "real" | "estimado";

export interface CostLote {
  id: string;
  loteCodigo: string;
  codigo: string;
  nome: string;
  segmento: Segmento;
  produto: string;
  status: string;
  /** yyyy-mm-dd (data de produção, no fuso local) */
  data: string;
  origem: Origem;
  custoTotal: number;
  /** false = há item com quantidade e sem preço (só no real) */
  completo: boolean;
  semPreco: string[];
  porTipo: { cimento: number; agregados: number; aditivo: number; aco: number };
  volumeM3: number | null;
  nTracos: number | null;
  /** Estimado: nº de traços usado na conta (1 quando não informado) */
  baseTracos: number | null;
  custoM3: number | null;
  custoMetro: number;
}

/** Custo previsto de UM traço (da análise), sem multiplicar por nada. */
export interface CostTraco {
  id: string;
  codigo: string;
  nome: string;
  segmento: Segmento;
  produto: string;
  status: string;
  /** yyyy-mm-dd (data da análise) */
  data: string;
  custoM3: number;
  custoBatelada: number;
}

export interface MonthlyCost {
  month: string; // "2026-04"
  label: string; // "Abr/26"
  real: number;
  estimado: number;
  batchCount: number;
}

export interface ProdutoCost {
  produto: string;
  lotesReal: number;
  lotesEstimado: number;
  custoReal: number;
  /** R$/m³ real (só lotes reais completos e com volume) */
  custoM3Real: number | null;
  /** R$/m de pista real (só lotes reais completos) */
  custoMetroReal: number | null;
  custoEstimado: number;
}

export interface CostSummary {
  /** Lotes do período, do mais recente para o mais antigo */
  lotes: CostLote[];
  /** Traços (análises) do período — custo previsto por traço */
  tracos: CostTraco[];
  nLotes: number;
  nLotesReal: number;
  nLotesEstimado: number;
  /** Lotes reais com preço faltando */
  nLotesIncompletos: number;
  custoReal: number;
  custoEstimado: number;
  /** R$/m³ real: soma do custo ÷ soma do volume (lotes reais completos com volume) */
  custoM3Real: number | null;
  /** R$/m de pista real (lotes reais completos) */
  custoMetroReal: number | null;
  /** Média do custo previsto por m³ dos traços do período */
  custoM3Previsto: number;
  /** Mês atual (independe do filtro) */
  custoRealMesAtual: number;
  custoEstimadoMesAtual: number;
  variacaoMensal: number;
  /** Ano selecionado inteiro (ignora o filtro de mês) */
  custoRealAno: number;
  custoEstimadoAno: number;
  mensais: MonthlyCost[];
  /** Composição do custo REAL do período */
  breakdown: { name: string; value: number; pct: number }[];
  porProduto: ProdutoCost[];
  /** 5 traços com maior custo previsto por m³ */
  top: CostTraco[];
}

export interface CostPeriod {
  /** "" = todos os anos */
  year: string;
  /** "00" = todos os meses */
  month: string;
}

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const round2 = (n: number) => Math.round(n * 100) / 100;

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return `${MONTH_LABELS[Number(m) - 1]}/${y.slice(2)}`;
}

const localDay = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const temReal = (b: CostBatchInput) => !!b.receita_real?.itens?.some((i) => i.real != null);

export function buildCostData(
  analyses: CostAnalysisInput[],
  batches: CostBatchInput[],
  dbMaterials: any[],
): { lotes: CostLote[]; tracos: CostTraco[] } {
  const porId = new Map(analyses.map((a) => [a.id, a]));
  const tracos: CostTraco[] = [];
  const lotes: CostLote[] = [];

  for (const a of analyses) {
    const segmento = getSegmento(a.tipo);
    if (!segmento) continue;
    const c = calcularCustoTracoCompleto({ formData: a.formData, dbMaterials: dbMaterials || [] });
    tracos.push({
      id: a.id,
      codigo: a.codigo,
      nome: a.nome,
      segmento,
      produto: a.produto?.trim() || SEM_PRODUTO,
      status: a.status,
      data: (a.data_analise || a.created_at || "").slice(0, 10),
      custoM3: c.totalM3,
      custoBatelada: c.totalBatelada,
    });
  }

  for (const b of batches) {
    const a = porId.get(b.analysis_id);
    const segmento = getSegmento(a?.tipo);
    if (!a || !segmento) continue;

    const volumeM3 = b.volume_concreto_m3 != null && Number(b.volume_concreto_m3) > 0 ? Number(b.volume_concreto_m3) : null;
    const base = {
      id: b.id,
      loteCodigo: b.batch_code,
      codigo: a.codigo,
      nome: a.nome,
      segmento,
      produto: a.produto?.trim() || SEM_PRODUTO,
      status: b.status ?? "",
      data: localDay(b.produced_at),
      volumeM3,
      nTracos: b.n_tracos ?? null,
    };

    if (temReal(b)) {
      const c = calcCustoLote(b.receita_real!.itens, "real");
      lotes.push({
        ...base,
        origem: "real",
        custoTotal: c.total,
        completo: c.completo,
        semPreco: c.semPreco,
        porTipo: c.porTipo,
        baseTracos: null,
        custoM3: volumeM3 ? c.total / volumeM3 : null,
        custoMetro: c.total / COMPRIMENTO_PISTA_M,
      });
    } else {
      const fd = a.formData;
      const e = custoEstimadoLote(fd, dbMaterials, b.n_tracos);
      const traco = calcularCustoTracoCompleto({ formData: fd, dbMaterials: dbMaterials || [] });
      const aco = e.total - traco.totalBatelada * e.baseTracos;
      lotes.push({
        ...base,
        origem: "estimado",
        custoTotal: e.total,
        completo: true,
        semPreco: [],
        porTipo: {
          cimento: traco.cimentoBatelada * e.baseTracos,
          agregados: traco.agregadosBatelada * e.baseTracos,
          aditivo: traco.aditivoBatelada * e.baseTracos,
          aco: Math.max(aco, 0),
        },
        baseTracos: e.baseTracos,
        custoM3: volumeM3 ? e.total / volumeM3 : null,
        custoMetro: e.total / COMPRIMENTO_PISTA_M,
      });
    }
  }
  return { lotes, tracos };
}

function emPeriodo(data: string, { year, month }: CostPeriod) {
  if (year && !data.startsWith(year)) return false;
  if (year && month !== "00" && !data.startsWith(`${year}-${month}`)) return false;
  return true;
}

const soma = (lotes: CostLote[]) => lotes.reduce((s, l) => s + l.custoTotal, 0);

/** Calcula todas as métricas de UM segmento (lotes e traços já só do segmento). */
export function summarizeSegment(
  lotesSeg: CostLote[],
  tracosSeg: CostTraco[],
  period: CostPeriod,
  now: Date = new Date(),
): CostSummary {
  const lotes = lotesSeg.filter((l) => emPeriodo(l.data, period)).sort((a, b) => b.data.localeCompare(a.data));
  const tracos = tracosSeg.filter((t) => emPeriodo(t.data, period)).sort((a, b) => b.data.localeCompare(a.data));
  const reais = lotes.filter((l) => l.origem === "real");
  const estimados = lotes.filter((l) => l.origem === "estimado");
  const reaisCompletos = reais.filter((l) => l.completo);

  // R$/m³ real = soma do custo ÷ soma do volume (média ponderada), só lotes reais completos com volume
  const comVolume = reaisCompletos.filter((l) => l.volumeM3);
  const volTotal = comVolume.reduce((s, l) => s + (l.volumeM3 ?? 0), 0);
  const custoM3Real = volTotal > 0 ? comVolume.reduce((s, l) => s + l.custoTotal, 0) / volTotal : null;
  const custoMetroReal = reaisCompletos.length
    ? reaisCompletos.reduce((s, l) => s + l.custoTotal, 0) / (reaisCompletos.length * COMPRIMENTO_PISTA_M)
    : null;

  // Mensal: últimos 6 meses, sobre todos os lotes do segmento
  const monthMap = new Map<string, MonthlyCost>();
  for (const l of lotesSeg) {
    if (l.data.length < 7) continue;
    const ym = l.data.slice(0, 7);
    const e = monthMap.get(ym) ?? { month: ym, label: monthLabel(ym), real: 0, estimado: 0, batchCount: 0 };
    if (l.origem === "real") e.real += l.custoTotal;
    else e.estimado += l.custoTotal;
    e.batchCount += 1;
    monthMap.set(ym, e);
  }
  const ymOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const mensais = Array.from({ length: 6 }, (_, i) => {
    const ym = ymOf(new Date(now.getFullYear(), now.getMonth() - (5 - i), 1));
    const e = monthMap.get(ym);
    return e
      ? { ...e, real: round2(e.real), estimado: round2(e.estimado) }
      : { month: ym, label: monthLabel(ym), real: 0, estimado: 0, batchCount: 0 };
  });
  const atual = monthMap.get(ymOf(now));
  const anterior = monthMap.get(ymOf(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
  const variacaoMensal = anterior?.real ? (((atual?.real ?? 0) - anterior.real) / anterior.real) * 100 : 0;

  const anoLotes = period.year ? lotesSeg.filter((l) => l.data.startsWith(period.year)) : lotesSeg;

  // Composição do custo real
  const tipos = reais.reduce(
    (acc, l) => ({
      cimento: acc.cimento + l.porTipo.cimento,
      agregados: acc.agregados + l.porTipo.agregados,
      aditivo: acc.aditivo + l.porTipo.aditivo,
      aco: acc.aco + l.porTipo.aco,
    }),
    { cimento: 0, agregados: 0, aditivo: 0, aco: 0 },
  );
  const totalComp = tipos.cimento + tipos.agregados + tipos.aditivo + tipos.aco;
  const comp = (name: string, v: number) => ({ name, value: round2(v), pct: totalComp > 0 ? (v / totalComp) * 100 : 0 });

  // Por produto
  const grupos = new Map<string, CostLote[]>();
  for (const l of lotes) grupos.set(l.produto, [...(grupos.get(l.produto) ?? []), l]);
  const porProduto: ProdutoCost[] = Array.from(grupos.entries())
    .map(([produto, ls]) => {
      const r = ls.filter((l) => l.origem === "real");
      const rc = r.filter((l) => l.completo);
      const rv = rc.filter((l) => l.volumeM3);
      const vol = rv.reduce((s, l) => s + (l.volumeM3 ?? 0), 0);
      return {
        produto,
        lotesReal: r.length,
        lotesEstimado: ls.length - r.length,
        custoReal: round2(soma(r)),
        custoM3Real: vol > 0 ? round2(rv.reduce((s, l) => s + l.custoTotal, 0) / vol) : null,
        custoMetroReal: rc.length ? round2(soma(rc) / (rc.length * COMPRIMENTO_PISTA_M)) : null,
        custoEstimado: round2(soma(ls.filter((l) => l.origem === "estimado"))),
      };
    })
    .sort((a, b) => b.custoReal + b.custoEstimado - (a.custoReal + a.custoEstimado));

  const tracosComCusto = tracos.filter((t) => t.custoM3 > 0);
  const custoM3Previsto = tracosComCusto.length
    ? tracosComCusto.reduce((s, t) => s + t.custoM3, 0) / tracosComCusto.length
    : 0;

  return {
    lotes,
    tracos,
    nLotes: lotes.length,
    nLotesReal: reais.length,
    nLotesEstimado: estimados.length,
    nLotesIncompletos: reais.length - reaisCompletos.length,
    custoReal: round2(soma(reais)),
    custoEstimado: round2(soma(estimados)),
    custoM3Real: custoM3Real != null ? round2(custoM3Real) : null,
    custoMetroReal: custoMetroReal != null ? round2(custoMetroReal) : null,
    custoM3Previsto: round2(custoM3Previsto),
    custoRealMesAtual: round2(atual?.real ?? 0),
    custoEstimadoMesAtual: round2(atual?.estimado ?? 0),
    variacaoMensal: Math.round(variacaoMensal * 10) / 10,
    custoRealAno: round2(soma(anoLotes.filter((l) => l.origem === "real"))),
    custoEstimadoAno: round2(soma(anoLotes.filter((l) => l.origem === "estimado"))),
    mensais,
    breakdown: [comp("Cimento", tipos.cimento), comp("Agregados", tipos.agregados), comp("Aditivo", tipos.aditivo), comp("Aço", tipos.aco)],
    porProduto,
    top: [...tracosComCusto].sort((a, b) => b.custoM3 - a.custoM3).slice(0, 5),
  };
}

export function summarizeAll(
  data: { lotes: CostLote[]; tracos: CostTraco[] },
  period: CostPeriod,
  now?: Date,
): Record<Segmento, CostSummary> {
  const seg = (s: Segmento) =>
    summarizeSegment(
      data.lotes.filter((l) => l.segmento === s),
      data.tracos.filter((t) => t.segmento === s),
      period,
      now,
    );
  return { laje: seg("laje"), pre_moldado: seg("pre_moldado") };
}

// Reexporta para quem só precisa do cálculo de item
export { custoItem };
