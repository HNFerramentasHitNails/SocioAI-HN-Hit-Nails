import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ConversationThread } from "@/components/conversas/conversation-thread";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/supabase/auth";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireProfile();

  const { data: lead } = await supabase
    .from("leads")
    .select("id, name, company, phone, ai_paused")
    .eq("id", id)
    .single();
  if (!lead) notFound();

  const { data: messages } = await supabase
    .from("conversation_messages")
    .select("id, role, body, created_at")
    .eq("lead_id", id)
    .order("created_at", { ascending: true });

  return (
    <>
      <Button asChild variant="ghost" className="mb-2 gap-2">
        <Link href="/conversas">
          <ArrowLeft className="size-4" /> Conversas
        </Link>
      </Button>
      <PageHeader
        title={lead.name ?? lead.company ?? lead.phone ?? "Conversa"}
        description={lead.phone ?? undefined}
      />
      <ConversationThread
        leadId={lead.id}
        aiPaused={lead.ai_paused}
        messages={messages ?? []}
      />
    </>
  );
}
