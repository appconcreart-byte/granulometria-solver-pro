import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  calcDesvio,
  formatQtd,
  parseQtd,
  scalePlanned,
  totalMistura,
  type Desvio,
  type ItemPreco,
  type PlannedItem,
  type RealRecipeItem,
  type RecipeUnidade,
} from "@/lib/production-recipe";
import { calcCustoLote, custoItem, indicadoresLote, type CustoLote } from "@/lib/production-cost";

const TH = "py-1.5 px-3 font-black uppercase text-[10px] tracking-wide";

const NIVEL_CLASS: Record<Desvio["nivel"], string> = {
  ok: "text-emerald-600 dark:text-emerald-400",
  atencao: "text-amber-600 dark:text-amber-400",
  alerta: "text-red-600 dark:text-red-400",
};

const fmtPct = (p: number) => {
  const v = Math.abs(p) < 0.05 ? 0 : p; // evita "−0,0"
  return `${v > 0 ? "+" : ""}${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
};

const brl = (n: number) =>
  `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function CustoCell({ valor, informado }: { valor: number | null; informado: boolean }) {
  if (!informado) return <span className="text-muted-foreground/50">—</span>;
  if (valor == null) return <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">sem preço</span>;
  return <span className="font-bold tabular-nums">{brl(valor)}</span>;
}

/** Resumo do custo real do lote: total, R$/m³, R$/m de pista, R$/traço e comparação com o previsto. */
export function CustoResumo({
  real,
  previsto,
  volumeM3,
  nTracos,
  parcial,
}: {
  real: CustoLote;
  previsto?: CustoLote;
  volumeM3?: number | null;
  nTracos?: number | null;
  /** true quando há itens sem quantidade real: o custo só cobre o que foi informado */
  parcial?: boolean;
}) {
  const ind = indicadoresLote(real.total, volumeM3, nTracos);
  const difPrev = previsto && previsto.completo && real.completo ? real.total - previsto.total : null;
  const card = "rounded-md border bg-muted/20 px-3 py-2";
  const lab = "text-[10px] font-bold uppercase tracking-wider text-muted-foreground";
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className={card}>
          <p className={lab}>Custo real</p>
          <p className="text-base font-black tabular-nums">{brl(real.total)}</p>
          {difPrev != null && (
            <p className={cn("text-[10px] font-semibold", difPrev > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
              {difPrev > 0 ? "+" : ""}{brl(difPrev)} vs previsto
            </p>
          )}
        </div>
        <div className={card}>
          <p className={lab}>R$ / m³</p>
          <p className="text-base font-black tabular-nums">{ind.custoM3 != null ? brl(ind.custoM3) : "—"}</p>
          {ind.custoM3 == null && <p className="text-[10px] text-muted-foreground">sem volume de concreto</p>}
        </div>
        <div className={card}>
          <p className={lab}>R$ / m de pista</p>
          <p className="text-base font-black tabular-nums">{brl(ind.custoMetro)}</p>
        </div>
        <div className={card}>
          <p className={lab}>R$ / traço</p>
          <p className="text-base font-black tabular-nums">{ind.custoTraco != null ? brl(ind.custoTraco) : "—"}</p>
        </div>
      </div>
      {parcial && (
        <p className="text-[11px] font-semibold text-muted-foreground">
          Custo parcial: os itens sem quantidade real não entram na conta.
        </p>
      )}
      {!real.completo && (
        <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
          ⚠️ Custo incompleto: sem preço cadastrado para {real.semPreco.join(", ")}. Cadastre o preço em Produtos.
        </p>
      )}
    </div>
  );
}

const fmtSinal = (n: number, un: RecipeUnidade) => `${n > 0 ? "+" : ""}${formatQtd(n, un)}`;

function DesvioCell({ item }: { item: Pick<RealRecipeItem, "previsto" | "real" | "unidade"> }) {
  const d = calcDesvio(item);
  if (!d) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("font-bold tabular-nums", NIVEL_CLASS[d.nivel])}>
      {fmtSinal(d.diff, item.unidade)}
      {d.pct != null && <span className="ml-1 text-[10px] font-semibold">({fmtPct(d.pct)}%)</span>}
    </span>
  );
}

function Qtd({ n, un, className }: { n: number; un: RecipeUnidade; className?: string }) {
  return (
    <span className={cn("tabular-nums", className)}>
      {formatQtd(n, un)} <span className="text-[10px] font-semibold text-muted-foreground">{un}</span>
    </span>
  );
}

