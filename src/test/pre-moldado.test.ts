import { describe, it, expect } from "vitest";
import {
  LIMITES_LAJE_PADRAO,
  LIMITES_BLOCO_PADRAO,
  TIPOS_ANALISE,
  getConfigMisturador,
  getLimitesPadrao,
  getTipoDosagem,
  isFamiliaLaje,
} from "@/lib/analysis-data";

describe("Pré-moldado (mesmo processo da laje)", () => {
  it("é reconhecido como família laje; blocos e pavers não", () => {
    expect(isFamiliaLaje("laje")).toBe(true);
    expect(isFamiliaLaje("pre_moldado")).toBe(true);
    expect(isFamiliaLaje("paver")).toBe(false);
    expect(isFamiliaLaje("bloco_estrutural")).toBe(false);
    expect(isFamiliaLaje("")).toBe(false);
    expect(isFamiliaLaje(undefined)).toBe(false);
  });

  it("usa o mesmo modelo de dosagem (wet casting) da laje", () => {
    expect(getTipoDosagem("pre_moldado")).toBe("WET_CASTING_PROTENDIDO");
    expect(getTipoDosagem("pre_moldado")).toBe(getTipoDosagem("laje"));
  });

  it("usa as mesmas faixas granulométricas da laje, não as de bloco", () => {
    expect(getLimitesPadrao("pre_moldado")).toBe(LIMITES_LAJE_PADRAO);
    expect(getLimitesPadrao("pre_moldado")).not.toBe(LIMITES_BLOCO_PADRAO);
  });

  it("usa o misturador de 2500 kg / 1,00 m³", () => {
    expect(getConfigMisturador("pre_moldado")).toEqual({ capacidade_kg: 2500, volume_m3: 1.0 });
  });

  it("aparece na lista de tipos de análise", () => {
    expect(TIPOS_ANALISE).toContainEqual({ value: "pre_moldado", label: "Pré-moldado" });
  });
});
