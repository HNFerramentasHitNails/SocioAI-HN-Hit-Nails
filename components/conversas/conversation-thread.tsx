"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Bot, BotOff } from "lucide-react";
import { toast } from "sonner";

import { sendManualReply, setAiPaused } from "@/app/(app)/conversas/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Msg = { id: string; role: string; body: string; created_at: string };

export function ConversationThread({
  leadId,
  aiPaused,
  messages,
}: {
  leadId: string;
  aiPaused: boolean;
  messages: Msg[];
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sending, startSending] = useTransition();
  const [, startToggle] = useTransition();

  function onToggle(checked: boolean) {
    // Switch ON = AI active = ai_paused false
    startToggle(async () => {
      const res = await setAiPaused(leadId, !checked);
      if (res.error) toast.error(res.error);
      else {
        toast.success(checked ? "Agente de IA ativado." : "Agente de IA pausado.");
        router.refresh();
      }
    });
  }

  function onSend() {
    if (!text.trim()) return;
    startSending(async () => {
      const res = await sendManualReply(leadId, text);
      if (res.error) toast.error(res.error);
      else {
        setText("");
        toast.success("Mensagem enviada (IA pausada).");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-2 text-sm">
          {aiPaused ? (
            <BotOff className="size-4 text-muted-foreground" />
          ) : (
            <Bot className="size-4 text-primary" />
          )}
          <span>{aiPaused ? "Agente de IA pausado" : "Agente de IA ativo"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="ai-toggle" className="text-xs text-muted-foreground">
            IA
          </Label>
          <Switch
            id="ai-toggle"
            checked={!aiPaused}
            onCheckedChange={onToggle}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sem mensagens ainda.
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex",
                m.role === "lead" ? "justify-start" : "justify-end",
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
                  m.role === "lead"
                    ? "rounded-bl-sm bg-muted text-foreground"
                    : "rounded-br-sm bg-primary text-primary-foreground",
                )}
              >
                {m.body}
                <div
                  className={cn(
                    "mt-1 text-[10px] opacity-60",
                    m.role === "lead" ? "" : "text-right",
                  )}
                >
                  {new Date(m.created_at).toLocaleString("pt-PT")}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-end gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreve uma resposta manual (pausa a IA)…"
          rows={2}
          className="resize-none"
        />
        <Button onClick={onSend} disabled={sending} className="gap-2">
          <Send className="size-4" />
          {sending ? "…" : "Enviar"}
        </Button>
      </div>
    </div>
  );
}
