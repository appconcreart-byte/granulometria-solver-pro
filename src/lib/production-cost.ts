import { calcularCustoMaterial, calcularCustoTracoCompleto, resolverAditivo, resolverCimento } from "@/lib/utils";
import { COMPRIMENTO_PISTA_M } from "@/lib/production-loss";
import type { ItemPreco, PlannedItem, ReceitaReal, RealRecipeItem } from "@/lib/production-recipe";

// =============================================================================
// Custo real do lote: quantidade REAL usada × preço unitário de cada item.
//
// - O preço vem do cadastro de Produtos e é GRAVADO no lote (campo `preco` de
//   cada item) quando a receita real é salva. Mudar o preço depois no cadastro
//   não altera o custo de lotes já registrados.
// - Água: custo zero (não há preço para ela).
// - Item com quantidade mas sem preço utilizável = "sem preço": o custo do lote
//   fica marcado como incompleto em vez de mostrar um valor baixo sem aviso.
// =============================================================================

const maiorQueZero = (n: unknown): n is number => typeof n === "number" && n > 0;

function precoDe(m: any): ItemPreco | null {
  if (!m) return null;
  const valor = m.custo_valor ?? m.custo_tonelada;
  if (!maiorQueZero(valor)) return null;
  return {
    valor,
    unidade: m.custo_unidade || "tonelada",
    densidade: m.densidade ?? undefined,
  };
}

/** Preço atual do cadastro para cada item da receita prevista (chave → preço | null). */
export function resolvePrecos(
  planned: PlannedItem[],
  formData: any,
  dbMaterials: any[],
): Record<string, ItemPreco | null> {
  const out: Record<string, ItemPreco | null> = {};
  for (const i of planned) {
    if (i.tipo === "agua") {
      out[i.chave] = null;
    } else if (i.tipo === "cimento") {
      const m = resolverCimento(formData, dbMaterials);
      out[i.chave] = precoDe(m) ?? (maiorQueZero(formData?.custo_cimento_ton) ? { valor: formData.custo_cimento_ton, unidade: "tonelada" } : null);
    } else if (i.tipo === "aditivo") {
      const m = resolverAditivo(formData, dbMaterials);
      // O preço do aditivo é por litro/kg (mesma regra de calcularCustoTracoCompleto)
      const valor = m?.custo_valor;
      out[i.chave] = maiorQueZero(valor)
        ? { valor, unidade: "litro" }
        : maiorQueZero(formData?.custo_aditivo_lt)
          ? { valor: formData.custo_aditivo_lt, unidade: "litro" }
          : null;
    } else {
      // agregado e aço: material cadastrado
      const m = i.materialId ? (dbMaterials ?? []).find((x) => x.id === i.materialId) : undefined;
      out[i.chave] = precoDe(m);
    }
  }
  return out;
}

/**
 * Custo de UM item para a quantidade informada (na unidade do item).
 * Retorna null quando não há como calcular (sem preço ou unidades incompatíveis).
 */
export function custoItem(
  item: Pick<RealRecipeItem, "tipo" | "unidade">,
  quantidade: number,
  preco: ItemPreco | null | undefined,
): number | null {
  if (item.tipo === "agua") return 0;
  if (quantidade === 0) return 0;
  if (!preco || !maiorQueZero(preco.valor)) return null;

  if (item.tipo === "aditivo") {
    // mL ou g → litro/kg (≈ 1 g/mL, como no resto do app)
    return preco.valor * (quantidade / 1000);
  }
  if (item.tipo === "aco") {
    if (item.unidade === "m") return preco.unidade === "metro" ? preco.valor * quantidade : null;
    if (preco.unidade === "kg") return preco.valor * quantidade;
    if (preco.unidade === "tonelada") return (preco.valor / 1000) * quantidade;
    return null;
  }
  // cimento e agregados: quantidade em kg
  return calcularCustoMaterial({
    custo_valor: preco.valor,
    custo_unidade: preco.unidade,
    quantidade,
    densidade: preco.densidade,
  });
}

