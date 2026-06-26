"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import {
  toggleCatalogItem,
  deleteCatalogItem,
} from "@/app/(app)/catalogo/actions";
import { CatalogFormDialog } from "@/components/catalog/catalog-form-dialog";
import { CatalogImportDialog } from "@/components/catalog/catalog-import-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CATALOG_TYPES, CATALOG_TYPE_LABELS, type CatalogType } from "@/lib/config";
import type { Tables } from "@/lib/supabase/types";

type Item = Tables<"catalog_items">;

export function CatalogView({ items }: { items: Item[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [, start] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      [i.name, i.category, i.description, (i.tags ?? []).join(" ")]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [items, query]);

  function run(fn: () => Promise<{ error?: string }>, ok: string) {
    start(async () => {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else {
        toast.success(ok);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar no catálogo…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <CatalogImportDialog
            trigger={
              <Button variant="outline" className="gap-2">
                <Upload className="size-4" /> Importar CSV
              </Button>
            }
          />
          <CatalogFormDialog
            trigger={
              <Button className="gap-2">
                <Plus className="size-4" /> Novo item
              </Button>
            }
          />
        </div>
      </div>

      {CATALOG_TYPES.map((t) => {
        const group = filtered.filter((i) => i.type === t.value);
        if (group.length === 0) return null;
        return (
          <div key={t.value} className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              {CATALOG_TYPE_LABELS[t.value as CatalogType]} ({group.length})
            </h2>
            <Card className="p-0">
              <ul className="divide-y divide-border">
                {group.map((i) => (
                  <li
                    key={i.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{i.name}</span>
                        {i.category && (
                          <Badge variant="outline">{i.category}</Badge>
                        )}
                        {i.price && (
                          <span className="text-xs text-muted-foreground">
                            {i.price}
                          </span>
                        )}
                      </div>
                      {i.description && (
                        <span className="line-clamp-1 text-xs text-muted-foreground">
                          {i.description}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={i.active}
                        onCheckedChange={(c) =>
                          run(
                            () => toggleCatalogItem(i.id, c),
                            c ? "Ativado." : "Desativado.",
                          )
                        }
                        title="Ativo (usado pela IA)"
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <CatalogFormDialog
                            item={i}
                            trigger={
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Pencil className="size-4" /> Editar
                              </DropdownMenuItem>
                            }
                          />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              if (!confirm("Eliminar este item?")) return;
                              run(
                                () => deleteCatalogItem(i.id),
                                "Item eliminado.",
                              );
                            }}
                          >
                            <Trash2 className="size-4" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Sem itens no catálogo.
        </div>
      )}
    </div>
  );
}
