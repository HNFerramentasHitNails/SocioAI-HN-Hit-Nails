"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { syncProductsToCatalog } from "@/app/(app)/catalogo/actions";
import { Button } from "@/components/ui/button";

export function SyncProductsButton() {
  const [pending, start] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await syncProductsToCatalog();
          if (res.error) toast.error(res.error);
          else toast.success(`Produtos sincronizados (${res.count} no catálogo).`);
        })
      }
    >
      <RefreshCw className={pending ? "size-4 animate-spin" : "size-4"} />
      Sincronizar produtos
    </Button>
  );
}
