-- Esquema exportado (somente estrutura, sem dados) do projeto Laje & Forro (lhfxcjwpsjnpmgyyhbxi)
-- Gerado via consultas SELECT ao catalogo. Nenhuma alteracao foi feita no projeto de origem.
SET check_function_bodies = off;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

CREATE TABLE public."analyses" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid,
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "tipo" text NOT NULL,
  "produto" text,
  "resistencia_prevista" numeric(6,2),
  "unidade" text,
  "analista_id" uuid,
  "standard_curve_id" uuid,
  "status" text DEFAULT 'rascunho'::text,
  "wizard_step" integer DEFAULT 1,
  "observacoes" text,
  "aprovado_por" uuid,
  "aprovado_em" timestamp with time zone,
  "liberado_por" uuid,
  "liberado_em" timestamp with time zone,
  "data_analise" date DEFAULT CURRENT_DATE,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "analise" integer,
  "laboratório" bigint,
  "labpro" real
);

CREATE TABLE public."analysis_dosage" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "analysis_id" uuid,
  "relacao_cimento" numeric(8,4),
  "relacao_ac" numeric(6,4),
  "volume_batelada_litros" numeric(10,3) DEFAULT 550,
  "densidade_cimento" numeric(5,3) DEFAULT 3.15,
  "consumo_cimento_kg" numeric(10,3),
  "massa_total_kg" numeric(10,3),
  "agua_litros" numeric(8,3),
  "agregado_kg" numeric(10,3),
  "aditivos_ml" numeric(8,2) DEFAULT 0,
  "traco_final" text,
  "ordem_mistura" jsonb,
  "custo_cimento_ton" numeric(10,2),
  "custo_aditivo_lt" numeric(10,2),
  "custo_total_m3" numeric(10,2),
  "custo_total_batelada" numeric(10,2),
  "cimento_marca_id" uuid,
  "cimento_lote" text,
  "cimento_observacao" text,
  "aditivo_marca_id" uuid,
  "aditivo_lote" text,
  "aditivo_diluicao" text,
  "aditivo_observacao" text
);

CREATE TABLE public."analysis_gradation_results" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "analysis_id" uuid,
  "sieve_id" integer,
  "pct_combinado" numeric(10,8),
  "pct_acumulado" numeric(10,8),
  "target_pct" numeric(10,8),
  "limite_min" numeric(10,8),
  "limite_max" numeric(10,8),
  "desvio_absoluto" numeric(10,8),
  "fora_da_faixa" boolean DEFAULT false
);

CREATE TABLE public."analysis_material_gradations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "analysis_material_id" uuid,
  "sieve_id" integer,
  "massa_retida" numeric(10,3)
);

CREATE TABLE public."analysis_materials" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "analysis_id" uuid,
  "material_id" uuid,
  "proporcao_pct" numeric(8,6) NOT NULL,
  "massa_kg" numeric(10,3),
  "ordem" integer
);

CREATE TABLE public."dosage_experiment_materials" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "experiment_id" uuid,
  "material_id" uuid,
  "papel" text,
  "proporcao_kg" numeric(10,3) NOT NULL,
  "ordem" integer
);

CREATE TABLE public."dosage_experiments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid,
  "produto_nome" text,
  "codigo" text NOT NULL,
  "origem" text NOT NULL,
  "status" text DEFAULT 'SIMULACAO'::text NOT NULL,
  "cimento_kg" numeric(10,3) NOT NULL,
  "agua_kg" numeric(10,3) NOT NULL,
  "aditivo_kg" numeric(10,3) DEFAULT 0 NOT NULL,
  "relacao_ac" numeric(6,4),
  "aditivo_pct_cimento" numeric(6,4),
  "densidade_cimento" numeric(5,3) DEFAULT 3.15,
  "volume_batelada_m3" numeric(10,4),
  "resultado_resistencia_mpa" numeric(6,2),
  "resistencia_estimada_mpa" numeric(6,2),
  "confianca_estimativa" text,
  "erro_estimado_vs_real_pct" numeric(6,2),
  "score" numeric(12,4),
  "extrapolacao" boolean DEFAULT false,
  "extrapolacao_motivo" text,
  "alertas" jsonb DEFAULT '[]'::jsonb,
  "usar_na_calibragem" boolean DEFAULT true NOT NULL,
  "motivo_exclusao_calibragem" text,
  "tipo_cimento" text,
  "tipo_cura" text,
  "slump_cm" numeric(5,2),
  "segregacao_observada" boolean,
  "exsudacao_observada" boolean,
  "observacoes" text,
  "registrado_por" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."granulometry_presets" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "nome" text NOT NULL,
  "materiais" jsonb NOT NULL,
  "dna_selecionado" text,
  "limites_curva" jsonb,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "tipo_analise" text DEFAULT 'bloco_estrutural'::text
);

CREATE TABLE public."material_brands" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "tipo" text NOT NULL,
  "nome" text NOT NULL,
  "fornecedor" text,
  "ativo" boolean DEFAULT true NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."material_gradations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "material_id" uuid,
  "sieve_id" integer,
  "massa_retida" numeric(10,4) DEFAULT 0 NOT NULL,
  "pct_individual" numeric(10,8),
  "pct_acumulado" numeric(10,8)
);

CREATE TABLE public."materials" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid,
  "nome" text NOT NULL,
  "tipo" text NOT NULL,
  "fornecedor" text,
  "densidade" numeric(5,3),
  "ativo" boolean DEFAULT true,
  "observacoes" text,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "mf" numeric(5,3),
  "custo_tonelada" numeric,
  "custo_valor" numeric(12,4),
  "custo_unidade" text DEFAULT 'tonelada'::text
);

CREATE TABLE public."monthly_reports" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "ano" integer NOT NULL,
  "mes" integer NOT NULL,
  "conclusao" text,
  "responsavel_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."notification_preferences" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "rupture_due_email" boolean DEFAULT true,
  "rupture_due_push" boolean DEFAULT true,
  "rupture_overdue_email" boolean DEFAULT true,
  "rupture_overdue_push" boolean DEFAULT true,
  "trace_approved_email" boolean DEFAULT true,
  "batch_rejected_email" boolean DEFAULT true,
  "report_ready_email" boolean DEFAULT true,
  "report_ready_push" boolean DEFAULT true,
  "antecedencia_horas" integer DEFAULT 24
);

