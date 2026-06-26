import { PageHeader } from "@/components/page-header";
import { TemplateEditor } from "@/components/templates/template-editor";
import { requireProfile } from "@/lib/supabase/auth";

export default async function NewTemplatePage() {
  const { supabase } = await requireProfile();
  const { data: org } = await supabase
    .from("organization")
    .select("about_context")
    .limit(1)
    .single();

  return (
    <>
      <PageHeader
        title="Novo template"
        description="Define o contexto e gera a mensagem com IA."
      />
      <TemplateEditor defaultAbout={org?.about_context ?? ""} />
    </>
  );
}
