import { PageHeader } from "@/components/page-header";
import { ChannelsSettings } from "@/components/settings/channels-settings";
import { requireAdmin } from "@/lib/supabase/auth";
import { getChannelSettings } from "./actions";

export default async function DefinicoesPage() {
  await requireAdmin();
  const settings = await getChannelSettings();

  return (
    <>
      <PageHeader
        title="Definições"
        description="Configura os canais de envio (WhatsApp e Email)."
      />
      <ChannelsSettings settings={settings} />
    </>
  );
}