CREATE TABLE public."notifications" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid,
  "user_id" uuid,
  "tipo" text NOT NULL,
  "titulo" text NOT NULL,
  "mensagem" text NOT NULL,
  "link" text,
  "lida" boolean DEFAULT false,
  "dados" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."organizations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "nome" text NOT NULL,
  "cnpj" text,
  "logo_url" text,
  "plano" text DEFAULT 'trial'::text,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."production_batches" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid,
  "analysis_id" uuid,
  "batch_code" text NOT NULL,
  "operador_id" uuid,
  "operador_nome" text,
  "maquina" text,
  "volume_produzido" numeric(10,3),
  "status" text DEFAULT 'aguardando_rompimentos'::text,
  "notas" text,
  "produced_at" timestamp with time zone DEFAULT now(),
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."products" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid,
  "nome" text NOT NULL,
  "tipo_produto" text NOT NULL,
  "dimensoes" text,
  "ativo" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."profiles" (
  "id" uuid NOT NULL,
  "organization_id" uuid,
  "nome" text NOT NULL,
  "cargo" text,
  "telefone" text,
  "avatar_url" text,
  "role" text DEFAULT 'laboratorio'::text NOT NULL,
  "ativo" boolean DEFAULT true,
  "tema" text DEFAULT 'dark'::text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "email" text
);

CREATE TABLE public."quality_reports" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid,
  "batch_id" uuid,
  "analysis_id" uuid,
  "final_status" text,
  "conclusion" text,
  "recommendations" text,
  "pdf_url" text,
  "assinatura_lab" text,
  "assinatura_prod" text,
  "assinatura_resp" text,
  "emitido_por" uuid,
  "emitido_em" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."rupture_samples" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "test_id" uuid,
  "numero" integer NOT NULL,
  "forca_kn" numeric(10,3),
  "tensao_mpa" numeric(8,4),
  "status" text,
  "registrado_por" uuid,
  "registrado_em" timestamp with time zone DEFAULT now(),
  "peso_kg" numeric(10,3)
);

CREATE TABLE public."rupture_schedules" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "batch_id" uuid,
  "idade_dias" integer NOT NULL,
  "data_prevista" date NOT NULL,
  "data_executada" date,
  "status" text DEFAULT 'pendente'::text,
  "responsavel_id" uuid,
  "responsavel_nome" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "motivo_nao_realizado" text
);

CREATE TABLE public."rupture_tests" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "schedule_id" uuid,
  "tipo_amostra" text NOT NULL,
  "meta_mpa" numeric(6,2),
  "media_mpa" numeric(8,4),
  "min_mpa" numeric(8,4),
  "max_mpa" numeric(8,4),
  "desvio_padrao" numeric(8,4),
  "status" text DEFAULT 'pendente'::text,
  "notas" text
);

CREATE TABLE public."sieves" (
  "id" serial,
  "abertura_mm" numeric(6,3) NOT NULL,
  "nome" text NOT NULL,
  "ordem" integer NOT NULL,
  "usa_no_mf" boolean DEFAULT true
);

CREATE TABLE public."standard_curve_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "curve_id" uuid,
  "sieve_id" integer,
  "pct_retido" numeric(10,8),
  "pct_acumulado" numeric(10,8),
  "limite_min" numeric(10,8),
  "limite_max" numeric(10,8)
);

CREATE TABLE public."standard_curves" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid,
  "nome" text NOT NULL,
  "tipo_produto" text NOT NULL,
  "resistencia_alvo" numeric(6,2),
  "modulo_finura" numeric(6,4),
  "descricao" text,
  "ativo" boolean DEFAULT true,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "is_system" boolean DEFAULT false NOT NULL,
  "dimensao_maxima_permitida_mm" numeric(6,2)
);

CREATE TABLE public."technical_settings" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid,
  "volume_batelada_padrao" numeric(10,3) DEFAULT 550,
  "densidade_cimento_padrao" numeric(5,3) DEFAULT 3.15,
  "formula_tensao_a" numeric(10,6) DEFAULT 0.0546,
  "formula_tensao_b" numeric(10,4) DEFAULT 98.0665,
  "bloco_meta_1d" numeric(6,2) DEFAULT 2.8,
  "bloco_meta_3d" numeric(6,2) DEFAULT 3.5,
  "bloco_meta_7d" numeric(6,2) DEFAULT 4.0,
  "bloco_meta_28d" numeric(6,2) DEFAULT 4.0,
  "paver_meta_1d" numeric(6,2) DEFAULT 22.0,
  "paver_meta_3d" numeric(6,2) DEFAULT 28.0,
  "paver_meta_7d" numeric(6,2) DEFAULT 35.0,
  "paver_meta_28d" numeric(6,2) DEFAULT 35.0,
  "logo_url" text,
  "rodape_endereco" text,
  "rodape_cnpj" text,
  "rodape_responsavel" text,
  "updated_at" timestamp with time zone DEFAULT now(),
  "formula_tensao_paver" numeric(10,6) DEFAULT 1.729,
  "formula_tensao_laje" numeric DEFAULT 78.54,
  "formula_tensao_laje_mult" numeric DEFAULT 100
);

CREATE TABLE public."user_invites" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid,
  "email" text NOT NULL,
  "role" text NOT NULL,
  "token" text DEFAULT (gen_random_uuid())::text NOT NULL,
  "convidado_por" uuid,
  "aceito_em" timestamp with time zone,
  "expira_em" timestamp with time zone DEFAULT (now() + '72:00:00'::interval) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."webhook_configs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid,
  "nome" text NOT NULL,
  "url" text NOT NULL,
  "evento" text NOT NULL,
  "secret" text DEFAULT encode(gen_random_bytes(32), 'hex'::text) NOT NULL,
  "ativo" boolean DEFAULT true,
  "headers" jsonb DEFAULT '{}'::jsonb,
  "retry_count" integer DEFAULT 3,
  "timeout_seconds" integer DEFAULT 30,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."webhook_logs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "webhook_id" uuid,
  "evento" text NOT NULL,
  "payload" jsonb,
  "response_status" integer,
  "response_body" text,
  "tentativas" integer DEFAULT 1,
  "sucesso" boolean,
  "disparado_em" timestamp with time zone DEFAULT now()
);

