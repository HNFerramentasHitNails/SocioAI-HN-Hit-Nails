"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";

import {
  importCatalogItems,
  type ImportRow,
} from "@/app/(app)/catalogo/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FIELD_ALIASES: Record<keyof ImportRow, string[]> = {
  name: ["name", "nome", "produto", "titulo", "item"],
  type: ["type", "tipo"],
  category: ["category", "categoria"],
  description: ["description", "descricao", "detalhe", "detalhes"],
  url: ["url", "link", "ligacao"],
  price: ["price", "preco", "valor"],
  tags: ["tags", "etiquetas"],
};

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function buildHeaderMap(headers: string[]) {
  const map: Partial<Record<string, keyof ImportRow>> = {};
  for (const header of headers) {
    const norm = normalize(header);
    for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [
      keyof ImportRow,
      string[],
    ][]) {
      if (aliases.includes(norm)) {
        map[header] = field;
        break;
      }
    }
  }
  return map;
}

export function CatalogImportDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [unmatched, setUnmatched] = useState(false);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function reset() {
    setRows([]);
    setFileName(null);
    setUnmatched(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleFile(file: File) {
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const headerMap = buildHeaderMap(result.meta.fields ?? []);
        if (!Object.values(headerMap).includes("name")) {
          setUnmatched(true);
          setRows([]);
          return;
        }
        setUnmatched(false);
        const mapped: ImportRow[] = result.data.map((raw) => {
          const item: ImportRow = {};
          for (const [header, field] of Object.entries(headerMap)) {
            if (!field) continue;
            const val = raw[header]?.trim();
            if (field === "tags") {
              item.tags = (val ?? "")
                .split(/[;|]/)
                .map((t) => t.trim())
                .filter(Boolean);
            } else {
              item[field] = val || undefined;
            }
          }
          return item;
        });
        setRows(mapped.filter((r) => r.name));
      },
      error: () => toast.error("Não foi possível ler o ficheiro."),
    });
  }

  function onImport() {
    start(async () => {
      const res = await importCatalogItems(rows);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`${res.count} itens importados.`);
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar catálogo (CSV)</DialogTitle>
          <DialogDescription>
            Colunas reconhecidas: nome, tipo (produto/formação/novidade),
            categoria, descrição, url, preço, tags (separadas por ; ou |).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-8 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            {fileName ? (
              <>
                <FileText className="size-6 text-primary" />
                <span className="font-medium text-foreground">{fileName}</span>
              </>
            ) : (
              <>
                <Upload className="size-6" />
                <span>Clica para escolher um ficheiro CSV</span>
              </>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />

          {unmatched ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Não foi encontrada a coluna do nome. Verifica os cabeçalhos.
            </p>
          ) : rows.length > 0 ? (
            <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
              {rows.length} itens prontos a importar.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onImport}
            disabled={pending || rows.length === 0}
          >
            {pending ? "A importar…" : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
