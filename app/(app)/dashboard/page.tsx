import Link from "next/link";
import { Users, Send, MessageSquare, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/supabase/auth";

export default async function DashboardPage() {
  const { profile, supabase } = await requireProfile();
  const firstName = profile.full_name?.split(/\s+/)[0] ?? "";

  const { count: leadsCount } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null);

  const { count: respondedCount } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null)
    .eq("status", "respondeu");

  const stats = [
    {
      title: "Leads",
      value: String(leadsCount ?? 0),
      icon: Users,
      hint: "Total de leads",
    },
    { title: "Mensagens enviadas", value: "0", icon: Send, hint: "Este mês" },
    {
      title: "Campanhas ativas",
      value: "0",
      icon: MessageSquare,
      hint: "Em execução",
    },
    {
      title: "Responderam",
      value: String(respondedCount ?? 0),
      icon: TrendingUp,
      hint: "Leads que responderam",
    },
  ];

  return (
    <>
      <PageHeader
        title={`Olá${firstName ? `, ${firstName}` : ""} 👋`}
        description="Visão geral da tua atividade de prospeção e outreach."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Próximos passos</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-inside list-disc space-y-1.5">
            <li>
              Importa ou cria os teus primeiros leads em{" "}
              <Link href="/leads" className="text-primary hover:underline">
                Leads
              </Link>
              .
            </li>
            <li>
              Cria <strong>templates</strong> de mensagem para WhatsApp e Email.
            </li>
            <li>
              Lança uma <strong>campanha</strong> para contactares os leads.
            </li>
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
