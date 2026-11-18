# Controle de Moldagem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar data, hora, temperatura, tempo (sol/chuva) e slump da moldagem no lote, a partir da tela de Lançamento de Rompimento, e mostrar esses dados no laudo (PDF) e no relatório mensal.

**Architecture:** Cinco colunas opcionais em `production_batches` (abordagem A do spec). Um módulo puro `src/lib/moldagem.ts` concentra tipos, validação e formatação. Um cartão novo (`MoldagemCard`) entra em `RuptureDetailPage` e grava só o lote, por um hook próprio. O laudo ganha um bloco `MoldagemLaudoBlock`, e o relatório mensal acrescenta um resumo às linhas de lotes reprovados ou com ressalva.

**Tech Stack:** React 18, TypeScript, Supabase (Postgres + supabase-js), TanStack Query, shadcn/Radix, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-11-18-controle-moldagem-design.md`

## Global Constraints

- Colunas de `production_batches` (nullable): `data_moldagem DATE`, `hora_moldagem TIME`, `temperatura_c NUMERIC(4,1)`, `tempo_clima TEXT` (`'sol'` | `'chuva'`), `slump_cm NUMERIC(4,1)`.
- Validação no banco: temperatura entre -10 e 60; slump maior ou igual a 0. A mesma regra vale no formulário.
- Todos os campos são opcionais e aparecem para todos os tipos de amostra (bloco, paver, cp, laje).
- Data e Hora começam com a data e a hora da produção do lote (`produced_at`, fuso local), editáveis. Só viram dado salvo ao clicar em **Salvar Moldagem**. Nunca alterar `produced_at`.
- "Salvar Moldagem" grava só as cinco colunas do lote. Não exige Responsável nem amostras e não toca em amostras, resultados ou responsável. O salvar do rompimento não escreve nessas colunas.
- A edição do cartão segue `isReadOnly` de `RuptureDetailPage` (VENDAS, GERENTE e PRODUCAO só visualizam; rompimento concluído só o ADMIN edita).
- Tempo tem só duas opções, "Sol" e "Chuva".
- Laudo: bloco "Moldagem" em "Dados Gerais", nas versões interna e cliente. Campo vazio aparece como "—".
- Relatório mensal: nas linhas de lotes reprovados ou com ressalva, acrescentar ` (moldagem: 28,5 °C, chuva, slump 11 cm)` com só os campos preenchidos. Sem dados, a linha continua igual.
- Migration nova é a `033`. Não há acesso ao Supabase na sessão: o usuário aplica a migration no banco.
- Git: o repositório está na branch `tema-concreart` com alterações não relacionadas e não commitadas (`src/lib/dateFilter.ts`, `src/pages/RupturesPage.tsx`, `src/test/date-filter.test.ts`). Nunca commitar em `main`. Fazer `git add` só dos caminhos listados em cada tarefa. Mensagens de commit em português, no padrão `feat(moldagem): ...`, terminando com a linha `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Comandos rodam em `granulometria-solver-pro/`.

## Review Focus

- Vírgula decimal ("19,2", como no placeholder) deve ser aceita e gravada como 19.2. Teste na Task 1.
- Temperatura fora de -10 a 60 ou slump negativo mostram erro e não gravam. Testes nas Tasks 1 e 3.
- Lote antigo sem moldagem (todas as colunas nulas) não pode quebrar laudo nem mensal: laudo mostra "—", mensal não muda a linha. Testes nas Tasks 4 e 5.
- Lote produzido perto da meia-noite (ex.: 23:30 local) deve pré-preencher a data local, não a data UTC. Teste na Task 1.
- O banco devolve `TIME` como "11:20:00", e `<input type="time">` espera "11:20". Teste na Task 1.

---

### Task 1: Módulo puro `moldagem.ts`

**Files:**
- Create: `src/lib/moldagem.ts`
- Test: `src/test/moldagem.test.ts`

