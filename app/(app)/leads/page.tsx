import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export default function LeadsPage() {
  return (
    <>
      <PageHeader
        title="Leads"
        description="Importa, organiza e acompanha os teus leads."
      />
      <ComingSoon phase="Fase 3" />
    </>
  );
}
