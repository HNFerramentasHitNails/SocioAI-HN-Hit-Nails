import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { TemplatesList } from "@/components/templates/templates-list";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/supabase/auth";

export default async function TemplatesPage() {
  const { supabase } = await requireProfile();
  const { data: templates } = await supabase
    .from("templates")
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Templates"
        description="Cria mensagens para WhatsApp e Email, com ajuda de IA."
      >
        <Button asChild className="gap-2">
          <Link href="/templates/new">
            <Plus className="size-4" /> Novo template
          </Link>
        </Button>
      </PageHeader>
      <TemplatesList templates={templates ?? []} />
    </>
  );
}
