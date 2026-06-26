"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { setMemberRole, removeMember } from "@/app/(app)/equipa/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MemberActions({
  id,
  role,
  isSelf,
}: {
  id: string;
  role: "admin" | "member";
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (isSelf) return null;

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
        {role === "member" ? (
          <DropdownMenuItem
            onClick={() =>
              run(() => setMemberRole(id, "admin"), "Promovido a administrador.")
            }
          >
            <ShieldCheck className="size-4" /> Tornar admin
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() =>
              run(() => setMemberRole(id, "member"), "Passou a membro.")
            }
          >
            <ShieldOff className="size-4" /> Tornar membro
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => {
            if (!confirm("Remover este membro? A conta será eliminada.")) return;
            run(() => removeMember(id), "Membro removido.");
          }}
        >
          <Trash2 className="size-4" /> Remover
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
