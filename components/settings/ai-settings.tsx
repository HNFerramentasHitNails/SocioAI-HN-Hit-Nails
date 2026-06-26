"use client";

import { useTransition } from "react";
import { Sparkles, Send } from "lucide-react";
import { toast } from "sonner";

import { saveAiConfig, testAi, type AiSettings } from "@/app/(app)/definicoes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AiSettingsCard({ settings }: { settings: AiSettings }) {
  const [saving, startSaving] = useTransition();
  const [testing, startTesting] = useTransition();

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startSaving(async () => {
      const res = await saveAiConfig(fd);
      if (res.error) toast.error(res.error);
      else toast.success("Configuração de IA guardada.");
    });
  }

  function onTest() {
    startTesting(async () => {
      const res = await testAi();
      if (res.error) toast.error(res.error);
      else toast.success(res.sample || "A IA está a funcionar.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" /> Inteligência Artificial
        </CardTitle>
        <CardDescription>
          Provedor para gerar as mensagens. Compatível com qualquer API estilo
          OpenAI (DeepSeek, OpenAI, etc.) — muda o URL e o modelo para trocar.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <form onSubmit={onSave} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ai-url">Base URL</Label>
              <Input
                id="ai-url"
                name="base_url"
                placeholder="https://api.deepseek.com"
                defaultValue={settings.baseUrl}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ai-model">Modelo</Label>
              <Input
                id="ai-model"
                name="model"
                placeholder="deepseek-v4-pro"
                defaultValue={settings.model}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ai-key">API Key</Label>
            <Input
              id="ai-key"
              name="api_key"
              type="password"
              placeholder={settings.hasApiKey ? "•••••• (definida)" : "sk-..."}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "A guardar…" : "Guardar"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              onClick={onTest}
              disabled={testing}
            >
              <Send className="size-4" />
              {testing ? "A testar…" : "Testar"}
            </Button>
          </div>
        </form>

        <p className="text-xs text-muted-foreground">
          Exemplos: DeepSeek → <code>https://api.deepseek.com</code> +{" "}
          <code>deepseek-v4-pro</code>. OpenAI →{" "}
          <code>https://api.openai.com/v1</code> + <code>gpt-4o</code>.
        </p>
      </CardContent>
    </Card>
  );
}
