"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { saveBranding, type Branding } from "@/app/(app)/definicoes/actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function BrandingSettings({ branding }: { branding: Branding }) {
  const router = useRouter();
  const [name, setName] = useState(branding.name);
  const [color, setColor] = useState(branding.primary_color ?? "#7c3aed");
  const [logoUrl, setLogoUrl] = useState<string | null>(branding.logo_url);
  const [aboutContext, setAboutContext] = useState(branding.about_context ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, startSaving] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `${branding.id}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("branding")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("branding").getPublicUrl(path);
      setLogoUrl(data.publicUrl);
      toast.success("Logo carregado. Não te esqueças de guardar.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar o logo.");
    } finally {
      setUploading(false);
    }
  }

  function onSave() {
    startSaving(async () => {
      const res = await saveBranding({
        name,
        primaryColor: color,
        logoUrl,
        aboutContext,
      });
      if (res.error) toast.error(res.error);
      else {
        toast.success("Branding guardado.");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>
          Personaliza o nome, a cor principal e o logótipo da organização.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="org-name">Nome da organização</Label>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="org-color">Cor principal</Label>
          <div className="flex items-center gap-3">
            <input
              id="org-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
            />
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="max-w-[140px] font-mono"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Logótipo</Label>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="Logo"
                width={48}
                height={48}
                unoptimized
                className="size-12 rounded-lg border border-border bg-muted object-contain"
              />
            ) : (
              <div className="flex size-12 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                —
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-4" />
              {uploading ? "A carregar…" : "Carregar logo"}
            </Button>
            {logoUrl && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                onClick={() => setLogoUrl(null)}
              >
                Remover
              </Button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="org-about">Sobre a empresa (contexto padrão para a IA)</Label>
          <Textarea
            id="org-about"
            value={aboutContext}
            onChange={(e) => setAboutContext(e.target.value)}
            rows={5}
            placeholder="O que ofereces? Que problema resolves? Prova/diferencial. Isto é usado como contexto por defeito ao gerar templates com IA."
          />
        </div>

        <Button onClick={onSave} disabled={saving} className="self-start">
          {saving ? "A guardar…" : "Guardar branding"}
        </Button>
      </CardContent>
    </Card>
  );
}
