"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TOOLTIP_STYLE = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  color: "var(--popover-foreground)",
  fontSize: "12px",
};

const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

type NamedValue = { name: string; value: number };

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">{children}</div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsCharts({
  leadsByStatus,
  messagesByChannel,
  leadsOverTime,
  campaignsByStatus,
}: {
  leadsByStatus: NamedValue[];
  messagesByChannel: NamedValue[];
  leadsOverTime: { name: string; value: number }[];
  campaignsByStatus: NamedValue[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Leads ao longo do tempo">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={leadsOverTime}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Line
              type="monotone"
              dataKey="value"
              name="Leads"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Leads por estado">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={leadsByStatus}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="value" name="Leads" radius={[6, 6, 0, 0]}>
              {leadsByStatus.map((_, i) => (
                <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Mensagens por canal">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={messagesByChannel}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="value" name="Mensagens" radius={[6, 6, 0, 0]}>
              {messagesByChannel.map((_, i) => (
                <Cell key={i} fill={SERIES_COLORS[(i + 1) % SERIES_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Saúde das campanhas">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={campaignsByStatus} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="name"
              stroke="var(--muted-foreground)"
              fontSize={11}
              width={90}
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="value" name="Campanhas" radius={[0, 6, 6, 0]}>
              {campaignsByStatus.map((_, i) => (
                <Cell key={i} fill={SERIES_COLORS[(i + 2) % SERIES_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
