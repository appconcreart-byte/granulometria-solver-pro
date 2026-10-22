export type ProductGroup = "BLOCOS" | "PAVERS" | "LAJES" | "PRE_MOLDADOS";

/**
 * Grupos de produto habilitados nesta planta.
 * Para liberar Blocos e/ou Pavers no futuro, basta descomentar a linha correspondente.
 */
export const ENABLED_PRODUCT_GROUPS: ProductGroup[] = [
  // "BLOCOS",
  // "PAVERS",
  "LAJES",
  "PRE_MOLDADOS",
];

export const isGroupEnabled = (group: ProductGroup) =>
  ENABLED_PRODUCT_GROUPS.includes(group);