/** Receita prevista de 1 traço (da análise) — somente leitura. */
export function PlannedRecipeTable({ items, capacidadeKg }: { items: PlannedItem[]; capacidadeKg?: number }) {
  const { total } = totalMistura(items, "previsto");
  const acima = capacidadeKg != null && total > capacidadeKg;

  return (
    <div className="space-y-2">
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className={cn(TH, "text-left")}>Material</th>
              <th className={cn(TH, "text-right")}>Qtd. por traço</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((i) => (
              <tr key={i.chave} className={i.tipo === "agua" ? "bg-blue-50/30 dark:bg-blue-950/20" : undefined}>
                <td
                  className={cn(
                    "py-1.5 px-3",
                    i.tipo === "cimento" && "font-bold",
                    i.tipo === "agua" && "font-bold text-blue-600 dark:text-blue-400",
                    (i.tipo === "agregado" || i.tipo === "aditivo" || i.tipo === "aco") && "text-muted-foreground",
                  )}
                >
                  {i.nome}
                </td>
                <td className="py-1.5 px-3 text-right font-bold">
                  <Qtd n={i.previsto} un={i.unidade} />
                </td>
              </tr>
            ))}
            <tr className="bg-muted/30 font-black">
              <td className="py-2 px-3 uppercase">Total do traço</td>
              <td className="py-2 px-3 text-right text-sm tabular-nums">{formatQtd(total, "kg")} kg</td>
            </tr>
          </tbody>
        </table>
      </div>
      {acima && (
        <p className="text-[10px] text-destructive font-bold">
          ⚠️ ATENÇÃO: massa de 1 traço excede a capacidade de {capacidadeKg} kg do misturador!
        </p>
      )}
    </div>
  );
}

/**
 * Receita real utilizada (soma de todos os traços da pista), editável.
 * Os números previstos aparecem como texto de fundo (placeholder): campo em
 * branco = não informado.
 */
export function RealRecipeEditor({
  planned,
  nTracos,
  values,
  onChange,
  precos,
  volumeM3,
}: {
  /** Receita prevista de 1 traço */
  planned: PlannedItem[];
  nTracos: number | null;
  values: Record<string, string>;
  onChange: (chave: string, value: string) => void;
  /** Preço de cada item (chave → preço); habilita a coluna de custo */
  precos?: Record<string, ItemPreco | null>;
  /** Volume de concreto do lote (m³), para o R$/m³ */
  volumeM3?: number | null;
}) {
  const n = nTracos && nTracos > 0 ? nTracos : 1;
  const scaled = scalePlanned(planned, n);
  const comReal = scaled.map((i) => ({ ...i, real: parseQtd(values[i.chave]) }));
  const prev = totalMistura(comReal, "previsto");
  const real = totalMistura(comReal, "real");
  const algumInformado = comReal.some((i) => i.real != null);
  const comCusto = !!precos;
  const custoReal = precos
    ? calcCustoLote(comReal.map((i) => ({ ...i, preco: precos[i.chave] ?? null })), "real")
    : null;

  return (
    <div className="space-y-3">
    <div className="rounded-md border overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className={cn(TH, "text-left")}>Material</th>
            <th className={cn(TH, "text-right")}>Previsto{n > 1 ? ` (×${n})` : ""}</th>
            <th className={cn(TH, "text-right")}>Real</th>
            <th className={cn(TH, "text-right")}>Dif.</th>
            {comCusto && <th className={cn(TH, "text-right")}>Custo</th>}
          </tr>
        </thead>
        <tbody className="divide-y">
          {comReal.map((i) => (
            <tr key={i.chave}>
              <td className={cn("py-1 px-3", i.tipo === "cimento" ? "font-bold" : "text-muted-foreground")}>{i.nome}</td>
              <td className="py-1 px-3 text-right text-muted-foreground">
                <Qtd n={i.previsto} un={i.unidade} />
              </td>
              <td className="py-1 px-2">
                <div className="flex items-center justify-end gap-1">
                  <Input
                    inputMode="decimal"
                    aria-label={`${i.nome} — quantidade real`}
                    value={values[i.chave] ?? ""}
                    onChange={(e) => onChange(i.chave, e.target.value)}
                    placeholder={formatQtd(i.previsto, i.unidade)}
                    className="w-24 h-7 text-xs text-right font-bold tabular-nums placeholder:font-normal placeholder:text-muted-foreground/40"
                  />
                  <span className="w-5 text-left text-[10px] font-semibold text-muted-foreground">{i.unidade}</span>
                </div>
              </td>
              <td className="py-1 px-3 text-right whitespace-nowrap">
                <DesvioCell item={i} />
              </td>
              {comCusto && (
                <td className="py-1 px-3 text-right whitespace-nowrap">
                  <CustoCell
                    informado={i.real != null}
                    valor={i.real != null ? custoItem(i, i.real, precos![i.chave]) : null}
                  />
                </td>
              )}
            </tr>
          ))}
          <tr className="bg-muted/30 font-black">
            <td className="py-2 px-3 uppercase">Total da mistura</td>
            <td className="py-2 px-3 text-right text-muted-foreground tabular-nums">{formatQtd(prev.total, "kg")} kg</td>
            <td className="py-2 px-3 text-right tabular-nums">
              {algumInformado ? `${formatQtd(real.total, "kg")} kg` : <span className="text-muted-foreground/50 font-normal">—</span>}
            </td>
            <td className="py-2 px-3 text-right text-[10px] font-semibold text-muted-foreground">
              {algumInformado && real.parcial ? "parcial" : ""}
            </td>
            {comCusto && (
              <td className="py-2 px-3 text-right tabular-nums">
                {algumInformado && custoReal ? brl(custoReal.total) : <span className="text-muted-foreground/50 font-normal">—</span>}
              </td>
            )}
          </tr>
        </tbody>
      </table>
    </div>
    {comCusto && algumInformado && custoReal && (
      <CustoResumo real={custoReal} volumeM3={volumeM3} nTracos={nTracos} parcial={comReal.some((i) => i.real == null)} />
    )}
    </div>
  );
}

