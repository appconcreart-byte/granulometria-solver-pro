import { describe, it, expect } from "vitest";
import { ALL_HISTORY_DATE_FILTER, getDefaultDateFilter, isInDateRange, formatPeriodLabel } from "@/lib/dateFilter";

describe("dateFilter", () => {
  it("ALL_HISTORY_DATE_FILTER inclui qualquer data (usado na abertura de Rompimentos)", () => {
    expect(isInDateRange("2025-01-05", ALL_HISTORY_DATE_FILTER)).toBe(true);
    expect(isInDateRange("2026-10-23T10:00:00Z", ALL_HISTORY_DATE_FILTER)).toBe(true);
    expect(formatPeriodLabel(ALL_HISTORY_DATE_FILTER)).toBe("Todo o histórico");
  });

  it("o filtro padrão das outras telas continua sendo o mês atual", () => {
    const now = new Date();
    const padrao = getDefaultDateFilter();
    expect(padrao.month).toBe(String(now.getMonth() + 1).padStart(2, "0"));
    expect(padrao.year).toBe(String(now.getFullYear()));
  });
});
