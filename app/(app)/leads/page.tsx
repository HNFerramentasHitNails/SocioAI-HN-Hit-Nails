import { PageHeader } from "@/components/page-header";
import { LeadsView } from "@/components/leads/leads-view";
import { requireProfile } from "@/lib/supabase/auth";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const isTrash = view === "trash";

  const { supabase } = await requireProfile();

  const query = supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: leads } = isTrash
    ? await query.not("deleted_at", "is", null)
    : await query.is("deleted_at", null);

  return (
    <>
      <PageHeader
        title={isTrash ? "Lixeira" : "Leads"}
        description={
          isTrash
            ? "Leads removidos. Podes restaurar ou eliminar definitivamente."
            : "Importa, organiza e acompanha os teus leads."
        }
      />
      <LeadsView leads={leads ?? []} view={isTrash ? "trash" : "active"} />
    </>
  );
}
