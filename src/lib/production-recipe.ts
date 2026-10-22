// =============================================================================
// Receita de produção: prevista (da análise, para 1 traço) x real utilizada
// (soma de todos os traços de uma pista, digitada na hora da pesagem).
// =============================================================================

export type RecipeTipo = "cimento" | "agregado" | "agua" | "aditivo" | "aco";
export type RecipeUnidade = "kg" | "L" | "mL" | "g" | "m";

/** Item da receita prevista, para 1 traço. */
export interface PlannedItem {
  chave: string;
  nome: string;
  tipo: RecipeTipo;
  unidade: RecipeUnidade;
  previsto: number;
  /** Material cadastrado (agregado ou aço), usado para buscar o preço */
  materialId?: string;
  /** true = quantidade por PISTA (aço): não é multiplicada pelo nº de traços */
  porPista?: boolean;
}

/** Preço unitário gravado no lote na hora de salvar a receita real. */
export interface ItemPreco {
  valor: number;
  /** tonelada | kg | m3 | saco | unidade | metro | litro (como no cadastro de materiais) */
  unidade: string;
  densidade?: number;
}

/** Item gravado no lote: previsto já multiplicado pelo nº de traços + o real informado. */
export interface RealRecipeItem extends PlannedItem {
  real: number | null;
  /** Preço do cadastro no momento em que a receita real foi salva (histórico de custo) */
  preco?: ItemPreco | null;
}

export interface ReceitaReal {
  itens: RealRecipeItem[];
}

// Destaque da diferença entre real e previsto (em %). Ajuste aqui se necessário.
export const DESVIO_ATENCAO_PCT = 5;
export const DESVIO_ALERTA_PCT = 10;

const round = (n: number, d = 2) => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

/** Receita prevista (1 traço), na ordem: cimento, agregados, água, aditivo, aço. */
export function buildPlannedRecipe(fd: any): PlannedItem[] {
  const cimento = fd?.consumo_alvo_m3 || 0;
  const itens: PlannedItem[] = [];

  itens.push({ chave: "cimento", nome: "Cimento", tipo: "cimento", unidade: "kg", previsto: round(cimento) });

  for (const m of fd?.materiais_selecionados ?? []) {
    itens.push({
      chave: `agregado:${m.material_id || m.nome}`,
      nome: m.nome,
      tipo: "agregado",
      unidade: "kg",
      previsto: round(m.proporcao_kg ?? 0),
      materialId: m.material_id || undefined,
    });
  }

  itens.push({ chave: "agua", nome: "Água", tipo: "agua", unidade: "L", previsto: round(cimento * (fd?.relacao_ac || 0)) });

  // Aditivo e aço aparecem sempre, mesmo com quantidade 0
  itens.push({
    chave: "aditivo",
    nome: "Aditivo",
    tipo: "aditivo",
    unidade: fd?.aditivo_unidade === "g" ? "g" : "mL",
    previsto: round(fd?.aditivos_ml || 0, 1),
  });
  itens.push({
    chave: "aco",
    nome: fd?.aco_descricao?.trim() ? `Aço — ${fd.aco_descricao.trim()}` : "Aço",
    tipo: "aco",
    unidade: fd?.aco_unidade === "m" ? "m" : "kg",
    previsto: round(fd?.aco_quantidade || 0),
    materialId: fd?.aco_material_id || undefined,
    porPista: true,
  });

  return itens;
}

/**
 * Multiplica o previsto pelo nº de traços (vazio ou inválido conta como 1).
 * Itens "por pista" (aço) não são multiplicados.
 */
export function scalePlanned(items: PlannedItem[], nTracos: number | null | undefined): PlannedItem[] {
  const n = nTracos && nTracos > 0 ? nTracos : 1;
  return items.map((i) =>
    i.porPista ? i : { ...i, previsto: round(i.previsto * n, i.unidade === "mL" ? 1 : 2) },
  );
}

/** Aceita vírgula ou ponto. Vazio, inválido ou negativo → null (não informado). */
export function parseQtd(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Monta a receita real a gravar. Sem nenhum valor digitado devolve null
 * (receita real "não informada"). Campos em branco ficam como não informados.
 */
export function buildReceitaReal(
  planned: PlannedItem[],
  nTracos: number | null | undefined,
  values: Record<string, string>,
): ReceitaReal | null {
  const scaled = scalePlanned(planned, nTracos);
  const itens: RealRecipeItem[] = scaled.map((i) => ({ ...i, real: parseQtd(values[i.chave]) }));
  return itens.some((i) => i.real != null) ? { itens } : null;
}

export type DesvioNivel = "ok" | "atencao" | "alerta";

export interface Desvio {
  diff: number;
  /** null quando o previsto é 0 */
  pct: number | null;
  nivel: DesvioNivel;
}

/** Diferença entre o real e o previsto. null quando o real não foi informado. */
export function calcDesvio(item: Pick<RealRecipeItem, "previsto" | "real">): Desvio | null {
  if (item.real == null) return null;
  const diff = round(item.real - item.previsto, 3);
  if (item.previsto === 0) {
    return { diff, pct: null, nivel: item.real > 0 ? "atencao" : "ok" };
  }
  const pct = (diff / item.previsto) * 100;
  const abs = Math.abs(pct);
  return { diff, pct, nivel: abs >= DESVIO_ALERTA_PCT ? "alerta" : abs >= DESVIO_ATENCAO_PCT ? "atencao" : "ok" };
}

/** kg de um item da mistura. Aço não entra na massa do concreto. */
function kgDaMistura(tipo: RecipeTipo, unidade: RecipeUnidade, qtd: number): number {
  if (tipo === "aco") return 0;
  if (unidade === "mL" || unidade === "g") return qtd / 1000; // aditivo, ~1 g/mL (mesma regra do restante do app)
  return qtd; // kg e L (água, 1 L = 1 kg)
}

/** Massa total da mistura (cimento + agregados + água + aditivo), sem o aço. */
export function totalMistura(
  items: Array<Pick<PlannedItem, "tipo" | "unidade" | "previsto"> & { real?: number | null }>,
  qual: "previsto" | "real",
): { total: number; parcial: boolean } {
  let total = 0;
  let parcial = false;
  for (const i of items) {
    if (i.tipo === "aco") continue;
    const q = qual === "previsto" ? i.previsto : (i.real ?? null);
    if (q == null) {
      parcial = true;
      continue;
    }
    total += kgDaMistura(i.tipo, i.unidade, q);
  }
  return { total: round(total, 1), parcial };
}

export function formatQtd(n: number, unidade: RecipeUnidade): string {
  const casas = unidade === "mL" ? 1 : 2;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}
