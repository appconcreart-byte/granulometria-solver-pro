import { describe, it, expect } from "vitest";
import { LIMITES_BLOCO_PADRAO, LIMITES_LAJE_PADRAO, CURVA_REFERENCIA_LAJE } from "@/lib/analysis-data";
import { resolveCurvaReferencia, toCurvaParaGrafico, type DbCurveLike } from "@/lib/curva-referencia";
import { calcCombinedCurve } from "@/lib/granulometry-engine";

const item = (sieve_id: number, limite_min: number, limite_max: number) => ({ sieve_id, limite_min, limite_max });
const bloco: DbCurveLike = {
  id: "bloco", nome: "ABNT — Bloco Estrutural", tipo_produto: "bloco_estrutural",
  standard_curve_items: [item(2, 0, 0.15), item(10, 1, 1)],
};
const paver: DbCurveLike = {
  id: "paver", nome: "ABNT — Paver", tipo_produto: "paver",
  standard_curve_items: [item(2, 0, 0), item(10, 1, 1)],
};
const dbCurves = [bloco, paver];

describe("resolveCurvaReferencia", () => {
  it("laje e pré-moldado usam sempre a faixa fixa, nunca a curva do banco", () => {
    for (const tipo of ["laje", "pre_moldado"]) {
      const r = resolveCurvaReferencia(tipo, dbCurves);
      expect(r.fixa).toBe(true);
      expect(r.limites).toBe(LIMITES_LAJE_PADRAO);
    }
  });

  it("laje ignora até uma curva escolhida manualmente do banco", () => {
    const r = resolveCurvaReferencia("pre_moldado", dbCurves, "bloco");
    expect(r.limites).toBe(LIMITES_LAJE_PADRAO);
  });

  it("bloco/paver seguem a curva do próprio tipo", () => {
    expect(resolveCurvaReferencia("paver", dbCurves).nome).toBe("ABNT — Paver");
    expect(resolveCurvaReferencia("bloco_estrutural", dbCurves).nome).toBe("ABNT — Bloco Estrutural");
  });

  it("curva escolhida manualmente vale para bloco/paver", () => {
    expect(resolveCurvaReferencia("bloco_estrutural", dbCurves, "paver").nome).toBe("ABNT — Paver");
  });

  it("sem curvas no banco cai na faixa normativa do tipo", () => {
    expect(resolveCurvaReferencia("bloco_estrutural", []).limites).toBe(LIMITES_BLOCO_PADRAO);
  });
});

describe("toCurvaParaGrafico", () => {
  const mat = [{
    material_id: "m", proporcao_pct: 1,
    gradations: [
      { sieve_id: 2, abertura_mm: 9.5, massa_retida: 10 },
      { sieve_id: 5, abertura_mm: 2.4, massa_retida: 40 },
      { sieve_id: 10, abertura_mm: 0, massa_retida: 50 },
    ],
  }];
  const curve = calcCombinedCurve(mat as any, LIMITES_LAJE_PADRAO);

  it("laje: passante, limites trocados e referência fixa", () => {
    const g = toCurvaParaGrafico(curve, "WET_CASTING_PROTENDIDO");
    const c5 = curve.find((r) => r.sieve_id === 5)!;
    const g5 = g.find((r) => r.sieve_id === 5)!;
    expect(g5.pct_acumulado).toBeCloseTo(1 - c5.pct_acumulado, 10);
    expect(g5.limite_min).toBeCloseTo(1 - c5.limite_max!, 10);
    expect(g5.limite_max).toBeCloseTo(1 - c5.limite_min!, 10);
    expect(g5.referencia).toBeCloseTo(1 - CURVA_REFERENCIA_LAJE[5], 10);
    expect(g5.limite_min!).toBeLessThanOrEqual(g5.limite_max!);
  });

  it("bloco/paver: devolve a curva sem alterar", () => {
    expect(toCurvaParaGrafico(curve, "VIBROPRESSADO")).toBe(curve);
  });
});
