import {
  generateAgentReply,
  detectOptOut,
  detectHandoff,
  type HistoryItem,
} from "@/lib/agent/agent";
import type { AgentConfig, AiConfig } from "@/lib/integrations/config";
import {
  TERMINAL_KINDS,
  isFlowGraph,
  type FlowGraph,
  type FlowNode,
  type FlowNodeKind,
} from "@/lib/agent/flow-types";

/** Side effects the webhook applies after running a flow. */
export type FlowEffect =
  | { type: "send"; body: string }
  | { type: "pause_ai" }
  | { type: "set_status"; status: string }
  | { type: "handoff" };

export type FlowRunContext = {
  text: string;
  history: HistoryItem[];
  /** How many times the assistant has already replied to this lead. */
  assistantTurns: number;
  about: string;
  ai: AiConfig;
  agent: AgentConfig;
  catalog?: string;
};

const MAX_STEPS = 40;

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

/**
 * Interprets a sales-agent flow graph for one inbound message and returns the
 * ordered list of effects to apply. AI replies are generated inline. Returns
 * an empty array if the graph has no usable trigger.
 */
export async function runFlow(
  graph: unknown,
  ctx: FlowRunContext,
): Promise<FlowEffect[]> {
  if (!isFlowGraph(graph)) return [];
  const g = graph as FlowGraph;

  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const trigger = g.nodes.find(
    (n) => n.type === "trigger" || n.data?.kind === "lead_reply",
  );
  if (!trigger) return [];

  const next = (nodeId: string, handle?: string): FlowNode | null => {
    const edge = g.edges.find((e) => {
      if (e.source !== nodeId) return false;
      if (handle == null) return true;
      return (e.sourceHandle ?? "") === handle;
    });
    if (!edge) return null;
    return byId.get(edge.target) ?? null;
  };

  const evalCondition = (kind: FlowNodeKind, cfg: Record<string, unknown>) => {
    switch (kind) {
      case "opt_out":
        return detectOptOut(ctx.text);
      case "handoff":
        return detectHandoff(ctx.text);
      case "keywords": {
        const words = Array.isArray(cfg.keywords)
          ? (cfg.keywords as unknown[]).map((w) => str(w).toLowerCase().trim())
          : [];
        const t = ctx.text.toLowerCase();
        return words.some((w) => w && t.includes(w));
      }
      case "max_turns": {
        const limit = Number(cfg.value) || ctx.agent.maxTurns;
        return ctx.assistantTurns >= limit;
      }
      default:
        return false;
    }
  };

  const effects: FlowEffect[] = [];
  let current = next(trigger.id);
  let steps = 0;

  while (current && steps < MAX_STEPS) {
    steps++;
    const kind = current.data?.kind as FlowNodeKind | undefined;
    const cfg = current.data?.config ?? {};
    if (!kind) break;

    if (current.type === "condition") {
      const result = evalCondition(kind, cfg);
      current = next(current.id, result ? "true" : "false");
      continue;
    }

    // action
    switch (kind) {
      case "ai_reply": {
        const body = await generateAgentReply({
          history: ctx.history,
          about: ctx.about,
          agent: ctx.agent,
          ai: ctx.ai,
          catalog: ctx.catalog,
        });
        if (body.trim()) effects.push({ type: "send", body });
        break;
      }
      case "send_text": {
        const body = str(cfg.text);
        if (body.trim()) effects.push({ type: "send", body });
        break;
      }
      case "send_store_link": {
        const prefix = str(cfg.text).trim();
        const body = prefix
          ? `${prefix}\n${ctx.agent.storeUrl}`
          : ctx.agent.storeUrl;
        effects.push({ type: "send", body });
        break;
      }
      case "set_status": {
        const status = str(cfg.status, "respondeu");
        effects.push({ type: "set_status", status });
        break;
      }
      case "pause_ai": {
        effects.push({ type: "pause_ai" });
        break;
      }
      case "handoff_human": {
        const body = str(
          cfg.text,
          "Claro! 😊 Vou pedir a um colega da equipa da HN Hit Nails para falar contigo em breve.",
        );
        if (body.trim()) effects.push({ type: "send", body });
        effects.push({ type: "handoff" });
        break;
      }
    }

    if (TERMINAL_KINDS.includes(kind)) break;
    current = next(current.id);
  }

  return effects;
}