ALTER TABLE public."analyses" ADD CONSTRAINT "analyses_pkey" PRIMARY KEY (id);
ALTER TABLE public."analysis_dosage" ADD CONSTRAINT "analysis_dosage_pkey" PRIMARY KEY (id);
ALTER TABLE public."analysis_gradation_results" ADD CONSTRAINT "analysis_gradation_results_pkey" PRIMARY KEY (id);
ALTER TABLE public."analysis_material_gradations" ADD CONSTRAINT "analysis_material_gradations_pkey" PRIMARY KEY (id);
ALTER TABLE public."analysis_materials" ADD CONSTRAINT "analysis_materials_pkey" PRIMARY KEY (id);
ALTER TABLE public."dosage_experiment_materials" ADD CONSTRAINT "dosage_experiment_materials_pkey" PRIMARY KEY (id);
ALTER TABLE public."dosage_experiments" ADD CONSTRAINT "dosage_experiments_pkey" PRIMARY KEY (id);
ALTER TABLE public."granulometry_presets" ADD CONSTRAINT "granulometry_presets_pkey" PRIMARY KEY (id);
ALTER TABLE public."material_brands" ADD CONSTRAINT "material_brands_pkey" PRIMARY KEY (id);
ALTER TABLE public."material_gradations" ADD CONSTRAINT "material_gradations_pkey" PRIMARY KEY (id);
ALTER TABLE public."materials" ADD CONSTRAINT "materials_pkey" PRIMARY KEY (id);
ALTER TABLE public."monthly_reports" ADD CONSTRAINT "monthly_reports_pkey" PRIMARY KEY (id);
ALTER TABLE public."notification_preferences" ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY (id);
ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_pkey" PRIMARY KEY (id);
ALTER TABLE public."organizations" ADD CONSTRAINT "organizations_pkey" PRIMARY KEY (id);
ALTER TABLE public."production_batches" ADD CONSTRAINT "production_batches_pkey" PRIMARY KEY (id);
ALTER TABLE public."products" ADD CONSTRAINT "products_pkey" PRIMARY KEY (id);
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (id);
ALTER TABLE public."quality_reports" ADD CONSTRAINT "quality_reports_pkey" PRIMARY KEY (id);
ALTER TABLE public."rupture_samples" ADD CONSTRAINT "rupture_samples_pkey" PRIMARY KEY (id);
ALTER TABLE public."rupture_schedules" ADD CONSTRAINT "rupture_schedules_pkey" PRIMARY KEY (id);
ALTER TABLE public."rupture_tests" ADD CONSTRAINT "rupture_tests_pkey" PRIMARY KEY (id);
ALTER TABLE public."sieves" ADD CONSTRAINT "sieves_pkey" PRIMARY KEY (id);
ALTER TABLE public."standard_curve_items" ADD CONSTRAINT "standard_curve_items_pkey" PRIMARY KEY (id);
ALTER TABLE public."standard_curves" ADD CONSTRAINT "standard_curves_pkey" PRIMARY KEY (id);
ALTER TABLE public."technical_settings" ADD CONSTRAINT "technical_settings_pkey" PRIMARY KEY (id);
ALTER TABLE public."user_invites" ADD CONSTRAINT "user_invites_pkey" PRIMARY KEY (id);
ALTER TABLE public."webhook_configs" ADD CONSTRAINT "webhook_configs_pkey" PRIMARY KEY (id);
ALTER TABLE public."webhook_logs" ADD CONSTRAINT "webhook_logs_pkey" PRIMARY KEY (id);
ALTER TABLE public."analyses" ADD CONSTRAINT "analyses_organization_id_codigo_key" UNIQUE (organization_id, codigo);
ALTER TABLE public."analysis_dosage" ADD CONSTRAINT "analysis_dosage_analysis_id_key" UNIQUE (analysis_id);
ALTER TABLE public."analysis_gradation_results" ADD CONSTRAINT "analysis_gradation_results_analysis_id_sieve_id_key" UNIQUE (analysis_id, sieve_id);
ALTER TABLE public."analysis_material_gradations" ADD CONSTRAINT "analysis_material_gradations_analysis_material_id_sieve_id_key" UNIQUE (analysis_material_id, sieve_id);
ALTER TABLE public."dosage_experiments" ADD CONSTRAINT "dosage_experiments_organization_id_codigo_key" UNIQUE (organization_id, codigo);
ALTER TABLE public."material_gradations" ADD CONSTRAINT "material_gradations_material_id_sieve_id_key" UNIQUE (material_id, sieve_id);
ALTER TABLE public."monthly_reports" ADD CONSTRAINT "monthly_reports_organization_id_ano_mes_key" UNIQUE (organization_id, ano, mes);
ALTER TABLE public."notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_key" UNIQUE (user_id);
ALTER TABLE public."production_batches" ADD CONSTRAINT "production_batches_batch_code_key" UNIQUE (batch_code);
ALTER TABLE public."sieves" ADD CONSTRAINT "sieves_ordem_key" UNIQUE (ordem);
ALTER TABLE public."standard_curve_items" ADD CONSTRAINT "standard_curve_items_curve_id_sieve_id_key" UNIQUE (curve_id, sieve_id);
ALTER TABLE public."technical_settings" ADD CONSTRAINT "technical_settings_organization_id_key" UNIQUE (organization_id);
ALTER TABLE public."user_invites" ADD CONSTRAINT "user_invites_token_key" UNIQUE (token);
ALTER TABLE public."material_brands" ADD CONSTRAINT "material_brands_tipo_check" CHECK ((tipo = ANY (ARRAY['cimento'::text, 'aditivo'::text])));
ALTER TABLE public."monthly_reports" ADD CONSTRAINT "monthly_reports_mes_check" CHECK (((mes >= 1) AND (mes <= 12)));
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_role_lowercase" CHECK ((role = lower(role)));
ALTER TABLE public."analyses" ADD CONSTRAINT "analyses_aprovado_por_fkey" FOREIGN KEY (aprovado_por) REFERENCES profiles(id);
ALTER TABLE public."analyses" ADD CONSTRAINT "analyses_standard_curve_id_fkey" FOREIGN KEY (standard_curve_id) REFERENCES standard_curves(id);
ALTER TABLE public."analyses" ADD CONSTRAINT "analyses_analista_id_fkey" FOREIGN KEY (analista_id) REFERENCES profiles(id);
ALTER TABLE public."analyses" ADD CONSTRAINT "analyses_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE public."analyses" ADD CONSTRAINT "analyses_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE public."analyses" ADD CONSTRAINT "analyses_liberado_por_fkey" FOREIGN KEY (liberado_por) REFERENCES profiles(id);
ALTER TABLE public."analysis_dosage" ADD CONSTRAINT "analysis_dosage_cimento_marca_id_fkey" FOREIGN KEY (cimento_marca_id) REFERENCES materials(id);
ALTER TABLE public."analysis_dosage" ADD CONSTRAINT "analysis_dosage_analysis_id_fkey" FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE;
ALTER TABLE public."analysis_dosage" ADD CONSTRAINT "analysis_dosage_aditivo_marca_id_fkey" FOREIGN KEY (aditivo_marca_id) REFERENCES materials(id);
ALTER TABLE public."analysis_gradation_results" ADD CONSTRAINT "analysis_gradation_results_analysis_id_fkey" FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE;
ALTER TABLE public."analysis_gradation_results" ADD CONSTRAINT "analysis_gradation_results_sieve_id_fkey" FOREIGN KEY (sieve_id) REFERENCES sieves(id);
ALTER TABLE public."analysis_material_gradations" ADD CONSTRAINT "analysis_material_gradations_analysis_material_id_fkey" FOREIGN KEY (analysis_material_id) REFERENCES analysis_materials(id) ON DELETE CASCADE;
ALTER TABLE public."analysis_material_gradations" ADD CONSTRAINT "analysis_material_gradations_sieve_id_fkey" FOREIGN KEY (sieve_id) REFERENCES sieves(id);
ALTER TABLE public."analysis_materials" ADD CONSTRAINT "analysis_materials_analysis_id_fkey" FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE;
ALTER TABLE public."analysis_materials" ADD CONSTRAINT "analysis_materials_material_id_fkey" FOREIGN KEY (material_id) REFERENCES materials(id);
ALTER TABLE public."dosage_experiment_materials" ADD CONSTRAINT "dosage_experiment_materials_experiment_id_fkey" FOREIGN KEY (experiment_id) REFERENCES dosage_experiments(id) ON DELETE CASCADE;
ALTER TABLE public."dosage_experiment_materials" ADD CONSTRAINT "dosage_experiment_materials_material_id_fkey" FOREIGN KEY (material_id) REFERENCES materials(id);
ALTER TABLE public."dosage_experiments" ADD CONSTRAINT "dosage_experiments_registrado_por_fkey" FOREIGN KEY (registrado_por) REFERENCES profiles(id);
ALTER TABLE public."dosage_experiments" ADD CONSTRAINT "dosage_experiments_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE public."granulometry_presets" ADD CONSTRAINT "granulometry_presets_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE public."granulometry_presets" ADD CONSTRAINT "granulometry_presets_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE public."material_brands" ADD CONSTRAINT "material_brands_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE public."material_brands" ADD CONSTRAINT "material_brands_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE public."material_gradations" ADD CONSTRAINT "material_gradations_material_id_fkey" FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE;
ALTER TABLE public."material_gradations" ADD CONSTRAINT "material_gradations_sieve_id_fkey" FOREIGN KEY (sieve_id) REFERENCES sieves(id);
ALTER TABLE public."materials" ADD CONSTRAINT "materials_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE public."materials" ADD CONSTRAINT "materials_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE public."monthly_reports" ADD CONSTRAINT "monthly_reports_responsavel_id_fkey" FOREIGN KEY (responsavel_id) REFERENCES profiles(id);
ALTER TABLE public."monthly_reports" ADD CONSTRAINT "monthly_reports_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE public."monthly_reports" ADD CONSTRAINT "monthly_reports_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE public."notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id);
ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id);
ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE public."production_batches" ADD CONSTRAINT "production_batches_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE public."production_batches" ADD CONSTRAINT "production_batches_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE public."production_batches" ADD CONSTRAINT "production_batches_analysis_id_fkey" FOREIGN KEY (analysis_id) REFERENCES analyses(id);
ALTER TABLE public."production_batches" ADD CONSTRAINT "production_batches_operador_id_fkey" FOREIGN KEY (operador_id) REFERENCES profiles(id);
ALTER TABLE public."products" ADD CONSTRAINT "products_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."quality_reports" ADD CONSTRAINT "quality_reports_analysis_id_fkey" FOREIGN KEY (analysis_id) REFERENCES analyses(id);
ALTER TABLE public."quality_reports" ADD CONSTRAINT "quality_reports_emitido_por_fkey" FOREIGN KEY (emitido_por) REFERENCES profiles(id);
ALTER TABLE public."quality_reports" ADD CONSTRAINT "quality_reports_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE public."quality_reports" ADD CONSTRAINT "quality_reports_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES production_batches(id);
ALTER TABLE public."rupture_samples" ADD CONSTRAINT "rupture_samples_test_id_fkey" FOREIGN KEY (test_id) REFERENCES rupture_tests(id) ON DELETE CASCADE;
ALTER TABLE public."rupture_samples" ADD CONSTRAINT "rupture_samples_registrado_por_fkey" FOREIGN KEY (registrado_por) REFERENCES profiles(id);
ALTER TABLE public."rupture_schedules" ADD CONSTRAINT "rupture_schedules_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES production_batches(id) ON DELETE CASCADE;
ALTER TABLE public."rupture_schedules" ADD CONSTRAINT "rupture_schedules_responsavel_id_fkey" FOREIGN KEY (responsavel_id) REFERENCES profiles(id);
ALTER TABLE public."rupture_tests" ADD CONSTRAINT "rupture_tests_schedule_id_fkey" FOREIGN KEY (schedule_id) REFERENCES rupture_schedules(id) ON DELETE CASCADE;
ALTER TABLE public."standard_curve_items" ADD CONSTRAINT "standard_curve_items_sieve_id_fkey" FOREIGN KEY (sieve_id) REFERENCES sieves(id);
ALTER TABLE public."standard_curve_items" ADD CONSTRAINT "standard_curve_items_curve_id_fkey" FOREIGN KEY (curve_id) REFERENCES standard_curves(id) ON DELETE CASCADE;
ALTER TABLE public."standard_curves" ADD CONSTRAINT "standard_curves_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE public."standard_curves" ADD CONSTRAINT "standard_curves_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE public."technical_settings" ADD CONSTRAINT "technical_settings_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE public."user_invites" ADD CONSTRAINT "user_invites_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE public."user_invites" ADD CONSTRAINT "user_invites_convidado_por_fkey" FOREIGN KEY (convidado_por) REFERENCES profiles(id);
ALTER TABLE public."webhook_configs" ADD CONSTRAINT "webhook_configs_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE public."webhook_configs" ADD CONSTRAINT "webhook_configs_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE public."webhook_logs" ADD CONSTRAINT "webhook_logs_webhook_id_fkey" FOREIGN KEY (webhook_id) REFERENCES webhook_configs(id);

