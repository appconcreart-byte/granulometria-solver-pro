import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useProduction } from "@/hooks/api/useProduction";
import { FIOS_OPCOES, PISTAS } from "@/lib/production-loss";
import { filterRecords, summarize, toPistaRecords, type PistaFilters } from "@/lib/pista-metrics";
import { generatePistaMetricsExcel } from "@/lib/pista-metrics-excel";

const ALL = "all";
const FIOS_COLORS: Record<number, string> = { 3: "#2563eb", 5: "#f59e0b", 7: "#10b981" };
const PISTA_COLORS: Record<string, string> = { A: "#2563eb", B: "#f59e0b", C: "#10b981" };
const AXIS = { fontSize: 12, fill: "hsl(var(--muted-foreground))" };

// Tooltip padrão dos gráficos: a 1ª linha é o título, as demais são "rótulo / valor"
function ChartTooltip({ active, payload, rows }: { active?: boolean; payload?: any[]; rows: (p: any) => [string, string][] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-md space-y-0.5">
      {rows(p).map(([k, v], i) =>
        i === 0 ? (
          <div key={k + v} className="font-bold text-sm mb-1">{v}</div>
        ) : (
          <div key={k} className="flex justify-between gap-4">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-semibold">{v}</span>
          </div>
        ),
      )}
    </div>
  );
}

const toDay = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

