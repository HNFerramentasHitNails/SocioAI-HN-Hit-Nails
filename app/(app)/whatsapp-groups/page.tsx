import { PageHeader } from "@/components/page-header";
import { GroupsView } from "@/components/groups/groups-view";
import { requireProfile } from "@/lib/supabase/auth";

export default async function WhatsappGroupsPage() {
  await requireProfile();
  return (
    <>
      <PageHeader
        title="Grupos de WhatsApp"
        description="Importa membros dos teus grupos de WhatsApp como leads."
      />
      <GroupsView />
    </>
  );
}
