"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/supabase/auth";
import {
  ChannelError,
  resolveEmailConfig,
  resolveWhatsappConfig,
} from "@/lib/integrations/config";
import * as waha from "@/lib/integrations/waha";
import { sendEmail } from "@/lib/integrations/email";
import type { TablesUpdate } from "@/lib/supabase/types";

export type ChannelSettings = {
  whatsapp: {
    url: string;
    session: string;
    enabled: boolean;
    hasApiKey: boolean;
  };
  email: { from: string; enabled: boolean; hasApiKey: boolean };
};

type Row = {
  type: string;
  config: Record<string, unknown> | null;
  enabled: boolean;
};

async function loadRows() {
  const { supabase, profile } = await requireAdmin();
  const { data } = await supabase
    .from("integrations")
    .select("type, config, enabled");
  const rows = (data ?? []) as Row[];
  const byType = (t: string) => rows.find((r) => r.type === t);
  return { supabase, orgId: profile.org_id!, byType };
}

export async function getChannelSettings(): Promise<ChannelSettings> {
  const { byType } = await loadRows();
  const wa = byType("whatsapp");
  const em = byType("email");
  const waCfg = (wa?.config ?? {}) as Record<string, unknown>;
  const emCfg = (em?.config ?? {}) as Record<string, unknown>;

  return {
    whatsapp: {
      url: (waCfg.url as string) ?? "",
      session: (waCfg.session as string) ?? "default",
      enabled: wa?.enabled ?? false,
      hasApiKey: Boolean(waCfg.api_key) || Boolean(process.env.WAHA_API_KEY),
    },
    email: {
      from: (emCfg.from as string) ?? "",
      enabled: em?.enabled ?? false,
      hasApiKey: Boolean(emCfg.api_key) || Boolean(process.env.RESEND_API_KEY),
    },
  };
}

function clean(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}

export type Branding = {
  id: string;
  name: string;
  primary_color: string | null;
  logo_url: string | null;
};

export async function getBranding(): Promise<Branding | null> {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("organization")
    .select("id, name, primary_color, logo_url")
    .limit(1)
    .single();
  return data;
}

export async function saveBranding(input: {
  name?: string;
  primaryColor?: string;
  logoUrl?: string | null;
}): Promise<{ ok?: boolean; error?: string }> {
  const { supabase, profile } = await requireAdmin();
  const update: TablesUpdate<"organization"> = {};
  if (input.name?.trim()) update.name = input.name.trim();
  if (input.primaryColor?.trim()) update.primary_color = input.primaryColor.trim();
  if (input.logoUrl !== undefined) update.logo_url = input.logoUrl || null;

  const { error } = await supabase
    .from("organization")
    .update(update)
    .eq("id", profile.org_id!);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveWhatsappConfig(
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const { supabase, orgId, byType } = await loadRows();
  const existing = (byType("whatsapp")?.config ?? {}) as Record<string, unknown>;

  const apiKeyInput = clean(formData.get("api_key"));
  const config = {
    url: clean(formData.get("url")),
    session: clean(formData.get("session")) || "default",
    api_key: apiKeyInput || (existing.api_key as string) || "",
  };

  const { error } = await supabase.from("integrations").upsert(
    {
      org_id: orgId,
      type: "whatsapp",
      config,
      enabled: formData.get("enabled") === "on",
    },
    { onConflict: "org_id,type" },
  );
  if (error) return { error: error.message };
  revalidatePath("/definicoes");
  return { ok: true };
}

export async function saveEmailConfig(
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const { supabase, orgId, byType } = await loadRows();
  const existing = (byType("email")?.config ?? {}) as Record<string, unknown>;

  const apiKeyInput = clean(formData.get("api_key"));
  const config = {
    from: clean(formData.get("from")),
    api_key: apiKeyInput || (existing.api_key as string) || "",
  };

  const { error } = await supabase.from("integrations").upsert(
    {
      org_id: orgId,
      type: "email",
      config,
      enabled: formData.get("enabled") === "on",
    },
    { onConflict: "org_id,type" },
  );
  if (error) return { error: error.message };
  revalidatePath("/definicoes");
  return { ok: true };
}

export async function checkWhatsappStatus(): Promise<{
  status?: string;
  qr?: string;
  error?: string;
}> {
  const { byType } = await loadRows();
  const cfg = resolveWhatsappConfig(byType("whatsapp")?.config);
  try {
    const status = await waha.getSessionStatus(cfg);
    if (status === "SCAN_QR_CODE") {
      try {
        const qr = await waha.getQrCode(cfg);
        return { status, qr };
      } catch {
        return { status };
      }
    }
    return { status };
  } catch (e) {
    return { error: e instanceof ChannelError ? e.message : "Erro ao verificar o estado." };
  }
}

export async function startWhatsapp(): Promise<{ ok?: boolean; error?: string }> {
  const { byType } = await loadRows();
  const cfg = resolveWhatsappConfig(byType("whatsapp")?.config);
  try {
    await waha.startSession(cfg);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof ChannelError ? e.message : "Erro ao iniciar a sessão." };
  }
}

export async function testWhatsapp(
  phone: string,
): Promise<{ ok?: boolean; error?: string }> {
  const { byType } = await loadRows();
  const cfg = resolveWhatsappConfig(byType("whatsapp")?.config);
  if (!phone.trim()) return { error: "Indica um número de telefone." };
  try {
    await waha.sendText(
      cfg,
      phone,
      "✅ Mensagem de teste do LeadsPro — HN Hit Nails.",
    );
    return { ok: true };
  } catch (e) {
    return { error: e instanceof ChannelError ? e.message : "Falha no envio de teste." };
  }
}

export async function testEmail(
  to: string,
): Promise<{ ok?: boolean; error?: string }> {
  const { byType } = await loadRows();
  const cfg = resolveEmailConfig(byType("email")?.config);
  if (!to.trim()) return { error: "Indica um email de destino." };
  try {
    await sendEmail(cfg, {
      to,
      subject: "Teste — LeadsPro HN Hit Nails",
      html: "<p>✅ Este é um email de teste do <strong>LeadsPro</strong>.</p>",
      text: "Este é um email de teste do LeadsPro.",
    });
    return { ok: true };
  } catch (e) {
    return { error: e instanceof ChannelError ? e.message : "Falha no envio de teste." };
  }
}
