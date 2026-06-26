"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";

import { importLeads } from "@/app/(app)/leads/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type MappedLead = {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  niche?: string;
  city?: string;
  state?: string;
  country?: string;
};

const FIELD_ALIASES: Record<keyof MappedLead, string[]> = {
  name: ["name", "nome", "fullname", "nomecompleto", "contacto", "contact"],
  company: ["company", "empresa", "negocio", "business", "organizacao"],
  email: ["email", "mail", "correio"],
  phone: ["phone", "telefone", "telemovel", "tel", "whatsapp", "numero", "contactotelefonico"],
  niche: ["niche", "nicho", "categoria", "category", "setor"],
  city: ["city", "cidade", "localidade"],
  state: ["state", "estado", "regiao", "distrito"],
  country: ["country", "pais"],
};

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function buildHeaderMap(headers: string[]) {
  const map: Partial<Record<string, keyof MappedLead>> = {};
  for (const header of headers) {
    const norm = normalize(header);
    for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [
      keyof MappedLead,
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

export function ImportCsvDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<MappedLead[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [unmatched, setUnmatched] = useState(false);
  const [pending, startTransition] = useTransition();
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
        const headers = result.meta.fields ?? [];
        const headerMap = buildHeaderMap(headers);
        if (Object.keys(headerMap).length === 0) {
          setUnmatched(true);
          setRows([]);
          return;
        }
        setUnmatched(false);
        const mapped: MappedLead[] = result.data.map((raw) => {
          const lead: MappedLead = {};
          for (const [header, field] of Object.entries(headerMap)) {
            if (field) lead[field] = raw[header]?.trim() || undefined;
          }
          return lead;
        });
        setRows(
          mapped.filter(
            (r) => r.name || r.company || r.email || r.phone,
          ),
        );
      },
      error: () => toast.error("Não foi possível ler o ficheiro."),
    });
  }

  function onImport() {
    startTransition(async () => {
      const res = await importLeads(rows);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`${res.count} leads importados.`);
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
          <DialogTitle>Importar leads (CSV)</DialogTitle>
          <DialogDescription>
            O ficheiro deve ter cabeçalhos. Reconhecemos colunas como nome,
            empresa, email, telefone, nicho, cidade, estado e país.
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
              Não foi reconhecida nenhuma coluna. Verifica os cabeçalhos do CSV.
            </p>
          ) : rows.length > 0 ? (
            <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
              {rows.length} leads prontos a importar.
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
