"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { MessageCircle, Mail, RefreshCw, Play, Send } from "lucide-react";
import { toast } from "sonner";

import {
  saveWhatsappConfig,
  saveEmailConfig,
  checkWhatsappStatus,
  startWhatsapp,
  testWhatsapp,
  testEmail,
  type ChannelSettings,
} from "@/app/(app)/definicoes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    WORKING: "border-emerald-500/20 bg-emerald-500/15 text-emerald-400",
    SCAN_QR_CODE: "border-amber-500/20 bg-amber-500/15 text-amber-400",
    STARTING: "border-blue-500/20 bg-blue-500/15 text-blue-400",
    STOPPED: "border-muted bg-muted text-muted-foreground",
  };
  const labels: Record<string, string> = {
    WORKING: "Ligado",
    SCAN_QR_CODE: "Ler QR code",
    STARTING: "A iniciar",
    STOPPED: "Parado",
  };
  return (
    <Badge
      variant="outline"
      className={map[status] ?? "border-muted bg-muted text-muted-foreground"}
    >
      {labels[status] ?? status}
    </Badge>
  );
}

export function ChannelsSettings({ settings }: { settings: ChannelSettings }) {
  const [waPending, startWa] = useTransition();
  const [emPending, startEm] = useTransition();
  const [statusPending, startStatus] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testTo, setTestTo] = useState("");

  function onSaveWhatsapp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startWa(async () => {
      const res = await saveWhatsappConfig(fd);
      if (res.error) toast.error(res.error);
      else toast.success("Configuração de WhatsApp guardada.");
    });
  }

  function onSaveEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startEm(async () => {
      const res = await saveEmailConfig(fd);
      if (res.error) toast.error(res.error);
      else toast.success("Configuração de Email guardada.");
    });
  }

  function onCheckStatus() {
    startStatus(async () => {
      const res = await checkWhatsappStatus();
      if (res.error) {
        toast.error(res.error);
        setStatus(null);
        setQr(null);
        return;
      }
      setStatus(res.status ?? null);
      setQr(res.qr ?? null);
    });
  }

  function onStart() {
    startStatus(async () => {
      const res = await startWhatsapp();
      if (res.error) toast.error(res.error);
      else {
        toast.success("Sessão iniciada. Verifica o estado e lê o QR code.");
        onCheckStatus();
      }
    });
  }

  function onTestWhatsapp() {
    startWa(async () => {
      const res = await testWhatsapp(testPhone);
      if (res.error) toast.error(res.error);
      else toast.success("Mensagem de teste enviada.");
    });
  }

  function onTestEmail() {
    startEm(async () => {
      const res = await testEmail(testTo);
      if (res.error) toast.error(res.error);
      else toast.success("Email de teste enviado.");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* WhatsApp */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="size-5 text-primary" /> WhatsApp (WAHA)
          </CardTitle>
          <CardDescription>
            Liga o teu servidor WAHA e a sessão de WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <form onSubmit={onSaveWhatsapp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="wa-url">WAHA URL</Label>
              <Input
                id="wa-url"
                name="url"
                placeholder="https://waha.teudominio.com"
                defaultValue={settings.whatsapp.url}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="wa-session">Sessão</Label>
              <Input
                id="wa-session"
                name="session"
                defaultValue={settings.whatsapp.session}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="wa-key">API Key</Label>
              <Input
                id="wa-key"
                name="api_key"
                type="password"
                placeholder={
                  settings.whatsapp.hasApiKey ? "•••••• (definida)" : "Opcional"
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="wa-enabled">Ativo</Label>
              <Switch
                id="wa-enabled"
                name="enabled"
                defaultChecked={settings.whatsapp.enabled}
              />
            </div>
            <Button type="submit" disabled={waPending} className="self-start">
              {waPending ? "A guardar…" : "Guardar"}
            </Button>
          </form>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estado da ligação</span>
              {status ? <StatusBadge status={status} /> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={onCheckStatus}
                disabled={statusPending}
              >
                <RefreshCw className="size-4" /> Verificar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={onStart}
                disabled={statusPending}
              >
                <Play className="size-4" /> Iniciar sessão
              </Button>
            </div>
            {qr ? (
              <div className="flex flex-col items-center gap-2 pt-2">
                <Image
                  src={qr}
                  alt="QR code do WhatsApp"
                  width={220}
                  height={220}
                  unoptimized
                  className="rounded-lg bg-white p-2"
                />
                <p className="text-xs text-muted-foreground">
                  Abre o WhatsApp → Dispositivos ligados → Ligar dispositivo.
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="wa-test">Enviar teste (nº com indicativo)</Label>
              <Input
                id="wa-test"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="351912345678"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              onClick={onTestWhatsapp}
              disabled={waPending}
            >
              <Send className="size-4" /> Testar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-5 text-primary" /> Email (Resend)
          </CardTitle>
          <CardDescription>
            Configura o envio de emails através do Resend.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <form onSubmit={onSaveEmail} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="em-from">Remetente (From)</Label>
              <Input
                id="em-from"
                name="from"
                placeholder="HN Hit Nails <no-reply@teudominio.com>"
                defaultValue={settings.email.from}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="em-key">Resend API Key</Label>
              <Input
                id="em-key"
                name="api_key"
                type="password"
                placeholder={
                  settings.email.hasApiKey ? "•••••• (definida)" : "re_..."
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="em-enabled">Ativo</Label>
              <Switch
                id="em-enabled"
                name="enabled"
                defaultChecked={settings.email.enabled}
              />
            </div>
            <Button type="submit" disabled={emPending} className="self-start">
              {emPending ? "A guardar…" : "Guardar"}
            </Button>
          </form>

          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="em-test">Enviar teste para</Label>
              <Input
                id="em-test"
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="tu@hnhitnails.com"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              onClick={onTestEmail}
              disabled={emPending}
            >
              <Send className="size-4" /> Testar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