/** Grava o preço em cada item. Itens que já têm preço gravado mantêm o histórico. */
export function comPrecos(
  receita: ReceitaReal,
  precosAtuais: Record<string, ItemPreco | null>,
  anterior?: ReceitaReal | null,
): ReceitaReal {
  const antigos = new Map((anterior?.itens ?? []).map((i) => [i.chave, i.preco]));
  return {
    itens: receita.itens.map((i) => ({
      ...i,
      preco: antigos.get(i.chave) ?? precosAtuais[i.chave] ?? null,
    })),
  };
}

export interface CustoLote {
  total: number;
  porTipo: { cimento: number; agregados: number; aditivo: number; aco: number };
  /** Itens com quantidade e sem preço utilizável */
  semPreco: string[];
  /** false quando algum item com quantidade não tem preço */
  completo: boolean;
  porItem: Record<string, number | null>;
}

/** Custo do lote a partir dos itens da receita (real ou previsto) com o preço gravado. */
export function calcCustoLote(
  itens: Array<Pick<RealRecipeItem, "chave" | "nome" | "tipo" | "unidade" | "previsto" | "real" | "preco">>,
  qual: "real" | "previsto",
): CustoLote {
  const out: CustoLote = {
    total: 0,
    porTipo: { cimento: 0, agregados: 0, aditivo: 0, aco: 0 },
    semPreco: [],
    completo: true,
    porItem: {},
  };
  for (const i of itens) {
    const q = qual === "real" ? i.real : i.previsto;
    if (q == null) {
      out.porItem[i.chave] = null;
      continue;
    }
    const c = custoItem(i, q, i.preco);
    out.porItem[i.chave] = c;
    if (c == null) {
      out.completo = false;
      out.semPreco.push(i.nome);
      continue;
    }
    out.total += c;
    if (i.tipo === "cimento") out.porTipo.cimento += c;
    else if (i.tipo === "agregado") out.porTipo.agregados += c;
    else if (i.tipo === "aditivo") out.porTipo.aditivo += c;
    else if (i.tipo === "aco") out.porTipo.aco += c;
  }
  return out;
}

export interface Indicadores {
  /** R$ por m³ de concreto produzido; null sem volume */
  custoM3: number | null;
  /** R$ por metro de pista */
  custoMetro: number;
  /** R$ por traço; null sem nº de traços */
  custoTraco: number | null;
}

export function indicadoresLote(total: number, volumeM3: number | null | undefined, nTracos: number | null | undefined): Indicadores {
  return {
    custoM3: maiorQueZero(volumeM3) ? total / volumeM3 : null,
    custoMetro: total / COMPRIMENTO_PISTA_M,
    custoTraco: maiorQueZero(nTracos) ? total / nTracos : null,
  };
}

/**
 * Estimativa para lotes SEM receita real: custo de 1 traço (preços atuais) × nº de
 * traços (1 se não informado), mais o aço previsto (que é por pista). Sempre
 * "estimado": nunca deve ser somado ao custo real.
 */
export function custoEstimadoLote(
  formData: any,
  dbMaterials: any[],
  nTracos: number | null | undefined,
): { total: number; baseTracos: number; informado: boolean } {
  const n = maiorQueZero(nTracos) ? nTracos : 1;
  const traco = calcularCustoTracoCompleto({ formData, dbMaterials: dbMaterials || [] });
  const aco = custoItem(
    { tipo: "aco", unidade: formData?.aco_unidade === "m" ? "m" : "kg" },
    formData?.aco_quantidade || 0,
    precoDe((dbMaterials ?? []).find((m) => m.id === formData?.aco_material_id)),
  );
  return { total: traco.totalBatelada * n + (aco ?? 0), baseTracos: n, informado: maiorQueZero(nTracos) };
}
