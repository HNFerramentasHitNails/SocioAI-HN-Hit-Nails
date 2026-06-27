import { createAdminClient } from "@/lib/supabase/server";

/**
 * Procedência de entidades criadas pela app SociaAI no ERP (Sales Success Suite).
 *
 * A app não cria nem deduplica clientes — a BD trata disso via `trg_leads_autolink`
 * (liga o lead a um `customer_id`/`prospect_id` existente por email/telefone/empresa).
 * Aqui apenas registamos a *origem* de cada entidade em `external_refs`, marcada com
 * o conector `socio_ai`, para o ERP saber que veio desta app.
 *
 * Porquê service role (server-only): `external_refs` é uma tabela de procedência
 * gerida por conectores. Tem RLS com apenas política de SELECT para membros, sem
 * política de INSERT — ou seja, o cliente autenticado (anon) não a pode escrever.
 * A escrita é feita aqui, no servidor, com a service role. NUNCA no browser.
 *
 * É best-effort: se a `SUPABASE_SERVICE_ROLE_KEY` não estiver configurada, ou se a
 * escrita falhar, a criação do lead não é afetada (a procedência é secundária).
 */

export const SOCIO_AI_CONNECTOR = "socio_ai" as const;

/** Tipos de entidade aceites por `external_refs.entity_type` que a app produz. */
export type ExternalEntityType =
  | "lead"
  | "prospect"
  | "campaign"
  | "message"
  | "template"
  | "agent_flow";

/**
 * Regista (idempotentemente) a origem `socio_ai` de uma ou mais entidades.
 * Para entidades nativas desta app, `external_id` = id da própria entidade.
 */
export async function recordExternalRefs(
  organizationId: string,
  entityType: ExternalEntityType,
  ids: Array<string | null | undefined>,
): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  const entityIds = Array.from(
    new Set(ids.filter((id): id is string => Boolean(id))),
  );
  if (entityIds.length === 0) return;

  const rows = entityIds.map((id) => ({
    organization_id: organizationId,
    connector_key: SOCIO_AI_CONNECTOR,
    entity_type: entityType,
    entity_id: id,
    external_id: id,
  }));

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("external_refs").upsert(rows, {
      onConflict: "organization_id,connector_key,entity_type,entity_id",
      ignoreDuplicates: true,
    });
    if (error) {
      console.error("[socio_ai] external_refs upsert falhou:", error.message);
    }
  } catch (e) {
    console.error("[socio_ai] external_refs upsert exception:", e);
  }
}
