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
  const { profile } = await requireAdmin();
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
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) return { error: error.message };

  const newId = created.user?.id;
  if (!newId) return { error: "Não foi possível criar o utilizador." };

  // Garante o profile e liga o utilizador à organização do admin.
  await admin
    .from("profiles")
    .upsert({ id: newId, full_name: fullName || null, email });
  const { error: memErr } = await admin.from("organization_members").insert({
    organization_id: profile.organization_id,
    user_id: newId,
    role: "sales_rep",
    status: "active",
  });
  if (memErr) return { error: memErr.message };

  revalidatePath("/equipa");
  return { ok: true };
}

export async function setMemberRole(
  id: string,
  role: "admin" | "member",
): Promise<TeamActionResult> {
  const { user, profile } = await requireAdmin();
  if (id === user.id) {
    return { error: "Não podes alterar a tua própria função." };
  }
  if (!serviceRoleAvailable()) {
    return {
      error:
        "Falta a SUPABASE_SERVICE_ROLE_KEY (adiciona-a nas variáveis de ambiente da Vercel).",
    };
  }
  // "member" do LeadsPro = papel de escrita no ERP (sales_rep).
  const appRole = role === "admin" ? "admin" : "sales_rep";
  const admin = createAdminClient();
  const { error } = await admin
    .from("organization_members")
    .update({ role: appRole })
    .eq("organization_id", profile.organization_id)
    .eq("user_id", id);
  if (error) return { error: error.message };
  revalidatePath("/equipa");
  return { ok: true };
}

export async function removeMember(id: string): Promise<TeamActionResult> {
  const { user, profile } = await requireAdmin();
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
  // Remove a ligação à org; o utilizador auth é eliminado a seguir.
  await admin
    .from("organization_members")
    .delete()
    .eq("organization_id", profile.organization_id)
    .eq("user_id", id);
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return { error: error.message };
  revalidatePath("/equipa");
  return { ok: true };
}
