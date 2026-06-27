import { PageHeader } from "@/components/page-header";
import { FlowsList } from "@/components/flows/flows-list";
import { requireProfile } from "@/lib/supabase/auth";

export default async function AutomacoesPage() {
  const { supabase } = await requireProfile();
  const { data: flows } = await supabase
    .from("agent_flows")
    .select("id, name, description, active, updated_at")
    .order("updated_at", { ascending: false });

  // Is the conversation agent enabled at all?
  const { data: agent } = await supabase
    .from("integrations")
    .select("enabled")
    .eq("type", "agent")
    .maybeSingle();

  return (
    <>
      <PageHeader
        title="Automações"
        description="Desenha visualmente o fluxo do agente de vendas: o que acontece quando um lead responde no WhatsApp."
      />
      <FlowsList flows={flows ?? []} agentEnabled={agent?.enabled ?? false} />
    </>
  );
}
