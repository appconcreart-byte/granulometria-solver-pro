import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const selects: string[] = [];
const q: any = {
  select: (s: string) => (selects.push(s), q),
  eq: () => q,
  order: () => q,
  single: () => Promise.resolve({ data: {}, error: null }),
  then: (resolve: any) => resolve({ data: [], error: null }),
};
vi.mock("@/lib/supabase", () => ({ supabase: { from: () => q } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ profile: { organization_id: "org1" } }) }));

import { useScheduleDetail } from "@/hooks/api/useRuptures";
import { useRuptureSchedulesWithTests } from "@/hooks/api/useMonthlyReports";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

// O embed do lote usa `*`: assim a tela de rompimento e o mensal continuam abrindo
// mesmo se o app subir antes de a migration 033 ser aplicada (a moldagem só aparece vazia).
const loteComAsterisco = /batch:production_batches\s*\(\s*\*/;

describe("leituras do lote tolerantes à migration 033 ainda não aplicada", () => {
  beforeEach(() => {
    selects.length = 0;
  });

  it("detalhe do rompimento lê o lote com *", async () => {
    renderHook(() => useScheduleDetail("s1"), { wrapper });
    await waitFor(() => expect(selects.some((s) => s.includes("production_batches"))).toBe(true));
    expect(selects.find((s) => s.includes("production_batches"))).toMatch(loteComAsterisco);
  });

  it("relatório mensal lê o lote com *", async () => {
    renderHook(() => useRuptureSchedulesWithTests(), { wrapper });
    await waitFor(() => expect(selects.some((s) => s.includes("production_batches"))).toBe(true));
    expect(selects.find((s) => s.includes("production_batches"))).toMatch(loteComAsterisco);
  });
});
