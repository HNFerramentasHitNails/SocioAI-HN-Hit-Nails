"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createCatalogItem,
  updateCatalogItem,
} from "@/app/(app)/catalogo/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATALOG_TYPES } from "@/lib/config";
import type { Tables } from "@/lib/supabase/types";

type Item = Tables<"catalog_items">;

export function CatalogFormDialog({
  item,
  defaultType,
  trigger,
}: {
  item?: Item;
  defaultType?: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const isEdit = Boolean(item);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = isEdit
        ? await updateCatalogItem(item!.id, fd)
        : await createCatalogItem(fd);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(isEdit ? "Item atualizado." : "Item criado.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar item" : "Novo item"}</DialogTitle>
          <DialogDescription>
            Produtos, formações e novidades que alimentam a IA.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Tipo</Label>
              <Select
                name="type"
                defaultValue={item?.type ?? defaultType ?? "product"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATALOG_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cat-category">Categoria</Label>
              <Input
                id="cat-category"
                name="category"
                defaultValue={item?.category ?? ""}
                placeholder="Ex: Gel Polish"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cat-name">Nome</Label>
            <Input id="cat-name" name="name" defaultValue={item?.name ?? ""} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cat-desc">Descrição</Label>
            <Textarea
              id="cat-desc"
              name="description"
              rows={3}
              defaultValue={item?.description ?? ""}
              placeholder="Para que serve, benefícios, a quem se destina…"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cat-url">Link</Label>
              <Input
                id="cat-url"
                name="url"
                defaultValue={item?.url ?? ""}
                placeholder="https://www.hnhitnails.com/…"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cat-price">Preço (opcional)</Label>
              <Input
                id="cat-price"
                name="price"
                defaultValue={item?.price ?? ""}
                placeholder="Ex: 9,90€"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cat-tags">Tags (separadas por vírgula)</Label>
            <Input
              id="cat-tags"
              name="tags"
              defaultValue={(item?.tags ?? []).join(", ")}
              placeholder="unhas, gel, cor"
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
              {pending ? "A guardar…" : isEdit ? "Guardar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
