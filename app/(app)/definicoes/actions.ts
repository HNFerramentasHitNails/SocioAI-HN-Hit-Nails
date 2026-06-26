"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/supabase/auth";
import {
  ChannelError,
  resolveAiConfig,
  resolveEmailConfig,
  resolveWhatsappConfig,
} from "@/lib/integrations/config";
import * as evolution from "@/lib/integrations/evolution";
import { sendEmail } from "@/lib/integrations/email";
import { AIError, generateText } from "@/lib/ai/client";
import type { TablesUpdate } from "@/lib/supabase/types";

export type ChannelSettings = {
  whatsapp: {
    url: string;
    instance: string;
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
      instance: (waCfg.instance as string) ?? "default",
      enabled: wa?.enabled ?? false,
      hasApiKey: Boolean(waCfg.api_key) || Boolean(process.env.EVOLUTION_API_KEY),
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
    instance: clean(formData.get("instance")) || "default",
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
    const status = await evolution.getSessionStatus(cfg);
    if (status === "SCAN_QR_CODE") {
      try {
        const qr = await evolution.getQrCode(cfg);
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

export async function startWhatsapp(): Promise<{
  ok?: boolean;
  error?: string;
  qr?: string;
  status?: string;
}> {
  const { byType } = await loadRows();
  const cfg = resolveWhatsappConfig(byType("whatsapp")?.config);
  try {
    const qr = await evolution.startSession(cfg);
    return {
      ok: true,
      qr: qr ?? undefined,
      status: qr ? "SCAN_QR_CODE" : undefined,
    };
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
    await evolution.sendText(
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

// ---------------------------------------------------------------------------
// IA
// ---------------------------------------------------------------------------

export type AiSettings = {
  baseUrl: string;
  model: string;
  enabled: boolean;
  hasApiKey: boolean;
};

export async function getAiSettings(): Promise<AiSettings> {
  const { byType } = await loadRows();
  const ai = byType("ai");
  const cfg = (ai?.config ?? {}) as Record<string, unknown>;
  return {
    baseUrl: (cfg.base_url as string) ?? "https://api.deepseek.com",
    model: (cfg.model as string) ?? "deepseek-v4-pro",
    enabled: ai?.enabled ?? true,
    hasApiKey: Boolean(cfg.api_key) || Boolean(process.env.AI_API_KEY),
  };
}

export async function saveAiConfig(
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const { supabase, orgId, byType } = await loadRows();
  const existing = (byType("ai")?.config ?? {}) as Record<string, unknown>;

  const apiKeyInput = clean(formData.get("api_key"));
  const config = {
    base_url: clean(formData.get("base_url")) || "https://api.deepseek.com",
    model: clean(formData.get("model")) || "deepseek-v4-pro",
    api_key: apiKeyInput || (existing.api_key as string) || "",
  };

  const { error } = await supabase.from("integrations").upsert(
    { org_id: orgId, type: "ai", config, enabled: true },
    { onConflict: "org_id,type" },
  );
  if (error) return { error: error.message };
  revalidatePath("/definicoes");
  return { ok: true };
}

export async function testAi(): Promise<{
  ok?: boolean;
  error?: string;
  sample?: string;
}> {
  const { byType } = await loadRows();
  const cfg = resolveAiConfig(byType("ai")?.config);
  try {
    const sample = await generateText({
      system: "Responde em português de Portugal, de forma muito breve.",
      prompt: "Diz apenas: A ligação à IA está a funcionar.",
      config: cfg,
      maxTokens: 800,
    });
    return { ok: true, sample };
  } catch (e) {
    return { error: e instanceof AIError ? e.message : "Falha ao testar a IA." };
  }
}
