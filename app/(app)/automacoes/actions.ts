"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/supabase/auth";
import { defaultFlowGraph, isFlowGraph } from "@/lib/agent/flow-types";
import type { Json, TablesUpdate } from "@/lib/supabase/types";

export type FlowResult = { ok?: boolean; error?: string; id?: string };

export async function createFlow(name: string): Promise<FlowResult> {
  const { supabase, profile } = await requireProfile();
  const clean = name.trim();
  if (!clean) return { error: "Dá um nome ao fluxo." };

  const { data, error } = await supabase
    .from("agent_flows")
    .insert({
      org_id: profile.org_id!,
      name: clean,
      graph: defaultFlowGraph() as unknown as Json,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/automacoes");
  return { ok: true, id: data.id };
}

export async function updateFlow(
  id: string,
  patch: { name?: string; description?: string | null; graph?: unknown },
): Promise<FlowResult> {
  const { supabase } = await requireProfile();
  const update: TablesUpdate<"agent_flows"> = {};
  if (patch.name != null) {
    const clean = patch.name.trim();
    if (!clean) return { error: "Dá um nome ao fluxo." };
    update.name = clean;
  }
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.graph !== undefined) {
    if (!isFlowGraph(patch.graph)) return { error: "Fluxo inválido." };
    update.graph = patch.graph as Json;
  }
  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase
    .from("agent_flows")
    .update(update)
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/automacoes");
  revalidatePath(`/automacoes/${id}`);
  return { ok: true };
}

export async function toggleFlowActive(
  id: string,
  active: boolean,
): Promise<FlowResult> {
  const { supabase, profile } = await requireProfile();
  // Only one active flow drives the agent — deactivate the others first.
  if (active) {
    await supabase
      .from("agent_flows")
      .update({ active: false })
      .eq("org_id", profile.org_id!)
      .neq("id", id);
  }
  const { error } = await supabase
    .from("agent_flows")
    .update({ active })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/automacoes");
  return { ok: true };
}

export async function deleteFlow(id: string): Promise<FlowResult> {
  const { supabase } = await requireProfile();
  const { error } = await supabase.from("agent_flows").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/automacoes");
  return { ok: true };
}
