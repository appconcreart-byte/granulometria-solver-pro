import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

const RUPTURE_TYPES = ["rupture_due_today", "rupture_overdue"];
const RESOLVED_STATUSES = ["concluido", "ignorado", "sem_expediente"];

/** Disparado quando o app criou avisos novos, para o sino recarregar a lista. */
export const NOTIFICATIONS_REFRESH_EVENT = "notifications:refresh";

/**
 * Ao abrir o app, garante que existam notificações para rompimentos
 * previstos para hoje ou em atraso, sem esperar o job diário do pg_cron.
 *
 * A criação é feita pela função `sync_rupture_notifications()` do banco
 * (migração 032): a tabela `notifications` não tem policy de INSERT, então o app
 * não consegue inserir direto. A função é idempotente e só gera avisos da
 * organização de quem chama.
 *
 * Também marca como lidas notificações cujo rompimento já foi concluído.
 */
export function useRuptureNotificationsSync() {
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile?.organization_id || !profile.ativo) return;

    const orgId = profile.organization_id;

    const markResolvedAsRead = async () => {
      const { data: unread } = await supabase
        .from("notifications")
        .select("id, dados")
        .eq("organization_id", orgId)
        .eq("lida", false)
        .in("tipo", RUPTURE_TYPES);

      if (!unread || unread.length === 0) return;

      const scheduleIds = [
        ...new Set(
          unread
            .map((n) => (n.dados as any)?.schedule_id as string | undefined)
            .filter((id): id is string => !!id)
        ),
      ];

      if (scheduleIds.length === 0) return;

      const { data: schedules } = await supabase
        .from("rupture_schedules")
        .select("id, status")
        .in("id", scheduleIds);

      const resolvedIds = new Set(
        (schedules ?? [])
          .filter((s) => RESOLVED_STATUSES.includes(s.status))
          .map((s) => s.id)
      );

      if (resolvedIds.size === 0) return;

      const notificationIdsToMark = unread
        .filter((n) => resolvedIds.has((n.dados as any)?.schedule_id))
        .map((n) => n.id);

      if (notificationIdsToMark.length === 0) return;

      await supabase
        .from("notifications")
        .update({ lida: true })
        .in("id", notificationIdsToMark);
    };

    const sync = async () => {
      await markResolvedAsRead();

      const { data: criadas, error } = await supabase.rpc("sync_rupture_notifications");
      if (error) {
        console.error("[useRuptureNotificationsSync] Erro ao gerar avisos de rompimento:", error);
        return;
      }

      if (typeof criadas === "number" && criadas > 0) {
        window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH_EVENT));
      }
    };

    sync();
  }, [profile?.id, profile?.organization_id, profile?.ativo]);
}