CREATE OR REPLACE FUNCTION public.cleanup_expired_invites()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM user_invites
  WHERE expira_em < now() AND aceito_em IS NULL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'cleanup_expired_invites falhou: %', SQLERRM;
  RETURN 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, nome, email, role, organization_id, ativo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'laboratorio'),
    COALESCE(
      (NEW.raw_user_meta_data->>'organization_id')::UUID,
      (SELECT id FROM public.organizations LIMIT 1)
    ),
    COALESCE((NEW.raw_user_meta_data->>'ativo')::boolean, true)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.on_analysis_approved()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'aprovado' AND OLD.status != 'aprovado' THEN
    BEGIN
      INSERT INTO notifications (organization_id, user_id, tipo, titulo, mensagem, link, dados)
      SELECT
        NEW.organization_id,
        p.id,
        'trace_approved',
        'Análise aprovada: ' || NEW.codigo,
        'A análise ' || NEW.nome || ' foi aprovada e está disponível para produção.',
        '/analyses/' || NEW.id,
        jsonb_build_object('analysis_id', NEW.id, 'codigo', NEW.codigo)
      FROM profiles p
      WHERE p.organization_id = NEW.organization_id
        AND p.role IN ('admin', 'gestor', 'producao')
        AND p.ativo = true;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'on_analysis_approved falhou para análise %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.on_batch_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  ages INTEGER[] := ARRAY[1, 3, 7, 28];
  age  INTEGER;
