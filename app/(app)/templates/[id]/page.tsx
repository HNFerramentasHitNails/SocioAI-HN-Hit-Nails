import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { TemplateEditor } from "@/components/templates/template-editor";
import { requireProfile } from "@/lib/supabase/auth";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireProfile();

  const { data: template } = await supabase
    .from("templates")
    .select("*")
    .eq("id", id)
    .single();

  if (!template) notFound();

  return (
    <>
      <PageHeader
        title="Editar template"
        description="Ajusta o contexto e regenera a mensagem com IA."
      />
      <TemplateEditor template={template} />
    </>
  );
}
