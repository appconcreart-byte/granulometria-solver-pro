import { describe, it, expect } from "vitest";
import {
  calcCustoLote,
  comPrecos,
  custoEstimadoLote,
  custoItem,
  indicadoresLote,
  resolvePrecos,
} from "@/lib/production-cost";
import { buildPlannedRecipe, buildReceitaReal } from "@/lib/production-recipe";

// Preços: cimento R$ 1.000/t, areia R$ 100/t, brita R$ 200/t, aditivo R$ 20/L, aço R$ 8/kg
const materials = [
  { id: "cim-velho", nome: "Cimento antigo", tipo: "cimento", ativo: false, custo_valor: null, custo_unidade: "tonelada" },
  { id: "cim-b", nome: "Cimento CP V", tipo: "cimento", ativo: true, custo_valor: 1000, custo_unidade: "tonelada" },
  { id: "areia", nome: "Areia", tipo: "areia_fina", ativo: true, custo_valor: 100, custo_unidade: "tonelada" },
  { id: "brita", nome: "Brita 0", tipo: "brita", ativo: true, custo_valor: 200, custo_unidade: "tonelada" },
  { id: "adit", nome: "Aditivo X", tipo: "aditivo", ativo: true, custo_valor: 20, custo_unidade: "litro" },
  { id: "aco-kg", nome: "CP-175 Ø5", tipo: "aco", ativo: true, custo_valor: 8, custo_unidade: "kg" },
  { id: "aco-m", nome: "Cordoalha 9,5", tipo: "aco", ativo: true, custo_valor: 3, custo_unidade: "metro" },
];

const fd = (over: any = {}) => ({
  consumo_alvo_m3: 100,
  relacao_ac: 0.4,
  aditivos_ml: 500,
  aditivo_unidade: "mL",
  aco_material_id: "aco-kg",
  aco_descricao: "CP-175 Ø5",
  aco_quantidade: 50,
  aco_unidade: "kg",
  materiais_selecionados: [
    { material_id: "areia", nome: "Areia", proporcao_kg: 400 },
    { material_id: "brita", nome: "Brita 0", proporcao_kg: 600 },
  ],
  ...over,
});

describe("resolvePrecos", () => {
  const planned = buildPlannedRecipe(fd());
  const precos = resolvePrecos(planned, fd(), materials);

  it("cada item recebe o preço do cadastro; água fica sem preço", () => {
    expect(precos["cimento"]).toMatchObject({ valor: 1000, unidade: "tonelada" });
    expect(precos["agregado:areia"]).toMatchObject({ valor: 100 });
    expect(precos["agregado:brita"]).toMatchObject({ valor: 200 });
    expect(precos["aditivo"]).toMatchObject({ valor: 20, unidade: "litro" });
    expect(precos["aco"]).toMatchObject({ valor: 8, unidade: "kg" });
    expect(precos["agua"]).toBeNull();
  });

  it("sem marca escolhida, não pega o cimento arquivado e sem preço", () => {
    expect(precos["cimento"]!.valor).toBe(1000);
  });

  it("a marca escolhida na análise tem prioridade", () => {
    const outra = [...materials, { id: "cim-c", nome: "Cimento CP II", tipo: "cimento", ativo: true, custo_valor: 900, custo_unidade: "tonelada" }];
    const p = resolvePrecos(planned, fd({ cimento_marca_id: "cim-c" }), outra);
    expect(p["cimento"]!.valor).toBe(900);
  });
});

