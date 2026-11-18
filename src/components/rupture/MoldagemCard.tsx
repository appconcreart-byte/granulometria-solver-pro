import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TEMPO_CLIMA,
  TEMPO_CLIMA_LABEL,
  moldagemColumnsFromForm,
  moldagemFormFromBatch,
  type MoldagemColumns,
  type MoldagemForm,
} from "@/lib/moldagem";

export interface MoldagemCardProps {
  batch: { produced_at: string } & Partial<MoldagemColumns>;
  readOnly: boolean;
  isSaving?: boolean;
  onSave: (value: MoldagemColumns) => Promise<void> | void;
}

/**
 * Controle de Moldagem: dados do LOTE, iguais em todas as idades de rompimento.
 * Tem o próprio botão de salvar e grava só o lote (nada do rompimento em andamento).
 */
export function MoldagemCard({ batch, readOnly, isSaving = false, onSave }: MoldagemCardProps) {
  const [form, setForm] = useState<MoldagemForm>(() => moldagemFormFromBatch(batch));
  const [error, setError] = useState<string | null>(null);

  // Quando o lote é recarregado (ex.: depois de salvar), mostra o que está salvo.
  useEffect(() => {
    setForm(moldagemFormFromBatch(batch));
    setError(null);
  }, [
    batch.produced_at,
    batch.data_moldagem,
    batch.hora_moldagem,
    batch.temperatura_c,
    batch.tempo_clima,
    batch.slump_cm,
  ]);

  const update = <K extends keyof MoldagemForm>(campo: K, valor: MoldagemForm[K]) => {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setError(null);
  };

  const handleSave = async () => {
    const resultado = moldagemColumnsFromForm(form);
    if ("error" in resultado) {
      setError(resultado.error);
      return;
    }
    await onSave(resultado.value);
  };

  return (
    <Card className="shadow-sm border-l-4 border-l-primary/30">
      <CardHeader className="pb-3 space-y-1">
        <CardTitle className="text-base">Controle de Moldagem</CardTitle>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
          Dados do lote — iguais em todas as idades de rompimento
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label htmlFor="moldagem-data">Data</Label>
            <Input
              id="moldagem-data"
              type="date"
              value={form.data}
              onChange={(e) => update("data", e.target.value)}
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="moldagem-hora">Hora da Moldagem</Label>
            <Input
              id="moldagem-hora"
              type="time"
              value={form.hora}
              onChange={(e) => update("hora", e.target.value)}
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="moldagem-temperatura">Temperatura (°C)</Label>
            <Input
              id="moldagem-temperatura"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 19,2"
              value={form.temperatura}
              onChange={(e) => update("temperatura", e.target.value)}
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="moldagem-tempo">Tempo (sol/chuva)</Label>
            <Select
              value={form.tempo}
              onValueChange={(v) => update("tempo", v as MoldagemForm["tempo"])}
              disabled={readOnly}
            >
              <SelectTrigger id="moldagem-tempo">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {TEMPO_CLIMA.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TEMPO_CLIMA_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="moldagem-slump">Slump Test (cm)</Label>
            <Input
              id="moldagem-slump"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 11"
              value={form.slump}
              onChange={(e) => update("slump", e.target.value)}
              disabled={readOnly}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        {!readOnly && (
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4" />
              {isSaving ? "Salvando..." : "Salvar Moldagem"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
