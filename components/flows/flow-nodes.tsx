"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  MessageSquareReply,
  Ban,
  UserRound,
  Search,
  Repeat,
  Sparkles,
  Send,
  Link2,
  Tag,
  PauseCircle,
  Headset,
  type LucideIcon,
} from "lucide-react";

import { NODE_DEFS, type FlowNodeData, type FlowNodeKind } from "@/lib/agent/flow-types";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/config";

const ICONS: Record<FlowNodeKind, LucideIcon> = {
  lead_reply: MessageSquareReply,
  opt_out: Ban,
  handoff: UserRound,
  keywords: Search,
  max_turns: Repeat,
  ai_reply: Sparkles,
  send_text: Send,
  send_store_link: Link2,
  set_status: Tag,
  pause_ai: PauseCircle,
  handoff_human: Headset,
};

function summary(kind: FlowNodeKind, config: Record<string, unknown> = {}) {
  switch (kind) {
    case "keywords": {
      const words = Array.isArray(config.keywords)
        ? (config.keywords as string[])
        : [];
      return words.length ? words.join(", ") : "sem palavras definidas";
    }
    case "max_turns":
      return `${Number(config.value) || 20} respostas`;
    case "send_text":
    case "send_store_link":
    case "handoff_human": {
      const t = typeof config.text === "string" ? config.text : "";
      return t ? (t.length > 48 ? t.slice(0, 48) + "…" : t) : null;
    }
    case "set_status": {
      const s = (typeof config.status === "string" ? config.status : "respondeu") as LeadStatus;
      return LEAD_STATUS_LABELS[s] ?? s;
    }
    default:
      return null;
  }
}

const handleClass = "!size-2.5 !border-2 !border-background";

function Shell({
  data,
  selected,
  accent,
}: {
  data: FlowNodeData;
  selected?: boolean;
  accent: string;
}) {
  const def = NODE_DEFS[data.kind];
  const Icon = ICONS[data.kind];
  const sub = summary(data.kind, data.config);
  return (
    <div
      className={`w-56 rounded-xl border bg-card px-3 py-2.5 shadow-sm transition-colors ${
        selected ? "border-primary ring-1 ring-primary" : "border-border"
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${accent}`}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            {data.label || def.label}
          </div>
          {sub && (
            <div className="truncate text-xs text-muted-foreground">{sub}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function TriggerNode({ data, selected }: NodeProps) {
  return (
    <>
      <Shell
        data={data as FlowNodeData}
        selected={selected}
        accent="bg-primary text-primary-foreground"
      />
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </>
  );
}

export function ConditionNode({ data, selected }: NodeProps) {
  return (
    <>
      <Handle type="target" position={Position.Top} className={handleClass} />
      <Shell
        data={data as FlowNodeData}
        selected={selected}
        accent="bg-amber-500/15 text-amber-600 dark:text-amber-400"
      />
      <Handle
        id="true"
        type="source"
        position={Position.Bottom}
        style={{ left: "28%" }}
        className={`${handleClass} !bg-emerald-500`}
      />
      <Handle
        id="false"
        type="source"
        position={Position.Bottom}
        style={{ left: "72%" }}
        className={`${handleClass} !bg-rose-500`}
      />
      <div className="pointer-events-none absolute -bottom-4 flex w-full justify-between px-3 text-[10px] font-medium">
        <span className="text-emerald-600 dark:text-emerald-400">sim</span>
        <span className="text-rose-600 dark:text-rose-400">não</span>
      </div>
    </>
  );
}

export function ActionNode({ data, selected }: NodeProps) {
  const d = data as FlowNodeData;
  const terminal = d.kind === "pause_ai" || d.kind === "handoff_human";
  return (
    <>
      <Handle type="target" position={Position.Top} className={handleClass} />
      <Shell
        data={d}
        selected={selected}
        accent="bg-violet-500/15 text-violet-600 dark:text-violet-400"
      />
      {!terminal && (
        <Handle
          type="source"
          position={Position.Bottom}
          className={handleClass}
        />
      )}
    </>
  );
}

export const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
};
