import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const single = vi.fn();
const select = vi.fn(() => ({ single }));
const eq = vi.fn(() => ({ select }));
const update = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ update }));

vi.mock("@/lib/supabase", () => ({ supabase: { from: (...a: any[]) => (from as any)(...a) } }));

import { useSaveBatchMoldagem } from "@/hooks/api/useBatchMoldagem";
import type { MoldagemColumns } from "@/lib/moldagem";

const value: MoldagemColumns = {
  data_moldagem: "2026-10-15",
  hora_moldagem: "11:20",
  temperatura_c: 19.2,
  tempo_clima: "sol",
  slump_cm: 11,
};

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useSaveBatchMoldagem(), { wrapper });
  return { ...hook, invalidate };
}

describe("useSaveBatchMoldagem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    single.mockResolvedValue({ data: { id: "b1" }, error: null });
  });

  it("grava só as cinco colunas de moldagem no lote certo", async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.saveMoldagem({ batchId: "b1", value });
    });
    expect(from).toHaveBeenCalledWith("production_batches");
    expect(update).toHaveBeenCalledWith(value);
    expect(eq).toHaveBeenCalledWith("id", "b1");
  });

  it("depois de gravar, atualiza as telas que leem o lote", async () => {
    const { result, invalidate } = setup();
    await act(async () => {
      await result.current.saveMoldagem({ batchId: "b1", value });
    });
    const chaves = invalidate.mock.calls.map((c) => (c[0] as { queryKey: unknown[] }).queryKey);
    expect(chaves).toEqual(
      expect.arrayContaining([
        ["rupture_schedule_detail"],
        ["production_batches"],
        ["batch_report"],
        ["rupture_schedules_with_tests"],
      ]),
    );
  });

  it("se o Supabase devolve erro, a gravação rejeita", async () => {
    single.mockResolvedValue({ data: null, error: { message: "x" } });
    const { result } = setup();
    await act(async () => {
      await expect(result.current.saveMoldagem({ batchId: "b1", value })).rejects.toMatchObject({ message: "x" });
    });
  });
});