**Interfaces:**
- Produces (exports de `src/lib/moldagem.ts`, usados por todas as tarefas seguintes):
  - `TEMPO_CLIMA = ["sol", "chuva"] as const`; `type TempoClima`; `TEMPO_CLIMA_LABEL: Record<TempoClima, string>` (`Sol`, `Chuva`)
  - `MOLDAGEM_SELECT_COLUMNS: string` = `"data_moldagem, hora_moldagem, temperatura_c, tempo_clima, slump_cm"`
  - `interface MoldagemColumns { data_moldagem: string | null; hora_moldagem: string | null; temperatura_c: number | null; tempo_clima: TempoClima | null; slump_cm: number | null }`
  - `interface MoldagemForm { data: string; hora: string; temperatura: string; tempo: TempoClima | ""; slump: string }`
  - `moldagemFormFromBatch(batch: { produced_at: string } & Partial<MoldagemColumns>): MoldagemForm`
  - `moldagemColumnsFromForm(form: MoldagemForm): { ok: true; value: MoldagemColumns } | { ok: false; error: string }`
  - `formatNumeroBR(n: number): string` (ponto vira vírgula, sem zeros à direita: `28.5` → `"28,5"`, `11` → `"11"`)
  - `formatMoldagemResumo(m: Partial<MoldagemColumns> | null | undefined): string | null`
  - `formatDataHoraMoldagem(m: Partial<MoldagemColumns> | null | undefined): string`

- [ ] **Step 1: Escrever os testes que falham** em `src/test/moldagem.test.ts` (`describe("moldagem")`):
  - `moldagemFormFromBatch` sem dados salvos usa a produção local: `produced_at: new Date(2026, 9, 15, 11, 20).toISOString()` resulta em `data: "2026-10-15"`, `hora: "11:20"`, demais campos `""`.
  - Mesmo teste com `new Date(2026, 9, 15, 23, 30).toISOString()` resulta em `data: "2026-10-15"` (fuso local, não UTC).
  - Com `data_moldagem: "2026-10-14"`, `hora_moldagem: "09:05:00"`, `temperatura_c: 28.5`, `tempo_clima: "chuva"`, `slump_cm: 11`, o form vem `{ data: "2026-10-14", hora: "09:05", temperatura: "28,5", tempo: "chuva", slump: "11" }` (hora sem segundos, números com vírgula).
  - `moldagemColumnsFromForm({ data: "2026-10-15", hora: "11:20", temperatura: "19,2", tempo: "sol", slump: "11" })` resulta em `{ ok: true, value: { data_moldagem: "2026-10-15", hora_moldagem: "11:20", temperatura_c: 19.2, tempo_clima: "sol", slump_cm: 11 } }`.
  - Form todo vazio resulta em `ok: true` com as cinco colunas `null`.
  - `temperatura: "61"` e `temperatura: "-11"` e `temperatura: "abc"` resultam em `{ ok: false, error: "Temperatura deve estar entre -10 e 60 °C" }`. `temperatura: "60"` e `"-10"` são aceitas.
  - `slump: "-1"` e `slump: "x"` resultam em `{ ok: false, error: "Slump deve ser um número maior ou igual a 0" }`. `slump: "0"` é aceito.
  - `temperatura: "19,25"` é arredondada para 1 casa (`19.3`).
  - `formatMoldagemResumo({ temperatura_c: 28.5, tempo_clima: "chuva", slump_cm: 11 })` é `"28,5 °C, chuva, slump 11 cm"`; só `tempo_clima: "sol"` dá `"sol"`; tudo nulo, `null` e `undefined` dão `null`.
  - `formatDataHoraMoldagem({ data_moldagem: "2026-10-15", hora_moldagem: "11:20:00" })` é `"15/10/2026 11:20"`; só data dá `"15/10/2026"`; só hora dá `"11:20"`; nada dá `"—"`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/moldagem.test.ts`
Expected: FAIL (módulo `@/lib/moldagem` não existe).

- [ ] **Step 3: Implementar `src/lib/moldagem.ts`** com as assinaturas acima. Regras: `moldagemFormFromBatch` só pré-preenche data e hora quando `data_moldagem` e `hora_moldagem` são ambos nulos, usando getters locais de `new Date(produced_at)`; data salva vem como está e hora salva é cortada para `HH:mm`. `moldagemColumnsFromForm` troca vírgula por ponto, arredonda para 1 casa, trata campo vazio como `null` e valida os intervalos do spec com as mensagens exatas dos testes. Datas de exibição vêm de `YYYY-MM-DD` por split, sem `new Date`, para não sofrer com fuso.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/moldagem.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/moldagem.ts src/test/moldagem.test.ts
git commit -m "feat(moldagem): modulo de validacao e formatacao dos dados de moldagem"
```

