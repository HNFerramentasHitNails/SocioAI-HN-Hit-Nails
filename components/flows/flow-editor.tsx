"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, Save, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

import { updateFlow, toggleFlowActive } from "@/app/(app)/automacoes/actions";
import { nodeTypes } from "@/components/flows/flow-nodes";
import {
  NODE_DEFS,
  type FlowGraph,
  type FlowNodeData,
  type FlowNodeKind,
} from "@/lib/agent/flow-types";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const ADDABLE = (Object.keys(NODE_DEFS) as FlowNodeKind[]).filter(
  (k) => NODE_DEFS[k].addable,
);

function uid(kind: string) {
  return `${kind}_${Math.random().toString(36).slice(2, 8)}`;
}

export function FlowEditor({
  id,
  name,
  active,
  graph,
}: {
  id: string;
  name: string;
  active: boolean;
  graph: FlowGraph;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [flowName, setFlowName] = useState(name);
  const [isActive, setIsActive] = useState(active);
  const [nodes, setNodes] = useState<Node[]>(graph.nodes as unknown as Node[]);
  const [edges, setEdges] = useState<Edge[]>(graph.edges as unknown as Edge[]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );
  const onConnect = useCallback((conn: Connection) => {
    // One outgoing edge per source handle — replace any existing one.
    setEdges((eds) =>
      addEdge(
        conn,
        eds.filter(
          (e) =>
            !(
              e.source === conn.source &&
              (e.sourceHandle ?? null) === (conn.sourceHandle ?? null)
            ),
        ),
      ),
    );
  }, []);

  function addNode(kind: FlowNodeKind) {
    const def = NODE_DEFS[kind];
    const node: Node = {
      id: uid(kind),
      type: def.category,
      position: { x: 560, y: 80 + nodes.length * 24 },
      data: {
        kind,
        config: def.defaultConfig ? { ...def.defaultConfig } : undefined,
      } as FlowNodeData as unknown as Record<string, unknown>,
    };
    setNodes((nds) => [...nds, node]);
    setSelectedId(node.id);
  }

  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  );

  function patchSelected(configPatch: Record<string, unknown>, label?: string) {
    if (!selectedId) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== selectedId) return n;
        const data = n.data as unknown as FlowNodeData;
        return {
          ...n,
          data: {
            ...data,
            ...(label !== undefined ? { label } : {}),
            config: { ...(data.config ?? {}), ...configPatch },
          } as unknown as Record<string, unknown>,
        };
      }),
    );
  }

  function deleteSelected() {
    if (!selected) return;
    if (selected.type === "trigger") {
      toast.error("O gatilho inicial não pode ser eliminado.");
      return;
    }
    setNodes((nds) => nds.filter((n) => n.id !== selectedId));
    setEdges((eds) =>
      eds.filter((e) => e.source !== selectedId && e.target !== selectedId),
    );
    setSelectedId(null);
  }

  function save() {
    start(async () => {
      const out: FlowGraph = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: (n.type as FlowGraph["nodes"][number]["type"]) ?? "action",
          position: n.position,
          data: n.data as unknown as FlowNodeData,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle ?? null,
        })),
      };
      const res = await updateFlow(id, { name: flowName, graph: out });
      if (res.error) toast.error(res.error);
      else toast.success("Fluxo guardado.");
    });
  }

  function onToggleActive(next: boolean) {
    setIsActive(next);
    start(async () => {
      const res = await toggleFlowActive(id, next);
      if (res.error) {
        toast.error(res.error);
        setIsActive(!next);
      } else {
        toast.success(next ? "Fluxo ativado." : "Fluxo desativado.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/automacoes")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <Input
          value={flowName}
          onChange={(e) => setFlowName(e.target.value)}
          className="h-9 max-w-xs font-medium"
        />
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={isActive} onCheckedChange={onToggleActive} />
          Ativo
        </label>
        <div className="ml-auto">
          <Button className="gap-2" onClick={save} disabled={pending}>
            <Save className="size-4" /> {pending ? "A guardar…" : "Guardar"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[200px_1fr_280px]">
        {/* Palette */}
        <div className="flex flex-col gap-3 rounded-xl border border-border p-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Condições
            </p>
            <div className="flex flex-col gap-1.5">
              {ADDABLE.filter((k) => NODE_DEFS[k].category === "condition").map(
                (k) => (
                  <PaletteButton key={k} kind={k} onAdd={addNode} />
                ),
              )}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Ações
            </p>
            <div className="flex flex-col gap-1.5">
              {ADDABLE.filter((k) => NODE_DEFS[k].category === "action").map(
                (k) => (
                  <PaletteButton key={k} kind={k} onAdd={addNode} />
                ),
              )}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div
          className="overflow-hidden rounded-xl border border-border bg-muted/20"
          style={{ height: "calc(100vh - 13rem)" }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelectedId(n.id)}
            onPaneClick={() => setSelectedId(null)}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>

        {/* Properties */}
        <div className="rounded-xl border border-border p-3">
          {selected ? (
            <PropertiesPanel
              node={selected}
              onPatch={patchSelected}
              onDelete={deleteSelected}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Clica num passo para o configurar. Liga os passos arrastando dos
              pontos inferiores para o ponto superior do passo seguinte.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PaletteButton({
  kind,
  onAdd,
}: {
  kind: FlowNodeKind;
  onAdd: (k: FlowNodeKind) => void;
}) {
  const def = NODE_DEFS[kind];
  return (
    <button
      type="button"
      title={def.description}
      onClick={() => onAdd(kind)}
      className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-left text-xs hover:border-primary/50 hover:bg-muted/50"
    >
      <Plus className="size-3 shrink-0 text-muted-foreground" />
      <span className="truncate">{def.label}</span>
    </button>
  );
}

function PropertiesPanel({
  node,
  onPatch,
  onDelete,
}: {
  node: Node;
  onPatch: (config: Record<string, unknown>, label?: string) => void;
  onDelete: () => void;
}) {
  const data = node.data as unknown as FlowNodeData;
  const def = NODE_DEFS[data.kind];
  const config = data.config ?? {};

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium">{def.label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{def.description}</p>
      </div>

      <Field label="Etiqueta (opcional)">
        <Input
          value={data.label ?? ""}
          placeholder={def.label}
          onChange={(e) => onPatch({}, e.target.value)}
        />
      </Field>

      {data.kind === "keywords" && (
        <Field label="Palavras‑chave (separadas por vírgula)">
          <textarea
            className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            value={
              Array.isArray(config.keywords)
                ? (config.keywords as string[]).join(", ")
                : ""
            }
            onChange={(e) =>
              onPatch({
                keywords: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </Field>
      )}

      {data.kind === "max_turns" && (
        <Field label="Número de respostas da IA">
          <Input
            type="number"
            min={1}
            value={Number(config.value) || 20}
            onChange={(e) => onPatch({ value: Number(e.target.value) || 1 })}
          />
        </Field>
      )}

      {data.kind === "business_hours" && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Hora de início">
            <Input
              type="number"
              min={0}
              max={23}
              value={Number(config.start) || 9}
              onChange={(e) => onPatch({ start: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Hora de fim">
            <Input
              type="number"
              min={0}
              max={24}
              value={Number(config.end) || 19}
              onChange={(e) => onPatch({ end: Number(e.target.value) || 0 })}
            />
          </Field>
        </div>
      )}

      {data.kind === "ai_intent" && (
        <Field label="Pergunta para a IA (responde sim/não)">
          <textarea
            className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            value={typeof config.prompt === "string" ? config.prompt : ""}
            placeholder="Ex.: O cliente está interessado em comprar?"
            onChange={(e) => onPatch({ prompt: e.target.value })}
          />
        </Field>
      )}

      {data.kind === "ai_reply_focus" && (
        <Field label="Instrução extra para esta resposta">
          <textarea
            className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            value={typeof config.instruction === "string" ? config.instruction : ""}
            placeholder="Ex.: Foca-te em fechar a venda hoje."
            onChange={(e) => onPatch({ instruction: e.target.value })}
          />
        </Field>
      )}

      {data.kind === "send_email" && (
        <>
          <Field label="Assunto">
            <Input
              value={typeof config.subject === "string" ? config.subject : ""}
              onChange={(e) => onPatch({ subject: e.target.value })}
            />
          </Field>
          <Field label="Corpo do email">
            <textarea
              className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={typeof config.body === "string" ? config.body : ""}
              onChange={(e) => onPatch({ body: e.target.value })}
            />
          </Field>
        </>
      )}

      {(data.kind === "send_text" ||
        data.kind === "send_store_link" ||
        data.kind === "handoff_human" ||
        data.kind === "add_note") && (
        <Field
          label={
            data.kind === "send_store_link"
              ? "Mensagem antes do link (opcional)"
              : data.kind === "add_note"
                ? "Nota"
                : "Mensagem"
          }
        >
          <textarea
            className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            value={typeof config.text === "string" ? config.text : ""}
            onChange={(e) => onPatch({ text: e.target.value })}
          />
        </Field>
      )}

      {(data.kind === "set_status" || data.kind === "lead_status") && (
        <Field
          label={data.kind === "lead_status" ? "Estado a verificar" : "Novo estado"}
        >
          <select
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            value={typeof config.status === "string" ? config.status : "respondeu"}
            onChange={(e) => onPatch({ status: e.target.value })}
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
      )}

      {node.type !== "trigger" && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 justify-start gap-2 text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="size-4" /> Eliminar passo
        </Button>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
