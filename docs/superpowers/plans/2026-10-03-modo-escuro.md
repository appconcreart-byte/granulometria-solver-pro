# Modo escuro Concreart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um botão que alterna entre modo claro e escuro no app, com o tema escuro azul-marinho da Concreart, sem alterar lógica, dados ou tabelas.

**Architecture:** O tema escuro já existe como variáveis CSS no bloco `.dark` de `src/index.css`. Falta ligar a classe `dark` no `<html>` com a biblioteca `next-themes` (já instalada), colocar um botão no cabeçalho e ajustar os poucos lugares com cor fixa (`bg-white`, `slate-*`, cores de gráfico). O login fica sempre claro.

**Tech Stack:** React, TypeScript, Tailwind (`darkMode: ["class"]`), next-themes 0.3.0, Recharts, Vitest com Testing Library.

**Spec:** Conversa de 2026-10-03. Decisões do usuário: botão no cabeçalho ao lado do sino; login não precisa de modo escuro; logo claro `LOGOTIPO_04.png` no escuro; o app inicia no claro.

## Global Constraints

- Branch: continuar em `tema-concreart`. Nunca commitar em `main`.
- Não alterar lógica, queries, tabelas, schema ou Supabase. Só estilo, mais o provider e o botão de tema.
- App inicia no **claro** (`defaultTheme="light"`, `enableSystem={false}`). A escolha do usuário fica guardada no navegador (chave `concreart-theme`).
- A rota `/login` é sempre clara, mesmo se a escolha salva for escuro.
- Cores do escuro (já em `.dark`): fundo `#08182D`, cards `#0F2548`, botões `#3D6FD4`.
- Cores semânticas (erro, aviso, sucesso) continuam com o mesmo significado no escuro.
- PDF e Excel não mudam.
- Fonte Poppins não muda.

## Review Focus

- Escolha salva como escuro e abrir `/login`: a tela precisa abrir clara, e ao entrar no app voltar para escuro.
- Primeira visita, sem nada salvo: precisa abrir claro, mesmo com o sistema operacional em modo escuro.
- Logo: no escuro, o texto "CONCREART" não pode sumir (usa o logo claro); no claro, usa o logo atual.
- Gráficos no escuro: barras e linhas de marca visíveis sobre o fundo escuro, sem barra marinho sobre marinho.
- Painéis com `bg-white` ou `slate-*` fixos (tooltips dos gráficos, caixas de aviso, seletores da granulometria): sem retângulo branco e sem texto ilegível no escuro.

---

### Task 1: Provider de tema e botão no cabeçalho

**Files:**
- Create: `src/components/ThemeRoot.tsx`
- Create: `src/components/ThemeToggle.tsx`
- Create: `src/test/theme-toggle.test.tsx`
- Modify: `src/App.tsx` (mover `<Sonner />` para dentro do `ThemeRoot`; envolver as rotas com `ThemeRoot`)
- Modify: `src/components/AppHeader.tsx:10` (botão antes do sino)

**Interfaces:**
- Produces: `ThemeRoot({ children })` e `ThemeToggle()`. A classe `dark` no `<html>` e a chave `concreart-theme` no `localStorage`.

- [ ] **Step 1: Escrever o teste que falha**

`src/test/theme-toggle.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeRoot } from "@/components/ThemeRoot";
import { ThemeToggle } from "@/components/ThemeToggle";

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeRoot>
        <ThemeToggle />
      </ThemeRoot>
    </MemoryRouter>,
  );

describe("modo escuro", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("inicia no claro", () => {
    renderAt("/");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("alterna para escuro e guarda a escolha", () => {
    renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: "Ativar modo escuro" }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("concreart-theme")).toBe("dark");
  });

  it("login fica sempre claro, mesmo com escuro salvo", () => {
    localStorage.setItem("concreart-theme", "dark");
    renderAt("/login");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/theme-toggle.test.tsx`
Expected: FAIL, módulos `ThemeRoot` e `ThemeToggle` não encontrados.

- [ ] **Step 3: Implementar**

`src/components/ThemeRoot.tsx`:

```tsx
import { ThemeProvider } from "next-themes";
import { useLocation } from "react-router-dom";

export function ThemeRoot({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="concreart-theme"
      forcedTheme={pathname === "/login" ? "light" : undefined}
    >
      {children}
    </ThemeProvider>
  );
}
```

`src/components/ThemeToggle.tsx`:

```tsx
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
```

`src/App.tsx`: importar `ThemeRoot`; remover `<Sonner />` de antes do `<BrowserRouter>`; dentro do `<BrowserRouter>`, abrir `<ThemeRoot>` antes de `<AuthProvider>`, colocar `<Sonner />` logo depois da abertura do `ThemeRoot`, e fechar `</ThemeRoot>` depois de `</AuthProvider>`. Nada mais muda.