BEGIN
  BEGIN
    FOREACH age IN ARRAY ages LOOP
      INSERT INTO rupture_schedules (batch_id, idade_dias, data_prevista)
      VALUES (NEW.id, age, (NEW.produced_at::date + age));
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'on_batch_created falhou para lote %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.on_rupture_completed()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  batch_uuid          UUID;
  total_schedules     INTEGER;
  completed_schedules INTEGER;
  non_conformities    INTEGER;
BEGIN
  IF NEW.status = 'concluido' AND OLD.status != 'concluido' THEN
    BEGIN
      SELECT rs.batch_id INTO batch_uuid FROM rupture_schedules rs WHERE rs.id = NEW.id;
      SELECT COUNT(*) INTO total_schedules FROM rupture_schedules WHERE batch_id = batch_uuid;
      SELECT COUNT(*) INTO completed_schedules FROM rupture_schedules WHERE batch_id = batch_uuid AND status = 'concluido';

      IF completed_schedules = total_schedules THEN
        SELECT COUNT(*) INTO non_conformities
        FROM rupture_tests rt
        JOIN rupture_schedules rs ON rs.id = rt.schedule_id
        WHERE rs.batch_id = batch_uuid AND rt.status = 'nao_conforme';

        UPDATE production_batches SET status =
          CASE
            WHEN non_conformities = 0  THEN 'aprovado'
            WHEN non_conformities <= 1 THEN 'aprovado_com_ressalva'
            ELSE 'reprovado'
          END
        WHERE id = batch_uuid;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'on_rupture_completed falhou para schedule %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.my_org_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.my_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT LOWER(role) FROM profiles WHERE id = auth.uid();
$function$;

