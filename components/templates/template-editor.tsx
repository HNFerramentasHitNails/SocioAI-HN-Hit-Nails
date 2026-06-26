"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import {
  createTemplate,
  updateTemplate,
  generateBody,
} from "@/app/(app)/templates/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CHANNELS,
  CHANNEL_LABELS,
  CHANNEL_CHAR_LIMIT,
  LEAD_STAGES,
  MESSAGE_OBJECTIVES,
  MESSAGE_TONES,
  MERGE_VARIABLES,
  type Channel,
} from "@/lib/config";
import { cn } from "@/lib/utils";
import type { Tables } from "@/lib/supabase/types";

type Template = Tables<"templates">;

export function TemplateEditor({ template }: { template?: Template }) {
  const router = useRouter();
  const isEdit = Boolean(template);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [name, setName] = useState(template?.name ?? "");
  const [channel, setChannel] = useState<Channel>(
    (template?.channel as Channel) ?? "whatsapp",
  );
  const [niche, setNiche] = useState(template?.niche ?? "");
  const [leadStage, setLeadStage] = useState(template?.lead_stage ?? "frio");
  const [objective, setObjective] = useState(template?.objective ?? "iniciar");
  const [tone, setTone] = useState(template?.tone ?? "humano");
  const [aboutContext, setAboutContext] = useState(
    template?.about_context ?? "",
  );
  const [body, setBody] = useState(template?.body ?? "");

  const [generating, startGenerating] = useTransition();
  const [saving, startSaving] = useTransition();

  const limit = CHANNEL_CHAR_LIMIT[channel];
  const over = body.length > limit;

  function onGenerate() {
    startGenerating(async () => {
      const res = await generateBody({
        channel,
        niche,
        leadStage,
        objective,
        tone,
        aboutContext,
        currentBody: body.trim() || undefined,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setBody(res.body ?? "");
      toast.success("Mensagem gerada.");
    });
  }

  function insertVariable(v: string) {
    const el = bodyRef.current;
    if (!el) {
      setBody((b) => b + v);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + v + body.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + v.length;
    });
  }

  function onSave() {
    if (!name.trim()) {
      toast.error("Dá um nome ao template.");
      return;
    }
    const fd = new FormData();
    fd.set("name", name);
    fd.set("channel", channel);
    fd.set("niche", niche);
    fd.set("lead_stage", leadStage);
    fd.set("objective", objective);
    fd.set("tone", tone);
    fd.set("about_context", aboutContext);
    fd.set("body", body);

    startSaving(async () => {
      const res = isEdit
        ? await updateTemplate(template!.id, fd)
        : await createTemplate(fd);
      // On success the action redirects; we only get here on error.
      if (res?.error) toast.error(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          className="gap-2"
          onClick={() => router.push("/templates")}
        >
          <ArrowLeft className="size-4" /> Templates
        </Button>
        <Button onClick={onSave} disabled={saving} className="gap-2">
          <Save className="size-4" />
          {saving ? "A guardar…" : "Guardar template"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuração */}
        <Card>
          <CardHeader>
            <CardTitle>Configuração</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nome do template</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Primeiro contacto restaurantes"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Canal</Label>
                <Select
                  value={channel}
                  onValueChange={(v) => setChannel(v as Channel)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CHANNEL_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="niche">Nicho</Label>
                <Input
                  id="niche"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="Ex: Restaurantes"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Estágio do lead</Label>
                <Select value={leadStage} onValueChange={setLeadStage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STAGES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Objetivo</Label>
                <Select value={objective} onValueChange={setObjective}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESSAGE_OBJECTIVES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Tom de voz</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESSAGE_TONES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="about">Sobre ti (contexto para a IA)</Label>
              <Textarea
                id="about"
                value={aboutContext}
                onChange={(e) => setAboutContext(e.target.value)}
                placeholder="O que ofereces? Que problema resolves? Prova/diferencial?"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Mensagem */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Mensagem</CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={onGenerate}
              disabled={generating}
            >
              <Sparkles className="size-4" />
              {generating
                ? "A gerar…"
                : body.trim()
                  ? "Regenerar"
                  : "Gerar com IA"}
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escreve a mensagem ou gera-a com IA…"
              rows={10}
              className="resize-none font-mono text-sm"
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Variáveis: clica para inserir
              </span>
              <span className={cn(over ? "text-destructive" : "text-muted-foreground")}>
                {body.length} / {limit}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MERGE_VARIABLES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVariable(v)}
                  className="rounded-md border border-border bg-muted/50 px-2 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  {v}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
