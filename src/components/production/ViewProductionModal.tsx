import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { TIPOS_ANALISE } from "@/lib/analysis-data";
import type { StoredAnalysis, ProductionBatch } from "@/store/useAppStore";
import type { DBProductionBatch } from "@/hooks/api/useProduction";
import { useMemo, useState } from "react";
import { useProduction } from "@/hooks/api/useProduction";
import { useTechnicalSettings } from "@/hooks/api/useTechnicalSettings";
import { useAuth } from "@/hooks/useAuth";
import { hasActionPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ViewRuptureResultModal } from "../rupture/ViewRuptureResultModal";
import { calcPerda } from "@/lib/production-loss";
import { PlannedRecipeTable, RealRecipeEditor, RecipeComparisonTable } from "./RecipeTables";
import { buildPlannedRecipe, buildReceitaReal, parseQtd } from "@/lib/production-recipe";
import { comPrecos, resolvePrecos } from "@/lib/production-cost";
import { useMaterials } from "@/hooks/api/useMaterials";
import { getConfigMisturador } from "@/lib/analysis-data";

interface ViewProductionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: StoredAnalysis;
  batch: DBProductionBatch | null;
}

const fmtNum = (n: number | null | undefined, d: number) =>
  n == null ? "—" : Number(n).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

