import { describe, it, expect } from "vitest";
import {
  moldagemFormFromBatch,
  moldagemColumnsFromForm,
  formatMoldagemResumo,
  formatDataHoraMoldagem,
} from "@/lib/moldagem";

describe("moldagem", () => {
  describe("moldagemFormFromBatch", () => {
    it("sem moldagem salva, pré-preenche data e hora com a produção do lote", () => {
      const form = moldagemFormFromBatch({ produced_at: new Date(2026, 9, 15, 11, 20).toISOString() });
      expect(form).toEqual({ data: "2026-10-15", hora: "11:20", temperatura: "", tempo: "", slump: "" });
    });

    it("usa a data local, não a UTC, para lote produzido perto da meia-noite", () => {
      const form = moldagemFormFromBatch({ produced_at: new Date(2026, 9, 15, 23, 30).toISOString() });
      expect(form.data).toBe("2026-10-15");
      expect(form.hora).toBe("23:30");
    });

    it("com moldagem salva, mostra os valores salvos (hora sem segundos, números com vírgula)", () => {
      const form = moldagemFormFromBatch({
        produced_at: new Date(2026, 9, 15, 11, 20).toISOString(),
        data_moldagem: "2026-10-14",
        hora_moldagem: "09:05:00",
        temperatura_c: 28.5,
        tempo_clima: "chuva",
        slump_cm: 11,
      });
      expect(form).toEqual({ data: "2026-10-14", hora: "09:05", temperatura: "28,5", tempo: "chuva", slump: "11" });
    });
  });

  describe("moldagemColumnsFromForm", () => {
    it("converte o formulário em colunas, aceitando vírgula decimal", () => {
      expect(
        moldagemColumnsFromForm({ data: "2026-10-15", hora: "11:20", temperatura: "19,2", tempo: "sol", slump: "11" }),
      ).toEqual({
        ok: true,
        value: { data_moldagem: "2026-10-15", hora_moldagem: "11:20", temperatura_c: 19.2, tempo_clima: "sol", slump_cm: 11 },
      });
    });

    it("formulário todo vazio vira cinco colunas nulas", () => {
      expect(moldagemColumnsFromForm({ data: "", hora: "", temperatura: "", tempo: "", slump: "" })).toEqual({
        ok: true,
        value: { data_moldagem: null, hora_moldagem: null, temperatura_c: null, tempo_clima: null, slump_cm: null },
      });
    });

    it.each(["61", "-11", "abc"])("rejeita temperatura %s", (temperatura) => {
      expect(moldagemColumnsFromForm({ data: "", hora: "", temperatura, tempo: "", slump: "" })).toEqual({
        ok: false,
        error: "Temperatura deve estar entre -10 e 60 °C",
      });
    });

    it.each(["60", "-10"])("aceita temperatura %s (limites do intervalo)", (temperatura) => {
      const r = moldagemColumnsFromForm({ data: "", hora: "", temperatura, tempo: "", slump: "" });
      expect(r.ok).toBe(true);
    });

    it.each(["-1", "x"])("rejeita slump %s", (slump) => {
      expect(moldagemColumnsFromForm({ data: "", hora: "", temperatura: "", tempo: "", slump })).toEqual({
        ok: false,
        error: "Slump deve ser um número maior ou igual a 0",
      });
    });

    it.each(["100", "99,95", "1000"])("rejeita slump %s (a coluna só comporta até 99,9)", (slump) => {
      expect(moldagemColumnsFromForm({ data: "", hora: "", temperatura: "", tempo: "", slump })).toEqual({
        ok: false,
        error: "Slump deve ser no máximo 99,9 cm",
      });
    });

    it("aceita slump 99,9 (limite)", () => {
      const r = moldagemColumnsFromForm({ data: "", hora: "", temperatura: "", tempo: "", slump: "99,9" });
      expect(r).toMatchObject({ ok: true, value: { slump_cm: 99.9 } });
    });

    it("aceita slump 0", () => {
      const r = moldagemColumnsFromForm({ data: "", hora: "", temperatura: "", tempo: "", slump: "0" });
      expect(r).toMatchObject({ ok: true, value: { slump_cm: 0 } });
    });

    it("arredonda a temperatura para 1 casa decimal", () => {
      const r = moldagemColumnsFromForm({ data: "", hora: "", temperatura: "19,25", tempo: "", slump: "" });
      expect(r).toMatchObject({ ok: true, value: { temperatura_c: 19.3 } });
    });
  });

  describe("formatMoldagemResumo", () => {
    it("junta temperatura, tempo e slump", () => {
      expect(formatMoldagemResumo({ temperatura_c: 28.5, tempo_clima: "chuva", slump_cm: 11 })).toBe(
        "28,5 °C, chuva, slump 11 cm",
      );
    });

    it("mostra só o que foi preenchido", () => {
      expect(formatMoldagemResumo({ tempo_clima: "sol" })).toBe("sol");
    });

    it("zero não é tratado como vazio", () => {
      expect(formatMoldagemResumo({ slump_cm: 0 })).toBe("slump 0 cm");
    });

    it("sem nenhum dado devolve null", () => {
      expect(formatMoldagemResumo({ temperatura_c: null, tempo_clima: null, slump_cm: null })).toBeNull();
      expect(formatMoldagemResumo(null)).toBeNull();
      expect(formatMoldagemResumo(undefined)).toBeNull();
    });
  });

  describe("formatDataHoraMoldagem", () => {
    it("data e hora", () => {
      expect(formatDataHoraMoldagem({ data_moldagem: "2026-10-15", hora_moldagem: "11:20:00" })).toBe("15/10/2026 11:20");
    });
    it("só data", () => {
      expect(formatDataHoraMoldagem({ data_moldagem: "2026-10-15" })).toBe("15/10/2026");
    });
    it("só hora", () => {
      expect(formatDataHoraMoldagem({ hora_moldagem: "11:20:00" })).toBe("11:20");
    });
    it("nada preenchido", () => {
      expect(formatDataHoraMoldagem({})).toBe("—");
      expect(formatDataHoraMoldagem(null)).toBe("—");
    });
  });
});
