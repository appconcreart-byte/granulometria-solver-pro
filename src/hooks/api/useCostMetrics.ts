import { useMemo } from "react";
import { useAnalyses } from "./useAnalyses";
import { useProduction } from "./useProduction";
import { useMaterials } from "./useMaterials";
import {
  buildCostData,
  summarizeAll,
  type CostPeriod,
  type CostSummary,
  type Segmento,
} from "@/lib/cost-metrics";

export type { CostSummary, Segmento, CostPeriod };

const TODO_PERIODO: CostPeriod = { year: "", month: "00" };

/**
 * Métricas de custo separadas por segmento (Lajes e Pré-moldados), por lote:
 * custo REAL (receita real informada) e custo ESTIMADO (lotes sem receita real).
 * Usa os dados já carregados por useAnalyses, useProduction e useMaterials.
 * Sem `period`, considera todo o histórico.
 */
export function useCostMetrics(period: CostPeriod = TODO_PERIODO) {
  const { analyses, isLoading: loadingAnalyses } = useAnalyses();
  const { batches, isLoadingBatches } = useProduction();
  const { materials: dbMaterials, isLoading: isLoadingMaterials } = useMaterials();

  const data = useMemo(
    () => buildCostData(analyses, batches, dbMaterials || []),
    [analyses, batches, dbMaterials],
  );

  const bySegmento = useMemo<Record<Segmento, CostSummary>>(
    () => summarizeAll(data, period),
    [data, period.year, period.month],
  );

  return {
    ...bySegmento,
    /** Todos os lotes e traços (todos os segmentos e períodos) */
    allData: data,
    isLoading: loadingAnalyses || isLoadingBatches || isLoadingMaterials,
  };
}
