"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Workflow, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

import {
  createFlow,
  toggleFlowActive,
  deleteFlow,
} from "@/app/(app)/automacoes/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Flow = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  updated_at: string;
};

export function FlowsList({
  flows,
  agentEnabled,
}: {
  flows: Flow[];
  agentEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  function run(fn: () => Promise<{ error?: string }>, ok: string) {
    start(async () => {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else {
        toast.success(ok);
        router.refresh();
      }
    });
  }

  function onCreate() {
    start(async () => {
      const res = await createFlow(name);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setOpen(false);
      setName("");
      if (res.id) router.push(`/automacoes/${res.id}`);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {!agentEnabled && (
        <p className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-400">
          O agente de conversação está desligado. Ativa-o em{" "}
          <strong>Definições → Agente de conversação</strong> para os fluxos
          entrarem em ação.
        </p>
      )}

      <div className="flex justify-end">
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Novo fluxo
        </Button>
      </div>

      {flows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Ainda não tens fluxos. Cria o primeiro — vem já com um modelo pronto a
          editar.
        </div>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {flows.map((f) => (
              <li
                key={f.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Workflow className="size-4" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{f.name}</span>
                    {f.active && <Badge>Ativo</Badge>}
                  </div>
                  {f.description && (
                    <span className="line-clamp-1 text-xs text-muted-foreground">
                      {f.description}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={f.active}
                      disabled={pending}
                      onCheckedChange={(c) =>
                        run(
                          () => toggleFlowActive(f.id, c),
                          c ? "Fluxo ativado." : "Fluxo desativado.",
                        )
                      }
                      title="Ativo (controla o agente)"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => router.push(`/automacoes/${f.id}`)}
                  >
                    <Pencil className="size-3.5" /> Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    disabled={pending}
                    onClick={() => {
                      if (!confirm(`Eliminar o fluxo "${f.name}"?`)) return;
                      run(() => deleteFlow(f.id), "Fluxo eliminado.");
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Só um fluxo pode estar ativo de cada vez — é esse que decide as respostas
        automáticas. Sem nenhum fluxo ativo, o agente usa o comportamento
        padrão.
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo fluxo</DialogTitle>
            <DialogDescription>
              Criamos um fluxo inicial pronto a editar no canvas.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Conversa de vendas WhatsApp"
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) onCreate();
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={onCreate} disabled={pending || !name.trim()}>
              {pending ? "A criar…" : "Criar e abrir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
