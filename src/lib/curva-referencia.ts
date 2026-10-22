import {
  CURVA_REFERENCIA_LAJE,
  getLimitesPadrao,
  isFamiliaLaje,
  type TipoDosagem,
} from "@/lib/analysis-data";
import type { GradationResult } from "@/lib/granulometry-engine";

// =============================================================================
// Faixa e curva de referência da granulometria — regra ÚNICA usada pelos passos
// Granulometria, Resultado e Revisão, pelo laudo de qualidade e pelo PDF/Excel.
//
// Laje e Pré-moldado (família laje): SEMPRE a faixa fixa (LIMITES_LAJE_PADRAO) e
// a curva de referência fixa da Concreart (CURVA_REFERENCIA_LAJE). Nunca uma
// curva do banco — sem isso, a falta de curva do tipo fazia o app cair na
// primeira curva cadastrada (Bloco Estrutural) e marcar "fora da faixa" contra
// a curva errada.
//
// Demais tipos: curva escolhida → curva do mesmo tipo → "geral" → primeira curva
// com itens → faixa normativa padrão do tipo.
// =============================================================================

export type Limite = { sieve_id: number; limite_min: number; limite_max: number };

export interface DbCurveLike {
  id: string;
  nome: string;
  tipo_produto: string;
  standard_curve_items?: Array<{ sieve_id: number; limite_min: number; limite_max: number }> | null;
}

export interface CurvaReferencia {
  limites: Limite[];
  nome?: string;
  /** true = faixa fixa de laje/pré-moldado (não vem do banco) */
  fixa: boolean;
}

export const NOME_FAIXA_FIXA_LAJE = "Faixa fixa — Laje / Pré-moldado";

export function resolveCurvaReferencia(
  tipo: string | undefined,
  dbCurves: DbCurveLike[],
  dnaSelecionado?: string,
): CurvaReferencia {
  if (isFamiliaLaje(tipo)) {
    return { limites: getLimitesPadrao("laje"), nome: NOME_FAIXA_FIXA_LAJE, fixa: true };
  }

  const comItens = (c?: DbCurveLike) => !!c?.standard_curve_items?.length;
  const curve =
    dbCurves.find((c) => dnaSelecionado && c.id === dnaSelecionado && comItens(c)) ??
    dbCurves.find((c) => c.tipo_produto === tipo && comItens(c)) ??
    dbCurves.find((c) => c.tipo_produto === "geral" && comItens(c)) ??
    dbCurves.find(comItens);

  if (curve) {
    return {
      nome: curve.nome,
      fixa: false,
      limites: (curve.standard_curve_items ?? []).map((i) => ({
        sieve_id: i.sieve_id,
        limite_min: i.limite_min,
        limite_max: i.limite_max,
      })),
    };
  }
  return { limites: getLimitesPadrao(tipo), fixa: false };
}

/**
 * Converte a curva para o que o GranulometryChart desenha.
 * Laje/Pré-moldado (wet casting): % PASSANTE, com limites invertidos e trocados
 * (o mínimo em retido vira o máximo em passante) e a curva de referência fixa
 * como linha "ideal". Demais: % retido, como vem do motor de cálculo.
 */
export function toCurvaParaGrafico(
  curveResults: GradationResult[],
  tipoDosagem: TipoDosagem,
): Array<GradationResult & { referencia?: number }> {
  if (tipoDosagem !== "WET_CASTING_PROTENDIDO") return curveResults;
  return curveResults.map((r) => {
    const refRetido = CURVA_REFERENCIA_LAJE[r.sieve_id];
    return {
      ...r,
      pct_acumulado: 1 - r.pct_acumulado,
      limite_min: r.limite_max != null ? 1 - r.limite_max : undefined,
      limite_max: r.limite_min != null ? 1 - r.limite_min : undefined,
      referencia: refRetido != null ? 1 - refRetido : undefined,
    };
  });
}