---

### Task 2: Banco, tipos, leituras e hook de gravação

**Files:**
- Create: `supabase/migrations/033_production_batch_moldagem.sql`
- Create: `src/hooks/api/useBatchMoldagem.ts`
- Modify: `src/hooks/api/useProduction.ts:8-27` (interface `DBProductionBatch`)
- Modify: `src/hooks/api/useRuptures.ts:429-435` (select do lote em `useScheduleDetail`)
- Modify: `src/hooks/api/useMonthlyReports.ts:20-27` (select do lote em `useRuptureSchedulesWithTests`)
- Test: `src/test/use-batch-moldagem.test.tsx`

**Interfaces:**
- Consumes: `MoldagemColumns`, `MOLDAGEM_SELECT_COLUMNS` (Task 1).
- Produces: `useSaveBatchMoldagem(): { saveMoldagem: (args: { batchId: string; value: MoldagemColumns }) => Promise<void>; isSaving: boolean }` em `src/hooks/api/useBatchMoldagem.ts`. Depois de gravar, invalida as queries com prefixo `["rupture_schedule_detail"]`, `["production_batches"]`, `["batch_report"]` e `["rupture_schedules_with_tests"]`. Erros do Supabase são lançados (a promise rejeita).
- Produces: `useScheduleDetail(...).data.batch` e `schedules[].batch` do mensal passam a trazer as cinco colunas.

- [ ] **Step 1: Escrever o teste que falha** em `src/test/use-batch-moldagem.test.tsx`, no padrão de `rupture-notifications-sync.test.ts`: `vi.mock("@/lib/supabase", ...)` com a cadeia `from(...).update(...).eq(...).select().single()`, e `renderHook` com `QueryClientProvider`. Casos:
  - `saveMoldagem({ batchId: "b1", value })` chama `from("production_batches")`, `update(value)` (exatamente as cinco colunas) e `eq("id", "b1")`.
  - Depois de gravar, `queryClient.invalidateQueries` foi chamado com cada uma das quatro chaves acima.
  - Se o Supabase devolve `{ error: { message: "x" } }`, a promise de `saveMoldagem` rejeita.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/use-batch-moldagem.test.tsx`
Expected: FAIL (hook não existe).

- [ ] **Step 3: Criar a migration `033_production_batch_moldagem.sql`** no mesmo padrão da `027`: cabeçalho em comentário, `ALTER TABLE production_batches ADD COLUMN IF NOT EXISTS` para as cinco colunas, e constraints recriadas com `DROP CONSTRAINT IF EXISTS` seguido de `ADD CONSTRAINT`: `production_batches_tempo_clima_check`, `production_batches_temperatura_c_check` e `production_batches_slump_cm_check`, cada uma aceitando `NULL`.

- [ ] **Step 4: Implementar o hook** `useSaveBatchMoldagem` com `useMutation` (mesmo padrão de `updateBatchRecipeMutation` em `src/hooks/api/useProduction.ts:186`) e o `onSuccess` descrito em Interfaces.

- [ ] **Step 5: Tipos e selects.** Em `useProduction.ts`, `DBProductionBatch` passa a estender `MoldagemColumns`. Em `useRuptures.ts` (`useScheduleDetail`) e em `useMonthlyReports.ts` (`useRuptureSchedulesWithTests`), acrescentar `${MOLDAGEM_SELECT_COLUMNS}` à lista de colunas do `production_batches`. Não alterar o `getScheduleDetail` interno de `useRuptures()` (não é usado pela tela).

- [ ] **Step 6: Rodar testes e tipos**

Run: `npx vitest run src/test/use-batch-moldagem.test.tsx && npx tsc --noEmit -p tsconfig.app.json`
Expected: testes PASS e `tsc` sem erros.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/033_production_batch_moldagem.sql src/hooks/api/useBatchMoldagem.ts src/hooks/api/useProduction.ts src/hooks/api/useRuptures.ts src/hooks/api/useMonthlyReports.ts src/test/use-batch-moldagem.test.tsx
git commit -m "feat(moldagem): colunas de moldagem no lote, leitura nas telas e hook de gravacao"
```

