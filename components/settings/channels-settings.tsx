"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  MessageCircle,
  Mail,
  RefreshCw,
  Plug,
  Send,
  Loader2,
  Server,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  saveWhatsappConfig,
  saveEmailConfig,
  checkWhatsappStatus,
  saveAndStartWhatsapp,
  testWhatsapp,
  testEmail,
  configureWhatsappWebhook,
  listWhatsappInstances,
  deleteWhatsappInstance,
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
  const [connecting, setConnecting] = useState(false);
  const [instances, setInstances] = useState<
    { name: string; status: string }[] | null
  >(null);
  const [testPhone, setTestPhone] = useState("");
  const [testTo, setTestTo] = useState("");

  // Controlled WhatsApp form so "Criar / ligar" can persist before connecting.
  const [waUrl, setWaUrl] = useState(settings.whatsapp.url);
  const [waInstance, setWaInstance] = useState(settings.whatsapp.instance);
  const [waKey, setWaKey] = useState("");
  const [waEnabled, setWaEnabled] = useState(settings.whatsapp.enabled);

  function buildWaForm(): FormData {
    const fd = new FormData();
    fd.set("url", waUrl);
    fd.set("instance", waInstance);
    if (waKey) fd.set("api_key", waKey);
    if (waEnabled) fd.set("enabled", "on");
    return fd;
  }

  function onSaveWhatsapp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startWa(async () => {
      const res = await saveWhatsappConfig(buildWaForm());
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

  // Auto-activate replies once connected (called by the poller / connect flow).
  const activateWebhook = useCallback(async () => {
    const res = await configureWhatsappWebhook();
    if (res.error) toast.error(res.error);
    else toast.success("WhatsApp ligado e respostas ativadas! ✅");
  }, []);

  // While a QR is showing, poll the connection state and finish automatically.
  useEffect(() => {
    if (!connecting) return;
    let tries = 0;
    let done = false;
    const timer = setInterval(async () => {
      tries++;
      const res = await checkWhatsappStatus();
      if (res.status) setStatus(res.status);
      // Refresh the QR if Evolution rotated it.
      if (res.qr && res.status === "SCAN_QR_CODE") setQr(res.qr);
      if (res.status === "WORKING") {
        done = true;
        setConnecting(false);
        setQr(null);
        clearInterval(timer);
        await activateWebhook();
      } else if (tries >= 40) {
        // ~2 min — stop polling, keep the QR for a manual retry.
        setConnecting(false);
        clearInterval(timer);
      }
    }, 3000);
    return () => {
      if (!done) clearInterval(timer);
    };
  }, [connecting, activateWebhook]);

  function onConnect() {
    startStatus(async () => {
      if (!waUrl.trim()) {
        toast.error("Preenche o URL da Evolution API primeiro.");
        return;
      }
      if (!waInstance.trim()) {
        toast.error("Dá um nome à instância.");
        return;
      }
      setWaEnabled(true);
      const res = await saveAndStartWhatsapp(buildWaForm());
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.status === "WORKING") {
        setStatus("WORKING");
        setQr(null);
        await activateWebhook();
        return;
      }
      if (res.qr) {
        setQr(res.qr);
        setStatus("SCAN_QR_CODE");
        setConnecting(true);
        toast.success("Lê o QR code — eu trato do resto.");
      } else {
        toast.success("Instância criada. A verificar o estado…");
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

  function onConfigureWebhook() {
    startStatus(async () => {
      const res = await configureWhatsappWebhook();
      if (res.error) toast.error(res.error);
      else toast.success("Respostas ativadas (webhook configurado).");
    });
  }

  function onListInstances() {
    startStatus(async () => {
      const res = await listWhatsappInstances();
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setInstances(res.instances ?? []);
    });
  }

  function onDeleteInstance(name: string) {
    if (
      !confirm(
        `Eliminar a instância "${name}" no servidor Evolution? Esta ação é irreversível.`,
      )
    )
      return;
    startStatus(async () => {
      const res = await deleteWhatsappInstance(name);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Instância "${name}" eliminada.`);
      onListInstances();
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
            <MessageCircle className="size-5 text-primary" /> WhatsApp (Evolution
            API)
          </CardTitle>
          <CardDescription>
            Liga o teu servidor Evolution API e a instância de WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <form onSubmit={onSaveWhatsapp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="wa-url">Evolution API URL</Label>
              <Input
                id="wa-url"
                placeholder="https://evolution.teudominio.com"
                value={waUrl}
                onChange={(e) => setWaUrl(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="wa-instance">Instância (nome à tua escolha)</Label>
              <Input
                id="wa-instance"
                value={waInstance}
                placeholder="ex.: hnhitnails"
                onChange={(e) => setWaInstance(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="wa-key">API Key</Label>
              <Input
                id="wa-key"
                type="password"
                value={waKey}
                placeholder={
                  settings.whatsapp.hasApiKey ? "•••••• (definida)" : "Opcional"
                }
                onChange={(e) => setWaKey(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="wa-enabled">Ativo</Label>
              <Switch
                id="wa-enabled"
                checked={waEnabled}
                onCheckedChange={setWaEnabled}
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
                size="sm"
                className="gap-2"
                onClick={onConnect}
                disabled={statusPending || connecting}
              >
                {connecting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plug className="size-4" />
                )}
                {connecting ? "À espera da leitura…" : "Criar / ligar instância"}
              </Button>
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
                variant="ghost"
                size="sm"
                onClick={onConfigureWebhook}
                disabled={statusPending}
              >
                Reativar respostas
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Um clique cria a instância no teu servidor Evolution, mostra o QR e,
              assim que o leres, liga e ativa as respostas automaticamente — não
              precisas de abrir o painel do Evolution.
            </p>
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
                <p className="text-center text-xs text-muted-foreground">
                  Abre o WhatsApp → Dispositivos ligados → Ligar dispositivo.
                  {connecting ? " A aguardar a ligação…" : ""}
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Server className="size-4 text-muted-foreground" /> Instâncias no
                servidor
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={onListInstances}
                disabled={statusPending}
              >
                <RefreshCw className="size-4" />
                {instances === null ? "Ver instâncias" : "Atualizar"}
              </Button>
            </div>
            {instances !== null &&
              (instances.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Não há instâncias no servidor.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {instances.map((inst) => {
                    const isCurrent = inst.name === waInstance;
                    return (
                      <li
                        key={inst.name}
                        className="flex items-center gap-2 py-2"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="truncate text-sm">{inst.name}</span>
                          {isCurrent && (
                            <Badge variant="outline" className="text-[10px]">
                              atual
                            </Badge>
                          )}
                        </div>
                        <StatusBadge status={inst.status} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          title={
                            isCurrent
                              ? "Eliminar a instância em uso"
                              : "Eliminar instância"
                          }
                          onClick={() => onDeleteInstance(inst.name)}
                          disabled={statusPending}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              ))}
            <p className="text-xs text-muted-foreground">
              Cria uma nova instância acima (com outro nome) e elimina aqui a
              antiga para não ficarem instâncias a mais no servidor.
            </p>
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
