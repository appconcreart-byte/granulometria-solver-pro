import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MoldagemLaudoBlock } from "@/components/quality/MoldagemLaudoBlock";

describe("MoldagemLaudoBlock", () => {
  it("mostra data/hora, temperatura, tempo e slump do lote", () => {
    render(
      <MoldagemLaudoBlock
        batch={{
          data_moldagem: "2026-10-15",
          hora_moldagem: "11:20:00",
          temperatura_c: 28.5,
          tempo_clima: "chuva",
          slump_cm: 11,
        }}
      />,
    );
    expect(screen.getByText("Moldagem")).toBeInTheDocument();
    expect(screen.getByText("15/10/2026 11:20")).toBeInTheDocument();
    expect(screen.getByText("28,5 °C")).toBeInTheDocument();
    expect(screen.getByText("Chuva")).toBeInTheDocument();
    expect(screen.getByText("11 cm")).toBeInTheDocument();
  });

  it("lote antigo, sem moldagem, mostra — nos quatro campos e não quebra", () => {
    render(
      <MoldagemLaudoBlock
        batch={{ data_moldagem: null, hora_moldagem: null, temperatura_c: null, tempo_clima: null, slump_cm: null }}
      />,
    );
    expect(screen.getAllByText("—")).toHaveLength(4);
  });

  it("lote sem as colunas (undefined) também mostra — nos quatro campos", () => {
    render(<MoldagemLaudoBlock batch={{}} />);
    expect(screen.getAllByText("—")).toHaveLength(4);
  });

  it("slump 0 aparece como 0 cm (zero não é vazio)", () => {
    render(<MoldagemLaudoBlock batch={{ slump_cm: 0 }} />);
    expect(screen.getByText("0 cm")).toBeInTheDocument();
  });
});