---

### Task 3: Cartão `MoldagemCard` na tela de rompimento

**Files:**
- Create: `src/components/rupture/MoldagemCard.tsx`
- Modify: `src/pages/RuptureDetailPage.tsx` (imports; chamada do hook junto dos outros hooks, antes do `if (!found) return` da linha 272; handler `handleSaveMoldagem` junto de `handleSave`; cartão logo depois do grid "Data real + Responsável", linha 597, dentro do bloco `!isSemExpediente`)
- Test: `src/test/moldagem-card.test.tsx`

**Interfaces:**
- Consumes: `moldagemFormFromBatch`, `moldagemColumnsFromForm`, `MoldagemColumns`, `TEMPO_CLIMA`, `TEMPO_CLIMA_LABEL` (Task 1); `useSaveBatchMoldagem` (Task 2).
- Produces: `MoldagemCard(props: { batch: { produced_at: string } & Partial<MoldagemColumns>; readOnly: boolean; isSaving?: boolean; onSave: (value: MoldagemColumns) => Promise<void> | void }): JSX.Element`.

- [ ] **Step 1: Escrever os testes que falham** em `src/test/moldagem-card.test.tsx` (render direto do componente, sem Supabase). Use `getByLabelText` com os rótulos "Data", "Hora da Moldagem", "Temperatura (°C)", "Slump Test (cm)":
  - Lote sem moldagem salva, `produced_at: new Date(2026, 9, 15, 11, 20).toISOString()`: Data vale `2026-10-15` e Hora vale `11:20`.
  - Digitar `19,2` em Temperatura e `11` em Slump e clicar em "Salvar Moldagem" chama `onSave` uma vez com `{ data_moldagem: "2026-10-15", hora_moldagem: "11:20", temperatura_c: 19.2, tempo_clima: null, slump_cm: 11 }`.
  - Clicar em "Salvar Moldagem" sem digitar nada chama `onSave` com data e hora pré-preenchidas e o resto `null` (não exige nenhum outro campo).
  - Temperatura `70`: `onSave` não é chamado e aparece um elemento `role="alert"` com "Temperatura deve estar entre -10 e 60 °C".
  - Com `readOnly: true`, os campos ficam `disabled` e o botão "Salvar Moldagem" não existe.
  - Quando a prop `batch` muda para trazer valores salvos (rerender), os campos mostram os valores salvos.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/moldagem-card.test.tsx`
Expected: FAIL (componente não existe).

- [ ] **Step 3: Implementar `MoldagemCard`** seguindo os prints: `Card` com título "Controle de Moldagem", subtítulo em caixa alta pequeno "Dados do lote — iguais em todas as idades de rompimento", grade de 5 campos (`grid-cols-1 md:grid-cols-5`): Data (`type="date"`), Hora da Moldagem (`type="time"`), Temperatura (°C) (`type="text"`, `inputMode="decimal"`, placeholder `Ex: 19,2`), Tempo (sol/chuva) (`Select` com placeholder "Selecione" e as opções de `TEMPO_CLIMA_LABEL`), Slump Test (cm) (`type="text"`, `inputMode="decimal"`, placeholder `Ex: 11`). Botão outline "Salvar Moldagem" com ícone `Save`, alinhado à direita, desabilitado enquanto `isSaving`. Cada `Input` tem `id` e `Label htmlFor`. Erro de validação aparece inline em `role="alert"`. O estado do form é recalculado com `moldagemFormFromBatch` quando mudam `produced_at` ou qualquer coluna de moldagem da prop `batch`. Mesmo estilo de cartão dos blocos de amostra da página (`shadow-sm`, borda à esquerda).

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/moldagem-card.test.tsx`
Expected: PASS.

