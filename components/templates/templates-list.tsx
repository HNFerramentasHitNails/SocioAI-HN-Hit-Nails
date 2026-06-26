"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { MessageCircle, Mail, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteTemplate } from "@/app/(app)/templates/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CHANNEL_LABELS, type Channel } from "@/lib/config";
import type { Tables } from "@/lib/supabase/types";

type Template = Tables<"templates">;

export function TemplatesList({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function onDelete(id: string) {
    if (!confirm("Eliminar este template?")) return;
    startTransition(async () => {
      const res = await deleteTemplate(id);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Template eliminado.");
        router.refresh();
      }
    });
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
        <p className="text-sm text-muted-foreground">
          Ainda não tens templates.
        </p>
        <Button asChild className="mt-4">
          <Link href="/templates/new">Criar o primeiro template</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((t) => (
        <Card key={t.id} className="flex flex-col">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="flex flex-col gap-1.5">
              <span className="font-medium">{t.name}</span>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="gap-1">
                  {t.channel === "whatsapp" ? (
                    <MessageCircle className="size-3" />
                  ) : (
                    <Mail className="size-3" />
                  )}
                  {CHANNEL_LABELS[t.channel as Channel]}
                </Badge>
                {t.niche && <Badge variant="outline">{t.niche}</Badge>}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="-mr-2 -mt-1">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/templates/${t.id}`}>
                    <Pencil className="size-4" /> Editar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(t.id)}
                >
                  <Trash2 className="size-4" /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent className="flex-1">
            <Link href={`/templates/${t.id}`}>
              <p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">
                {t.body || "Sem conteúdo ainda."}
              </p>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
