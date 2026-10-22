import * as ExcelJSNamespace from "exceljs";
import type { CostSummary } from "@/lib/cost-metrics";

const ExcelJS: typeof ExcelJSNamespace =
  (ExcelJSNamespace as any).default ?? ExcelJSNamespace;

const BRL = '"R$" #,##0.00';

/**
 * Exporta o relatório de custos de UM segmento: Resumo, Por produto, Lotes
 * (real e estimado separados) e Traços (custo previsto por traço).
 */
export async function generateCostReportExcel(segmentoLabel: string, periodoLabel: string, s: CostSummary) {
  const wb = new ExcelJS.Workbook();

  const head = (row: ExcelJSNamespace.Row) => {
    row.font = { bold: true };
    row.eachCell((c) => {
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
    });
  };
  const fmt = (row: ExcelJSNamespace.Row, cols: number[], numFmt = BRL) => cols.forEach((c) => (row.getCell(c).numFmt = numFmt));

  // Resumo
  const resumo = wb.addWorksheet("Resumo");
  resumo.addRow([`Relatório de Custos — ${segmentoLabel}`]).font = { bold: true, size: 14 };
  resumo.addRow([`Período: ${periodoLabel}`]);
  resumo.addRow([]);
  head(resumo.addRow(["Indicador", "Valor"]));
  fmt(resumo.addRow(["Custo REAL do período", s.custoReal]), [2]);
  resumo.addRow(["Lotes com receita real", s.nLotesReal]);
  resumo.addRow(["Lotes com preço faltando (custo incompleto)", s.nLotesIncompletos]);
  fmt(resumo.addRow(["Custo médio por m³ (real)", s.custoM3Real ?? "—"]), [2]);
  fmt(resumo.addRow(["Custo médio por metro de pista (real)", s.custoMetroReal ?? "—"]), [2]);
  fmt(resumo.addRow(["Custo ESTIMADO (lotes sem receita real)", s.custoEstimado]), [2]);
  resumo.addRow(["Lotes estimados", s.nLotesEstimado]);
  fmt(resumo.addRow(["Mês atual (real)", s.custoRealMesAtual]), [2]);
  fmt(resumo.addRow(["Acumulado do ano (real)", s.custoRealAno]), [2]);
  fmt(resumo.addRow(["Custo previsto médio por m³ (por traço)", s.custoM3Previsto]), [2]);
  resumo.addRow([]);
  head(resumo.addRow(["Composição do custo real", "Valor", "%"]));
  for (const b of s.breakdown) {
    const r = resumo.addRow([b.name, b.value, Number(b.pct.toFixed(1))]);
    r.getCell(2).numFmt = BRL;
  }
  resumo.columns = [{ width: 46 }, { width: 18 }, { width: 10 }];

  // Por produto
  const prod = wb.addWorksheet("Por produto");
  head(prod.addRow(["Produto", "Lotes reais", "Lotes estimados", "R$/m³ real", "R$/m pista real", "Custo real", "Custo estimado"]));
  for (const p of s.porProduto) {
    const r = prod.addRow([p.produto, p.lotesReal, p.lotesEstimado, p.custoM3Real ?? "—", p.custoMetroReal ?? "—", p.custoReal, p.custoEstimado]);
    fmt(r, [4, 5, 6, 7]);
  }
  prod.columns = [{ width: 30 }, { width: 12 }, { width: 16 }, { width: 14 }, { width: 16 }, { width: 16 }, { width: 16 }];

  // Lotes
  const lotes = wb.addWorksheet("Lotes");
  head(lotes.addRow(["Lote", "Análise", "Produto", "Data", "Origem", "Nº traços", "Concreto (m³)", "R$/m³", "R$/m pista", "Cimento", "Agregados", "Aditivo", "Aço", "Total", "Obs."]));
  for (const l of s.lotes) {
    const r = lotes.addRow([
      l.loteCodigo,
      `${l.codigo} — ${l.nome}`,
      l.produto,
      new Date(`${l.data}T12:00:00`),
      l.origem === "real" ? "Real" : "Estimado",
      l.nTracos ?? l.baseTracos ?? "",
      l.volumeM3 ?? "",
      l.custoM3 ?? "",
      l.custoMetro,
      l.porTipo.cimento,
      l.porTipo.agregados,
      l.porTipo.aditivo,
      l.porTipo.aco,
      l.custoTotal,
      l.origem === "estimado"
        ? l.nTracos ? "Estimado: 1 traço × nº de traços" : "Estimado com 1 traço (nº de traços não informado)"
        : l.completo ? "" : `Sem preço: ${l.semPreco.join(", ")}`,
    ]);
    r.getCell(4).numFmt = "dd/mm/yyyy";
    fmt(r, [8, 9, 10, 11, 12, 13, 14]);
  }
  lotes.columns = [14, 30, 22, 12, 11, 10, 14, 12, 12, 12, 12, 12, 12, 14, 44].map((width) => ({ width }));

  // Traços (previsto)
  const tr = wb.addWorksheet("Traços (previsto)");
  head(tr.addRow(["Código", "Nome", "Produto", "Data", "R$/m³", "R$/batelada (1 traço)"]));
  for (const t of s.tracos) {
    const r = tr.addRow([t.codigo, t.nome, t.produto, new Date(`${t.data}T12:00:00`), t.custoM3, t.custoBatelada]);
    r.getCell(4).numFmt = "dd/mm/yyyy";
    fmt(r, [5, 6]);
  }
  tr.columns = [14, 28, 24, 12, 14, 22].map((width) => ({ width }));

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `custos_${segmentoLabel.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
