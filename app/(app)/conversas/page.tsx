import Link from "next/link";
import { Bot, BotOff } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireProfile } from "@/lib/supabase/auth";

export default async function ConversasPage() {
  const { supabase } = await requireProfile();

  const { data: msgs } = await supabase
    .from("conversation_messages")
    .select("lead_id, role, body, created_at")
    .order("created_at", { ascending: false })
    .limit(400);

  // Latest message per lead.
  const seen = new Set<string>();
  const convos: { lead_id: string; body: string; created_at: string }[] = [];
  for (const m of msgs ?? []) {
    if (seen.has(m.lead_id)) continue;
    seen.add(m.lead_id);
    convos.push({ lead_id: m.lead_id, body: m.body, created_at: m.created_at });
  }

  const leadIds = convos.map((c) => c.lead_id);
  const { data: leads } = leadIds.length
    ? await supabase
        .from("leads")
        .select("id, name, company, phone, status, ai_paused")
        .in("id", leadIds)
    : {
        data: [] as {
          id: string;
          name: string | null;
          company: string | null;
          phone: string | null;
          status: string;
          ai_paused: boolean;
        }[],
      };
  const leadById = new Map((leads ?? []).map((l) => [l.id, l]));

  return (
    <>
      <PageHeader
        title="Conversas"
        description="Conversas de WhatsApp conduzidas pelo agente de IA."
      />

      {convos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Ainda não há conversas. Quando um lead responder no WhatsApp, a conversa
          aparece aqui.
        </div>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {convos.map((c) => {
              const lead = leadById.get(c.lead_id);
              if (!lead) return null;
              return (
                <li key={c.lead_id}>
                  <Link
                    href={`/conversas/${c.lead_id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
                  >
                    {lead.ai_paused ? (
                      <BotOff className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <Bot className="size-4 shrink-0 text-primary" />
                    )}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium">
                        {lead.name ?? lead.company ?? lead.phone ?? "Lead"}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {c.body}
                      </span>
                    </div>
                    {lead.status === "respondeu" && (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/20 bg-emerald-500/15 text-emerald-400"
                      >
                        Respondeu
                      </Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
