export type ProductGroup = "BLOCOS" | "PAVERS" | "LAJES";

/**
 * Grupos de produto habilitados nesta planta.
 * Para liberar Blocos e/ou Pavers no futuro, basta descomentar a linha correspondente.
 */
export const ENABLED_PRODUCT_GROUPS: ProductGroup[] = [
  // "BLOCOS",
  // "PAVERS",
  "LAJES",
];

export const isGroupEnabled = (group: ProductGroup) =>
  ENABLED_PRODUCT_GROUPS.includes(group);
