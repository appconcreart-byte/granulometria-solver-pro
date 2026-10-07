# Tema Concreart (cores azuis) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a identidade de cores do app (vermelho do Laje e Forro) pelo azul-marinho da Concreart, sem alterar componentes, lógica, tabelas ou banco.

**Architecture:** As cores do app vêm de variáveis CSS em `src/index.css`, lidas pelo `tailwind.config.ts`. A troca principal é só trocar os valores dessas variáveis. Depois ajustamos os poucos pontos com cor fixa no código (gráficos e PDF). Tudo acontece em um branch separado, `tema-concreart`.

**Tech Stack:** Vite, React, TypeScript, Tailwind, shadcn/ui, Recharts, jsPDF, Vitest.

**Spec:** Conversa de 2026-10-03 (análise de `concreartms.com.br` e prévia em https://claude.ai/artifact/TMmSfRLwqsjFr5KEWX5t8X). Não há documento de spec separado.

## Global Constraints

- Não alterar lógica, componentes, nomes de variáveis, nomes de constantes, tabelas, schema ou Supabase. Só valores de cor.
- Fonte continua **Poppins**. Não trocar para Montserrat.
- Logo (`src/assets/logo-lajeforro.png`), lettering, favicon e título da aba (`Lajeforro | Laboratório`) não mudam.
- Cores semânticas continuam como estão: `destructive`, `success`, `warning`, `info`, classes `red-*` de erro/atraso/crítico, status do PDF aprovado/reprovado.
- Cores da Concreart (do CSS do site): `#0F2548` primária, `#08182D` primária escura, `#2E5499` azul médio, `#3D6FD4` azul vivo, `#E8EEF9` azul suave, `#F4F6F9` e `#EEF2F7` fundos, `#333333` texto, `#5C6570` texto mudo.
- Tema claro: botão principal marinho `#0F2548`; azul vivo `#3D6FD4` só em foco (`--ring`) e destaques secundários.
- Tema escuro: fundo `#08182D`, cards `#0F2548`, botão principal azul vivo `#3D6FD4`.
- Não commitar em `main`. Todo o trabalho vai no branch `tema-concreart`.

## Review Focus

- Gráficos ficarem vermelhos no tema azul porque usam cor fixa (Dashboard, CostReportPage, RuptureDetailPage). Esperado: nenhum gráfico de marca em vermelho.
- Botão principal sumir no escuro por contraste. Esperado: botão `#3D6FD4` legível sobre `#08182D`.
- PDF do relatório sair com cabeçalho vermelho. Esperado: cabeçalho marinho, com status de fora da faixa ainda em vermelho.
- Alertas de erro e atraso ficarem azuis por engano. Esperado: continuam vermelhos.
- Badge de perfil ADMIN colidir com PRODUCAO (azul). Esperado: ADMIN continua vermelho, pois cada perfil tem cor própria.

Observação: o app não tem seletor de tema escuro hoje (nenhum `ThemeProvider` ou `setTheme` em `src`). O bloco `.dark` só vale se a classe `dark` for aplicada. Mesmo assim ele é atualizado para o tema ficar completo.

---

### Task 0: Branch e linha de base

**Files:** nenhum arquivo alterado.

- [ ] **Step 1: Criar o branch**

Run: `git checkout -b tema-concreart`
Expected: `Switched to a new branch 'tema-concreart'`

- [ ] **Step 2: Instalar dependências** (a pasta `node_modules` não existe)

Run: `npm install`
Expected: termina sem erro.

- [ ] **Step 3: Registrar a linha de base**

Run: `npm run build` e depois `npm test`
Expected: anote o resultado de cada um. Se algo já falhar aqui, registre no relatório e não corrija: a falha não é do tema.

---

### Task 1: Tokens de cor (claro e escuro)

**Files:**
- Modify: `src/index.css` (blocos `:root` e `.dark`, linhas 8-121)

**Interfaces:**
- Consumes: nomes de variáveis já existentes (`--primary`, `--ring`, `--chart-primary`, `--sidebar-*` etc.).
- Produces: as mesmas variáveis com valores azuis. Nenhum nome muda.

- [ ] **Step 1: Trocar o bloco `:root`**

Substituir os valores abaixo (manter `--font-sans`, `--radius`, `--destructive*`, `--success*`, `--warning*`, `--info*`, `--chart-amber`, `--chart-green`, `--chart-slate` como estão):

```css
    /* Concreart blue palette */
    --background: 216 29% 97%;
    --foreground: 0 0% 20%;

    --card: 0 0% 100%;
    --card-foreground: 0 0% 20%;

    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 20%;

    --primary: 217 66% 17%;
    --primary-foreground: 0 0% 100%;

    --secondary: 213 36% 95%;
    --secondary-foreground: 217 66% 17%;

    --muted: 213 36% 95%;
    --muted-foreground: 213 10% 40%;

    --accent: 219 58% 94%;
    --accent-foreground: 219 54% 39%;

    --border: 214 14% 90%;
    --input: 214 14% 90%;
    --ring: 220 64% 53%;

    --chart-primary: 217 66% 17%;
    --chart-primary-light: 220 64% 53%;

    --sidebar-background: 0 0% 100%;
    --sidebar-foreground: 0 0% 20%;
    --sidebar-primary: 217 66% 17%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 219 58% 94%;
    --sidebar-accent-foreground: 219 54% 39%;
    --sidebar-border: 214 14% 92%;
    --sidebar-ring: 220 64% 53%;
```

- [ ] **Step 2: Trocar o bloco `.dark`**

Manter `--destructive*`, `--success*`, `--warning*`, `--info*` como estão:

```css
    --background: 214 70% 10%;
    --foreground: 219 51% 93%;

    --card: 217 66% 17%;
    --card-foreground: 219 51% 93%;

    --popover: 217 66% 17%;
    --popover-foreground: 219 51% 93%;

    --primary: 220 64% 53%;
    --primary-foreground: 0 0% 100%;

    --secondary: 217 50% 21%;
    --secondary-foreground: 219 51% 93%;

    --muted: 217 50% 21%;
    --muted-foreground: 217 26% 67%;

    --accent: 220 55% 24%;
    --accent-foreground: 220 76% 75%;

    --border: 217 40% 24%;
    --input: 217 40% 24%;
    --ring: 220 64% 53%;

    --sidebar-background: 216 71% 15%;
    --sidebar-foreground: 217 26% 67%;
    --sidebar-primary: 220 64% 53%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 220 55% 24%;
    --sidebar-accent-foreground: 220 76% 75%;
    --sidebar-border: 217 40% 24%;
    --sidebar-ring: 220 64% 53%;
```

- [ ] **Step 3: Verificar que nenhum valor vermelho restou nas variáveis**

Run: `grep -nE "^\s+--(background|foreground|card|popover|primary|secondary|muted|accent|border|input|ring|sidebar-[a-z-]+|chart-primary[a-z-]*):\s+0 " src/index.css`
Expected: nenhuma linha, exceto valores `0 0% ...` (cinza neutro de `--sidebar-background`, por exemplo). Linhas com saturação diferente de 0% e matiz 0 não podem existir.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: termina sem erro novo em relação à linha de base.

- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "feat(tema): troca variaveis de cor para azul Concreart"
```

---

### Task 2: Cores fixas em gráficos

**Files:**
- Modify: `src/pages/Dashboard.tsx:63-65, 324, 327, 419, 443`
- Modify: `src/pages/CostReportPage.tsx:34-37, 223, 239`
- Modify: `src/pages/RuptureDetailPage.tsx:792`

**Interfaces:**
- Consumes: as constantes `BRAND_RED`, `BRAND_RED_MED`, `BRAND_RED_LIGHT` e `PIE_COLORS` já usadas nos gráficos.
- Produces: as mesmas constantes, com os mesmos nomes e valores azuis. Os nomes continuam `BRAND_RED*` para o diff ficar só em valores.

- [ ] **Step 1: Dashboard.tsx, constantes (linhas 63-65)**

```tsx
const BRAND_RED        = "hsl(217, 66%, 17%)";  // marinho — cor principal Concreart
const BRAND_RED_MED    = "hsl(220, 64%, 53%)";  // azul vivo
const BRAND_RED_LIGHT  = "hsl(219, 70%, 78%)";  // azul claro
```

- [ ] **Step 2: Dashboard.tsx, grade e cursor dos gráficos**

Nas linhas 324 e 419 trocar `stroke="hsl(0,10%,93%)"` por `stroke="hsl(214,14%,93%)"`. Nas linhas 327 e 443 trocar `cursor={{ fill: "hsl(0,10%,96%)" }}` por `cursor={{ fill: "hsl(214,29%,96%)" }}`. Os cinzas neutros `hsl(0,0%,50%)` ficam como estão.

- [ ] **Step 3: CostReportPage.tsx, constantes e grade**

Linhas 34-37:

```tsx
const BRAND_RED = "hsl(217, 66%, 17%)";
const BRAND_RED_MED = "hsl(220, 64%, 53%)";
const BRAND_RED_LIGHT = "hsl(219, 70%, 78%)";
const PIE_COLORS = [BRAND_RED, BRAND_RED_MED, BRAND_RED_LIGHT, "hsl(219, 58%, 88%)", "hsl(219, 40%, 93%)"];
```

Linha 223: `stroke="hsl(0,10%,93%)"` vira `stroke="hsl(214,14%,93%)"`. Linha 239: `cursor={{ fill: "hsl(0,10%,96%)" }}` vira `cursor={{ fill: "hsl(214,29%,96%)" }}`.

- [ ] **Step 4: RuptureDetailPage.tsx, marcador de dispersão (linha 792)**

Trocar as duas ocorrências de `#d7263d` na linha por `#0f2548`. O gráfico de linha `#2563eb` e as grades `#e5e7eb` ficam como estão.

- [ ] **Step 5: Verificar**

Run: `grep -rnE "hsl\(\s*0[ ,]+[0-9]+%[ ,]+(3[0-9]|[4-9][0-9])%|hsl\(0,10%|d7263d" src`
Expected: nenhuma linha.

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: sem erro novo.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Dashboard.tsx src/pages/CostReportPage.tsx src/pages/RuptureDetailPage.tsx
git commit -m "feat(tema): cores de graficos em azul Concreart"
```

---

### Task 3: PDF do relatório

**Files:**
- Modify: `src/lib/pdf-generator.ts:29, 63, 66, 85, 114, 172, 245`

**Interfaces:**
- Consumes: nada de outras tasks.
- Produces: PDF com cabeçalho e títulos de seção marinho.

- [ ] **Step 1: Trocar o vermelho da marca**

Trocar `[153, 27, 27]` por `[15, 37, 72]` nas linhas 29 (`liberado_producao`), 85, 114, 172 e 245. Na linha 63 trocar `doc.setFillColor(153, 27, 27); // primary red` por `doc.setFillColor(15, 37, 72); // primary navy`. Na linha 66 trocar `[255, 220, 220]` por `[200, 215, 240]` (subtítulo claro sobre o cabeçalho).

Não alterar: linha 152 (`[255, 240, 240]`, fundo de linha fora da faixa), linha 159 (`[220, 50, 50]`, valor fora da faixa) e linha 28 (`[34, 139, 34]`, aprovado). São semânticas.

- [ ] **Step 2: Verificar**

Run: `grep -n "153, 27, 27\|255, 220, 220" src/lib/pdf-generator.ts`
Expected: nenhuma linha.

- [ ] **Step 3: Build e testes**

Run: `npm run build` e `npm test`
Expected: igual à linha de base.

- [ ] **Step 4: Commit**

```bash
git add src/lib/pdf-generator.ts
git commit -m "feat(tema): cabecalho do PDF em azul Concreart"
```

---

### Task 4: Revisão final e conferência visual

**Files:** nenhum arquivo alterado, a menos que a revisão aponte um resto de vermelho de marca.

- [ ] **Step 1: Conferir que as classes vermelhas restantes são semânticas**

Run: `grep -rnE "(bg|text|border|ring)-(red|rose)-[0-9]+" src`
Expected: só os usos de erro, atraso, crítico e perfil ADMIN já listados: `RealtimeDashboardMetrics.tsx` (atrasados), `ViewRuptureResultModal.tsx` (CV acima de 10), `UsersTab.tsx` (ADMIN, cada perfil tem cor própria), `toast.tsx` (destructive), `AnalyticsPage.tsx` (crítico), `NewAnalysisPage.tsx` (erro), `RupturesPage.tsx` (atrasado). Nenhuma troca nesta task.

- [ ] **Step 2: Rodar tudo**

Run: `npm run build`, `npm test`, `npm run lint`
Expected: sem erro novo em relação à linha de base da Task 0.

- [ ] **Step 3: Conferência visual (feita por você no navegador)**

Run: `npm run dev` e abrir as telas Dashboard, Nova análise, Rupturas, Relatório de custos, Configurações e o PDF de uma análise.
Expected: sem vermelho de marca; botões marinhos; foco com anel azul vivo; erros e atrasos ainda vermelhos. O logo continua vermelho, pois foi decisão manter.

- [ ] **Step 4: Decidir o merge**

Se tudo estiver certo, você escolhe: manter o branch `tema-concreart` como versão Concreart, ou fazer merge em `main`.

---

## Self-Review

- **Cobertura:** cores claro e escuro (Task 1), gráficos (Task 2), PDF (Task 3), revisão de `red-*` e verificação (Task 4). Fonte, logo, favicon e título não entram, por decisão sua. O Excel não tem cor de marca (só negrito), então não entra.
- **Placeholders:** nenhum. Todos os valores de cor estão escritos.
- **Consistência:** nomes `BRAND_RED*` e `PIE_COLORS` mantidos. Mesmos valores em Dashboard e CostReportPage.
- **Review Focus:** cobertos por verificação em Task 2 (gráficos), Task 1 (contraste do botão escuro, pela paleta), Task 3 (PDF) e Task 4 (erros e ADMIN).
