import { PageHeader } from "@/components/page-header";
import { MarketplaceView } from "@/components/marketplace/marketplace-view";
import { requireProfile } from "@/lib/supabase/auth";

export default async function MarketplacePage() {
  await requireProfile();
  return (
    <>
      <PageHeader
        title="Marketplace de leads"
        description="Descobre negócios locais por nicho e cidade e importa-os como leads."
      />
      <MarketplaceView />
    </>
  );
}
