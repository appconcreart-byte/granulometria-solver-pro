-- ============================================================
-- MIGRATION 033 — Controle de Moldagem no lote de produção
-- (tela de Lançamento de Rompimento: data, hora, temperatura,
-- tempo sol/chuva e slump da moldagem)
-- ============================================================
-- Dados do LOTE: valem para todas as idades de rompimento (1, 3, 7, 28 dias).
-- Aparecem no laudo (PDF) e no relatório mensal. Todas as colunas são
-- nullable: lotes antigos não têm esses dados.
-- ============================================================

ALTER TABLE production_batches
  ADD COLUMN IF NOT EXISTS data_moldagem  DATE,
  ADD COLUMN IF NOT EXISTS hora_moldagem  TIME,
  ADD COLUMN IF NOT EXISTS temperatura_c  NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS tempo_clima    TEXT,
  ADD COLUMN IF NOT EXISTS slump_cm       NUMERIC(4,1);

ALTER TABLE production_batches
  DROP CONSTRAINT IF EXISTS production_batches_tempo_clima_check,
  DROP CONSTRAINT IF EXISTS production_batches_temperatura_c_check,
  DROP CONSTRAINT IF EXISTS production_batches_slump_cm_check;

ALTER TABLE production_batches
  ADD CONSTRAINT production_batches_tempo_clima_check CHECK (tempo_clima IS NULL OR tempo_clima IN ('sol','chuva')),
  ADD CONSTRAINT production_batches_temperatura_c_check CHECK (temperatura_c IS NULL OR temperatura_c BETWEEN -10 AND 60),
  ADD CONSTRAINT production_batches_slump_cm_check CHECK (slump_cm IS NULL OR slump_cm BETWEEN 0 AND 99.9);