CREATE INDEX idx_analyses_analista_id ON public.analyses USING btree (analista_id);
CREATE INDEX idx_analyses_aprovado_por ON public.analyses USING btree (aprovado_por);
CREATE INDEX idx_analyses_created_by ON public.analyses USING btree (created_by);
CREATE INDEX idx_analyses_liberado_por ON public.analyses USING btree (liberado_por);
CREATE INDEX idx_analyses_org_date ON public.analyses USING btree (organization_id, data_analise);
CREATE INDEX idx_analyses_organization_id ON public.analyses USING btree (organization_id);
CREATE INDEX idx_analyses_standard_curve_id ON public.analyses USING btree (standard_curve_id);
CREATE INDEX idx_analyses_status ON public.analyses USING btree (status);
CREATE INDEX idx_agr_analysis_id ON public.analysis_gradation_results USING btree (analysis_id);
CREATE INDEX idx_agr_sieve_id ON public.analysis_gradation_results USING btree (sieve_id);
CREATE INDEX idx_amg_analysis_material_id ON public.analysis_material_gradations USING btree (analysis_material_id);
CREATE INDEX idx_amg_sieve_id ON public.analysis_material_gradations USING btree (sieve_id);
CREATE INDEX idx_analysis_materials_analysis_id ON public.analysis_materials USING btree (analysis_id);
CREATE INDEX idx_analysis_materials_material_id ON public.analysis_materials USING btree (material_id);
CREATE INDEX idx_dosage_experiment_materials_experiment ON public.dosage_experiment_materials USING btree (experiment_id);
CREATE INDEX idx_dosage_experiments_org ON public.dosage_experiments USING btree (organization_id);
CREATE INDEX idx_dosage_experiments_status ON public.dosage_experiments USING btree (status);
CREATE INDEX idx_material_brands_org_tipo ON public.material_brands USING btree (organization_id, tipo);
CREATE INDEX idx_material_gradations_sieve_id ON public.material_gradations USING btree (sieve_id);
CREATE INDEX idx_materials_created_by ON public.materials USING btree (created_by);
CREATE INDEX idx_materials_organization_id ON public.materials USING btree (organization_id);
CREATE INDEX idx_monthly_reports_org_period ON public.monthly_reports USING btree (organization_id, ano, mes);
CREATE INDEX idx_notifications_lida ON public.notifications USING btree (lida) WHERE (lida = false);
CREATE INDEX idx_notifications_organization_id ON public.notifications USING btree (organization_id);
CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);
CREATE INDEX idx_production_batches_analysis_id ON public.production_batches USING btree (analysis_id);
CREATE INDEX idx_production_batches_created_by ON public.production_batches USING btree (created_by);
CREATE INDEX idx_production_batches_operador_id ON public.production_batches USING btree (operador_id);
CREATE INDEX idx_production_batches_organization_id ON public.production_batches USING btree (organization_id);
CREATE INDEX idx_production_batches_status ON public.production_batches USING btree (status);
CREATE INDEX idx_products_organization_id ON public.products USING btree (organization_id);
CREATE INDEX idx_profiles_organization_id ON public.profiles USING btree (organization_id);
CREATE INDEX idx_quality_reports_analysis_id ON public.quality_reports USING btree (analysis_id);
CREATE INDEX idx_quality_reports_batch_id ON public.quality_reports USING btree (batch_id);
CREATE INDEX idx_quality_reports_emitido_por ON public.quality_reports USING btree (emitido_por);
CREATE INDEX idx_quality_reports_organization_id ON public.quality_reports USING btree (organization_id);
CREATE INDEX idx_rupture_samples_registrado_por ON public.rupture_samples USING btree (registrado_por);
CREATE INDEX idx_rupture_samples_test_id ON public.rupture_samples USING btree (test_id);
CREATE INDEX idx_rupture_schedules_batch_id ON public.rupture_schedules USING btree (batch_id);
CREATE INDEX idx_rupture_schedules_data_prevista ON public.rupture_schedules USING btree (data_prevista);
CREATE INDEX idx_rupture_schedules_responsavel_id ON public.rupture_schedules USING btree (responsavel_id);
CREATE INDEX idx_rupture_schedules_status ON public.rupture_schedules USING btree (status);
CREATE INDEX idx_rupture_tests_schedule_id ON public.rupture_tests USING btree (schedule_id);
CREATE INDEX idx_standard_curve_items_sieve_id ON public.standard_curve_items USING btree (sieve_id);
CREATE INDEX idx_standard_curves_created_by ON public.standard_curves USING btree (created_by);
CREATE INDEX idx_standard_curves_organization_id ON public.standard_curves USING btree (organization_id);
CREATE INDEX idx_user_invites_convidado_por ON public.user_invites USING btree (convidado_por);
CREATE INDEX idx_user_invites_organization_id ON public.user_invites USING btree (organization_id);
CREATE INDEX idx_webhook_configs_created_by ON public.webhook_configs USING btree (created_by);
CREATE INDEX idx_webhook_configs_organization_id ON public.webhook_configs USING btree (organization_id);
CREATE INDEX idx_webhook_logs_webhook_id ON public.webhook_logs USING btree (webhook_id);

ALTER TABLE public."analyses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."analysis_dosage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."analysis_gradation_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."analysis_material_gradations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."analysis_materials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."dosage_experiment_materials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."dosage_experiments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."granulometry_presets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."material_brands" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."material_gradations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."materials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."monthly_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."notification_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."production_batches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."quality_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."rupture_samples" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."rupture_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."rupture_tests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."sieves" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."standard_curve_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."standard_curves" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."technical_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_invites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."webhook_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."webhook_logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON public."analyses" AS PERMISSIVE FOR ALL TO authenticated USING ((organization_id = my_org_id())) WITH CHECK ((organization_id = my_org_id()));
CREATE POLICY "org_isolation" ON public."analysis_dosage" AS PERMISSIVE FOR ALL TO authenticated USING ((analysis_id IN ( SELECT analyses.id
   FROM analyses
  WHERE (analyses.organization_id = my_org_id())))) WITH CHECK ((analysis_id IN ( SELECT analyses.id
   FROM analyses
  WHERE (analyses.organization_id = my_org_id()))));
CREATE POLICY "org_isolation" ON public."analysis_gradation_results" AS PERMISSIVE FOR ALL TO authenticated USING ((analysis_id IN ( SELECT analyses.id
   FROM analyses
  WHERE (analyses.organization_id = my_org_id())))) WITH CHECK ((analysis_id IN ( SELECT analyses.id
   FROM analyses
  WHERE (analyses.organization_id = my_org_id()))));
CREATE POLICY "org_isolation" ON public."analysis_material_gradations" AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM (analysis_materials am
     JOIN analyses a ON ((am.analysis_id = a.id)))
  WHERE ((am.id = analysis_material_gradations.analysis_material_id) AND (a.organization_id = my_org_id()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (analysis_materials am
     JOIN analyses a ON ((am.analysis_id = a.id)))
  WHERE ((am.id = analysis_material_gradations.analysis_material_id) AND (a.organization_id = my_org_id())))));
CREATE POLICY "org_isolation" ON public."analysis_materials" AS PERMISSIVE FOR ALL TO authenticated USING ((analysis_id IN ( SELECT analyses.id
   FROM analyses
  WHERE (analyses.organization_id = my_org_id())))) WITH CHECK ((analysis_id IN ( SELECT analyses.id
   FROM analyses
  WHERE (analyses.organization_id = my_org_id()))));
CREATE POLICY "org_isolation" ON public."dosage_experiment_materials" AS PERMISSIVE FOR ALL TO public USING ((experiment_id IN ( SELECT dosage_experiments.id
   FROM dosage_experiments
  WHERE (dosage_experiments.organization_id = my_org_id()))));
