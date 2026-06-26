import { PageHeader } from "@/components/page-header";
import { TemplateEditor } from "@/components/templates/template-editor";
import { requireProfile } from "@/lib/supabase/auth";

export default async function NewTemplatePage() {
  await requireProfile();
  return (
    <>
      <PageHeader
        title="Novo template"
        description="Define o contexto e gera a mensagem com IA."
      />
      <TemplateEditor />
    </>
  );
}
