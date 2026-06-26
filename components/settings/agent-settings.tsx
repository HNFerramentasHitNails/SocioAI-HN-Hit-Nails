"use client";

import { useTransition } from "react";
import { Bot } from "lucide-react";
import { toast } from "sonner";

import { saveAgentConfig, type AgentSettings } from "@/app/(app)/definicoes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AgentSettingsCard({ settings }: { settings: AgentSettings }) {
  const [saving, startSaving] = useTransition();

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startSaving(async () => {
      const res = await saveAgentConfig(fd);
      if (res.error) toast.error(res.error);
      else toast.success("Agente de IA guardado.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="size-5 text-primary" /> Agente de IA (conversas)
        </CardTitle>
        <CardDescription>
          Quando um lead responde no WhatsApp, a IA continua a conversa
          automaticamente para o conduzir à compra na loja. Respeita pedidos de
          paragem e de falar com uma pessoa.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSave} className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="agent-enabled" className="text-sm font-medium">
                Resposta automática ativa
              </Label>
              <p className="text-xs text-muted-foreground">
                Liga/desliga o agente para todas as conversas.
              </p>
            </div>
            <Switch
              id="agent-enabled"
              name="enabled"
              defaultChecked={settings.enabled}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="agent-store">URL da loja</Label>
              <Input
                id="agent-store"
                name="store_url"
                defaultValue={settings.storeUrl}
                placeholder="https://www.hnhitnails.com"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="agent-turns">Máx. respostas por conversa</Label>
              <Input
                id="agent-turns"
                name="max_turns"
                type="number"
                min={1}
                defaultValue={settings.maxTurns}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="agent-instr">Instruções do agente</Label>
            <Textarea
              id="agent-instr"
              name="instructions"
              rows={5}
              defaultValue={settings.instructions}
              placeholder="Ex: foca-te em produtos de gel e formações; oferece ajuda para escolher; menciona entregas em 24-48h; não dês descontos sem confirmação."
            />
          </div>

          <Button type="submit" disabled={saving} className="self-start">
            {saving ? "A guardar…" : "Guardar agente"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
