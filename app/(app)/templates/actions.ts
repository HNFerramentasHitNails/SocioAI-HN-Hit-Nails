"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireProfile } from "@/lib/supabase/auth";
import { AIError, generateText } from "@/lib/ai/client";
import { buildCopyPrompt, extractVariables, type CopyParams } from "@/lib/ai/copy";
import { resolveAiConfig } from "@/lib/integrations/config";
import { getCatalogContext } from "@/lib/agent/catalog";
import type { Channel } from "@/lib/config";

export type TemplateActionResult = {
  error?: string;
  ok?: boolean;
  id?: string;
};

function clean(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  return s.length ? s : null;
}

function parseForm(formData: FormData) {
  const body = clean(formData.get("body")) ?? "";
  return {
    name: clean(formData.get("name")),
    channel: (clean(formData.get("channel")) ?? "whatsapp") as Channel,
    niche: clean(formData.get("niche")),
    lead_stage: clean(formData.get("lead_stage")),
    objective: clean(formData.get("objective")),
    tone: clean(formData.get("tone")),
    about_context: clean(formData.get("about_context")),
    body: body || null,
    variables: extractVariables(body),
  };
}

export async function createTemplate(
  formData: FormData,
): Promise<TemplateActionResult> {
  const { supabase, profile, user } = await requireProfile();
  const input = parseForm(formData);

  if (!input.name) return { error: "Dá um nome ao template." };

  const { error } = await supabase.from("templates").insert({
    ...input,
    name: input.name,
    organization_id: profile.organization_id!,
    created_by: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/templates");
  redirect("/templates");
}

export async function updateTemplate(
  id: string,
  formData: FormData,
): Promise<TemplateActionResult> {
  const { supabase } = await requireProfile();
  const input = parseForm(formData);

  if (!input.name) return { error: "Dá um nome ao template." };

  const { error } = await supabase
    .from("templates")
    .update({ ...input, name: input.name })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/templates");
  redirect("/templates");
}

export async function deleteTemplate(
  id: string,
): Promise<TemplateActionResult> {
  const { supabase } = await requireProfile();
  const { error } = await supabase.from("templates").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/templates");
  return { ok: true };
}

/** Generates (or regenerates) a message body with AI. */
export async function generateBody(
  params: CopyParams,
): Promise<{ body?: string; error?: string }> {
  const { supabase } = await requireProfile();
  try {
    const { data } = await supabase
      .from("integrations")
      .select("config")
      .eq("type", "ai")
      .maybeSingle();
    const aiConfig = resolveAiConfig(
      (data?.config ?? null) as Record<string, unknown> | null,
    );
    const catalog = await getCatalogContext(supabase);
    const { system, prompt } = buildCopyPrompt({ ...params, catalog });
    const body = await generateText({ system, prompt, config: aiConfig });
    return { body };
  } catch (e) {
    if (e instanceof AIError) return { error: e.message };
    return { error: "Falha ao gerar a mensagem." };
  }
}
