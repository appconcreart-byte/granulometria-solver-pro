import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const rpc = vi.fn();
const insert = vi.fn();
// Consulta encadeável que resolve com "sem notificações não lidas" (markResolvedAsRead)
const emptyQuery = () => {
  const q: any = { select: () => q, eq: () => q, in: () => q, update: () => q, then: (r: any) => r({ data: [], error: null }) };
  return q;
};
const from = vi.fn((table: string) => (table === "notifications" ? { ...emptyQuery(), insert } : emptyQuery()));

vi.mock("@/lib/supabase", () => ({ supabase: { rpc: (...a: any[]) => rpc(...a), from: (...a: any[]) => from(...(a as [string])) } }));

let profile: any = { id: "u1", organization_id: "org1", ativo: true, role: "ADMIN", nome: "Ana" };
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ profile }) }));

import { useRuptureNotificationsSync, NOTIFICATIONS_REFRESH_EVENT } from "@/hooks/useRuptureNotificationsSync";

describe("useRuptureNotificationsSync", () => {
  beforeEach(() => {
    rpc.mockReset();
    insert.mockReset();
    from.mockClear();
    profile = { id: "u1", organization_id: "org1", ativo: true, role: "ADMIN", nome: "Ana" };
  });

  it("gera os avisos pela função do banco, sem inserir direto na tabela (o INSERT é bloqueado por RLS)", async () => {
    rpc.mockResolvedValue({ data: 0, error: null });
    renderHook(() => useRuptureNotificationsSync());

    await waitFor(() => expect(rpc).toHaveBeenCalledWith("sync_rupture_notifications"));
    expect(insert).not.toHaveBeenCalled();
  });

  it("avisa o sino para recarregar quando foram criados avisos novos", async () => {
    rpc.mockResolvedValue({ data: 3, error: null });
    const onRefresh = vi.fn();
    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);

    renderHook(() => useRuptureNotificationsSync());

    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);
  });

  it("não recarrega o sino quando nada foi criado", async () => {
    rpc.mockResolvedValue({ data: 0, error: null });
    const onRefresh = vi.fn();
    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);

    renderHook(() => useRuptureNotificationsSync());

    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(onRefresh).not.toHaveBeenCalled();
    window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);
  });

  it("registra o erro no console em vez de falhar em silêncio", async () => {
    const error = { message: "function public.sync_rupture_notifications() does not exist" };
    rpc.mockResolvedValue({ data: null, error });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const onRefresh = vi.fn();
    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);

    renderHook(() => useRuptureNotificationsSync());

    await waitFor(() => expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("Erro ao gerar avisos"), error));
    expect(onRefresh).not.toHaveBeenCalled();
    window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);
    consoleError.mockRestore();
  });

  it("não faz nada para usuário inativo ou sem organização", async () => {
    profile = { ...profile, ativo: false };
    renderHook(() => useRuptureNotificationsSync());
    profile = { ...profile, ativo: true, organization_id: null };
    renderHook(() => useRuptureNotificationsSync());

    await new Promise((r) => setTimeout(r, 20));
    expect(rpc).not.toHaveBeenCalled();
  });
});
