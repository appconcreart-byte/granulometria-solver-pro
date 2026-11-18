-- ============================================================
-- MIGRATION 032 — Notificações de rompimento
--
-- Problemas corrigidos:
--  1. O app (hook useRuptureNotificationsSync) tentava inserir em `notifications`,
--     mas a tabela só tem policies de SELECT/UPDATE → o INSERT era recusado
--     em silêncio. Agora a geração roda dentro do banco (SECURITY DEFINER).
--  2. Os jobs do pg_cron só avisavam o rompimento do dia exato (e o de ontem),
--     então lote registrado com data passada nunca gerava aviso.
--  3. O filtro de destinatários era case-sensitive e deixava o perfil `gerente`
--     de fora.
-- ============================================================

-- 1) Um único aviso por (usuário, tipo, rompimento): protege contra dois acessos
--    simultâneos gerando duplicatas.
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_rupture_once
  ON public.notifications (user_id, tipo, (dados->>'schedule_id'))
  WHERE tipo IN ('rupture_due_today', 'rupture_overdue');

-- 2) Gera os avisos de rompimento. p_org NULL = todas as organizações (pg_cron).
--    - "hoje": data_prevista = hoje (horário de Brasília)
--    - "em atraso": data_prevista nos últimos 30 dias, ainda não concluído
--      (rompimentos mais antigos que isso não geram aviso novo, para não
--      encher o sino com pendências antigas)
--    Idempotente: pode ser chamada quantas vezes quiser.
CREATE OR REPLACE FUNCTION public.generate_rupture_notifications(p_org uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today    date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_inserted integer;
BEGIN
  WITH due AS (
    SELECT
      rs.id            AS schedule_id,
      rs.idade_dias,
      rs.data_prevista,
      pb.organization_id,
      pb.batch_code,
      CASE WHEN rs.data_prevista = v_today THEN 'rupture_due_today' ELSE 'rupture_overdue' END AS tipo
    FROM rupture_schedules rs
    JOIN production_batches pb ON pb.id = rs.batch_id
    WHERE rs.status IN ('pendente', 'atrasado')
      AND rs.data_prevista <= v_today
      AND rs.data_prevista >= v_today - 30
      AND (p_org IS NULL OR pb.organization_id = p_org)
  )
  INSERT INTO notifications (organization_id, user_id, tipo, titulo, mensagem, link, dados)
  SELECT
    d.organization_id,
    p.id,
    d.tipo,
    CASE WHEN d.tipo = 'rupture_due_today'
      THEN 'Rompimento hoje: Lote ' || d.batch_code
      ELSE 'Rompimento em atraso: Lote ' || d.batch_code
    END,
    CASE WHEN d.tipo = 'rupture_due_today'
      THEN 'O lote ' || d.batch_code || ' tem rompimento de ' || d.idade_dias || ' dias previsto para hoje.'
      ELSE 'O lote ' || d.batch_code || ' tem rompimento de ' || d.idade_dias
           || ' dias em atraso (previsto: ' || to_char(d.data_prevista, 'DD/MM/YYYY') || ').'
    END,
    '/ruptures',
    jsonb_build_object(
      'schedule_id',   d.schedule_id,
      'batch_code',    d.batch_code,
      'idade_dias',    d.idade_dias,
      'data_prevista', d.data_prevista
    )
  FROM due d
  JOIN profiles p ON p.organization_id = d.organization_id
  WHERE p.ativo = true
    AND lower(p.role) IN ('admin', 'gestor', 'laboratorio', 'producao', 'gerente')
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

-- 3) Ponto de entrada do app: gera os avisos só da organização de quem chama.
CREATE OR REPLACE FUNCTION public.sync_rupture_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid := my_org_id();
BEGIN
  IF v_org IS NULL THEN
    RETURN 0;
  END IF;
  RETURN generate_rupture_notifications(v_org);
END;
$$;

-- A função genérica (todas as organizações) fica só para o pg_cron; o app chama a segunda.
REVOKE ALL ON FUNCTION public.generate_rupture_notifications(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_rupture_notifications() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_rupture_notifications() TO authenticated;

-- 4) Jobs do pg_cron passam a usar a função (06:00 e 07:00 de Brasília).
DO $$
BEGIN
  PERFORM cron.unschedule(jobname)
  FROM cron.job
  WHERE jobname IN ('rupture-due-today', 'rupture-overdue');
END $$;

SELECT cron.schedule(
  'rupture-due-today',
  '0 9 * * *',
  $$ SELECT public.generate_rupture_notifications(); $$
);

SELECT cron.schedule(
  'rupture-overdue',
  '0 10 * * *',
  $$
    UPDATE rupture_schedules
    SET status = 'atrasado'
    WHERE status = 'pendente'
      AND data_prevista < CURRENT_DATE;

    SELECT public.generate_rupture_notifications();
  $$
);

-- 5) Gera agora os avisos dos rompimentos que já estão pendentes/atrasados.
SELECT public.generate_rupture_notifications();
