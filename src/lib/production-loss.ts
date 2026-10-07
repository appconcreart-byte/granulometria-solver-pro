// Comprimento da pista de concretagem (m), conforme planilha "REGISTRO DE CONCRETAGEM"
export const COMPRIMENTO_PISTA_M = 1600;

export const PISTAS = ["A", "B", "C"] as const;
export const FIOS_OPCOES = [3, 5, 7] as const;

/** % Perda = metros de perda * 100 / 1600; % Aproveitamento = 100 - % Perda */
export function calcPerda(metrosPerda: number) {
  const perda = (metrosPerda * 100) / COMPRIMENTO_PISTA_M;
  return { perda, aproveitamento: 100 - perda };
}
