import { Badge } from "@/components/ui/badge";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/config";
import { cn } from "@/lib/utils";

const STYLES: Record<LeadStatus, string> = {
  novo: "border-blue-500/20 bg-blue-500/15 text-blue-400",
  contatado: "border-amber-500/20 bg-amber-500/15 text-amber-400",
  respondeu: "border-emerald-500/20 bg-emerald-500/15 text-emerald-400",
  convertido: "border-violet-500/20 bg-violet-500/15 text-violet-400",
  perdido: "border-rose-500/20 bg-rose-500/15 text-rose-400",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STYLES[status])}>
      {LEAD_STATUS_LABELS[status]}
    </Badge>
  );
}
