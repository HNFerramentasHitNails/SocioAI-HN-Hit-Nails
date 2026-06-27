import { notFound } from "next/navigation";

import { FlowEditor } from "@/components/flows/flow-editor";
import { requireProfile } from "@/lib/supabase/auth";
import { defaultFlowGraph, isFlowGraph } from "@/lib/agent/flow-types";

export default async function FlowEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireProfile();
  const { data: flow } = await supabase
    .from("agent_flows")
    .select("id, name, description, active, graph")
    .eq("id", id)
    .maybeSingle();

  if (!flow) notFound();

  const graph = isFlowGraph(flow.graph) ? flow.graph : defaultFlowGraph();

  return (
    <FlowEditor
      id={flow.id}
      name={flow.name}
      active={flow.active}
      graph={graph}
    />
  );
}
