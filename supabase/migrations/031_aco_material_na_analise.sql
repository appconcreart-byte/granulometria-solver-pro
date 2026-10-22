-- ============================================================
-- MIGRATION 031 — Aço cadastrado como material, escolhido na análise
-- ============================================================
-- O aço passa a ser um material (tipo 'aco') cadastrado em Produtos, com preço
-- por kg ou por metro. A análise guarda qual aço foi escolhido; a descrição
-- (aco_descricao) continua como texto livre para quem não usa o cadastro.
-- Opcional e seguro para rodar mais de uma vez.
-- ============================================================

ALTER TABLE analysis_dosage
  ADD COLUMN IF NOT EXISTS aco_material_id UUID REFERENCES materials(id) ON DELETE SET NULL;