/** Previsto x real de um lote já registrado — somente leitura, com custo pelo preço gravado no lote. */
export function RecipeComparisonTable({
  itens,
  volumeM3,
  nTracos,
}: {
  itens: RealRecipeItem[];
  volumeM3?: number | null;
  nTracos?: number | null;
}) {
  const prev = totalMistura(itens, "previsto");
  const real = totalMistura(itens, "real");
  const algumInformado = itens.some((i) => i.real != null);
  const custoReal = calcCustoLote(itens, "real");
  const custoPrev = calcCustoLote(itens, "previsto");
  const temPreco = itens.some((i) => i.preco);

  return (
    <div className="space-y-3">
      <div className="rounded-md border overflow-hidden overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className={cn(TH, "text-left")}>Material</th>
              <th className={cn(TH, "text-right")}>Previsto</th>
              <th className={cn(TH, "text-right")}>Real</th>
              <th className={cn(TH, "text-right")}>Dif.</th>
              {temPreco && <th className={cn(TH, "text-right")}>Custo real</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {itens.map((i) => (
              <tr key={i.chave}>
                <td className={cn("py-1.5 px-3", i.tipo === "cimento" ? "font-bold" : "text-muted-foreground")}>{i.nome}</td>
                <td className="py-1.5 px-3 text-right text-muted-foreground">
                  <Qtd n={i.previsto} un={i.unidade} />
                </td>
                <td className="py-1.5 px-3 text-right font-bold">
                  {i.real != null ? <Qtd n={i.real} un={i.unidade} /> : <span className="font-normal text-muted-foreground">—</span>}
                </td>
                <td className="py-1.5 px-3 text-right whitespace-nowrap">
                  <DesvioCell item={i} />
                </td>
                {temPreco && (
                  <td className="py-1.5 px-3 text-right whitespace-nowrap">
                    <CustoCell informado={i.real != null} valor={custoReal.porItem[i.chave] ?? null} />
                  </td>
                )}
              </tr>
            ))}
            <tr className="bg-muted/30 font-black">
              <td className="py-2 px-3 uppercase">Total da mistura</td>
              <td className="py-2 px-3 text-right text-muted-foreground tabular-nums">{formatQtd(prev.total, "kg")} kg</td>
              <td className="py-2 px-3 text-right tabular-nums">{algumInformado ? `${formatQtd(real.total, "kg")} kg` : "—"}</td>
              <td className="py-2 px-3 text-right text-[10px] font-semibold text-muted-foreground">
                {algumInformado && real.parcial ? "parcial" : ""}
              </td>
              {temPreco && <td className="py-2 px-3 text-right tabular-nums">{algumInformado ? brl(custoReal.total) : "—"}</td>}
            </tr>
          </tbody>
        </table>
      </div>
      {temPreco && algumInformado && (
        <CustoResumo real={custoReal} previsto={custoPrev} volumeM3={volumeM3} nTracos={nTracos} parcial={itens.some((i) => i.real == null)} />
      )}
    </div>
  );
}
