import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { DollarSign, TrendingDown, TrendingUp, ArrowLeft, RefreshCw, Package, Download, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useCostMetrics } from "@/hooks/api/useCostMetrics";
import { StatusBadge } from "@/components/StatusBadge";
import { SEGMENTOS, type CostSummary, type Segmento } from "@/lib/cost-metrics";
import { generateCostReportExcel } from "@/lib/cost-report-excel";

const BRAND_RED = "hsl(var(--chart-primary))";
const BRAND_RED_MED = "hsl(var(--chart-primary-light))";
const BRAND_RED_LIGHT = "hsl(var(--chart-primary-soft))";
const ESTIMADO = "hsl(var(--muted-foreground) / 0.35)";
const PIE_COLORS = [BRAND_RED, BRAND_RED_MED, BRAND_RED_LIGHT, "hsl(var(--chart-primary-soft) / 0.6)"];

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const brl = (n: number) =>
  `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TH = "text-[11px] font-bold uppercase tracking-wide h-9";

function OrigemBadge({ origem, semPreco }: { origem: "real" | "estimado"; semPreco?: boolean }) {
  if (origem === "estimado") {
    return <Badge variant="outline" className="text-[10px] border-dashed text-muted-foreground">Estimado</Badge>;
  }
  return (
    <Badge variant="outline" className="text-[10px] border-primary/40 text-primary gap-1">
      Real
      {semPreco && <AlertTriangle className="h-3 w-3 text-amber-500" />}
    </Badge>
  );
}

interface SegmentViewProps {
  summary: CostSummary;
  segmentoLabel: string;
  filterYear: string;
  filterMonth: string;
  periodoLabel: string;
}

function SegmentView({ summary: s, segmentoLabel, filterYear, filterMonth, periodoLabel }: SegmentViewProps) {
  const [showTracos, setShowTracos] = useState(false);
  const hasData = s.nLotes > 0 || s.tracos.length > 0;

  const handleExport = async () => {
    try {
      await generateCostReportExcel(segmentoLabel, periodoLabel, s);
      toast.success("Planilha exportada com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao exportar planilha");
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Custo Real</p>
            <p className="text-2xl font-black text-foreground mt-1">{s.custoReal > 0 ? brl(s.custoReal) : "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {s.nLotesReal} de {s.nLotes} lotes com receita real
            </p>
            {s.nLotesIncompletos > 0 && (
              <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {s.nLotesIncompletos} lote(s) com preço faltando
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Custo Médio / m³ (real)</p>
            <p className="text-2xl font-black text-foreground mt-1">{s.custoM3Real != null ? brl(s.custoM3Real) : "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {s.custoMetroReal != null ? `${brl(s.custoMetroReal)} por metro de pista` : "Sem lotes reais completos"}
            </p>
            {s.custoM3Previsto > 0 && (
              <p className="text-[11px] text-muted-foreground mt-0.5">Previsto: {brl(s.custoM3Previsto)}/m³</p>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Mês Atual (real)</p>
            <p className="text-2xl font-black text-foreground mt-1">{s.custoRealMesAtual > 0 ? brl(s.custoRealMesAtual) : "—"}</p>
            {s.variacaoMensal !== 0 && (
              <p className={`text-xs font-semibold mt-1 flex items-center gap-1 ${s.variacaoMensal <= 0 ? "text-success" : "text-destructive"}`}>
                {s.variacaoMensal <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                {s.variacaoMensal > 0 ? "+" : ""}{s.variacaoMensal.toFixed(1)}% vs mês anterior
              </p>
            )}
            {s.custoEstimadoMesAtual > 0 && (
              <p className="text-[11px] text-muted-foreground mt-0.5">+ {brl(s.custoEstimadoMesAtual)} estimado</p>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Acumulado {filterYear} (real)</p>
            <p className="text-2xl font-black text-foreground mt-1">{s.custoRealAno > 0 ? brl(s.custoRealAno) : "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">Ano inteiro</p>
            {s.custoEstimadoAno > 0 && (
              <p className="text-[11px] text-muted-foreground mt-0.5">+ {brl(s.custoEstimadoAno)} estimado</p>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-muted-foreground/40 border-dashed">
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Estimado (sem receita real)</p>
            <p className="text-2xl font-black text-muted-foreground mt-1">{s.custoEstimado > 0 ? brl(s.custoEstimado) : "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {s.nLotesEstimado > 0
                ? `${s.nLotesEstimado} lote(s) aguardando a receita real`
                : "Todos os lotes têm receita real"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Evolução Mensal */}
        <Card className="shadow-sm">
          <CardHeader className="pb-1 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold text-foreground">Evolução Mensal — {segmentoLabel}</CardTitle>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: BRAND_RED }} />Real</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: ESTIMADO }} />Estimado</span>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={s.mensais} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} width={60}
                  tickFormatter={(v) => v > 0 ? `R$${v}` : "0"} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="rounded-lg border bg-white dark:bg-card shadow-lg px-4 py-3 text-sm">
                        <p className="font-bold mb-1">{label}</p>
                        <p>Real: <strong>{brl(Number(d?.real || 0))}</strong></p>
                        <p className="text-muted-foreground">Estimado: {brl(Number(d?.estimado || 0))}</p>
                        <p className="text-muted-foreground">{d?.batchCount || 0} lote(s)</p>
                      </div>
                    );
                  }}
                  cursor={{ fill: "hsl(var(--muted))" }}
                />
                <Bar dataKey="real" stackId="c" fill={BRAND_RED} maxBarSize={40} />
                <Bar dataKey="estimado" stackId="c" fill={ESTIMADO} radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Composição do custo real */}
        <Card className="shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-bold text-foreground">Composição do Custo Real — {periodoLabel}</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {s.custoReal > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={s.breakdown.filter((b) => b.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {s.breakdown.filter((b) => b.value > 0).map((b) => (
                        <Cell key={b.name} fill={PIE_COLORS[s.breakdown.findIndex((x) => x.name === b.name)]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 w-full space-y-3">
                  {s.breakdown.map((b, i) => (
                    <div key={b.name} className="flex items-center gap-2.5">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ background: PIE_COLORS[i] }} />
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{b.name}</span>
                          <span className="font-bold">{brl(b.value)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full mt-1 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${b.pct}%`, background: PIE_COLORS[i] }} />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-muted-foreground w-10 text-right">{b.pct.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic py-16 text-center">
                Nenhum lote com receita real em {periodoLabel}. Informe a receita real no modal do lote.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Custo por produto */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-bold text-foreground">Custo por Produto — {segmentoLabel}</CardTitle>
          <Button variant="outline" size="sm" className="gap-2 h-8 text-xs" onClick={handleExport} disabled={!hasData}>
            <Download className="h-3.5 w-3.5" />
            Exportar Excel
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {s.porProduto.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
              <div className="rounded-md border overflow-hidden overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className={TH}>Produto</TableHead>
                      <TableHead className={`${TH} text-right`}>Lotes</TableHead>
                      <TableHead className={`${TH} text-right`}>R$/m³</TableHead>
                      <TableHead className={`${TH} text-right`}>R$/m</TableHead>
                      <TableHead className={`${TH} text-right`}>Real</TableHead>
                      <TableHead className={`${TH} text-right`}>Estimado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {s.porProduto.map((p) => (
                      <TableRow key={p.produto} className="hover:bg-muted/30">
                        <TableCell className="text-sm font-semibold">{p.produto}</TableCell>
                        <TableCell className="text-right text-xs">
                          {p.lotesReal} real{p.lotesEstimado > 0 ? ` · ${p.lotesEstimado} est.` : ""}
                        </TableCell>
                        <TableCell className="text-right font-bold">{p.custoM3Real != null ? brl(p.custoM3Real) : "—"}</TableCell>
                        <TableCell className="text-right">{p.custoMetroReal != null ? brl(p.custoMetroReal) : "—"}</TableCell>
                        <TableCell className="text-right font-black">{p.custoReal > 0 ? brl(p.custoReal) : "—"}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{p.custoEstimado > 0 ? brl(p.custoEstimado) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ResponsiveContainer width="100%" height={Math.max(180, s.porProduto.length * 44)}>
                <BarChart data={s.porProduto.filter((p) => p.custoM3Real != null)} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" fontSize={11} tickLine={false} axisLine={false}
                    tickFormatter={(v) => v > 0 ? `R$${v}` : "0"} />
                  <YAxis type="category" dataKey="produto" fontSize={11} tickLine={false} axisLine={false} width={110} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-white dark:bg-card shadow-lg px-4 py-3 text-sm">
                          <p className="font-bold mb-1">{d.produto}</p>
                          <p>R$/m³ real: <strong>{brl(d.custoM3Real)}</strong></p>
                          {d.custoMetroReal != null && <p>R$/m de pista: <strong>{brl(d.custoMetroReal)}</strong></p>}
                          <p className="text-muted-foreground">{d.lotesReal} lote(s) real(is)</p>
                        </div>
                      );
                    }}
                    cursor={{ fill: "hsl(var(--muted))" }}
                  />
                  <Bar dataKey="custoM3Real" fill={BRAND_RED} radius={[0, 4, 4, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic py-6 text-center">
              Nenhum lote de {segmentoLabel} em {periodoLabel}.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Lotes */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-foreground">Lotes de Produção</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-md border overflow-hidden overflow-x-auto overflow-y-auto max-h-[480px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow className="bg-muted/40">
                  <TableHead className={TH}>Lote</TableHead>
                  <TableHead className={TH}>Análise</TableHead>
                  <TableHead className={TH}>Produto</TableHead>
                  <TableHead className={TH}>Data</TableHead>
                  <TableHead className={TH}>Origem</TableHead>
                  <TableHead className={`${TH} text-right`}>Traços</TableHead>
                  <TableHead className={`${TH} text-right`}>Concreto</TableHead>
                  <TableHead className={`${TH} text-right`}>R$/m³</TableHead>
                  <TableHead className={`${TH} text-right`}>R$/m</TableHead>
                  <TableHead className={`${TH} text-right`}>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.lotes.length > 0 ? (
                  s.lotes.map((l) => (
                    <TableRow key={l.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs font-bold">
                        <div className="flex items-center gap-2">
                          <Package className="h-3 w-3 text-muted-foreground" />
                          {l.loteCodigo}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="font-mono text-xs font-bold">{l.codigo}</span>
                        <span className="text-muted-foreground"> · {l.nome}</span>
                      </TableCell>
                      <TableCell className="text-sm">{l.produto}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(`${l.data}T12:00:00`).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell><OrigemBadge origem={l.origem} semPreco={!l.completo} /></TableCell>
                      <TableCell className="text-right text-sm">
                        {l.origem === "real"
                          ? (l.nTracos ?? "—")
                          : <span className="text-muted-foreground" title={l.nTracos ? undefined : "Nº de traços não informado: estimado com 1 traço"}>{l.baseTracos}{l.nTracos ? "" : "*"}</span>}
                      </TableCell>
                      <TableCell className="text-right text-sm">{l.volumeM3 != null ? `${l.volumeM3.toLocaleString("pt-BR")} m³` : "—"}</TableCell>
                      <TableCell className="text-right text-sm">{l.custoM3 != null ? brl(l.custoM3) : "—"}</TableCell>
                      <TableCell className="text-right text-sm">{brl(l.custoMetro)}</TableCell>
                      <TableCell className={`text-right font-black ${l.origem === "estimado" ? "text-muted-foreground" : ""}`}>
                        {brl(l.custoTotal)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-muted-foreground italic">
                      Nenhum lote de {segmentoLabel} em {filterMonth !== "00" ? `${filterMonth}/${filterYear}` : filterYear}.
                    </TableCell>
                  </TableRow>
                )}
                {s.lotes.length > 0 && (
                  <TableRow className="bg-muted/30 font-black">
                    <TableCell colSpan={9} className="text-right uppercase text-xs">Total real</TableCell>
                    <TableCell className="text-right text-primary">{brl(s.custoReal)}</TableCell>
                  </TableRow>
                )}
                {s.custoEstimado > 0 && (
                  <TableRow className="bg-muted/10">
                    <TableCell colSpan={9} className="text-right uppercase text-xs text-muted-foreground">Total estimado (separado)</TableCell>
                    <TableCell className="text-right font-bold text-muted-foreground">{brl(s.custoEstimado)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {s.lotes.some((l) => l.origem === "estimado") && (
            <p className="text-[11px] text-muted-foreground mt-2">
              Estimado = custo de 1 traço × nº de traços (+ aço previsto), a preços atuais. Informe a receita real no modal do lote para obter o custo real. * nº de traços não informado: estimado com 1 traço.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top Traços (previsto) */}
      {s.top.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2 flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm font-bold text-foreground">Top 5 Traços — Maior Custo Previsto por m³</CardTitle>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setShowTracos(!showTracos)}>
              {showTracos ? "Ocultar" : "Ver"} todos os traços
            </Button>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="space-y-2">
              {s.top.map((t, idx) => (
                <div key={t.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <span className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-black text-primary">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{t.nome || t.codigo}</p>
                    <p className="text-[11px] text-muted-foreground">{t.codigo} · {t.produto}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-foreground">{brl(t.custoM3)}/m³</span>
                    <span className="text-xs text-muted-foreground block">{brl(t.custoBatelada)} por traço</span>
                  </div>
                </div>
              ))}
            </div>
            {showTracos && (
              <div className="rounded-md border overflow-hidden overflow-x-auto max-h-[360px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow className="bg-muted/40">
                      <TableHead className={TH}>Código</TableHead>
                      <TableHead className={TH}>Nome</TableHead>
                      <TableHead className={TH}>Produto</TableHead>
                      <TableHead className={TH}>Data</TableHead>
                      <TableHead className={TH}>Status</TableHead>
                      <TableHead className={`${TH} text-right`}>R$/m³</TableHead>
                      <TableHead className={`${TH} text-right`}>R$/traço</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {s.tracos.map((t) => (
                      <TableRow key={t.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs font-bold">{t.codigo}</TableCell>
                        <TableCell className="text-sm">{t.nome}</TableCell>
                        <TableCell className="text-sm">{t.produto}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(`${t.data}T12:00:00`).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell><StatusBadge status={t.status as any} /></TableCell>
                        <TableCell className="text-right font-bold">{brl(t.custoM3)}</TableCell>
                        <TableCell className="text-right">{brl(t.custoBatelada)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const CostReportPage = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
  const [filterYear, setFilterYear] = useState(String(currentYear));
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [segmento, setSegmento] = useState<Segmento>("laje");

  const costs = useCostMetrics({ year: filterYear, month: filterMonth });

  // Anos disponíveis para filtro
  const availableYears = useMemo(() => {
    const years = new Set<string>([String(currentYear)]);
    for (const l of costs.allData.lotes) if (l.data) years.add(l.data.slice(0, 4));
    for (const t of costs.allData.tracos) if (t.data) years.add(t.data.slice(0, 4));
    return Array.from(years).sort().reverse();
  }, [costs.allData, currentYear]);

  const periodoLabel = filterMonth !== "00"
    ? `${MONTHS[Number(filterMonth) - 1]}/${filterYear}`
    : filterYear;

  if (costs.isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" />
              Relatório de Custos
            </h1>
            <p className="text-sm text-muted-foreground">
              Custo real da produção por lote, separado por segmento
            </p>
          </div>
        </div>

        {/* Filtros de período (valem para os dois segmentos) */}
        <div className="flex items-center gap-2">
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="00">Todos os meses</SelectItem>
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i + 1).padStart(2, "0")}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={segmento} onValueChange={(v) => setSegmento(v as Segmento)} className="space-y-6">
        <TabsList>
          {SEGMENTOS.map((s) => (
            <TabsTrigger key={s.value} value={s.value} className="gap-2">
              {s.label}
              <span className="text-[10px] font-bold opacity-70">{costs[s.value].nLotes}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {SEGMENTOS.map((s) => (
          <TabsContent key={s.value} value={s.value} className="mt-0">
            <SegmentView
              summary={costs[s.value]}
              segmentoLabel={s.label}
              filterYear={filterYear}
              filterMonth={filterMonth}
              periodoLabel={periodoLabel}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default CostReportPage;
