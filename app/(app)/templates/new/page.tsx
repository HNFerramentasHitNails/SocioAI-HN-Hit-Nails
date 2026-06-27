import { PageHeader } from "@/components/page-header";
import { TemplateEditor } from "@/components/templates/template-editor";
import { requireProfile } from "@/lib/supabase/auth";

export default async function NewTemplatePage() {
  const { supabase, profile } = await requireProfile();
  const { data: settings } = await supabase
    .from("outreach_org_settings")
    .select("about_context")
    .eq("organization_id", profile.organization_id)
    .maybeSingle();

  return (
    <>
      <PageHeader
        title="Novo template"
        description="Define o contexto e gera a mensagem com IA."
      />
      <TemplateEditor defaultAbout={settings?.about_context ?? ""} />
    </>
  );
}
