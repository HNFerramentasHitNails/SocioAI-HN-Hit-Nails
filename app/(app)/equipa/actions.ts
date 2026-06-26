"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";

export type TeamActionResult = { ok?: boolean; error?: string };

function serviceRoleAvailable() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function inviteMember(
  formData: FormData,
): Promise<TeamActionResult> {
  await requireAdmin();
  if (!serviceRoleAvailable()) {
    return {
      error:
        "Falta a SUPABASE_SERVICE_ROLE_KEY (adiciona-a nas variáveis de ambiente da Vercel).",
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email e palavra-passe são obrigatórios." };
  }
  if (password.length < 8) {
    return { error: "A palavra-passe deve ter pelo menos 8 caracteres." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) return { error: error.message };

  revalidatePath("/equipa");
  return { ok: true };
}

export async function setMemberRole(
  id: string,
  role: "admin" | "member",
): Promise<TeamActionResult> {
  const { supabase, user } = await requireAdmin();
  if (id === user.id) {
    return { error: "Não podes alterar a tua própria função." };
  }
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/equipa");
  return { ok: true };
}

export async function removeMember(id: string): Promise<TeamActionResult> {
  const { user } = await requireAdmin();
  if (id === user.id) {
    return { error: "Não podes remover-te a ti próprio." };
  }
  if (!serviceRoleAvailable()) {
    return {
      error:
        "Falta a SUPABASE_SERVICE_ROLE_KEY (adiciona-a nas variáveis de ambiente da Vercel).",
    };
  }
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return { error: error.message };
  revalidatePath("/equipa");
  return { ok: true };
}
