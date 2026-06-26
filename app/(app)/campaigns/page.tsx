import Link from "next/link";
import { Plus, MessageCircle, Mail } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { CampaignActions } from "@/components/campaigns/campaign-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireProfile } from "@/lib/supabase/auth";

export default async function CampaignsPage() {
  const { supabase, profile } = await requireProfile();
  const isAdmin = profile.role === "admin";

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, status, channels, scheduled_at, created_at")
    .order("created_at", { ascending: false });

  const { data: cl } = await supabase
    .from("campaign_leads")
    .select("campaign_id");
  const { data: msgs } = await supabase
    .from("messages")
    .select("campaign_id, status");

  const leadsByCampaign = new Map<string, number>();
  for (const r of cl ?? [])
    leadsByCampaign.set(
      r.campaign_id,
      (leadsByCampaign.get(r.campaign_id) ?? 0) + 1,
    );
  const sentByCampaign = new Map<string, number>();
  let totalReplies = 0;
  for (const m of msgs ?? []) {
    if (m.status === "sent" || m.status === "delivered" || m.status === "replied") {
      if (m.campaign_id)
        sentByCampaign.set(
          m.campaign_id,
          (sentByCampaign.get(m.campaign_id) ?? 0) + 1,
        );
    }
    if (m.status === "replied") totalReplies++;
  }

  const list = campaigns ?? [];
  const kpis = [
    { label: "Total", value: list.length },
    { label: "Em execução", value: list.filter((c) => c.status === "running").length },
    { label: "Agendadas", value: list.filter((c) => c.status === "scheduled").length },
    { label: "Respostas", value: totalReplies },
  ];

  return (
    <>
      <PageHeader
        title="Campanhas"
        description="Orquestra envios multicanal e acompanha respostas."
      >
        {isAdmin && (
          <Button asChild className="gap-2">
            <Link href="/campaigns/new">
              <Plus className="size-4" /> Nova campanha
            </Link>
          </Button>
        )}
      </PageHeader>

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

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campanha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Canais</TableHead>
              <TableHead>Leads</TableHead>
              <TableHead>Enviadas</TableHead>
              {isAdmin && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 6 : 5}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  Ainda não há campanhas.
                </TableCell>
              </TableRow>
            ) : (
              list.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="font-medium hover:underline"
                    >
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <CampaignStatusBadge status={c.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5 text-muted-foreground">
                      {c.channels.includes("whatsapp") && (
                        <MessageCircle className="size-4" />
                      )}
                      {c.channels.includes("email") && (
                        <Mail className="size-4" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {leadsByCampaign.get(c.id) ?? 0}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {sentByCampaign.get(c.id) ?? 0}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <CampaignActions id={c.id} status={c.status} />
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