`src/components/AppHeader.tsx`: importar `ThemeToggle` e colocar `<ThemeToggle />` imediatamente antes de `<NotificationsDropdown />`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/theme-toggle.test.tsx`
Expected: 3 testes PASS.

- [ ] **Step 5: Build e testes completos**

Run: `npm run build` e `npm test`
Expected: build ok; todos os testes passam (63 no total).

- [ ] **Step 6: Commit**

```bash
git add src/components/ThemeRoot.tsx src/components/ThemeToggle.tsx src/test/theme-toggle.test.tsx src/App.tsx src/components/AppHeader.tsx
git commit -m "feat(escuro): botao de tema no cabecalho, inicia no claro, login sempre claro"
```

---

### Task 2: Logo claro no modo escuro

**Files:**
- Create: `src/assets/logo-concreart-escuro.png`
- Modify: `src/components/AppSidebar.tsx:17, 85-90`

**Interfaces:**
- Consumes: `useTheme().resolvedTheme` (Task 1).

- [ ] **Step 1: Gerar o arquivo do logo claro** (corta a margem transparente do `LOGOTIPO_04.png`, que tem o texto branco)

```bash
python -c "
from PIL import Image
i=Image.open('../concreartms.com.br/assets/8928bc4e20113c5b_LOGOTIPO_04.png').convert('RGBA')
b=i.getchannel('A').getbbox(); p=12
i.crop((max(b[0]-p,0),max(b[1]-p,0),min(b[2]+p,i.width),min(b[3]+p,i.height))).save('src/assets/logo-concreart-escuro.png',optimize=True)
"
```
Expected: arquivo criado, com cerca de 1146×651 px.

- [ ] **Step 2: Trocar o logo conforme o tema**

Em `AppSidebar.tsx`: importar `import logoDark from "@/assets/logo-concreart-escuro.png";` e `import { useTheme } from "next-themes";`. Dentro do componente, `const { resolvedTheme } = useTheme();`. No `<img>` trocar `src={logoImg}` por `src={resolvedTheme === "dark" ? logoDark : logoImg}`.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: ok.

- [ ] **Step 4: Commit**

```bash
git add src/assets/logo-concreart-escuro.png src/components/AppSidebar.tsx
git commit -m "feat(escuro): logo claro da Concreart no modo escuro"
```

---

### Task 3: Cores fixas que não acompanham o tema

**Files (todos `src/`):** `components/AppLayout.tsx:17`, `components/ProtectedRoute.tsx:19,22`, `components/StatusBadge.tsx:42`, `pages/RupturesPage.tsx:29,31`, `pages/Dashboard.tsx:71,257,427`, `pages/CostReportPage.tsx:232`, `pages/NewAnalysisPage.tsx:48,52`, `pages/AnalyticsPage.tsx:299-301`, `pages/RuptureDetailPage.tsx` (usos de `slate`), `components/analysis/StepGranulometry.tsx` (linhas 455, 465, 487, 558-565, 761, 771, 800, 854, 939-949, 976, 985, 1017).

**Regra de troca.** Em cada classe fixa, manter a classe atual e acrescentar a variante `dark:` ao lado:

| Classe atual | Acrescentar |
|---|---|
| `bg-white` | `dark:bg-card` |
| `bg-white/50` | `dark:bg-card/50` |
| `bg-slate-50`, `bg-slate-50/50` | `dark:bg-slate-800/50` (no `AppLayout`: `dark:bg-transparent`; no `ProtectedRoute`: `dark:bg-background`) |
| `bg-slate-100` | `dark:bg-slate-800` |
| `bg-slate-900 hover:bg-slate-800` | `dark:bg-slate-700 dark:hover:bg-slate-600` |
| `border-slate-200`, `border-slate-300` | `dark:border-slate-700` |
| `text-slate-500` | `dark:text-slate-400` (no `ProtectedRoute`: `dark:text-muted-foreground`) |
| `text-slate-600` | `dark:text-slate-300` |
| `text-slate-700`, `text-slate-900` | `dark:text-slate-200` |
| `hover:bg-slate-50` | `dark:hover:bg-slate-800` |
| `bg-red-50` | `dark:bg-red-950/40` |
| `border-red-200`, `border-red-100` | `dark:border-red-900` |
| `text-red-600`, `text-red-700` | `dark:text-red-300` |
| `hover:bg-red-100` | `dark:hover:bg-red-950/60` |

Não mexer em `LoginPage.tsx` (sempre claro). Não mexer nos `dark:` que já existem.

- [ ] **Step 1: Listar o que falta**

Run: `grep -rnE "bg-white|slate-[0-9]+|bg-red-50" src --include=*.tsx | grep -v "dark:" | grep -v LoginPage`
Expected: lista das linhas a ajustar.

- [ ] **Step 2: Aplicar a regra acima em cada linha da lista**

- [ ] **Step 3: Conferir que nada ficou sem par**

Run: `grep -rnE "bg-white|slate-[0-9]+" src --include=*.tsx | grep -v LoginPage | grep -v "dark:"`
Expected: nenhuma linha. Se sobrar alguma, é uma linha que já usa `dark:` em outra classe da mesma linha; confira se o par existe antes de aceitar.

- [ ] **Step 4: Build e testes**

Run: `npm run build` e `npm test`
Expected: tudo passa.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat(escuro): variantes dark em caixas, badges e seletores com cor fixa"
```

