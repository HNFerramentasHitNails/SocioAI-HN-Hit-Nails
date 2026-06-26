import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  draft: "border-muted bg-muted text-muted-foreground",
  scheduled: "border-blue-500/20 bg-blue-500/15 text-blue-400",
  running: "border-amber-500/20 bg-amber-500/15 text-amber-400",
  paused: "border-orange-500/20 bg-orange-500/15 text-orange-400",
  completed: "border-emerald-500/20 bg-emerald-500/15 text-emerald-400",
};

const LABELS: Record<string, string> = {
  draft: "Rascunho",
  scheduled: "Agendada",
  running: "Em execução",
  paused: "Pausada",
  completed: "Concluída",
};

export function CampaignStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", STYLES[status] ?? STYLES.draft)}
    >
      {LABELS[status] ?? status}
    </Badge>
  );
}
