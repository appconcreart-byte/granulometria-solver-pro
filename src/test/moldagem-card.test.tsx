import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MoldagemCard } from "@/components/rupture/MoldagemCard";

const produced_at = new Date(2026, 9, 15, 11, 20).toISOString();

const digitar = (rotulo: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });

describe("MoldagemCard", () => {
  it("lote sem moldagem salva começa com a data e a hora da produção", () => {
    render(<MoldagemCard batch={{ produced_at }} readOnly={false} onSave={vi.fn()} />);
    expect(screen.getByText("Controle de Moldagem")).toBeInTheDocument();
    expect(screen.getByLabelText("Data")).toHaveValue("2026-10-15");
    expect(screen.getByLabelText("Hora da Moldagem")).toHaveValue("11:20");
  });

  it("salva temperatura com vírgula e slump", async () => {
    const onSave = vi.fn();
    render(<MoldagemCard batch={{ produced_at }} readOnly={false} onSave={onSave} />);
    digitar("Temperatura (°C)", "19,2");
    digitar("Slump Test (cm)", "11");
    fireEvent.click(screen.getByRole("button", { name: /Salvar Moldagem/ }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      data_moldagem: "2026-10-15",
      hora_moldagem: "11:20",
      temperatura_c: 19.2,
      tempo_clima: null,
      slump_cm: 11,
    });
  });

  it("não exige nenhum outro campo: salvar sem digitar grava só a data e a hora pré-preenchidas", async () => {
    const onSave = vi.fn();
    render(<MoldagemCard batch={{ produced_at }} readOnly={false} onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: /Salvar Moldagem/ }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      data_moldagem: "2026-10-15",
      hora_moldagem: "11:20",
      temperatura_c: null,
      tempo_clima: null,
      slump_cm: null,
    });
  });

  it("temperatura fora do intervalo mostra erro e não salva", () => {
    const onSave = vi.fn();
    render(<MoldagemCard batch={{ produced_at }} readOnly={false} onSave={onSave} />);
    digitar("Temperatura (°C)", "70");
    fireEvent.click(screen.getByRole("button", { name: /Salvar Moldagem/ }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Temperatura deve estar entre -10 e 60 °C");
  });

  it("somente leitura: campos desabilitados e sem botão de salvar", () => {
    render(<MoldagemCard batch={{ produced_at }} readOnly onSave={vi.fn()} />);
    expect(screen.getByLabelText("Data")).toBeDisabled();
    expect(screen.getByLabelText("Hora da Moldagem")).toBeDisabled();
    expect(screen.getByLabelText("Temperatura (°C)")).toBeDisabled();
    expect(screen.getByLabelText("Slump Test (cm)")).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Salvar Moldagem/ })).not.toBeInTheDocument();
  });

  it("quando o lote passa a trazer valores salvos, os campos mostram esses valores", () => {
    const { rerender } = render(<MoldagemCard batch={{ produced_at }} readOnly={false} onSave={vi.fn()} />);
    rerender(
      <MoldagemCard
        batch={{
          produced_at,
          data_moldagem: "2026-10-14",
          hora_moldagem: "09:05:00",
          temperatura_c: 28.5,
          tempo_clima: "chuva",
          slump_cm: 11,
        }}
        readOnly={false}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Data")).toHaveValue("2026-10-14");
    expect(screen.getByLabelText("Hora da Moldagem")).toHaveValue("09:05");
    expect(screen.getByLabelText("Temperatura (°C)")).toHaveValue("28,5");
    expect(screen.getByLabelText("Slump Test (cm)")).toHaveValue("11");
  });
});