---

### Task 4: Gráficos no modo escuro

**Files:**
- Modify: `src/index.css` (adicionar variáveis em `:root` e `.dark`)
- Modify: `src/pages/Dashboard.tsx:63-65, 324, 327, 419, 443`
- Modify: `src/pages/CostReportPage.tsx:34-37, 223, 239`
- Modify: `src/pages/RuptureDetailPage.tsx:779, 792, 807`

**Interfaces:**
- Produces: variável nova `--chart-primary-soft`. As variáveis `--chart-primary` e `--chart-primary-light` passam a existir também no `.dark`.

- [ ] **Step 1: Variáveis**

Em `:root`, depois de `--chart-primary-light`: `--chart-primary-soft: 219 70% 78%;`

No bloco `.dark` (depois de `--ring`):

```css
    --chart-primary: 219 76% 75%;
    --chart-primary-light: 220 64% 53%;
    --chart-primary-soft: 219 45% 38%;
```

- [ ] **Step 2: Constantes de gráfico leem as variáveis**

Em `Dashboard.tsx:63-65` e `CostReportPage.tsx:34-36`, com os mesmos nomes de constante:

```tsx
const BRAND_RED        = "hsl(var(--chart-primary))";
const BRAND_RED_MED    = "hsl(var(--chart-primary-light))";
const BRAND_RED_LIGHT  = "hsl(var(--chart-primary-soft))";
```

Em `CostReportPage.tsx:37`:

```tsx
const PIE_COLORS = [BRAND_RED, BRAND_RED_MED, BRAND_RED_LIGHT, "hsl(var(--chart-primary-soft) / 0.7)", "hsl(var(--chart-primary-soft) / 0.45)"];
```

- [ ] **Step 3: Grade e cursor**

Trocar `stroke="hsl(214,14%,93%)"` por `stroke="hsl(var(--border))"` (Dashboard linhas 324 e 419; CostReportPage linha 223) e `fill: "hsl(214,29%,96%)"` por `fill: "hsl(var(--muted))"` (Dashboard linhas 327 e 443; CostReportPage linha 239).

- [ ] **Step 4: RuptureDetailPage**

Linha 792: trocar as duas ocorrências de `#0f2548` por `hsl(var(--chart-primary))`. Linhas 779 e 807: trocar `stroke="#e5e7eb"` por `stroke="hsl(var(--border))"`.

- [ ] **Step 5: Build e testes**

Run: `npm run build` e `npm test`
Expected: tudo passa.

- [ ] **Step 6: Commit**

```bash
git add src/index.css src/pages
git commit -m "feat(escuro): gráficos usam variáveis de tema"
```

---

### Task 5: Revisão final

**Files:** nenhum, a menos que a revisão aponte algo.

- [ ] **Step 1: Build, testes e lint**

Run: `npm run build`, `npm test`, `npm run lint`
Expected: build ok; testes passam; lint sem erro novo em relação aos 196 problemas do `main`.

- [ ] **Step 2: Conferência visual (feita por você no navegador)**

Rodar `npm run dev` e conferir:
- primeira visita abre clara;
- botão no cabeçalho alterna e a escolha continua após recarregar;
- no escuro, abrir `/login` mostra a tela clara; entrar no app volta ao escuro;
- logo da sidebar legível nos dois temas;
- Dashboard, Análises, Nova análise (granulometria e dosagem), Rupturas, Relatório de custos e Configurações sem retângulo branco nem texto apagado;
- gráficos visíveis;
- toasts seguem o tema.

- [ ] **Step 3: Decidir o merge**

Você escolhe entre manter o branch `tema-concreart` ou fazer merge em `main`.

---

## Self-Review

- **Cobertura:** botão no cabeçalho (Task 1), inicia no claro (Task 1, com teste), login sempre claro (Task 1, com teste), logo claro (Task 2), cores fixas (Task 3), gráficos (Task 4), verificação (Task 5).
- **Placeholders:** a Task 3 usa tabela de regras com a lista exata de arquivos e linhas, e um comando que prova que nada ficou sem par.
- **Consistência:** `ThemeRoot`, `ThemeToggle`, chave `concreart-theme` e `--chart-primary-soft` usados com o mesmo nome em todas as tasks.
- **Review Focus:** login forçado claro e início no claro têm teste (Task 1); logo na Task 2; gráficos na Task 4; caixas fixas na Task 3; todos conferidos de novo no passo visual da Task 5.
