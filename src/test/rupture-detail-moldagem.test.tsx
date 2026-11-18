import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/supabase", () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useParams: () => ({ scheduleId: "s1" }),
  useNavigate: () => vi.fn(),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ profile: { role: "ADMIN", organization_id: "org1" } }) }));
vi.mock("@/hooks/api/useProfiles", () => ({ useProfiles: () => ({ profiles: [{ id: "p1", nome: "Ana" }] }) }));
vi.mock("@/hooks/api/useTechnicalSettings", () => ({ useTechnicalSettings: () => ({ settings: null }) }));
vi.mock("@/hooks/api/useBatchMoldagem", () => ({ useSaveBatchMoldagem: () => ({ saveMoldagem: vi.fn(), isSaving: false }) }));

let scheduleData: any;
vi.mock("@/hooks/api/useRuptures", () => ({
  useRuptures: () => ({
    completeRupture: vi.fn(), isCompleting: false,
    finalizeWithCurrentTest: vi.fn(), isFinalizing: false,
    updateRupture: vi.fn(), isUpdating: false,
    markSemExpediente: vi.fn(), isMarkingSemExpediente: false,
  }),
  useScheduleDetail: () => ({ data: scheduleData, isLoading: false }),
}));

import RuptureDetailPage from "@/pages/RuptureDetailPage";

// jsdom não tem ResizeObserver (usado pelos componentes de gráfico/select da página).
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Rompimento já concluído (o ADMIN pode corrigir). Cada chamada devolve um objeto novo,
// como o react-query faz quando o lote é recarregado depois de salvar a moldagem.
const concluido = (temperatura_c: number | null) => ({
  id: "s1",
  batch_id: "b1",
  idade_dias: 7,
  data_prevista: "2026-10-22",
  data_executada: "2026-10-22",
  status: "concluido",
  responsavel_id: "p1",
  batch: {
    id: "b1",
    batch_code: "L-1",
    produced_at: "2026-10-15T15:00:00Z",
    status: "aprovado",
    temperatura_c,
    analyses: { id: "a1", nome: "Análise", codigo: "AN-1", produto: "CP", tipo: "cp", resistencia_prevista: 30 },
  },
  tests: [
    {
      tipo_amostra: "cp",
      notas: "",
      samples: [1, 2, 3].map((numero) => ({ numero, forca_kn: 100, peso_kg: null })),
    },
  ],
});

describe("RuptureDetailPage — moldagem e edição de rompimento concluído", () => {
  it("recarregar o lote depois de salvar a moldagem não apaga edições não salvas das amostras", () => {
    scheduleData = concluido(null);
    const { rerender } = render(<RuptureDetailPage />);

    const forca1 = () => screen.getAllByPlaceholderText("Força (kN)")[0] as HTMLInputElement;
    expect(forca1().value).toBe("100");

    fireEvent.change(forca1(), { target: { value: "999" } });
    expect(forca1().value).toBe("999");

    scheduleData = concluido(28.5); // lote recarregado com a moldagem salva
    rerender(<RuptureDetailPage />);

    expect(forca1().value).toBe("999");
  });
});
