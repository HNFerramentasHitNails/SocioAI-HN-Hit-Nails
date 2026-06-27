import {
  generateAgentReply,
  detectOptOut,
  detectHandoff,
  type HistoryItem,
} from "@/lib/agent/agent";
import { generateText } from "@/lib/ai/client";
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
  | { type: "send_email"; subject: string; body: string }
  | { type: "add_note"; text: string }
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
  /** Snapshot of the lead, for lead-based conditions. */
  lead: { status: string; email: string | null; name: string | null };
};

/** Current hour (0-23) in mainland Portugal, for the business-hours node. */
function lisbonHour(): number {
  try {
    const s = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Lisbon",
      hour: "2-digit",
      hour12: false,
    }).format(new Date());
    return parseInt(s, 10) || 0;
  } catch {
    return new Date().getHours();
  }
}

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

  const evalCondition = async (
    kind: FlowNodeKind,
    cfg: Record<string, unknown>,
  ): Promise<boolean> => {
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
      case "first_message":
        return ctx.assistantTurns === 0;
      case "lead_status":
        return ctx.lead.status === str(cfg.status, "novo");
      case "has_email":
        return !!ctx.lead.email && ctx.lead.email.includes("@");
      case "business_hours": {
        const start = Number(cfg.start);
        const end = Number(cfg.end);
        const s = Number.isFinite(start) ? start : 9;
        const e = Number.isFinite(end) ? end : 19;
        const h = lisbonHour();
        return h >= s && h < e;
      }
      case "ai_intent": {
        const question = str(cfg.prompt).trim();
        if (!question) return false;
        try {
          const ans = await generateText({
            system:
              "És um classificador. Responde APENAS com 'SIM' ou 'NÃO', sem mais nada.",
            prompt: `Pergunta: ${question}\n\nMensagem do cliente: "${ctx.text}"`,
            config: ctx.ai,
            maxTokens: 8,
            temperature: 0,
          });
          return /^\s*sim/i.test(ans);
        } catch {
          return false;
        }
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
      const result = await evalCondition(kind, cfg);
      current = next(current.id, result ? "true" : "false");
      continue;
    }

    // action
    switch (kind) {
      case "ai_reply":
      case "ai_reply_focus": {
        const focus = str(cfg.instruction).trim();
        const agent =
          kind === "ai_reply_focus" && focus
            ? {
                ...ctx.agent,
                instructions: [ctx.agent.instructions, focus]
                  .filter(Boolean)
                  .join("\n"),
              }
            : ctx.agent;
        const body = await generateAgentReply({
          history: ctx.history,
          about: ctx.about,
          agent,
          ai: ctx.ai,
          catalog: ctx.catalog,
        });
        if (body.trim()) effects.push({ type: "send", body });
        break;
      }
      case "send_email": {
        const subject = str(cfg.subject, "HN Hit Nails");
        const body = str(cfg.body);
        if (ctx.lead.email && body.trim()) {
          effects.push({ type: "send_email", subject, body });
        }
        break;
      }
      case "add_note": {
        const text = str(cfg.text).trim();
        if (text) effects.push({ type: "add_note", text });
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