describe("custoItem", () => {
  it("água custa zero; quantidade 0 custa zero", () => {
    expect(custoItem({ tipo: "agua", unidade: "L" }, 70, null)).toBe(0);
    expect(custoItem({ tipo: "agregado", unidade: "kg" }, 0, null)).toBe(0);
  });
  it("cimento/agregado: kg × preço por tonelada", () => {
    expect(custoItem({ tipo: "cimento", unidade: "kg" }, 350, { valor: 1000, unidade: "tonelada" })).toBeCloseTo(350, 5);
  });
  it("aditivo: mL ou g → litro/kg", () => {
    expect(custoItem({ tipo: "aditivo", unidade: "mL" }, 2700, { valor: 20, unidade: "litro" })).toBeCloseTo(54, 5);
  });
  it("aço por kg e por metro; unidades incompatíveis → null", () => {
    expect(custoItem({ tipo: "aco", unidade: "kg" }, 120, { valor: 8, unidade: "kg" })).toBe(960);
    expect(custoItem({ tipo: "aco", unidade: "kg" }, 1, { valor: 8000, unidade: "tonelada" })).toBe(8);
    expect(custoItem({ tipo: "aco", unidade: "m" }, 4800, { valor: 3, unidade: "metro" })).toBe(14400);
    expect(custoItem({ tipo: "aco", unidade: "m" }, 100, { valor: 8, unidade: "kg" })).toBeNull();
    expect(custoItem({ tipo: "aco", unidade: "kg" }, 100, { valor: 3, unidade: "metro" })).toBeNull();
  });
  it("sem preço → null", () => {
    expect(custoItem({ tipo: "cimento", unidade: "kg" }, 350, null)).toBeNull();
  });
});

describe("custo real do lote", () => {
  const planned = buildPlannedRecipe(fd());
  const precos = resolvePrecos(planned, fd(), materials);
  const base = buildReceitaReal(planned, 3, {
    cimento: "310", "agregado:areia": "1250", "agregado:brita": "1900", agua: "125", aditivo: "1600", aco: "52",
  })!;
  const receita = comPrecos(base, precos);

  it("soma quantidade REAL × preço, item por item (sem multiplicar o custo de 1 traço)", () => {
    const c = calcCustoLote(receita.itens, "real");
    expect(c.porTipo.cimento).toBeCloseTo(310, 5); // 310 kg × R$ 1/kg
    expect(c.porTipo.agregados).toBeCloseTo(1250 * 0.1 + 1900 * 0.2, 5); // 125 + 380
    expect(c.porTipo.aditivo).toBeCloseTo(32, 5); // 1,6 L × 20
    expect(c.porTipo.aco).toBeCloseTo(416, 5); // 52 kg × 8
    expect(c.total).toBeCloseTo(310 + 505 + 32 + 416, 5);
    expect(c.completo).toBe(true);
  });

  it("o preço gravado não muda quando o cadastro muda", () => {
    const novo = resolvePrecos(planned, fd(), materials.map((m) => (m.id === "cim-b" ? { ...m, custo_valor: 2000 } : m)));
    const editada = comPrecos(base, novo, receita); // edição: mantém o histórico
    expect(editada.itens.find((i) => i.chave === "cimento")!.preco!.valor).toBe(1000);
  });

  it("item informado sem preço marca o custo como incompleto", () => {
    const fdSemAco = fd({ aco_material_id: undefined });
    const semAco = resolvePrecos(buildPlannedRecipe(fdSemAco), fdSemAco, materials);
    const c = calcCustoLote(comPrecos(base, semAco).itens, "real");
    expect(c.completo).toBe(false);
    expect(c.semPreco).toContain("Aço — CP-175 Ø5");
  });

  it("itens não informados não entram no custo real", () => {
    const parcial = buildReceitaReal(planned, 3, { cimento: "310" })!;
    const c = calcCustoLote(comPrecos(parcial, precos).itens, "real");
    expect(c.total).toBeCloseTo(310, 5);
  });
});

describe("indicadores e estimado", () => {
  it("R$/m³, R$/m de pista e R$/traço", () => {
    const i = indicadoresLote(3200, 12.8, 4);
    expect(i.custoM3).toBeCloseTo(250, 5);
    expect(i.custoMetro).toBeCloseTo(2, 5); // 3200 / 1600 m
    expect(i.custoTraco).toBe(800);
    expect(indicadoresLote(100, null, null).custoM3).toBeNull();
  });
  it("estimado: custo de 1 traço × nº de traços + aço previsto", () => {
    const e = custoEstimadoLote(fd(), materials, 4);
    // 1 traço: 100 kg cimento (100) + areia 40 + brita 120 + aditivo 0,5 L (10) = 270; × 4 = 1080; + aço 50 kg × 8 = 400
    expect(e.total).toBeCloseTo(1480, 4);
    expect(e.informado).toBe(true);
  });
  it("estimado sem nº de traços usa 1 e avisa", () => {
    const e = custoEstimadoLote(fd(), materials, null);
    expect(e.baseTracos).toBe(1);
    expect(e.informado).toBe(false);
  });
});
