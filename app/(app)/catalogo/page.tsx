import { PageHeader } from "@/components/page-header";
import { CatalogView } from "@/components/catalog/catalog-view";
import { SyncProductsButton } from "@/components/catalog/sync-products-button";
import { requireProfile } from "@/lib/supabase/auth";

export default async function CatalogoPage() {
  const { supabase } = await requireProfile();
  const { data: items } = await supabase
    .from("catalog_items")
    .select("*")
    .order("type", { ascending: true })
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  return (
    <>
      <PageHeader
        title="Catálogo"
        description="Produtos, formações e novidades que alimentam a IA nas recomendações."
      >
        <SyncProductsButton />
      </PageHeader>
      <CatalogView items={items ?? []} />
    </>
  );
}
