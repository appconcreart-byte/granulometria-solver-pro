import { cn } from "@/lib/utils";
import {
  TEMPO_CLIMA_LABEL,
  formatDataHoraMoldagem,
  formatNumeroBR,
  type MoldagemColumns,
} from "@/lib/moldagem";

interface MoldagemLaudoBlockProps {
  batch: Partial<MoldagemColumns>;
  /** true quando o laudo está sendo capturado para PDF (layout fixo, sem breakpoints). */
  exporting?: boolean;
}

/** Moldagem do lote no laudo (versões interna e cliente). Campo vazio aparece como "—". */
export function MoldagemLaudoBlock({ batch, exporting = false }: MoldagemLaudoBlockProps) {
  const itens: { rotulo: string; valor: string }[] = [
    { rotulo: "Data / Hora", valor: formatDataHoraMoldagem(batch) },
    { rotulo: "Temperatura", valor: batch.temperatura_c != null ? `${formatNumeroBR(batch.temperatura_c)} °C` : "—" },
    { rotulo: "Tempo", valor: batch.tempo_clima ? TEMPO_CLIMA_LABEL[batch.tempo_clima] ?? batch.tempo_clima : "—" },
    { rotulo: "Slump", valor: batch.slump_cm != null ? `${formatNumeroBR(batch.slump_cm)} cm` : "—" },
  ];

  return (
    <div className="space-y-3" data-pdf-avoid-break>
      <h2 className="text-xs font-black uppercase tracking-widest text-primary">Moldagem</h2>
      <div className={cn("grid gap-4 md:gap-8", exporting ? "grid-cols-4" : "grid-cols-2 md:grid-cols-4")}>
        {itens.map((item) => (
          <div key={item.rotulo} className="space-y-1">
            <p className="text-[10px] uppercase font-black text-muted-foreground">{item.rotulo}</p>
            <p className="text-sm font-bold">{item.valor}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
