"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { inviteMember } from "@/app/(app)/equipa/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function InviteMemberDialog() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await inviteMember(fd);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Membro adicionado. Já pode entrar com as credenciais.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button className="gap-2" onClick={() => setOpen(true)}>
        <UserPlus className="size-4" /> Convidar membro
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar membro</DialogTitle>
          <DialogDescription>
            Cria uma conta para um membro da equipa. Partilha-lhe a palavra-passe;
            ele poderá alterá-la depois.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="inv-name">Nome</Label>
            <Input id="inv-name" name="full_name" placeholder="Nome do membro" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="inv-email">Email</Label>
            <Input
              id="inv-email"
              name="email"
              type="email"
              required
              placeholder="membro@hnhitnails.com"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="inv-pass">Palavra-passe temporária</Label>
            <Input
              id="inv-pass"
              name="password"
              type="text"
              required
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "A criar…" : "Criar membro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
