-- ============================================================
-- MIGRATION 028 — Volume de concreto produzido (m³) por concretagem
-- (coluna VOLUME da planilha "REGISTRO DE CONCRETAGEM", ~12,6 m³)
-- Alimenta o painel de Métricas de Pista. Nullable: lotes antigos
-- não têm esse dado.
-- ============================================================

ALTER TABLE production_batches
  ADD COLUMN IF NOT EXISTS volume_concreto_m3 NUMERIC(8,2);

ALTER TABLE production_batches
  DROP CONSTRAINT IF EXISTS production_batches_volume_concreto_check;

ALTER TABLE production_batches
  ADD CONSTRAINT production_batches_volume_concreto_check
  CHECK (volume_concreto_m3 IS NULL OR volume_concreto_m3 > 0);
