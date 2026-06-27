"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Upload,
  Search,
  Trash2,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  ArrowLeft,
  Mail,
  Phone,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import {
  setLeadStatus,
  softDeleteLead,
  restoreLead,
  permanentDeleteLead,
  emptyTrash,
  promoteLead,
} from "@/app/(app)/leads/actions";
import { LeadFormDialog } from "@/components/leads/lead-form-dialog";
import { ImportCsvDialog } from "@/components/leads/import-csv-dialog";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/lib/config";
import { cn } from "@/lib/utils";
import type { Tables } from "@/lib/supabase/types";

type Lead = Tables<"leads">;

const FILTERS: { value: "all" | LeadStatus; label: string }[] = [
  { value: "all", label: "Todos" },
  ...LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] })),
];

export function LeadsView({
  leads,
  view,
}: {
  leads: Lead[];
  view: "active" | "trash";
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | LeadStatus>("all");
  const [, startTransition] = useTransition();
  const router = useRouter();

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length };
    for (const s of LEAD_STATUSES) c[s] = 0;
    for (const l of leads) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [leads]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (view === "active" && filter !== "all" && l.status !== filter)
        return false;
      if (!q) return true;
      return [l.name, l.company, l.email, l.phone, l.niche, l.city]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [leads, query, filter, view]);

  function runAction(fn: () => Promise<{ error?: string }>, success: string) {
    startTransition(async () => {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else {
        toast.success(success);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar leads…"
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          {view === "active" ? (
            <>
              <ImportCsvDialog
                trigger={
                  <Button variant="outline" className="gap-2">
                    <Upload className="size-4" /> Importar CSV
                  </Button>
                }
              />
              <LeadFormDialog
                trigger={
                  <Button className="gap-2">
                    <Plus className="size-4" /> Novo lead
                  </Button>
                }
              />
              <Button asChild variant="ghost" size="icon" title="Lixeira">
                <Link href="/leads?view=trash">
                  <Trash2 className="size-4" />
                </Link>
              </Button>
            </>
          ) : (
            <>
              {leads.length > 0 && (
                <Button
                  variant="outline"
                  className="gap-2 text-destructive"
                  onClick={() =>
                    runAction(emptyTrash, "Lixeira esvaziada.")
                  }
                >
                  <Trash2 className="size-4" /> Esvaziar lixeira
                </Button>
              )}
              <Button asChild variant="ghost" className="gap-2">
                <Link href="/leads">
                  <ArrowLeft className="size-4" /> Voltar
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status filters (active only) */}
      {view === "active" && (
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                filter === f.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
              <span className="ml-1.5 text-xs opacity-70">
                {counts[f.value] ?? 0}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Nicho</TableHead>
              <TableHead>Localização</TableHead>
              {view === "active" && <TableHead>Estado</TableHead>}
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={view === "active" ? 6 : 5}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  {view === "trash"
                    ? "A lixeira está vazia."
                    : leads.length === 0
                      ? "Ainda não tens leads. Cria um ou importa um CSV."
                      : "Nenhum lead corresponde à pesquisa."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div className="font-medium">{lead.name ?? "—"}</div>
                    {lead.company && (
                      <div className="text-sm text-muted-foreground">
                        {lead.company}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 text-sm">
                      {lead.email && (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="size-3" />
                          {lead.email}
                        </span>
                      )}
                      {lead.phone && (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="size-3" />
                          {lead.phone}
                        </span>
                      )}
                      {!lead.email && !lead.phone && "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {lead.niche ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[lead.city, lead.country].filter(Boolean).join(", ") || "—"}
                  </TableCell>
                  {view === "active" && (
                    <TableCell>
                      <LeadStatusBadge status={lead.status} />
                    </TableCell>
                  )}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {view === "active" ? (
                          <>
                            <LeadFormDialog
                              lead={lead}
                              trigger={
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  <Pencil className="size-4" /> Editar
                                </DropdownMenuItem>
                              }
                            />
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs text-muted-foreground">
                              Mudar estado
                            </DropdownMenuLabel>
                            {LEAD_STATUSES.map((s) => (
                              <DropdownMenuItem
                                key={s}
                                disabled={lead.status === s}
                                onClick={() =>
                                  runAction(
                                    () => setLeadStatus(lead.id, s),
                                    "Estado atualizado.",
                                  )
                                }
                              >
                                {LEAD_STATUS_LABELS[s]}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={Boolean(lead.prospect_id)}
                              onClick={() =>
                                runAction(
                                  () => promoteLead(lead.id),
                                  "Lead promovido a prospect.",
                                )
                              }
                            >
                              <UserPlus className="size-4" />{" "}
                              {lead.prospect_id
                                ? "Já é prospect"
                                : "Promover a prospect"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                runAction(
                                  () => softDeleteLead(lead.id),
                                  "Movido para a lixeira.",
                                )
                              }
                            >
                              <Trash2 className="size-4" /> Mover para lixeira
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <>
                            <DropdownMenuItem
                              onClick={() =>
                                runAction(
                                  () => restoreLead(lead.id),
                                  "Lead restaurado.",
                                )
                              }
                            >
                              <RotateCcw className="size-4" /> Restaurar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (
                                  confirm(
                                    "Eliminar este lead definitivamente? Esta ação é irreversível.",
                                  )
                                )
                                  runAction(
                                    () => permanentDeleteLead(lead.id),
                                    "Lead eliminado.",
                                  );
                              }}
                            >
                              <Trash2 className="size-4" /> Eliminar definitivamente
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
