import { describe, it, expect } from "vitest";
import {
  buildPlannedRecipe,
  buildReceitaReal,
  calcDesvio,
  parseQtd,
  scalePlanned,
  totalMistura,
} from "@/lib/production-recipe";

const fd = {
  consumo_alvo_m3: 350,
  relacao_ac: 0.2,
  aditivos_ml: 2700,
  aditivo_unidade: "mL",
  aco_descricao: "CP-175 Ø5 mm",
  aco_quantidade: 120,
  aco_unidade: "kg",
  materiais_selecionados: [
    { material_id: "a", nome: "Areia", proporcao_kg: 1000 },
    { material_id: "b", nome: "Brita 0", proporcao_kg: 800.456 },
  ],
};

describe("receita prevista (1 traço)", () => {
  const items = buildPlannedRecipe(fd);

  it("lista cimento, agregados, água, aditivo e aço, nessa ordem", () => {
    expect(items.map((i) => i.tipo)).toEqual(["cimento", "agregado", "agregado", "agua", "aditivo", "aco"]);
    expect(items.find((i) => i.tipo === "agua")!.previsto).toBe(70); // 350 × 0,2
    expect(items.find((i) => i.tipo === "aco")!.nome).toBe("Aço — CP-175 Ø5 mm");
  });

  it("aditivo e aço aparecem mesmo com quantidade 0", () => {
    const vazio = buildPlannedRecipe({ ...fd, aditivos_ml: 0, aco_quantidade: 0, aco_descricao: "" });
    const aditivo = vazio.find((i) => i.tipo === "aditivo")!;
    const aco = vazio.find((i) => i.tipo === "aco")!;
    expect(aditivo.previsto).toBe(0);
    expect(aco.previsto).toBe(0);
    expect(aco.nome).toBe("Aço");
  });

  it("respeita as unidades gravadas (aditivo em g, aço em m)", () => {
    const g = buildPlannedRecipe({ ...fd, aditivo_unidade: "g", aco_unidade: "m" });
    expect(g.find((i) => i.tipo === "aditivo")!.unidade).toBe("g");
    expect(g.find((i) => i.tipo === "aco")!.unidade).toBe("m");
  });

  it("análise antiga, sem aditivo/aço salvos, não quebra", () => {
    const antiga = buildPlannedRecipe({ consumo_alvo_m3: 100, relacao_ac: 0.4, materiais_selecionados: [] });
    expect(antiga.map((i) => i.tipo)).toEqual(["cimento", "agua", "aditivo", "aco"]);
    expect(antiga.find((i) => i.tipo === "aditivo")!.unidade).toBe("mL");
  });
});

describe("escala por nº de traços", () => {
  const items = buildPlannedRecipe(fd);
  it("multiplica o previsto", () => {
    const x4 = scalePlanned(items, 4);
    expect(x4.find((i) => i.tipo === "cimento")!.previsto).toBe(1400);
    expect(x4.find((i) => i.tipo === "agua")!.previsto).toBe(280);
  });
  it("aço é por pista: não multiplica pelo nº de traços", () => {
    const x4 = scalePlanned(items, 4);
    expect(x4.find((i) => i.tipo === "aco")!.previsto).toBe(120);
    expect(x4.find((i) => i.tipo === "aditivo")!.previsto).toBe(10800);
  });
  it("vazio ou inválido conta como 1", () => {
    expect(scalePlanned(items, null)).toEqual(scalePlanned(items, 1));
    expect(scalePlanned(items, 0)).toEqual(scalePlanned(items, 1));
  });
});

describe("parseQtd", () => {
  it("aceita vírgula, ponto, e trata vazio/inválido/negativo como não informado", () => {
    expect(parseQtd("12,5")).toBe(12.5);
    expect(parseQtd("12.5")).toBe(12.5);
    expect(parseQtd(" 0 ")).toBe(0);
    expect(parseQtd("")).toBeNull();
    expect(parseQtd("abc")).toBeNull();
    expect(parseQtd("-3")).toBeNull();
    expect(parseQtd(undefined)).toBeNull();
  });
});

describe("receita real", () => {
  const planned = buildPlannedRecipe(fd);

  it("sem nenhum valor digitado → null (não informada)", () => {
    expect(buildReceitaReal(planned, 3, {})).toBeNull();
    expect(buildReceitaReal(planned, 3, { cimento: "  " })).toBeNull();
  });

  it("grava previsto já multiplicado e deixa em branco o que não foi digitado", () => {
    const r = buildReceitaReal(planned, 3, { cimento: "1060", agua: "215,5" })!;
    const cim = r.itens.find((i) => i.chave === "cimento")!;
    expect(cim.previsto).toBe(1050);
    expect(cim.real).toBe(1060);
    expect(r.itens.find((i) => i.chave === "agua")!.real).toBe(215.5);
    expect(r.itens.find((i) => i.chave === "aditivo")!.real).toBeNull();
  });
});

describe("desvio", () => {
  it("destaca a partir de 5% (atenção) e 10% (alerta), para mais ou para menos", () => {
    expect(calcDesvio({ previsto: 100, real: 103 })!.nivel).toBe("ok");
    expect(calcDesvio({ previsto: 100, real: 105 })!.nivel).toBe("atencao");
    expect(calcDesvio({ previsto: 100, real: 94 })!.nivel).toBe("atencao");
    expect(calcDesvio({ previsto: 100, real: 110 })!.nivel).toBe("alerta");
    expect(calcDesvio({ previsto: 100, real: 85 })!.nivel).toBe("alerta");
  });
  it("devolve a diferença e o percentual", () => {
    const d = calcDesvio({ previsto: 200, real: 210 })!;
    expect(d.diff).toBe(10);
    expect(d.pct).toBeCloseTo(5, 10);
  });
  it("real não informado → null; previsto 0 não divide por zero", () => {
    expect(calcDesvio({ previsto: 100, real: null })).toBeNull();
    expect(calcDesvio({ previsto: 0, real: 0 })!.nivel).toBe("ok");
    const d = calcDesvio({ previsto: 0, real: 5 })!;
    expect(d.pct).toBeNull();
    expect(d.nivel).toBe("atencao");
  });
});

describe("total da mistura", () => {
  const items = buildPlannedRecipe(fd);
  it("soma cimento, agregados, água e aditivo, sem o aço", () => {
    const { total, parcial } = totalMistura(items, "previsto");
    // 350 + 1000 + 800,456 + 70 + 2,7 (2700 mL ≈ 2,7 kg)
    expect(total).toBeCloseTo(2223.2, 1);
    expect(parcial).toBe(false);
  });
  it("na receita real, o que não foi informado marca como parcial", () => {
    const r = buildReceitaReal(items, 1, { cimento: "360" })!;
    const { total, parcial } = totalMistura(r.itens, "real");
    expect(total).toBe(360);
    expect(parcial).toBe(true);
  });
});
