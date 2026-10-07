-- ============================================================
-- MIGRATION 027 — Dados de pista no lote de produção
-- (planilha "REGISTRO DE CONCRETAGEM": pista, fios, metros de perda)
-- ============================================================
-- Guarda apenas os valores digitados. % Perda e % Aproveitamento
-- são calculados na aplicação (perda * 100 / 1600 m).
-- Colunas nullable para não quebrar lotes já existentes.
-- ============================================================

ALTER TABLE production_batches
  ADD COLUMN IF NOT EXISTS pista         TEXT,
  ADD COLUMN IF NOT EXISTS fios          SMALLINT,
  ADD COLUMN IF NOT EXISTS metros_perda  NUMERIC(8,2);

ALTER TABLE production_batches
  DROP CONSTRAINT IF EXISTS production_batches_pista_check,
  DROP CONSTRAINT IF EXISTS production_batches_fios_check,
  DROP CONSTRAINT IF EXISTS production_batches_metros_perda_check;

ALTER TABLE production_batches
  ADD CONSTRAINT production_batches_pista_check CHECK (pista IS NULL OR pista IN ('A','B','C')),
  ADD CONSTRAINT production_batches_fios_check CHECK (fios IS NULL OR fios IN (3,5,7)),
  ADD CONSTRAINT production_batches_metros_perda_check CHECK (metros_perda IS NULL OR metros_perda >= 0);
