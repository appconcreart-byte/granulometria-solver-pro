import { COMPRIMENTO_PISTA_M } from "@/lib/production-loss";
import type { DBProductionBatch } from "@/hooks/api/useProduction";

// Uma linha da planilha "REGISTRO DE CONCRETAGEM"
export interface PistaRecord {
  id: string;
  data: string; // ISO
  loteCodigo: string;
  pista: string;
  fios: number;
  volume: number; // m³ de concreto
  metrosPerda: number;
  perdaPct: number;
  aproveitamentoPct: number;
}

export interface PistaFilters {
  from: string; // yyyy-mm-dd ("" = sem limite)
  to: string;
  pista: string; // "" = todas
  fios: string; // "" = todos
}

export interface PistaSummary {
  qtdPistas: number;
  volume: number;
  metrosPerda: number;
  perdaPct: number;
  aproveitamentoPct: number;
  porFios: { fios: number; qtd: number }[];
  porPista: { pista: string; qtd: number; volume: number; metrosPerda: number; perdaPct: number; aproveitamentoPct: number }[];
}

// Perda de um conjunto de pistas: soma dos metros * 100 / (nº de pistas * 1600)
function perdaPct(metrosPerda: number, qtd: number) {
  return qtd > 0 ? (metrosPerda * 100) / (qtd * COMPRIMENTO_PISTA_M) : 0;
}

/** Só entram lotes com pista e fios informados (lotes antigos ficam de fora). */
export function toPistaRecords(batches: DBProductionBatch[]): PistaRecord[] {
  return batches
    .filter((b) => b.pista && b.fios)
    .map((b) => {
      const metrosPerda = Number(b.metros_perda ?? 0);
      const perda = perdaPct(metrosPerda, 1);
      return {
        id: b.id,
        data: b.produced_at,
        loteCodigo: b.batch_code,
        pista: b.pista as string,
        fios: Number(b.fios),
        volume: Number(b.volume_concreto_m3 ?? 0),
        metrosPerda,
        perdaPct: perda,
        aproveitamentoPct: 100 - perda,
      };
    })
    .sort((a, b) => a.data.localeCompare(b.data));
}

const localDay = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export function filterRecords(records: PistaRecord[], f: PistaFilters) {
  return records.filter((r) => {
    const day = localDay(r.data);
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
    if (f.pista && r.pista !== f.pista) return false;
    if (f.fios && r.fios !== Number(f.fios)) return false;
    return true;
  });
}

export function summarize(records: PistaRecord[]): PistaSummary {
  const qtdPistas = records.length;
  const metrosPerda = records.reduce((s, r) => s + r.metrosPerda, 0);
  const perda = perdaPct(metrosPerda, qtdPistas);

  const fiosSet = Array.from(new Set(records.map((r) => r.fios))).sort((a, b) => a - b);
  const pistaSet = Array.from(new Set(records.map((r) => r.pista))).sort();

  return {
    qtdPistas,
    volume: records.reduce((s, r) => s + r.volume, 0),
    metrosPerda,
    perdaPct: perda,
    aproveitamentoPct: qtdPistas > 0 ? 100 - perda : 0,
    porFios: fiosSet.map((fios) => ({ fios, qtd: records.filter((r) => r.fios === fios).length })),
    porPista: pistaSet.map((pista) => {
      const rs = records.filter((r) => r.pista === pista);
      const m = rs.reduce((s, r) => s + r.metrosPerda, 0);
      const p = perdaPct(m, rs.length);
      return {
        pista,
        qtd: rs.length,
        volume: rs.reduce((s, r) => s + r.volume, 0),
        metrosPerda: m,
        perdaPct: p,
        aproveitamentoPct: 100 - p,
      };
    }),
  };
}
