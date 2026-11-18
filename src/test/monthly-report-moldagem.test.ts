import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));
vi.mock("@/lib/pdf-generator", () => ({ generateElementPDF: vi.fn() }));
vi.mock("@/lib/excel-generator", () => ({ generateMonthlyReportExcel: vi.fn() }));

import { buildSummary } from "@/pages/MonthlyReportPage";

const lote = (extra: Record<string, unknown>) => ({
  id: "b1",
  batch_code: "L-1",
  produced_at: "2026-10-05T15:00:00Z",
  status: "reprovado",
  notas: null,
  data_moldagem: null,
  hora_moldagem: null,
  temperatura_c: null,
  tempo_clima: null,
  slump_cm: null,
  ...extra,
});

const descricoes = (batches: any[]) => buildSummary(2026, 10, [], batches, [], [], []).naoConformidades.map((n) => n.descricao);

describe("relatório mensal — moldagem nos lotes não conformes", () => {
  it("lote reprovado traz o resumo da moldagem", () => {
    expect(descricoes([lote({ temperatura_c: 28.5, tempo_clima: "chuva", slump_cm: 11 })])).toEqual([
      "Lote L-1 — reprovado (moldagem: 28,5 °C, chuva, slump 11 cm)",
    ]);
  });

  it("com observações, o resumo vem depois delas", () => {
    expect(descricoes([lote({ notas: "caiu na umidade", temperatura_c: 28.5, tempo_clima: "chuva", slump_cm: 11 })])).toEqual([
      "Lote L-1 — reprovado: caiu na umidade (moldagem: 28,5 °C, chuva, slump 11 cm)",
    ]);
  });

  it("aprovado com ressalva mostra só os campos preenchidos", () => {
    const [d] = descricoes([lote({ status: "aprovado_com_ressalva", slump_cm: 9 })]);
    expect(d).toBe("Lote L-1 — aprovado com ressalva (moldagem: slump 9 cm)");
  });

  it("lote sem nenhum dado de moldagem (lote antigo) mantém a linha como era", () => {
    expect(descricoes([lote({})])).toEqual(["Lote L-1 — reprovado"]);
    const { data_moldagem, hora_moldagem, temperatura_c, tempo_clima, slump_cm, ...semColunas } = lote({});
    expect(descricoes([semColunas])).toEqual(["Lote L-1 — reprovado"]);
  });
});
