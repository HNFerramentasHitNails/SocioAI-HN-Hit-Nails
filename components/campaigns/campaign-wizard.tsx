"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Rocket,
  MessageCircle,
  Mail,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { createCampaign } from "@/app/(app)/campaigns/actions";
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
import { CHANNELS, CHANNEL_LABELS, type Channel } from "@/lib/config";
import { cn } from "@/lib/utils";

type LeadLite = {
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  niche: string | null;
};
type TemplateLite = {
  id: string;
  name: string;
  channel: string;
  body: string | null;
};

const STEPS = ["Informações", "Leads", "Templates", "Agendamento", "Revisão"];

export function CampaignWizard({
  leads,
  templates,
}: {
  leads: LeadLite[];
  templates: TemplateLite[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [channels, setChannels] = useState<Channel[]>(["whatsapp"]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [whatsappTemplateId, setWhatsappTemplateId] = useState<string>("");
  const [emailTemplateId, setEmailTemplateId] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState("");
  const [mode, setMode] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState("");

  const waTemplates = templates.filter((t) => t.channel === "whatsapp");
  const emTemplates = templates.filter((t) => t.channel === "email");

  const filteredLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.name, l.company, l.email, l.phone, l.niche]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [leads, query]);

  function toggleChannel(c: Channel) {
    setChannels((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  }
  function toggleLead(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function selectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = filteredLeads.every((l) => next.has(l.id));
      if (allSelected) filteredLeads.forEach((l) => next.delete(l.id));
      else filteredLeads.forEach((l) => next.add(l.id));
      return next;
    });
  }

  function canNext(): string | null {
    if (step === 0) {
      if (!name.trim()) return "Dá um nome à campanha.";
      if (channels.length === 0) return "Escolhe pelo menos um canal.";
    }
    if (step === 1 && selected.size === 0) return "Seleciona pelo menos um lead.";
    if (step === 2) {
      if (channels.includes("whatsapp") && !whatsappTemplateId)
        return "Escolhe um template de WhatsApp.";
      if (channels.includes("email") && !emailTemplateId)
        return "Escolhe um template de Email.";
    }
    if (step === 3 && mode === "later" && !scheduledAt)
      return "Define a data e hora.";
    return null;
  }

  function next() {
    const err = canNext();
    if (err) {
      toast.error(err);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function launch() {
    const err = canNext();
    if (err) {
      toast.error(err);
      return;
    }
    const input = {
      name: name.trim(),
      channels,
      leadIds: [...selected],
      whatsappTemplateId: channels.includes("whatsapp")
        ? whatsappTemplateId
        : null,
      emailTemplateId: channels.includes("email") ? emailTemplateId : null,
      emailSubject: channels.includes("email") ? emailSubject : null,
      mode,
      scheduledAt:
        mode === "later" && scheduledAt
          ? new Date(scheduledAt).toISOString()
          : null,
    };
    start(async () => {
      const res = await createCampaign(input);
      if (res?.error) toast.error(res.error);
      // success redirects server-side
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Steps indicator */}
      <div className="flex items-center gap-2 overflow-x-auto">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-xs font-medium",
                i < step
                  ? "bg-primary text-primary-foreground"
                  : i === step
                    ? "border-2 border-primary text-primary"
                    : "border border-border text-muted-foreground",
              )}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </div>
            <span
              className={cn(
                "whitespace-nowrap text-sm",
                i === step ? "font-medium" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="mx-1 h-px w-6 bg-border" />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {/* Step 0: Info */}
          {step === 0 && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="c-name">Nome da campanha</Label>
                <Input
                  id="c-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Restaurantes Lisboa — Junho"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Canais</Label>
                <div className="flex gap-3">
                  {CHANNELS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleChannel(c)}
                      className={cn(
                        "flex flex-1 items-center gap-2 rounded-lg border p-3 text-sm transition-colors",
                        channels.includes(c)
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      {c === "whatsapp" ? (
                        <MessageCircle className="size-4" />
                      ) : (
                        <Mail className="size-4" />
                      )}
                      {CHANNEL_LABELS[c]}
                      {channels.includes(c) && (
                        <Check className="ml-auto size-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Leads */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Pesquisar…"
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {selected.size} selecionados
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllFiltered}
                  >
                    Selecionar todos
                  </Button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
                {filteredLeads.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Sem leads. Cria leads primeiro.
                  </p>
                ) : (
                  filteredLeads.map((l) => (
                    <label
                      key={l.id}
                      className="flex cursor-pointer items-center gap-3 border-b border-border px-4 py-2.5 last:border-0 hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={selected.has(l.id)}
                        onCheckedChange={() => toggleLead(l.id)}
                      />
                      <div className="flex flex-1 flex-col">
                        <span className="text-sm font-medium">
                          {l.name ?? l.company ?? "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {[l.company, l.niche].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        {l.phone && (
                          <MessageCircle className="size-3.5 text-muted-foreground" />
                        )}
                        {l.email && (
                          <Mail className="size-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Step 2: Templates */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              {channels.includes("whatsapp") && (
                <div className="flex flex-col gap-2">
                  <Label>Template de WhatsApp</Label>
                  <Select
                    value={whatsappTemplateId}
                    onValueChange={setWhatsappTemplateId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolhe um template…" />
                    </SelectTrigger>
                    <SelectContent>
                      {waTemplates.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          Sem templates de WhatsApp.
                        </div>
                      ) : (
                        waTemplates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {channels.includes("email") && (
                <>
                  <div className="flex flex-col gap-2">
                    <Label>Template de Email</Label>
                    <Select
                      value={emailTemplateId}
                      onValueChange={setEmailTemplateId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Escolhe um template…" />
                      </SelectTrigger>
                      <SelectContent>
                        {emTemplates.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            Sem templates de Email.
                          </div>
                        ) : (
                          emTemplates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="c-subject">Assunto do email</Label>
                    <Input
                      id="c-subject"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Ex: Uma ideia para a {{company}}"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Schedule */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => setMode("now")}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                  mode === "now"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/40",
                )}
              >
                <Rocket className="size-5 text-primary" />
                <div>
                  <div className="text-sm font-medium">Enviar agora</div>
                  <div className="text-xs text-muted-foreground">
                    As mensagens entram já na fila de envio.
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode("later")}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                  mode === "later"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/40",
                )}
              >
                <ArrowRight className="size-5 text-primary" />
                <div>
                  <div className="text-sm font-medium">Agendar</div>
                  <div className="text-xs text-muted-foreground">
                    Escolhe quando as mensagens devem ser enviadas.
                  </div>
                </div>
              </button>
              {mode === "later" && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="c-when">Data e hora</Label>
                  <Input
                    id="c-when"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="flex flex-col gap-3 text-sm">
              <Row label="Nome" value={name} />
              <Row
                label="Canais"
                value={channels.map((c) => CHANNEL_LABELS[c]).join(", ")}
              />
              <Row label="Leads" value={`${selected.size} selecionados`} />
              {channels.includes("whatsapp") && (
                <Row
                  label="Template WhatsApp"
                  value={
                    waTemplates.find((t) => t.id === whatsappTemplateId)?.name ??
                    "—"
                  }
                />
              )}
              {channels.includes("email") && (
                <Row
                  label="Template Email"
                  value={
                    emTemplates.find((t) => t.id === emailTemplateId)?.name ??
                    "—"
                  }
                />
              )}
              <Row
                label="Envio"
                value={
                  mode === "now"
                    ? "Agora"
                    : `Agendado: ${scheduledAt.replace("T", " ")}`
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={step === 0 ? () => router.push("/campaigns") : back}
          className="gap-2"
        >
          <ArrowLeft className="size-4" />
          {step === 0 ? "Cancelar" : "Anterior"}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={next} className="gap-2">
            Seguinte <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={launch}
            disabled={pending}
            className="gap-2"
          >
            <Rocket className="size-4" />
            {pending ? "A lançar…" : "Lançar campanha"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