- [ ] **Step 5: Ligar na página.** Em `RuptureDetailPage`: chamar `const { saveMoldagem, isSaving: isSavingMoldagem } = useSaveBatchMoldagem()` perto da linha 53; criar `handleSaveMoldagem(value: MoldagemColumns)` que chama `saveMoldagem({ batchId: (batch as any).id, value })` e mostra `toast.success("Moldagem salva")` ou, no erro, `console.error` e `toast.error("Erro ao salvar moldagem")`. Renderizar `<MoldagemCard batch={batch as any} readOnly={isReadOnly} isSaving={isSavingMoldagem} onSave={handleSaveMoldagem} />` depois do grid da linha 597. Não alterar `handleSave`, `handleUpdate` nem `handleFinalize`.

- [ ] **Step 6: Tipos e testes**

Run: `npx tsc --noEmit -p tsconfig.app.json && npx vitest run src/test/moldagem-card.test.tsx`
Expected: sem erros de tipo e testes PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/rupture/MoldagemCard.tsx src/pages/RuptureDetailPage.tsx src/test/moldagem-card.test.tsx
git commit -m "feat(moldagem): cartao Controle de Moldagem na tela de lancamento de rompimento"
```

---

### Task 4: Bloco de moldagem no laudo

**Files:**
- Create: `src/components/quality/MoldagemLaudoBlock.tsx`
- Modify: `src/pages/QualityReportPage.tsx` (import; inserir o bloco logo depois da grade "Dados Gerais", que fecha na linha 453)
- Test: `src/test/moldagem-laudo-block.test.tsx`

**Interfaces:**
- Consumes: `MoldagemColumns`, `TEMPO_CLIMA_LABEL`, `formatDataHoraMoldagem`, `formatNumeroBR` (Task 1). O `batch` do laudo já vem com `select *`, então traz as colunas novas.
- Produces: `MoldagemLaudoBlock(props: { batch: Partial<MoldagemColumns>; exporting?: boolean }): JSX.Element`.

- [ ] **Step 1: Escrever os testes que falham** em `src/test/moldagem-laudo-block.test.tsx`:
  - Com `{ data_moldagem: "2026-10-15", hora_moldagem: "11:20:00", temperatura_c: 28.5, tempo_clima: "chuva", slump_cm: 11 }`, aparecem os textos `15/10/2026 11:20`, `28,5 °C`, `Chuva` e `11 cm`, e o título "Moldagem".
  - Com todas as colunas `null` (lote antigo), aparece "—" quatro vezes e nada quebra.
  - Com `slump_cm: 0`, aparece `0 cm` (zero não é tratado como vazio).

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/moldagem-laudo-block.test.tsx`
Expected: FAIL (componente não existe).

- [ ] **Step 3: Implementar `MoldagemLaudoBlock`.** Título "Moldagem" e quatro itens (Data / Hora, Temperatura, Tempo, Slump), com as mesmas classes tipográficas dos itens de "Dados Gerais" (rótulo `text-[10px] uppercase font-black text-muted-foreground`, valor `text-sm font-bold`). O contêiner leva `data-pdf-avoid-break` e as colunas seguem o padrão da página: `exporting ? "grid-cols-4" : "grid-cols-2 md:grid-cols-4"`.

- [ ] **Step 4: Inserir em `QualityReportPage`** logo depois da grade "Dados Gerais", fora de qualquer condição `cliente`, com `<MoldagemLaudoBlock batch={batch} exporting={exporting} />`, para aparecer nas duas versões.

- [ ] **Step 5: Rodar e conferir**

