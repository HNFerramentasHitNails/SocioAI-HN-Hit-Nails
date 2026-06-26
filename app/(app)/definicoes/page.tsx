import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";
import { requireAdmin } from "@/lib/supabase/auth";

export default async function DefinicoesPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader
        title="Definições"
        description="Branding e integrações da tua organização."
      />
      <ComingSoon phase="Fase 8" />
    </>
  );
}
