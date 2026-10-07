import * as ExcelJSNamespace from "exceljs";
import type { PistaRecord, PistaSummary } from "@/lib/pista-metrics";

const ExcelJS: typeof ExcelJSNamespace =
  (ExcelJSNamespace as any).default ?? ExcelJSNamespace;

/** Gera uma planilha no mesmo formato de "REGISTRO DE CONCRETAGEM" (linhas + TOTAL). */
export async function generatePistaMetricsExcel(records: PistaRecord[], summary: PistaSummary, periodo: string) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("REGISTRO DE CONCRETAGEM");

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = `REGISTRO DE CONCRETAGENS DE PISTA${periodo ? ` — ${periodo}` : ""}`;
  ws.getCell("A1").font = { bold: true, size: 14 };
  ws.getCell("A1").alignment = { horizontal: "center" };
  ws.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };

  const header = ws.addRow(["DATA", "PISTA", "FIOS", "VOLUME", "MTS PERDA", "%PERDA", "%APROVEITAMENTO"]);
  header.font = { bold: true };
  header.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF00B0F0" } };
    c.alignment = { horizontal: "center" };
  });

  records.forEach((r) => {
    ws.addRow([
      new Date(r.data),
      r.pista,
      r.fios,
      r.volume,
      r.metrosPerda,
      Number(r.perdaPct.toFixed(2)),
      Number(r.aproveitamentoPct.toFixed(2)),
    ]);
  });
  ws.getColumn(1).numFmt = "dd/mm/yyyy";

  ws.addRow([]);
  const totalHeader = ws.addRow(["TOTAL", "QTD PISTA", "TIPO FIOS", "VOLUME", "MTS PERDA", "%PERDA", "%APROVEITAMENTO"]);
  totalHeader.font = { bold: true };
  ws.addRow([
    "",
    summary.qtdPistas,
    summary.porFios.map((f) => `${f.fios} fios: ${f.qtd}`).join(" | "),
    Number(summary.volume.toFixed(2)),
    Number(summary.metrosPerda.toFixed(2)),
    Number(summary.perdaPct.toFixed(4)),
    Number(summary.aproveitamentoPct.toFixed(4)),
  ]).font = { bold: true };

  ws.columns.forEach((c) => (c.width = 18));

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `metricas_pista_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