CREATE POLICY "org_isolation" ON public."dosage_experiments" AS PERMISSIVE FOR ALL TO public USING ((organization_id = my_org_id()));
CREATE POLICY "org_members_can_manage_presets" ON public."granulometry_presets" AS PERMISSIVE FOR ALL TO public USING ((organization_id = ( SELECT profiles.organization_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));
CREATE POLICY "org_isolation" ON public."material_brands" AS PERMISSIVE FOR ALL TO public USING ((organization_id = my_org_id()));
CREATE POLICY "org_isolation" ON public."material_gradations" AS PERMISSIVE FOR ALL TO authenticated USING ((material_id IN ( SELECT materials.id
   FROM materials
  WHERE (materials.organization_id = my_org_id())))) WITH CHECK ((material_id IN ( SELECT materials.id
   FROM materials
  WHERE (materials.organization_id = my_org_id()))));
CREATE POLICY "org_isolation" ON public."materials" AS PERMISSIVE FOR ALL TO authenticated USING ((organization_id = my_org_id())) WITH CHECK ((organization_id = my_org_id()));
CREATE POLICY "org_isolation" ON public."monthly_reports" AS PERMISSIVE FOR ALL TO public USING ((organization_id = my_org_id()));
CREATE POLICY "own_preferences" ON public."notification_preferences" AS PERMISSIVE FOR ALL TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "own_notifications" ON public."notifications" AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "own_notifications_update" ON public."notifications" AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "org_own" ON public."organizations" AS PERMISSIVE FOR SELECT TO authenticated USING ((id = my_org_id()));
CREATE POLICY "org_isolation" ON public."production_batches" AS PERMISSIVE FOR ALL TO authenticated USING ((organization_id = my_org_id())) WITH CHECK ((organization_id = my_org_id()));
CREATE POLICY "org_isolation" ON public."products" AS PERMISSIVE FOR ALL TO authenticated USING ((organization_id = my_org_id())) WITH CHECK ((organization_id = my_org_id()));
CREATE POLICY "admin_profile_update" ON public."profiles" AS PERMISSIVE FOR UPDATE TO authenticated USING (((my_org_id() = organization_id) AND (my_role() = ANY (ARRAY['admin'::text, 'gestor'::text, 'ADMIN'::text])))) WITH CHECK (((my_org_id() = organization_id) AND (my_role() = ANY (ARRAY['admin'::text, 'gestor'::text, 'ADMIN'::text]))));
CREATE POLICY "admin_update_org_profiles" ON public."profiles" AS PERMISSIVE FOR UPDATE TO public USING (((organization_id = my_org_id()) AND (my_role() = 'admin'::text)));
CREATE POLICY "own_profile_update" ON public."profiles" AS PERMISSIVE FOR UPDATE TO public USING ((id = auth.uid()));
CREATE POLICY "same_org_profiles" ON public."profiles" AS PERMISSIVE FOR SELECT TO authenticated USING ((organization_id = my_org_id()));
CREATE POLICY "org_isolation" ON public."quality_reports" AS PERMISSIVE FOR ALL TO authenticated USING ((organization_id = my_org_id())) WITH CHECK ((organization_id = my_org_id()));
CREATE POLICY "org_isolation" ON public."rupture_samples" AS PERMISSIVE FOR ALL TO authenticated USING ((test_id IN ( SELECT rt.id
   FROM ((rupture_tests rt
     JOIN rupture_schedules rs ON ((rs.id = rt.schedule_id)))
     JOIN production_batches pb ON ((pb.id = rs.batch_id)))
  WHERE (pb.organization_id = my_org_id())))) WITH CHECK ((test_id IN ( SELECT rt.id
   FROM ((rupture_tests rt
     JOIN rupture_schedules rs ON ((rs.id = rt.schedule_id)))
     JOIN production_batches pb ON ((pb.id = rs.batch_id)))
  WHERE (pb.organization_id = my_org_id()))));
CREATE POLICY "org_isolation" ON public."rupture_schedules" AS PERMISSIVE FOR ALL TO authenticated USING ((batch_id IN ( SELECT production_batches.id
   FROM production_batches
  WHERE (production_batches.organization_id = my_org_id())))) WITH CHECK ((batch_id IN ( SELECT production_batches.id
   FROM production_batches
  WHERE (production_batches.organization_id = my_org_id()))));
CREATE POLICY "org_isolation" ON public."rupture_tests" AS PERMISSIVE FOR ALL TO authenticated USING ((schedule_id IN ( SELECT rs.id
   FROM (rupture_schedules rs
     JOIN production_batches pb ON ((pb.id = rs.batch_id)))
  WHERE (pb.organization_id = my_org_id())))) WITH CHECK ((schedule_id IN ( SELECT rs.id
   FROM (rupture_schedules rs
     JOIN production_batches pb ON ((pb.id = rs.batch_id)))
  WHERE (pb.organization_id = my_org_id()))));
CREATE POLICY "public_read" ON public."sieves" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "delete_standard_curve_items" ON public."standard_curve_items" AS PERMISSIVE FOR DELETE TO public USING ((curve_id IN ( SELECT standard_curves.id
   FROM standard_curves
  WHERE ((standard_curves.organization_id = my_org_id()) AND (standard_curves.is_system = false)))));
CREATE POLICY "select_standard_curve_items" ON public."standard_curve_items" AS PERMISSIVE FOR SELECT TO public USING ((curve_id IN ( SELECT standard_curves.id
   FROM standard_curves
  WHERE ((standard_curves.organization_id = my_org_id()) OR (standard_curves.is_system = true)))));
CREATE POLICY "write_standard_curve_items" ON public."standard_curve_items" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((curve_id IN ( SELECT standard_curves.id
   FROM standard_curves
  WHERE (standard_curves.organization_id = my_org_id()))));
CREATE POLICY "delete_standard_curves" ON public."standard_curves" AS PERMISSIVE FOR DELETE TO public USING (((organization_id = my_org_id()) AND (is_system = false)));
CREATE POLICY "modify_standard_curves" ON public."standard_curves" AS PERMISSIVE FOR UPDATE TO public USING ((organization_id = my_org_id()));
CREATE POLICY "select_standard_curves" ON public."standard_curves" AS PERMISSIVE FOR SELECT TO public USING (((organization_id = my_org_id()) OR (is_system = true)));
CREATE POLICY "write_standard_curves" ON public."standard_curves" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((organization_id = my_org_id()));
CREATE POLICY "org_gestor_delete" ON public."technical_settings" AS PERMISSIVE FOR DELETE TO authenticated USING (((organization_id = my_org_id()) AND (my_role() = ANY (ARRAY['admin'::text, 'gestor'::text]))));
CREATE POLICY "org_gestor_update" ON public."technical_settings" AS PERMISSIVE FOR UPDATE TO authenticated USING (((organization_id = my_org_id()) AND (my_role() = ANY (ARRAY['admin'::text, 'gestor'::text])))) WITH CHECK (((organization_id = my_org_id()) AND (my_role() = ANY (ARRAY['admin'::text, 'gestor'::text]))));
CREATE POLICY "org_gestor_write" ON public."technical_settings" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((organization_id = my_org_id()) AND (my_role() = ANY (ARRAY['admin'::text, 'gestor'::text]))));
CREATE POLICY "org_read" ON public."technical_settings" AS PERMISSIVE FOR SELECT TO authenticated USING ((organization_id = my_org_id()));
CREATE POLICY "org_isolation" ON public."user_invites" AS PERMISSIVE FOR ALL TO authenticated USING ((organization_id = my_org_id())) WITH CHECK ((organization_id = my_org_id()));
CREATE POLICY "webhook_admin_delete" ON public."webhook_configs" AS PERMISSIVE FOR DELETE TO authenticated USING (((organization_id = my_org_id()) AND (my_role() = 'admin'::text)));
CREATE POLICY "webhook_admin_insert" ON public."webhook_configs" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((organization_id = my_org_id()) AND (my_role() = 'admin'::text)));
CREATE POLICY "webhook_admin_update" ON public."webhook_configs" AS PERMISSIVE FOR UPDATE TO authenticated USING (((organization_id = my_org_id()) AND (my_role() = 'admin'::text))) WITH CHECK (((organization_id = my_org_id()) AND (my_role() = 'admin'::text)));
CREATE POLICY "webhook_read" ON public."webhook_configs" AS PERMISSIVE FOR SELECT TO authenticated USING ((organization_id = my_org_id()));
CREATE POLICY "org_isolation" ON public."webhook_logs" AS PERMISSIVE FOR ALL TO authenticated USING ((webhook_id IN ( SELECT webhook_configs.id
   FROM webhook_configs
  WHERE (webhook_configs.organization_id = my_org_id())))) WITH CHECK ((webhook_id IN ( SELECT webhook_configs.id
   FROM webhook_configs
  WHERE (webhook_configs.organization_id = my_org_id()))));

