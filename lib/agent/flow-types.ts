/**
 * Shared definitions for the visual sales-agent flow builder.
 * Imported by both the editor (client) and the execution engine (server),
 * so this module must stay free of server-only / client-only imports.
 */

export type NodeCategory = "trigger" | "condition" | "action";

export type FlowNodeKind =
  // trigger
  | "lead_reply"
  // conditions (two outputs: "true" / "false")
  | "opt_out"
  | "handoff"
  | "keywords"
  | "max_turns"
  // actions (single output: "out")
  | "ai_reply"
  | "send_text"
  | "send_store_link"
  | "set_status"
  | "pause_ai"
  | "handoff_human";

export type FlowNodeConfig = Record<string, unknown>;

export type FlowNodeData = {
  kind: FlowNodeKind;
  label?: string;
  config?: FlowNodeConfig;
};

export type FlowNode = {
  id: string;
  type: NodeCategory;
  position: { x: number; y: number };
  data: FlowNodeData;
};

export type FlowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
};

export type FlowGraph = { nodes: FlowNode[]; edges: FlowEdge[] };

export type NodeDef = {
  category: NodeCategory;
  label: string;
  description: string;
  /** Whether the user can add this node from the palette (trigger is fixed). */
  addable: boolean;
  defaultConfig?: FlowNodeConfig;
};

export const NODE_DEFS: Record<FlowNodeKind, NodeDef> = {
  lead_reply: {
    category: "trigger",
    label: "Lead responde",
    description: "Início: o lead enviou uma mensagem no WhatsApp.",
    addable: false,
  },
  opt_out: {
    category: "condition",
    label: "Pediu para parar?",
    description: "Verdadeiro se a mensagem indicar opt-out (parar, sair, cancelar…).",
    addable: true,
  },
  handoff: {
    category: "condition",
    label: "Quer falar com pessoa?",
    description: "Verdadeiro se o lead pedir um atendente humano.",
    addable: true,
  },
  keywords: {
    category: "condition",
    label: "Contém palavras‑chave",
    description: "Verdadeiro se a mensagem contiver alguma das palavras indicadas.",
    addable: true,
    defaultConfig: { keywords: ["preço", "preco"] },
  },
  max_turns: {
    category: "condition",
    label: "Limite de respostas?",
    description: "Verdadeiro quando a IA já respondeu o número de vezes definido.",
    addable: true,
    defaultConfig: { value: 20 },
  },
  ai_reply: {
    category: "action",
    label: "Responder com IA",
    description: "Gera e envia a próxima resposta de vendas com a IA + catálogo.",
    addable: true,
  },
  send_text: {
    category: "action",
    label: "Enviar mensagem fixa",
    description: "Envia uma mensagem de texto definida por ti.",
    addable: true,
    defaultConfig: { text: "Olá! 😊" },
  },
  send_store_link: {
    category: "action",
    label: "Enviar link da loja",
    description: "Envia o link da loja (com uma mensagem opcional antes).",
    addable: true,
    defaultConfig: { text: "Vê aqui na nossa loja:" },
  },
  set_status: {
    category: "action",
    label: "Mudar estado do lead",
    description: "Atualiza o estado do lead no pipeline.",
    addable: true,
    defaultConfig: { status: "respondeu" },
  },
  pause_ai: {
    category: "action",
    label: "Pausar IA",
    description: "Para a automação para este lead (termina o fluxo).",
    addable: true,
  },
  handoff_human: {
    category: "action",
    label: "Passar a humano",
    description: "Avisa o lead que um colega vai falar e pausa a IA (termina o fluxo).",
    addable: true,
    defaultConfig: {
      text: "Claro! 😊 Vou pedir a um colega da equipa da HN Hit Nails para falar contigo em breve.",
    },
  },
};

/** Terminal actions stop traversal after running. */
export const TERMINAL_KINDS: FlowNodeKind[] = ["pause_ai", "handoff_human"];

/** A starter flow that mirrors the built-in agent behaviour. */
export function defaultFlowGraph(): FlowGraph {
  const node = (
    id: string,
    kind: FlowNodeKind,
    x: number,
    y: number,
  ): FlowNode => ({
    id,
    type: NODE_DEFS[kind].category,
    position: { x, y },
    data: { kind, config: NODE_DEFS[kind].defaultConfig },
  });

  return {
    nodes: [
      node("trigger", "lead_reply", 280, 0),
      node("optout", "opt_out", 280, 130),
      node("pause1", "pause_ai", 540, 200),
      node("handoff", "handoff", 280, 270),
      node("human", "handoff_human", 540, 340),
      node("maxturns", "max_turns", 280, 410),
      node("pause2", "pause_ai", 540, 480),
      node("ai", "ai_reply", 280, 560),
    ],
    edges: [
      { id: "e1", source: "trigger", target: "optout" },
      { id: "e2", source: "optout", sourceHandle: "true", target: "pause1" },
      { id: "e3", source: "optout", sourceHandle: "false", target: "handoff" },
      { id: "e4", source: "handoff", sourceHandle: "true", target: "human" },
      { id: "e5", source: "handoff", sourceHandle: "false", target: "maxturns" },
      { id: "e6", source: "maxturns", sourceHandle: "true", target: "pause2" },
      { id: "e7", source: "maxturns", sourceHandle: "false", target: "ai" },
    ],
  };
}

export function isFlowGraph(value: unknown): value is FlowGraph {
  if (!value || typeof value !== "object") return false;
  const g = value as { nodes?: unknown; edges?: unknown };
  return Array.isArray(g.nodes) && Array.isArray(g.edges);
}
