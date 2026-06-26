import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export default function TemplatesPage() {
  return (
    <>
      <PageHeader
        title="Templates"
        description="Cria mensagens para WhatsApp e Email, com ajuda de IA."
      />
      <ComingSoon phase="Fase 4" />
    </>
  );
}
