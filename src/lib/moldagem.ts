// Dados de moldagem do lote (colunas de production_batches, migration 033).
// Iguais em todas as idades de rompimento do mesmo lote.

export const TEMPO_CLIMA = ["sol", "chuva"] as const;
export type TempoClima = (typeof TEMPO_CLIMA)[number];

export const TEMPO_CLIMA_LABEL: Record<TempoClima, string> = {
  sol: "Sol",
  chuva: "Chuva",
};

/** Lista de colunas para usar dentro de um select() do production_batches. */
export const MOLDAGEM_SELECT_COLUMNS = "data_moldagem, hora_moldagem, temperatura_c, tempo_clima, slump_cm";

export interface MoldagemColumns {
  data_moldagem: string | null; // "YYYY-MM-DD"
  hora_moldagem: string | null; // "HH:mm" (o banco devolve "HH:mm:ss")
  temperatura_c: number | null;
  tempo_clima: TempoClima | null;
  slump_cm: number | null;
}

/** Valores dos inputs do cartão (sempre texto). */
export interface MoldagemForm {
  data: string;
  hora: string;
  temperatura: string;
  tempo: TempoClima | "";
  slump: string;
}

const TEMPERATURA_MIN = -10;
const TEMPERATURA_MAX = 60;
const ERRO_TEMPERATURA = "Temperatura deve estar entre -10 e 60 °C";
const ERRO_SLUMP = "Slump deve ser um número maior ou igual a 0";

const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (hora: string | null | undefined) => (hora ? hora.slice(0, 5) : "");

/** 28.5 -> "28,5"; 11 -> "11". */
export function formatNumeroBR(n: number): string {
  return String(Number(n)).replace(".", ",");
}

/**
 * Valores iniciais do cartão. Lote sem moldagem salva começa com a data e a hora
 * (fuso local) em que foi produzido; lote com moldagem salva mostra o que foi salvo.
 */
export function moldagemFormFromBatch(batch: { produced_at: string } & Partial<MoldagemColumns>): MoldagemForm {
  let data = batch.data_moldagem ?? "";
  let hora = hhmm(batch.hora_moldagem);

  if (batch.data_moldagem == null && batch.hora_moldagem == null) {
    const produzido = new Date(batch.produced_at);
    if (!Number.isNaN(produzido.getTime())) {
      data = `${produzido.getFullYear()}-${pad(produzido.getMonth() + 1)}-${pad(produzido.getDate())}`;
      hora = `${pad(produzido.getHours())}:${pad(produzido.getMinutes())}`;
    }
  }

  return {
    data,
    hora,
    temperatura: batch.temperatura_c != null ? formatNumeroBR(batch.temperatura_c) : "",
    tempo: batch.tempo_clima ?? "",
    slump: batch.slump_cm != null ? formatNumeroBR(batch.slump_cm) : "",
  };
}

/** Texto vazio -> null; aceita vírgula decimal; qualquer outra coisa não numérica -> NaN. */
function parseDecimal(texto: string): number | null {
  const limpo = texto.trim().replace(",", ".");
  if (limpo === "") return null;
  if (!/^-?\d+(\.\d+)?$/.test(limpo)) return Number.NaN;
  return Math.round(Number(limpo) * 10) / 10 + 0; // 1 casa decimal; "+ 0" evita -0
}

export function moldagemColumnsFromForm(
  form: MoldagemForm,
): { ok: true; value: MoldagemColumns } | { ok: false; error: string } {
  const temperatura = parseDecimal(form.temperatura);
  if (temperatura !== null && (Number.isNaN(temperatura) || temperatura < TEMPERATURA_MIN || temperatura > TEMPERATURA_MAX)) {
    return { ok: false, error: ERRO_TEMPERATURA };
  }

  const slump = parseDecimal(form.slump);
  if (slump !== null && (Number.isNaN(slump) || slump < 0)) {
    return { ok: false, error: ERRO_SLUMP };
  }

  return {
    ok: true,
    value: {
      data_moldagem: form.data || null,
      hora_moldagem: form.hora || null,
      temperatura_c: temperatura,
      tempo_clima: form.tempo || null,
      slump_cm: slump,
    },
  };
}

/** "28,5 °C, chuva, slump 11 cm" com só o que foi preenchido; null se não há nada. */
export function formatMoldagemResumo(m: Partial<MoldagemColumns> | null | undefined): string | null {
  if (!m) return null;
  const partes: string[] = [];
  if (m.temperatura_c != null) partes.push(`${formatNumeroBR(m.temperatura_c)} °C`);
  if (m.tempo_clima) partes.push(m.tempo_clima);
  if (m.slump_cm != null) partes.push(`slump ${formatNumeroBR(m.slump_cm)} cm`);
  return partes.length ? partes.join(", ") : null;
}

/** "15/10/2026 11:20", só a data, só a hora, ou "—". Sem `new Date` para não sofrer com fuso. */
export function formatDataHoraMoldagem(m: Partial<MoldagemColumns> | null | undefined): string {
  const data = m?.data_moldagem ? m.data_moldagem.split("-").reverse().join("/") : "";
  const hora = hhmm(m?.hora_moldagem);
  return [data, hora].filter(Boolean).join(" ") || "—";
}
