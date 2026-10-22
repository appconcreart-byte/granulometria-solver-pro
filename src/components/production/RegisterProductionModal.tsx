import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calcPerda, PISTAS, FIOS_OPCOES, COMPRIMENTO_PISTA_M } from "@/lib/production-loss";
import { ClipboardList } from "lucide-react";
import { PlannedRecipeTable, RealRecipeEditor } from "./RecipeTables";
import { buildPlannedRecipe, buildReceitaReal, parseQtd } from "@/lib/production-recipe";
import { comPrecos, resolvePrecos } from "@/lib/production-cost";
import { useMaterials } from "@/hooks/api/useMaterials";
import { getConfigMisturador } from "@/lib/analysis-data";
import { toast } from "sonner";
import { useProduction } from "@/hooks/api/useProduction";
import type { StoredAnalysis } from "@/hooks/api/useAnalyses";

interface RegisterProductionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: StoredAnalysis | null;
}

function generateBatchCode() {
  return `L-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
}

export function RegisterProductionModal({ open, onOpenChange, analysis }: RegisterProductionModalProps) {
  const { createBatch, isCreating } = useProduction();
  const { materials: dbMaterials } = useMaterials();

  const [batchCode, setBatchCode] = useState(generateBatchCode);
  const [operador, setOperador] = useState("");
  const [maquina, setMaquina] = useState("");
  const toLocalDateTimeInput = (date: Date) =>
    new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const [dataProducao, setDataProducao] = useState(toLocalDateTimeInput(new Date()));
  const [observacoes, setObservacoes] = useState("");
  const [nTracos, setNTracos] = useState<string>("");
  const [realValues, setRealValues] = useState<Record<string, string>>({});
  const [pista, setPista] = useState<string>("");
  const [fios, setFios] = useState<string>("");
  const [metrosPerda, setMetrosPerda] = useState<string>("0");
  const [volumeConcreto, setVolumeConcreto] = useState<string>("");

  const metrosPerdaNum = Number(metrosPerda) || 0;
  const { perda, aproveitamento } = calcPerda(metrosPerdaNum);

  // Sincroniza data/hora com o momento de liberação da análise quando o modal abre
  useEffect(() => {
    if (analysis?.liberado_em) {
      setDataProducao(toLocalDateTimeInput(new Date(analysis.liberado_em)));
    } else {
      setDataProducao(toLocalDateTimeInput(new Date()));
    }
  }, [analysis?.id]);

  // Novo lote → receita real e nº de traços começam em branco
  useEffect(() => {
    setNTracos("");
    setRealValues({});
  }, [analysis?.id]);

  // Receita prevista (1 traço), vinda da análise: cimento, agregados, água, aditivo e aço
  const planned = useMemo(() => (analysis ? buildPlannedRecipe(analysis.formData) : []), [analysis]);

  // Preços atuais do cadastro de Produtos para cada item (gravados no lote ao salvar)
  const precos = useMemo(
    () => (analysis ? resolvePrecos(planned, analysis.formData, dbMaterials ?? []) : {}),
    [analysis, planned, dbMaterials],
  );

  if (!analysis) return null;

  const handleRegister = async () => {
    if (!batchCode.trim()) {
      toast.error("Informe o código do lote");
      return;
    }
    if (!operador.trim()) {
      toast.error("Informe o operador");
      return;
    }
    if (!maquina.trim()) {
      toast.error("Informe a máquina");
      return;
    }

    if (!pista) {
      toast.error("Informe a pista");
      return;
    }
    if (!fios) {
      toast.error("Informe a quantidade de fios");
      return;
    }
    const volumeConcretoNum = Number(volumeConcreto);
    if (!(volumeConcretoNum > 0)) {
      toast.error("Informe o volume de concreto produzido (m³)");
      return;
    }
    if (metrosPerdaNum < 0) {
      toast.error("Metros de perda não pode ser negativo");
      return;
    }
    if (metrosPerdaNum > COMPRIMENTO_PISTA_M) {
      toast.error(`Metros de perda não pode passar de ${COMPRIMENTO_PISTA_M} m (comprimento da pista)`);
      return;
    }

    const nTracosNum = parseQtd(nTracos);
    if (nTracos.trim() !== "" && (nTracosNum == null || !Number.isInteger(nTracosNum) || nTracosNum < 1)) {
      toast.error("Nº de traços deve ser um número inteiro maior que zero");
      return;
    }
    const receitaBase = buildReceitaReal(planned, nTracosNum, realValues);
    const receitaReal = receitaBase ? comPrecos(receitaBase, precos) : null;

    try {
      await createBatch({
        analysis_id: analysis.id,
        batch_code: batchCode.trim(),
        operador_nome: operador.trim(),
        maquina,
        volume_produzido: Math.round((analysis.formData.volume_m3 || 0.55) * 1000),
        volume_concreto_m3: volumeConcretoNum,
        pista,
        fios: Number(fios),
        metros_perda: metrosPerdaNum,
        n_tracos: nTracosNum,
        receita_real: receitaReal,
        notas: observacoes,
        produced_at: new Date(dataProducao).toISOString(),
      });

      onOpenChange(false);
      resetForm();

      toast.success("Lote de produção criado!", {
        description: `${batchCode} — 4 rompimentos agendados automaticamente.`,
      });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao registrar o lote de produção");
    }
  };

  const resetForm = () => {
    setBatchCode(generateBatchCode());
    setOperador("");
    setMaquina("");
    setObservacoes("");
    setPista("");
    setFios("");
    setMetrosPerda("0");
    setVolumeConcreto("");
    setNTracos("");
    setRealValues({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Registrar Produção
          </DialogTitle>
          <DialogDescription>
            Crie um lote de produção para <strong>{analysis.codigo}</strong>. Os 4 agendamentos de rompimento (1, 3, 7 e 28 dias) serão criados automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border p-3 bg-muted/30 text-sm space-y-1">
            <p><span className="text-muted-foreground">Análise:</span> <strong>{analysis.codigo}</strong> — {analysis.nome}</p>
            <p><span className="text-muted-foreground">Tipo:</span> {analysis.tipo}</p>
            <p><span className="text-muted-foreground">Resistência:</span> {analysis.resistencia_prevista} MPa</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="batch-code">Código do Lote *</Label>
            <Input
              id="batch-code"
              value={batchCode}
              onChange={(e) => setBatchCode(e.target.value)}
              placeholder="Ex: L-2026-0001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="operador">Operador *</Label>
            <Input
              id="operador"
              value={operador}
              onChange={(e) => setOperador(e.target.value)}
              placeholder="Nome do operador"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maquina">Máquina *</Label>
            <Input
              id="maquina"
              value={maquina}
              onChange={(e) => setMaquina(e.target.value)}
              placeholder="Ex: Vibro-prensa VP-3000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Volume Produzido (L)</Label>
              <Input
                type="number"
                value={Math.round((analysis.formData.volume_m3 || 0.55) * 1000)}
                readOnly
                className="bg-muted/50 cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data-producao">Data/Hora Produção</Label>
              <Input
                id="data-producao"
                type="datetime-local"
                value={dataProducao}
                onChange={(e) => setDataProducao(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pista *</Label>
              <Select value={pista} onValueChange={setPista}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {PISTAS.map((p) => (
                    <SelectItem key={p} value={p}>Pista {p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fios *</Label>
              <Select value={fios} onValueChange={setFios}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {FIOS_OPCOES.map((f) => (
                    <SelectItem key={f} value={String(f)}>{f} fios</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="volume-concreto">Volume de Concreto Produzido (m³) *</Label>
              <Input
                id="volume-concreto"
                type="number"
                min={0}
                step="0.01"
                value={volumeConcreto}
                onChange={(e) => setVolumeConcreto(e.target.value)}
                placeholder="Ex: 12.6"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metros-perda">Metros de Perda (m)</Label>
              <Input
                id="metros-perda"
                type="number"
                min={0}
                max={COMPRIMENTO_PISTA_M}
                step="0.01"
                value={metrosPerda}
                onChange={(e) => setMetrosPerda(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>% Perda</Label>
                <Input value={perda.toFixed(2)} readOnly className="bg-muted/50 cursor-not-allowed" />
              </div>
              <div className="space-y-2">
                <Label>% Aprov.</Label>
                <Input value={aproveitamento.toFixed(2)} readOnly className="bg-muted/50 cursor-not-allowed" />
              </div>
            </div>
          </div>

          {/* Receita prevista — 1 traço, vinda da análise (somente leitura) */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Receita prevista (1 traço)
            </Label>
            <PlannedRecipeTable items={planned} capacidadeKg={getConfigMisturador(analysis.tipo).capacidade_kg} />
          </div>

          {/* Receita real — soma de todos os traços da pista (opcional) */}
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Receita real utilizada <span className="normal-case font-medium tracking-normal">(opcional)</span>
                </Label>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Informe a soma de todos os traços da pista. Os números em cinza são o previsto; deixe em branco o que não quiser informar.
                </p>
              </div>
              <div className="space-y-1 w-28 shrink-0">
                <Label htmlFor="n-tracos" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Nº de traços
                </Label>
                <Input
                  id="n-tracos"
                  inputMode="numeric"
                  value={nTracos}
                  onChange={(e) => setNTracos(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="1"
                  className="h-8 text-sm text-right font-bold"
                />
              </div>
            </div>
            <RealRecipeEditor
              planned={planned}
              nTracos={parseQtd(nTracos)}
              values={realValues}
              onChange={(chave, v) => setRealValues((prev) => ({ ...prev, [chave]: v }))}
              precos={precos}
              volumeM3={Number(volumeConcreto) > 0 ? Number(volumeConcreto) : null}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="obs-producao">Observações (opcional)</Label>
            <Textarea
              id="obs-producao"
              placeholder="Registre observações sobre a produção..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancelar
          </Button>
          <Button onClick={handleRegister} disabled={isCreating} className="gap-2">
            {isCreating ? "Registrando..." : "Confirmar Registro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
