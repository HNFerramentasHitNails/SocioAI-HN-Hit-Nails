"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Search, Download, Star, Globe, Phone } from "lucide-react";
import { toast } from "sonner";

import {
  searchMarketplace,
  importMarketplaceLeads,
} from "@/app/(app)/marketplace/actions";
import type { PlaceLead } from "@/lib/integrations/places";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MARKETPLACE_CATEGORIES, MARKETPLACE_QUANTITIES } from "@/lib/config";

function regionCodeFor(country: string): string {
  const c = country.toLowerCase();
  if (c.includes("bras")) return "BR";
  if (c.includes("espan") || c.includes("spain")) return "ES";
  if (c.includes("fran")) return "FR";
  if (c.includes("ingl") || c.includes("united kingdom") || c.includes("reino"))
    return "GB";
  return "PT";
}

export function MarketplaceView() {
  const [category, setCategory] = useState<string>("nails");
  const [customKeywords, setCustomKeywords] = useState("");
  const [quantity, setQuantity] = useState<number>(20);
  const [minRating, setMinRating] = useState<string>("0");
  const [website, setWebsite] = useState<"any" | "with" | "without">("any");
  const [country, setCountry] = useState("Portugal");
  const [city, setCity] = useState("");

  const [results, setResults] = useState<PlaceLead[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [searching, startSearch] = useTransition();
  const [importing, startImport] = useTransition();

  const cat = MARKETPLACE_CATEGORIES.find((c) => c.value === category);
  const keywords = category === "other" ? customKeywords : cat?.keywords ?? "";
  const niche = category === "other" ? customKeywords : cat?.label ?? null;

  const allSelected = useMemo(
    () => results !== null && results.length > 0 && selected.size === results.length,
    [results, selected],
  );

  function toggle(i: number) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  }
  function toggleAll() {
    if (!results) return;
    setSelected(allSelected ? new Set() : new Set(results.map((_, i) => i)));
  }

  function onSearch() {
    if (!keywords.trim()) {
      toast.error("Escolhe uma categoria ou escreve uma palavra-chave.");
      return;
    }
    if (!city.trim()) {
      toast.error("Indica a cidade.");
      return;
    }
    startSearch(async () => {
      const res = await searchMarketplace({
        niche,
        keywords,
        city,
        country,
        regionCode: regionCodeFor(country),
        minRating: Number(minRating),
        website,
        max: quantity,
      });
      if (res.error) {
        toast.error(res.error);
        setResults(null);
        return;
      }
      setResults(res.results ?? []);
      setSelected(new Set((res.results ?? []).map((_, i) => i)));
      toast.success(`${res.results?.length ?? 0} negócios encontrados.`);
    });
  }

  function onImport() {
    if (!results) return;
    const chosen = results.filter((_, i) => selected.has(i));
    if (chosen.length === 0) {
      toast.error("Seleciona pelo menos um lead.");
      return;
    }
    startImport(async () => {
      const res = await importMarketplaceLeads(chosen);
      if (res.error) toast.error(res.error);
      if (res.ok) toast.success(`${res.count} leads importados para os teus Leads.`);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Filtros */}
      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label>Categoria / Nicho</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MARKETPLACE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {category === "other" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="kw">Palavra-chave</Label>
              <Input
                id="kw"
                value={customKeywords}
                onChange={(e) => setCustomKeywords(e.target.value)}
                placeholder="Ex: dentista"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ex: Setúbal"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="country">País</Label>
            <Input
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Quantidade</Label>
            <Select
              value={String(quantity)}
              onValueChange={(v) => setQuantity(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MARKETPLACE_QUANTITIES.map((q) => (
                  <SelectItem key={q} value={String(q)}>
                    {q} leads
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Avaliação mínima</Label>
            <Select value={minRating} onValueChange={setMinRating}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Qualquer</SelectItem>
                <SelectItem value="3">3.0+</SelectItem>
                <SelectItem value="3.5">3.5+</SelectItem>
                <SelectItem value="4">4.0+</SelectItem>
                <SelectItem value="4.5">4.5+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Website</Label>
            <Select
              value={website}
              onValueChange={(v) => setWebsite(v as typeof website)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Indiferente</SelectItem>
                <SelectItem value="with">Com website</SelectItem>
                <SelectItem value="without">Sem website</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button onClick={onSearch} disabled={searching} className="gap-2">
              <Search className="size-4" />
              {searching ? "A pesquisar…" : "Pesquisar leads"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {results !== null && (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-3 text-sm">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              <span className="text-muted-foreground">
                {selected.size} de {results.length} selecionados
              </span>
            </div>
            <Button
              onClick={onImport}
              disabled={importing || selected.size === 0}
              className="gap-2"
            >
              <Download className="size-4" />
              {importing ? "A importar…" : "Importar selecionados"}
            </Button>
          </div>

          {results.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Nenhum negócio encontrado. Ajusta os filtros.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {results.map((r, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
                >
                  <Checkbox
                    checked={selected.has(i)}
                    onCheckedChange={() => toggle(i)}
                  />
                  <div className="flex flex-1 flex-col">
                    <span className="font-medium">{r.company}</span>
                    <span className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                      {r.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3" />
                          {r.phone}
                        </span>
                      )}
                      {r.city && <span>{r.city}</span>}
                      {typeof r.rating === "number" && (
                        <span className="flex items-center gap-1">
                          <Star className="size-3 text-amber-400" />
                          {r.rating}
                        </span>
                      )}
                      {r.has_website && (
                        <span className="flex items-center gap-1">
                          <Globe className="size-3" /> site
                        </span>
                      )}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Os leads importados aparecem em{" "}
        <Link href="/leads" className="text-primary hover:underline">
          Leads
        </Link>{" "}
        (origem: marketplace). Configura a chave Google em Definições → Geração de
        leads.
      </p>
    </div>
  );
}
