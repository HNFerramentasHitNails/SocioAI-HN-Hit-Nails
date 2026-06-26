"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Play, Pause, Rocket, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  pauseCampaign,
  resumeCampaign,
  sendCampaignNow,
  deleteCampaign,
} from "@/app/(app)/campaigns/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CampaignActions({
  id,
  status,
  redirectOnDelete,
}: {
  id: string;
  status: string;
  redirectOnDelete?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ error?: string }>, success: string) {
    start(async () => {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else {
        toast.success(success);
        router.refresh();
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={pending}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(status === "scheduled" ||
          status === "paused" ||
          status === "draft" ||
          status === "running") && (
          <DropdownMenuItem
            onClick={() =>
              run(() => sendCampaignNow(id), "Envio iniciado.")
            }
          >
            <Rocket className="size-4" /> Enviar agora
          </DropdownMenuItem>
        )}
        {status === "running" && (
          <DropdownMenuItem
            onClick={() => run(() => pauseCampaign(id), "Campanha pausada.")}
          >
            <Pause className="size-4" /> Pausar
          </DropdownMenuItem>
        )}
        {status === "paused" && (
          <DropdownMenuItem
            onClick={() => run(() => resumeCampaign(id), "Campanha retomada.")}
          >
            <Play className="size-4" /> Retomar
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => {
            if (!confirm("Eliminar esta campanha?")) return;
            start(async () => {
              const res = await deleteCampaign(id);
              if (res.error) toast.error(res.error);
              else {
                toast.success("Campanha eliminada.");
                if (redirectOnDelete) router.push("/campaigns");
                else router.refresh();
              }
            });
          }}
        >
          <Trash2 className="size-4" /> Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