Run: `npx vitest run src/test/moldagem-laudo-block.test.tsx && npx tsc --noEmit -p tsconfig.app.json`
Expected: PASS e `tsc` sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/components/quality/MoldagemLaudoBlock.tsx src/pages/QualityReportPage.tsx src/test/moldagem-laudo-block.test.tsx
git commit -m "feat(moldagem): bloco de moldagem no laudo (versoes interna e cliente)"
```

---

### Task 5: Moldagem no relatório mensal

**Files:**
- Modify: `src/pages/MonthlyReportPage.tsx:69` (exportar `buildSummary`) e `:143-150` (texto das linhas de lotes)
- Test: `src/test/monthly-report-moldagem.test.ts`

**Interfaces:**
- Consumes: `formatMoldagemResumo` (Task 1). Os lotes do mensal já trazem as colunas (Task 2, select de `useRuptureSchedulesWithTests`).
- Produces: `export function buildSummary(...)` com a mesma assinatura de hoje. O export gera só um aviso do `react-refresh/only-export-components` (regra em `warn`), aceitável.

- [ ] **Step 1: Escrever os testes que falham** em `src/test/monthly-report-moldagem.test.ts`. Mockar `@/lib/supabase` (como em `rupture-notifications-sync.test.ts`), `@/lib/pdf-generator` e `@/lib/excel-generator`. Chamar `buildSummary(2026, 10, [], batches, [], [], [])` com lotes de `produced_at: "2026-10-05T15:00:00Z"`:
  - Lote `status: "reprovado"`, `notas: null`, `temperatura_c: 28.5`, `tempo_clima: "chuva"`, `slump_cm: 11`: `naoConformidades[0].descricao` é `"Lote L-1 — reprovado (moldagem: 28,5 °C, chuva, slump 11 cm)"`.
  - Mesmo lote com `notas: "caiu na umidade"`: `"Lote L-1 — reprovado: caiu na umidade (moldagem: 28,5 °C, chuva, slump 11 cm)"`.
  - Lote `status: "aprovado_com_ressalva"` só com `slump_cm: 9`: termina em `"(moldagem: slump 9 cm)"`.
  - Lote reprovado sem nenhum dado de moldagem (colunas `null` ou ausentes): `"Lote L-1 — reprovado"`, sem parênteses.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/monthly-report-moldagem.test.ts`
Expected: FAIL (`buildSummary` não é exportada e o texto não tem moldagem).

- [ ] **Step 3: Implementar.** Exportar `buildSummary`. Na linha que monta `descricao` do lote (`:147`), acrescentar ao final ` (moldagem: ${resumo})` quando `formatMoldagemResumo(b)` não for `null`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/monthly-report-moldagem.test.ts`
Expected: PASS. Se a importação da página falhar no jsdom por causa de outro módulo, acrescentar `vi.mock` desse módulo no teste (sem mover código de lugar).

- [ ] **Step 5: Commit**

```bash
git add src/pages/MonthlyReportPage.tsx src/test/monthly-report-moldagem.test.ts
git commit -m "feat(moldagem): resumo de moldagem nas linhas de lotes reprovados do relatorio mensal"
```

---

### Task 6: Verificação final

**Files:** nenhum arquivo novo.

- [ ] **Step 1: Suíte completa, tipos e build**

Run: `npm test && npx tsc --noEmit -p tsconfig.app.json && npm run build`
Expected: todos os testes passam (os testes anteriores continuam verdes), `tsc` sem erros e build concluído.

- [ ] **Step 2: Conferência manual** (precisa da migration 033 aplicada no Supabase pelo usuário; sem ela o salvar falha):
  - Abrir um rompimento pendente: o cartão aparece abaixo de "Data Real / Responsável", com Data e Hora da produção do lote.
  - Preencher temperatura `19,2`, tempo "Chuva", slump `11` e clicar em "Salvar Moldagem": aparece "Moldagem salva" e nada do rompimento muda.
  - Abrir o rompimento de outra idade do mesmo lote: os valores salvos aparecem.
  - Como perfil de visualização (ex.: GERENTE), o cartão aparece desabilitado e sem botão.
  - Abrir o laudo do lote (versões interna e cliente) e exportar o PDF: o bloco "Moldagem" aparece. Em um lote antigo, aparecem quatro "—".
  - No relatório mensal, um lote reprovado ou com ressalva mostra o resumo de moldagem na linha.

- [ ] **Step 3: Relatar** ao usuário o que foi verificado e o que ficou pendente (aplicar a migration 033).
