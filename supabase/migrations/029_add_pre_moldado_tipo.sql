-- ============================================================
-- MIGRATION 029 — Novo tipo de produto/análise: 'pre_moldado'
-- ============================================================
-- Pré-moldado segue o mesmo processo da laje (wet casting), a mesma
-- granulometria e a mesma fórmula; só é um segmento separado.
--
-- As colunas de tipo (analyses.tipo, products.tipo_produto,
-- standard_curves.tipo_produto, granulometry_presets.tipo_analise) são
-- TEXT no schema versionado, então nada precisa mudar nelas. Se o banco
-- real tiver o enum "TipoProduto" (criado fora destas migrations, ver 013),
-- o valor é adicionado aqui. É seguro rodar mais de uma vez.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoProduto') THEN
    ALTER TYPE "TipoProduto" ADD VALUE IF NOT EXISTS 'pre_moldado';
  END IF;
END
$$;
