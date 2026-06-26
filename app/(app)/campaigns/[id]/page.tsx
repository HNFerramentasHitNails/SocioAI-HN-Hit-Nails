import { notFound } from "next/navigation";
import { MessageCircle, Mail } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { CampaignActions } from "@/components/campaigns/campaign-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireProfile } from "@/lib/supabase/auth";

const MSG_LABELS: Record<string, string> = {
  queued: "Em fila",
  sent: "Enviada",
  delivered: "Entregue",
  failed: "Falhou",
  replied: "Respondeu",
  skipped: "Ignorada",
};

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  const isAdmin = profile.role === "admin";

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .single();
  if (!campaign) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, channel, status, error, sent_at, lead_id, created_at")
    .eq("campaign_id", id)
    .order("created_at", { ascending: false });

  const msgs = messages ?? [];
  const leadIds = [...new Set(msgs.map((m) => m.lead_id).filter(Boolean))];
  const { data: leads } = leadIds.length
    ? await supabase
        .from("leads")
        .select("id, name, company")
        .in("id", leadIds as string[])
    : { data: [] as { id: string; name: string | null; company: string | null }[] };
  const leadById = new Map((leads ?? []).map((l) => [l.id, l]));

  const count = (s: string) => msgs.filter((m) => m.status === s).length;
  const kpis = [
    { label: "Total", value: msgs.length },
    { label: "Enviadas", value: count("sent") + count("delivered") },
    { label: "Em fila", value: count("queued") },
    { label: "Falhadas", value: count("failed") },
  ];

  return (
    <>
      <PageHeader title={campaign.name}>
        {isAdmin && (
          <CampaignActions
            id={campaign.id}
            status={campaign.status}
            redirectOnDelete
          />
        )}
      </PageHeader>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <CampaignStatusBadge status={campaign.status} />
        {(campaign.channels as string[]).includes("whatsapp") && (
          <Badge variant="secondary" className="gap-1">
            <MessageCircle className="size-3" /> WhatsApp
          </Badge>
        )}
        {(campaign.channels as string[]).includes("email") && (
          <Badge variant="secondary" className="gap-1">
            <Mail className="size-3" /> Email
          </Badge>
        )}
        {campaign.scheduled_at && (
          <span className="text-sm text-muted-foreground">
            Agendada para{" "}
            {new Date(campaign.scheduled_at).toLocaleString("pt-PT")}
          </span>
        )}
      </div>

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
              <TableHead>Lead</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Enviada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {msgs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  Sem mensagens nesta campanha.
                </TableCell>
              </TableRow>
            ) : (
              msgs.map((m) => {
                const lead = m.lead_id ? leadById.get(m.lead_id) : undefined;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {lead?.name ?? lead?.company ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.channel === "whatsapp" ? (
                        <MessageCircle className="size-4" />
                      ) : (
                        <Mail className="size-4" />
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className="text-sm"
                        title={m.error ?? undefined}
                      >
                        {MSG_LABELS[m.status] ?? m.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.sent_at
                        ? new Date(m.sent_at).toLocaleString("pt-PT")
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
