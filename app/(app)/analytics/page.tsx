import { PageHeader } from "@/components/page-header";
import { AnalyticsCharts } from "@/components/analytics/analytics-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/supabase/auth";
import {
  CHANNEL_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_STATUSES,
  CHANNELS,
  type Channel,
  type LeadStatus,
} from "@/lib/config";

const CAMPAIGN_LABELS: Record<string, string> = {
  draft: "Rascunho",
  scheduled: "Agendada",
  running: "Em execução",
  paused: "Pausada",
  completed: "Concluída",
};

export default async function AnalyticsPage() {
  const { supabase } = await requireProfile();

  const [{ data: leads }, { data: messages }, { data: campaigns }] =
    await Promise.all([
      supabase.from("leads").select("status, created_at").is("deleted_at", null),
      supabase.from("messages").select("channel, status"),
      supabase.from("campaigns").select("status"),
    ]);

  const leadRows = leads ?? [];
  const msgRows = messages ?? [];
  const campRows = campaigns ?? [];

  // Leads by status
  const leadsByStatus = LEAD_STATUSES.map((s) => ({
    name: LEAD_STATUS_LABELS[s as LeadStatus],
    value: leadRows.filter((l) => l.status === s).length,
  }));

  // Messages by channel (sent-ish)
  const sentStatuses = new Set(["sent", "delivered", "replied"]);
  const messagesByChannel = CHANNELS.map((c) => ({
    name: CHANNEL_LABELS[c as Channel],
    value: msgRows.filter(
      (m) => m.channel === c && sentStatuses.has(m.status),
    ).length,
  }));

  // Campaigns by status (only non-zero)
  const campaignsByStatus = Object.entries(CAMPAIGN_LABELS)
    .map(([status, label]) => ({
      name: label,
      value: campRows.filter((c) => c.status === status).length,
    }))
    .filter((d) => d.value > 0);

  // Leads over time (last 30 days)
  const days: { name: string; value: number }[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const count = leadRows.filter(
      (l) => (l.created_at ?? "").slice(0, 10) === key,
    ).length;
    days.push({
      name: d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" }),
      value: count,
    });
  }

  const totalSent = messagesByChannel.reduce((a, b) => a + b.value, 0);
  const totalReplies = msgRows.filter((m) => m.status === "replied").length;
  const responseRate =
    totalSent > 0 ? `${Math.round((totalReplies / totalSent) * 100)}%` : "—";

  const kpis = [
    { label: "Leads", value: leadRows.length },
    { label: "Mensagens enviadas", value: totalSent },
    { label: "Campanhas", value: campRows.length },
    { label: "Taxa de resposta", value: responseRate },
  ];

  return (
    <>
      <PageHeader
        title="Análises"
        description="Desempenho da tua prospeção e outreach."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {k.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AnalyticsCharts
        leadsByStatus={leadsByStatus}
        messagesByChannel={messagesByChannel}
        leadsOverTime={days}
        campaignsByStatus={campaignsByStatus}
      />
    </>
  );
}