function currentMonthRange() {
  const now = new Date();
  return {
    from: toDay(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

const fmt = (n: number, d = 2) => n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-3xl font-black mt-1">{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default function PistaMetricsPage() {
  const { batches, isLoadingBatches } = useProduction();
  const [filters, setFilters] = useState<PistaFilters>({ ...currentMonthRange(), pista: "", fios: "" });

  const set = (patch: Partial<PistaFilters>) => setFilters((f) => ({ ...f, ...patch }));

  const allRecords = useMemo(() => toPistaRecords(batches), [batches]);
  const records = useMemo(() => filterRecords(allRecords, filters), [allRecords, filters]);
  const summary = useMemo(() => summarize(records), [records]);

  const evolucao = useMemo(
    () =>
      records.map((r) => ({
        data: new Date(r.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        perda: Number(r.perdaPct.toFixed(3)),
        lote: r.loteCodigo,
        pista: r.pista,
        metros: r.metrosPerda,
      })),
    [records],
  );

  const handleExport = async () => {
    try {
      const periodo = filters.from || filters.to ? `${filters.from || "..."} a ${filters.to || "..."}` : "";
      await generatePistaMetricsExcel(records, summary, periodo);
      toast.success("Planilha exportada com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao exportar planilha");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold">Métricas de Pista</h1>
          <p className="text-muted-foreground mt-1">
            Eficiência das concretagens de pista (pista de {1600} m): perda e aproveitamento no período.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExport} disabled={records.length === 0}>
          <Download className="h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="pm-from">De</Label>
            <Input id="pm-from" type="date" value={filters.from} onChange={(e) => set({ from: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pm-to">Até</Label>
            <Input id="pm-to" type="date" value={filters.to} onChange={(e) => set({ to: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Pista</Label>
            <Select value={filters.pista || ALL} onValueChange={(v) => set({ pista: v === ALL ? "" : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {PISTAS.map((p) => (
                  <SelectItem key={p} value={p}>Pista {p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Fios</Label>
            <Select value={filters.fios || ALL} onValueChange={(v) => set({ fios: v === ALL ? "" : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {FIOS_OPCOES.map((f) => (
                  <SelectItem key={f} value={String(f)}>{f} fios</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setFilters({ ...currentMonthRange(), pista: "", fios: "" })}>
              Mês atual
            </Button>
            <Button variant="outline" size="sm" onClick={() => setFilters({ from: "", to: "", pista: "", fios: "" })}>
              Tudo
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoadingBatches ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : records.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhuma concretagem de pista no período. Registre produções com Pista, Fios e Volume informados para ver as métricas.
        </div>
      ) : (
        <>
          {/* Resumo (equivale à linha TOTAL da planilha) */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              label="Qtd. de Pistas"
              value={String(summary.qtdPistas)}
              hint={summary.porFios.map((f) => `${f.fios} fios: ${f.qtd}`).join(" · ")}
            />
            <StatCard label="Volume de Concreto" value={`${fmt(summary.volume, 1)} m³`} />
            <StatCard label="Metros de Perda" value={`${fmt(summary.metrosPerda)} m`} />
            <StatCard label="% Perda" value={`${fmt(summary.perdaPct, 3)}%`} />
            <StatCard label="% Aproveitamento" value={`${fmt(summary.aproveitamentoPct, 3)}%`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Pistas por tipo de fio</CardTitle></CardHeader>
              <CardContent>
                <div className="relative h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary.porFios.map((f) => ({ name: `${f.fios} fios`, fios: f.fios, value: f.qtd }))}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={62}
                        outerRadius={92}
                        paddingAngle={summary.porFios.length > 1 ? 3 : 0}
                        cornerRadius={4}
                        stroke="none"
                      >
                        {summary.porFios.map((f) => (
                          <Cell key={f.fios} fill={FIOS_COLORS[f.fios] ?? "#64748b"} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => (
                          <ChartTooltip
                            active={active}
                            payload={payload as any[]}
                            rows={(p) => [
                              ["", p.name],
                              ["Pistas", String(p.value)],
                              ["Participação", `${fmt((p.value * 100) / summary.qtdPistas, 0)}%`],
                            ]}
                          />
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black leading-none">{summary.qtdPistas}</span>
                    <span className="text-xs text-muted-foreground">{summary.qtdPistas === 1 ? "pista" : "pistas"}</span>
                  </div>
                </div>
                <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 mt-2 text-sm">
                  {summary.porFios.map((f) => (
                    <div key={f.fios} className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: FIOS_COLORS[f.fios] ?? "#64748b" }} />
                      <span>{f.fios} fios</span>
                      <span className="font-bold">{f.qtd}</span>
                      <span className="text-muted-foreground">({fmt((f.qtd * 100) / summary.qtdPistas, 0)}%)</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Comparativo entre pistas (% perda)</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={summary.porPista.map((p) => ({ ...p, nome: `Pista ${p.pista}`, perda: Number(p.perdaPct.toFixed(3)) }))}
                    margin={{ top: 24, right: 8, left: -8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="nome" tick={AXIS} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, "auto"]} />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                      content={({ active, payload }) => (
                        <ChartTooltip
                          active={active}
                          payload={payload as any[]}
                          rows={(p) => [
                            ["", p.nome],
                            ["Concretagens", String(p.qtd)],
                            ["Metros de perda", `${fmt(p.metrosPerda)} m`],
                            ["% Perda", `${fmt(p.perdaPct, 3)}%`],
                            ["% Aproveitamento", `${fmt(p.aproveitamentoPct, 3)}%`],
                          ]}
                        />
                      )}
                    />
                    <Bar dataKey="perda" radius={[6, 6, 0, 0]} maxBarSize={64}>
                      {summary.porPista.map((p) => (
                        <Cell key={p.pista} fill={PISTA_COLORS[p.pista] ?? "#64748b"} />
                      ))}
                      <LabelList
                        dataKey="perda"
                        position="top"
                        formatter={(v: number) => `${fmt(v, 2)}%`}
                        style={{ fontSize: 12, fontWeight: 700, fill: "hsl(var(--foreground))" }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Evolução da % de perda</CardTitle>
              <span className="text-xs text-muted-foreground">
                Linha tracejada = média do período ({fmt(summary.perdaPct, 3)}%)
              </span>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolucao} margin={{ top: 16, right: 24, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="perdaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="data" tick={AXIS} axisLine={false} tickLine={false} padding={{ left: 24, right: 24 }} />
                  <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, "auto"]} />
                  <ReferenceLine y={summary.perdaPct} stroke="#ef4444" strokeDasharray="5 4" />
                  <Tooltip
                    content={({ active, payload }) => (
                      <ChartTooltip
                        active={active}
                        payload={payload as any[]}
                        rows={(p) => [
                          ["", `${p.data} · Pista ${p.pista}`],
                          ["Lote", p.lote],
                          ["Metros de perda", `${fmt(p.metros)} m`],
                          ["% Perda", `${fmt(p.perda, 3)}%`],
                        ]}
                      />
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="perda"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fill="url(#perdaFill)"
                    dot={{ r: 4, fill: "#2563eb", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tabela detalhada (mesmas colunas da planilha) */}
          <Card>
            <CardHeader><CardTitle className="text-base">Concretagens</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-4">Data</th>
                    <th className="pr-4">Lote</th>
                    <th className="pr-4">Pista</th>
                    <th className="pr-4">Fios</th>
                    <th className="pr-4 text-right">Volume (m³)</th>
                    <th className="pr-4 text-right">Mts perda</th>
                    <th className="pr-4 text-right">% Perda</th>
                    <th className="text-right">% Aproveit.</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 pr-4">{new Date(r.data).toLocaleDateString("pt-BR")}</td>
                      <td className="pr-4">{r.loteCodigo}</td>
                      <td className="pr-4">{r.pista}</td>
                      <td className="pr-4">{r.fios}</td>
                      <td className="pr-4 text-right">{fmt(r.volume, 1)}</td>
                      <td className="pr-4 text-right">{fmt(r.metrosPerda)}</td>
                      <td className="pr-4 text-right">{fmt(r.perdaPct)}</td>
                      <td className="text-right">{fmt(r.aproveitamentoPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
