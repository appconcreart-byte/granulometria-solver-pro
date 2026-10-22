-- ============================================================
-- MIGRATION 030 — Aço e unidade do aditivo na análise; receita real no lote
-- ============================================================
-- analysis_dosage: aço (descrição, quantidade, unidade) e a unidade em que o
-- aditivo foi informado (mL ou g). aditivos_ml continua guardando só o número.
-- production_batches: nº de traços da pista e a receita REAL utilizada
-- (JSON com itens: nome, tipo, unidade, previsto e real). O previsto é gravado
-- junto para preservar o histórico se a análise mudar depois.
-- Todas as colunas são opcionais; análises e lotes antigos continuam válidos.
-- É seguro rodar mais de uma vez.
-- ============================================================

ALTER TABLE analysis_dosage
  ADD COLUMN IF NOT EXISTS aditivo_unidade TEXT NOT NULL DEFAULT 'mL',
  ADD COLUMN IF NOT EXISTS aco_descricao   TEXT,
  ADD COLUMN IF NOT EXISTS aco_quantidade  NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS aco_unidade     TEXT NOT NULL DEFAULT 'kg';

ALTER TABLE analysis_dosage
  DROP CONSTRAINT IF EXISTS analysis_dosage_aditivo_unidade_check,
  DROP CONSTRAINT IF EXISTS analysis_dosage_aco_unidade_check,
  DROP CONSTRAINT IF EXISTS analysis_dosage_aco_quantidade_check;

ALTER TABLE analysis_dosage
  ADD CONSTRAINT analysis_dosage_aditivo_unidade_check CHECK (aditivo_unidade IN ('mL', 'g')),
  ADD CONSTRAINT analysis_dosage_aco_unidade_check CHECK (aco_unidade IN ('kg', 'm')),
  ADD CONSTRAINT analysis_dosage_aco_quantidade_check CHECK (aco_quantidade IS NULL OR aco_quantidade >= 0);

ALTER TABLE production_batches
  ADD COLUMN IF NOT EXISTS n_tracos     SMALLINT,
  ADD COLUMN IF NOT EXISTS receita_real JSONB;

ALTER TABLE production_batches
  DROP CONSTRAINT IF EXISTS production_batches_n_tracos_check;

ALTER TABLE production_batches
  ADD CONSTRAINT production_batches_n_tracos_check CHECK (n_tracos IS NULL OR n_tracos > 0);