function InfoCard({
  label,
  unit,
  big,
  tone,
  children,
}: {
  label: string;
  unit?: string;
  big?: boolean;
  tone?: "danger" | "success";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-muted/30 p-3 min-w-0",
        tone === "danger" && "border-red-500/30 bg-red-500/10",
        tone === "success" && "border-emerald-500/30 bg-emerald-500/10",
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div
        className={cn(
          "mt-1 flex items-baseline gap-1 font-black text-foreground truncate",
          big ? "text-2xl" : "text-sm",
          tone === "danger" && "text-red-600 dark:text-red-400",
          tone === "success" && "text-emerald-600 dark:text-emerald-400",
        )}
      >
        {children}
        {unit && children !== "—" && <span className="text-xs font-bold text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

export function ViewProductionModal({ open, onOpenChange, analysis, batch }: ViewProductionModalProps) {
  const [selectedRupture, setSelectedRupture] = useState<any | null>(null);
  const [showRuptureResult, setShowRuptureResult] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [editedCode, setEditedCode] = useState("");
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editedDate, setEditedDate] = useState("");
  const { deleteBatch, updateBatchCode, updateBatchDate, updateBatchRecipe, isDeleting, isUpdatingBatchCode, isUpdatingBatchDate, isUpdatingBatchRecipe } = useProduction();
  const { materials: dbMaterials } = useMaterials();
  const [isEditingRecipe, setIsEditingRecipe] = useState(false);
  const [editNTracos, setEditNTracos] = useState("");
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const { settings } = useTechnicalSettings();
  const { profile } = useAuth();
  const canEditBatchCode = profile?.role ? hasActionPermission(profile.role, "batch:edit_code") : false;
  const canEditRecipe = profile?.role ? hasActionPermission(profile.role, "batch:edit_recipe") : false;

  const handleSaveBatchDate = async () => {
    if (!batch || !editedDate) return;
    const newIso = new Date(editedDate).toISOString();
    if (newIso === new Date(batch.produced_at).toISOString()) {
      setIsEditingDate(false);
      return;
    }
    try {
      await updateBatchDate({ id: batch.id, produced_at: newIso });
      toast.success("Data de produção atualizada com sucesso!");
      setIsEditingDate(false);
    } catch (err: any) {
      toast.error("Erro ao atualizar data de produção", { description: err?.message });
    }
  };

  const handleSaveBatchCode = async () => {
    if (!batch) return;
    const trimmed = editedCode.trim();
    if (!trimmed) {
      toast.error("O código do lote não pode ficar vazio.");
      return;
    }
    if (trimmed === batch.batch_code) {
      setIsEditingCode(false);
      return;
    }
    try {
      await updateBatchCode({ id: batch.id, batch_code: trimmed });
      toast.success("Código do lote atualizado com sucesso!");
      setIsEditingCode(false);
    } catch (err: any) {
      toast.error("Erro ao atualizar código do lote", { description: err?.message });
    }
  };

  const startEditRecipe = () => {
    if (!batch) return;
    setEditNTracos(batch.n_tracos ? String(batch.n_tracos) : "");
    const values: Record<string, string> = {};
    for (const i of batch.receita_real?.itens ?? []) {
      if (i.real != null) values[i.chave] = String(i.real).replace(".", ",");
    }
    setEditValues(values);
    setIsEditingRecipe(true);
  };

  const handleSaveRecipe = async () => {
    if (!batch || !analysis) return;
    const n = parseQtd(editNTracos);
    if (editNTracos.trim() !== "" && (n == null || !Number.isInteger(n) || n < 1)) {
      toast.error("Nº de traços deve ser um número inteiro maior que zero");
      return;
    }
    const planejada = buildPlannedRecipe(analysis.formData);
    const base = buildReceitaReal(planejada, n, editValues);
    const receita = base
      ? comPrecos(base, resolvePrecos(planejada, analysis.formData, dbMaterials ?? []), batch.receita_real)
      : null;
    try {
      await updateBatchRecipe({ id: batch.id, n_tracos: n, receita_real: receita });
      toast.success("Receita real atualizada com sucesso!");
      setIsEditingRecipe(false);
    } catch (err: any) {
      toast.error("Erro ao salvar a receita real", { description: err?.message });
    }
  };

  if (!analysis) return null;
  const tipoAnalise: string = analysis.tipo ?? analysis.tipo_analise; // StoredAnalysis (banco) usa `tipo`
  const tipoLabel = TIPOS_ANALISE.find((t) => t.value === tipoAnalise)?.label ?? "—";

  // Preços na edição: o que já está gravado no lote vale; o que falta vem do cadastro atual
  const precosEdicao = useMemo(() => {
    const atuais = resolvePrecos(buildPlannedRecipe(analysis.formData), analysis.formData, dbMaterials ?? []);
    for (const i of batch?.receita_real?.itens ?? []) if (i.preco) atuais[i.chave] = i.preco;
    return atuais;
  }, [analysis, batch, dbMaterials]);

  // Receita prevista (da análise), na escala do volume do lote, para lotes sem receita real
  const plannedRecipe = useMemo(() => {
    if (!batch) return [];
    const fd = analysis.formData;
    const volOrigL = (fd.volume_m3 || 0.55) * 1000;
    const scale = volOrigL > 0 && batch.volume_produzido ? batch.volume_produzido / volOrigL : 1;
    return buildPlannedRecipe(fd).map((i) => ({ ...i, previsto: Math.round(i.previsto * scale * 100) / 100 }));
  }, [analysis, batch]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes  {analysis.codigo}</DialogTitle>
        </DialogHeader>

        {/* Botão de exclusão de lote */}
        {batch && (
          <div className="flex justify-end mb-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              disabled={isDeleting}
            >
              Excluir Lote
            </Button>
          </div>
        )}

        <div className="space-y-4">
          <div className="rounded-md border p-4 space-y-2 text-sm">
            <h4 className="font-semibold text-foreground">Análise</h4>
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Código:</span> <strong>{analysis.codigo}</strong></div>
              <div><span className="text-muted-foreground">Nome:</span> {analysis.nome}</div>
              <div>
                <span className="text-muted-foreground">Produto:</span>{" "}
                <strong>{analysis.produto ?? "—"}</strong>
                {analysis.produto && (
                  <span className="text-xs text-muted-foreground ml-1">({tipoLabel})</span>
                )}
              </div>
              <div><span className="text-muted-foreground">Resistência:</span> {analysis.resistencia_prevista} MPa</div>
              <div><span className="text-muted-foreground">Data:</span> {analysis.data_analise ? new Date(analysis.data_analise + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</div>
              <div>
                <span className="text-muted-foreground">Status:</span>{" "}
                <StatusBadge status={analysis.status} />
              </div>
            </div>
            {analysis.formData.materiais_selecionados.length > 0 && (
              <div>
                <span className="text-muted-foreground text-xs">Materiais:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {analysis.formData.materiais_selecionados.map((m) => (
                    <Badge key={m.material_id} variant="outline" className="text-xs">
                      {m.nome}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {batch ? (
            <div className="rounded-md border p-4 space-y-2 text-sm">
              <h4 className="font-semibold text-foreground">Lote de Produção</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 flex items-center gap-2">
                  <span className="text-muted-foreground">Lote:</span>
                  {isEditingCode ? (
                    <>
                      <Input
                        value={editedCode}
                        onChange={(e) => setEditedCode(e.target.value)}
                        className="h-7 w-40 text-sm"
                        autoFocus
                        disabled={isUpdatingBatchCode}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={handleSaveBatchCode}
                        disabled={isUpdatingBatchCode}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setIsEditingCode(false)}
                        disabled={isUpdatingBatchCode}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <strong>{batch.batch_code}</strong>
                      {canEditBatchCode && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => {
                            setEditedCode(batch.batch_code);
                            setIsEditingCode(true);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <span className="text-muted-foreground">Data Produção:</span>
                  {isEditingDate ? (
                    <>
                      <Input
                        type="datetime-local"
                        value={editedDate}
                        onChange={(e) => setEditedDate(e.target.value)}
                        className="h-7 w-48 text-sm"
                        autoFocus
                        disabled={isUpdatingBatchDate}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={handleSaveBatchDate}
                        disabled={isUpdatingBatchDate}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setIsEditingDate(false)}
                        disabled={isUpdatingBatchDate}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <strong>{new Date(batch.produced_at).toLocaleString("pt-BR")}</strong>
                      {canEditBatchCode && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => {
                            const d = new Date(batch.produced_at);
                            const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
                            setEditedDate(local.toISOString().slice(0, 16));
                            setIsEditingDate(true);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                <InfoCard label="Operador">{batch.operador_nome || "—"}</InfoCard>
                <InfoCard label="Máquina">{batch.maquina || "—"}</InfoCard>
                <InfoCard label="Status">
                  <StatusBadge status={batch.status} />
                </InfoCard>
                <InfoCard label="Volume da batelada" unit="L">{fmtNum(batch.volume_produzido, 0)}</InfoCard>
              </div>

              {batch.pista ? (
                <div className="space-y-3 pt-1">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Concretagem da pista</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <InfoCard label="Pista" big>{batch.pista}</InfoCard>
                    <InfoCard label="Fios" big>{batch.fios ?? "—"}</InfoCard>
                    <InfoCard label="Concreto" unit="m³" big>{fmtNum(batch.volume_concreto_m3, 1)}</InfoCard>
                    <InfoCard label="Perda" unit="m" big>{fmtNum(batch.metros_perda ?? 0, 2)}</InfoCard>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoCard label="% Perda" unit="%" big tone="danger">{fmtNum(calcPerda(batch.metros_perda ?? 0).perda, 2)}</InfoCard>
                    <InfoCard label="% Aproveitamento" unit="%" big tone="success">{fmtNum(calcPerda(batch.metros_perda ?? 0).aproveitamento, 2)}</InfoCard>
                  </div>
                </div>
              ) : (
                <p className="rounded-md border border-dashed p-2 text-center text-xs text-muted-foreground">
                  Lote registrado antes do controle de pista (sem dados de pista, fios e perda).
                </p>
              )}

              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">
                    {batch.receita_real ? "Receita Real Utilizada" : "Receita Utilizada"}
                    {batch.n_tracos ? <span className="ml-2 normal-case font-medium text-muted-foreground">{batch.n_tracos} traço(s)</span> : null}
                  </h4>
                  {canEditRecipe && !isEditingRecipe && (
                    <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={startEditRecipe}>
                      <Pencil className="h-3 w-3" />
                      {batch.receita_real ? "Editar receita real" : "Informar receita real"}
                    </Button>
                  )}
                </div>

                {isEditingRecipe ? (
                  <div className="space-y-3">
                    <div className="flex items-end justify-between gap-3">
                      <p className="text-[11px] text-muted-foreground">
                        Informe a soma de todos os traços da pista. Os números em cinza são o previsto; deixe em branco o que não quiser informar.
                      </p>
                      <div className="space-y-1 w-28 shrink-0">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nº de traços</span>
                        <Input
                          inputMode="numeric"
                          value={editNTracos}
                          onChange={(e) => setEditNTracos(e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="1"
                          className="h-8 text-sm text-right font-bold"
                        />
                      </div>
                    </div>
                    <RealRecipeEditor
                      planned={buildPlannedRecipe(analysis.formData)}
                      nTracos={parseQtd(editNTracos)}
                      values={editValues}
                      onChange={(chave, v) => setEditValues((prev) => ({ ...prev, [chave]: v }))}
                      precos={precosEdicao}
                      volumeM3={batch.volume_concreto_m3}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsEditingRecipe(false)} disabled={isUpdatingBatchRecipe}>
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={handleSaveRecipe} disabled={isUpdatingBatchRecipe}>
                        {isUpdatingBatchRecipe ? "Salvando..." : "Salvar receita real"}
                      </Button>
                    </div>
                  </div>
                ) : batch.receita_real ? (
                  <RecipeComparisonTable itens={batch.receita_real.itens} volumeM3={batch.volume_concreto_m3} nTracos={batch.n_tracos} />
                ) : (
                  <>
                    <PlannedRecipeTable items={plannedRecipe} capacidadeKg={getConfigMisturador(tipoAnalise).capacidade_kg} />
                    <p className="text-[11px] text-muted-foreground">Receita real não informada para este lote.</p>
                  </>
                )}
              </div>

              <h4 className="font-semibold text-foreground pt-2">Cronograma de Rompimentos</h4>
              <div className="grid grid-cols-4 gap-2">
                {batch.rupture_schedules?.map((s) => {
                  const isConcluido = s.status === "concluido";
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        if (isConcluido) {
                          setSelectedRupture(s);
                          setShowRuptureResult(true);
                        }
                      }}
                      disabled={!isConcluido}
                      className={cn(
                        "rounded-md border p-2 text-center transition-all",
                        isConcluido 
                          ? "hover:border-primary hover:bg-primary/5 cursor-pointer active:scale-95 shadow-sm" 
                          : "opacity-80 cursor-default"
                      )}
                    >
                      <p className="text-lg font-bold text-foreground">{s.idade_dias}d</p>
                      <p className="text-[10px] text-muted-foreground">{s.data_prevista}</p>
                      <StatusBadge status={s.status} className="mt-1 h-4 text-[9px]" />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Nenhum lote registrado ainda. Clique em "Registrar Produção" para criar.
            </div>
          )}
        </div>
      </DialogContent>

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle>Excluir Lote</DialogTitle>
            </DialogHeader>
            <div className="py-2">Tem certeza que deseja excluir este lote? Esta ação não pode ser desfeita.</div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)} disabled={isDeleting}>Cancelar</Button>
              <Button
                variant="destructive"
                size="sm"
                loading={isDeleting}
                onClick={async () => {
                  if (!batch) return;
                  try {
                    await deleteBatch(batch.id);
                    toast.success("Lote excluído com sucesso!");
                    setConfirmDelete(false);
                    onOpenChange(false);
                  } catch (err: any) {
                    toast.error("Erro ao excluir lote", { description: err?.message });
                  }
                }}
              >
                Excluir
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <ViewRuptureResultModal
        open={showRuptureResult}
        onOpenChange={setShowRuptureResult}
        schedule={selectedRupture}
        analysis={analysis}
        settings={settings}
      />
    </Dialog>
  );
}