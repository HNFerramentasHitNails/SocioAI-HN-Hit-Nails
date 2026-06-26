import { PageHeader } from "@/components/page-header";
import { CampaignWizard } from "@/components/campaigns/campaign-wizard";
import { requireAdmin } from "@/lib/supabase/auth";

export default async function NewCampaignPage() {
  const { supabase } = await requireAdmin();

  const [{ data: leads }, { data: templates }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, name, company, email, phone, niche")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("templates")
      .select("id, name, channel, body")
      .order("updated_at", { ascending: false }),
  ]);

  return (
    <>
      <PageHeader
        title="Nova campanha"
        description="Segue os passos para criar e lançar a campanha."
      />
      <CampaignWizard leads={leads ?? []} templates={templates ?? []} />
    </>
  );
}
