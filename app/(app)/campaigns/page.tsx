import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export default function CampaignsPage() {
  return (
    <>
      <PageHeader
        title="Campanhas"
        description="Orquestra envios multicanal e acompanha respostas."
      />
      <ComingSoon phase="Fase 6" />
    </>
  );
}
