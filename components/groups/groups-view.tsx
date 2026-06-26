"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Download, Users2 } from "lucide-react";
import { toast } from "sonner";

import {
  listGroups,
  importGroupMembers,
  type GroupItem,
} from "@/app/(app)/whatsapp-groups/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function GroupsView() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupItem[] | null>(null);
  const [loading, startLoading] = useTransition();
  const [importingId, setImportingId] = useState<string | null>(null);
  const [, startImport] = useTransition();

  function load() {
    startLoading(async () => {
      const res = await listGroups();
      if (res.error) {
        toast.error(res.error);
        setGroups(null);
        return;
      }
      setGroups(res.groups ?? []);
      if ((res.groups ?? []).length === 0) toast.info("Nenhum grupo encontrado.");
    });
  }

  function importMembers(g: GroupItem) {
    setImportingId(g.id);
    startImport(async () => {
      const res = await importGroupMembers(g.id, g.subject);
      setImportingId(null);
      if (res.error) toast.error(res.error);
      else {
        toast.success(`${res.count} membros importados como leads.`);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className="size-4" />
          {loading ? "A carregar…" : "Carregar grupos"}
        </Button>
      </div>

      {groups !== null && (
        <Card className="p-0">
          {groups.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Nenhum grupo. Confirma que o WhatsApp está ligado em Definições →
              Canais.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {groups.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
                >
                  <Users2 className="size-4 text-muted-foreground" />
                  <div className="flex flex-1 flex-col">
                    <span className="font-medium">{g.subject}</span>
                    <span className="text-xs text-muted-foreground">
                      {g.size} membros
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={importingId === g.id}
                    onClick={() => importMembers(g)}
                  >
                    <Download className="size-4" />
                    {importingId === g.id ? "A importar…" : "Importar membros"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Importa os contactos dos teus grupos de WhatsApp como leads (apenas o
        número). Requer o WhatsApp ligado via Evolution API.
      </p>
    </div>
  );
}
