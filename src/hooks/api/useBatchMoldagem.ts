import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { MoldagemColumns } from "@/lib/moldagem";

/**
 * Grava os dados de moldagem do lote (production_batches). Mexe só nas cinco
 * colunas de moldagem: não toca em amostras, resultados nem responsável do rompimento.
 */
export function useSaveBatchMoldagem() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ batchId, value }: { batchId: string; value: MoldagemColumns }) => {
      const { data, error } = await supabase
        .from("production_batches")
        .update(value)
        .eq("id", batchId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rupture_schedule_detail"] });
      queryClient.invalidateQueries({ queryKey: ["production_batches"] });
      queryClient.invalidateQueries({ queryKey: ["batch_report"] });
      queryClient.invalidateQueries({ queryKey: ["rupture_schedules_with_tests"] });
    },
  });

  const saveMoldagem = async (args: { batchId: string; value: MoldagemColumns }): Promise<void> => {
    await mutation.mutateAsync(args);
  };

  return { saveMoldagem, isSaving: mutation.isPending };
}