CREATE TRIGGER analysis_approved_trigger AFTER UPDATE ON public.analyses FOR EACH ROW EXECUTE FUNCTION on_analysis_approved();
CREATE TRIGGER set_updated_at_analyses BEFORE UPDATE ON public.analyses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_dosage_experiments BEFORE UPDATE ON public.dosage_experiments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_material_brands BEFORE UPDATE ON public.material_brands FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_materials BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_monthly_reports BEFORE UPDATE ON public.monthly_reports FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER batch_created_trigger AFTER INSERT ON public.production_batches FOR EACH ROW EXECUTE FUNCTION on_batch_created();
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_quality_reports BEFORE UPDATE ON public.quality_reports FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER rupture_completed_trigger AFTER UPDATE ON public.rupture_schedules FOR EACH ROW EXECUTE FUNCTION on_rupture_completed();
CREATE TRIGGER set_updated_at_technical_settings BEFORE UPDATE ON public.technical_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

INSERT INTO storage.buckets (id,name,public) VALUES ('quality-reports','quality-reports',true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public can read reports via signed URLs" ON storage.objects FOR SELECT USING ((bucket_id = 'quality-reports'::text));
CREATE POLICY "Users can delete their org reports" ON storage.objects FOR DELETE USING (((bucket_id = 'quality-reports'::text) AND ((storage.foldername(name))[1] = (my_org_id())::text)));
CREATE POLICY "Users can read their org reports" ON storage.objects FOR SELECT USING (((bucket_id = 'quality-reports'::text) AND ((storage.foldername(name))[1] = (my_org_id())::text)));
CREATE POLICY "Users can update their org reports" ON storage.objects FOR UPDATE USING (((bucket_id = 'quality-reports'::text) AND ((storage.foldername(name))[1] = (my_org_id())::text))) WITH CHECK (((bucket_id = 'quality-reports'::text) AND ((storage.foldername(name))[1] = (my_org_id())::text)));
CREATE POLICY "Users can upload to their org folder" ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'quality-reports'::text) AND ((storage.foldername(name))[1] = (my_org_id())::text)));

SELECT cron.schedule('rupture-due-today','0 9 * * *',$job$
    INSERT INTO notifications (organization_id, user_id, tipo, titulo, mensagem, link, dados)
    SELECT DISTINCT
      pb.organization_id, p.id, 'rupture_due_today',
      'Rompimento hoje: Lote ' || pb.batch_code,
      'O lote ' || pb.batch_code || ' tem rompimento de ' || rs.idade_dias || ' dias previsto para hoje.',
      '/ruptures',
      jsonb_build_object('schedule_id', rs.id, 'batch_code', pb.batch_code, 'idade_dias', rs.idade_dias)
    FROM rupture_schedules rs
    JOIN production_batches pb ON pb.id = rs.batch_id
    JOIN profiles p ON p.organization_id = pb.organization_id
    WHERE rs.data_prevista = CURRENT_DATE AND rs.status = 'pendente'
      AND p.role IN ('admin', 'gestor', 'laboratorio') AND p.ativo = true;
  $job$);
SELECT cron.schedule('rupture-overdue','0 10 * * *',$job$
    UPDATE rupture_schedules SET status = 'atrasado'
    WHERE status = 'pendente' AND data_prevista < CURRENT_DATE;

    INSERT INTO notifications (organization_id, user_id, tipo, titulo, mensagem, link, dados)
    SELECT DISTINCT
      pb.organization_id, p.id, 'rupture_overdue',
      'Rompimento em atraso: Lote ' || pb.batch_code,
      'O lote ' || pb.batch_code || ' tem rompimento de ' || rs.idade_dias || ' dias em atraso.',
      '/ruptures',
      jsonb_build_object('schedule_id', rs.id, 'batch_code', pb.batch_code, 'idade_dias', rs.idade_dias)
    FROM rupture_schedules rs
    JOIN production_batches pb ON pb.id = rs.batch_id
    JOIN profiles p ON p.organization_id = pb.organization_id
    WHERE rs.status = 'atrasado' AND rs.data_prevista >= CURRENT_DATE - INTERVAL '1 day'
      AND p.role IN ('admin', 'gestor') AND p.ativo = true;
  $job$);
