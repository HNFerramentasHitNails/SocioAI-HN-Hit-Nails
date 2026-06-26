import { PageHeader } from "@/components/page-header";
import { ChannelsSettings } from "@/components/settings/channels-settings";
import { BrandingSettings } from "@/components/settings/branding-settings";
import { AiSettingsCard } from "@/components/settings/ai-settings";
import { requireAdmin } from "@/lib/supabase/auth";
import { getChannelSettings, getBranding, getAiSettings } from "./actions";

export default async function DefinicoesPage() {
  await requireAdmin();
  const [settings, branding, aiSettings] = await Promise.all([
    getChannelSettings(),
    getBranding(),
    getAiSettings(),
  ]);

  return (
    <>
      <PageHeader
        title="Definições"
        description="Branding e canais de envio da tua organização."
      />

      <div className="flex flex-col gap-8">
        {branding && (
          <section>
            <BrandingSettings branding={branding} />
          </section>
        )}

        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Inteligência Artificial
          </h2>
          <AiSettingsCard settings={aiSettings} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Canais
          </h2>
          <ChannelsSettings settings={settings} />
        </section>
      </div>
    </>
  );
}
