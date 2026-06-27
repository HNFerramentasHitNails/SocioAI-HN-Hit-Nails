# Integração LeadsPro (sociaAI) → Sales Success Suite (ERP)

Objetivo: **uma só fonte de verdade**, sem dados duplicados, com o ciclo
`lead (outreach) → prospect (pipeline) → customer (comprou)` ligado por chaves
estrangeiras nativas.

## Decisões fechadas

| Tema | Decisão |
|------|---------|
| **Base de dados** | Uma só. A BD do **ERP** (`yvlzskbnewmomnxnxyix`, *HN Hit Nails Projects*) passa a ser a fonte única. O outreach do LeadsPro migra para lá. |
| **Funil** | `leads` (topo de funil, cold outreach em volume) **promove** a `prospects` (pipeline CRM existente) e, ao ganhar, liga a `customers`. |
| **Apps** | O LeadsPro continua como app/Vercel próprio, mas reaponta o cliente Supabase para a BD do ERP. |
| **Projeto LeadsPro Supabase** (`ccmtswezlqrwwhrhdblk`) | Fica só com os 10 leads de teste (descartáveis). Após validação, pausar/arquivar. |

## Mapeamento de entidades

| LeadsPro (origem) | ERP (destino) | Notas |
|---|---|---|
| `organization` (1 linha) | `organizations` (linha existente) | Reutiliza-se a org do ERP. `org_id` → `organization_id`. |
| `profiles` | `profiles` + `organization_members` | Auth é por projeto; a equipa volta a autenticar-se no projeto do ERP. |
| `leads` | **`leads`** (nova) | Ganha `prospect_id` e `customer_id` para nunca duplicar a pessoa. |
| `templates` | `templates` | |
| `campaigns` | `campaigns` | |
| `campaign_leads` | `campaign_leads` | |
| `messages` | `messages` | |
| `conversation_messages` | `conversation_messages` | Distinta de `ai_conversation_messages` (do ERP). |
| `agent_flows` | `agent_flows` | |
| `integrations` | `integrations` | Distinto de `connections`/conectores (Stripe) do ERP. |
| `catalog_items` (967) | `catalog_items` | Base de conhecimento da IA. Opcional: sincronizar `products` → `catalog_items`. |
| `organization.leads_limit/…/about_context` | **`outreach_org_settings`** (nova) | Limites + contexto IA do LeadsPro, fora da tabela core `organizations`. |

> Os nomes das tabelas de outreach foram mantidos sem prefixo (não colidem com
> nenhuma tabela do ERP), o que minimiza a mudança na app. Todas usam
> `organization_id` (consistente com o ERP) com `default current_org_id()`.

## Anti-duplicação (o ponto central)

1. **Pessoa única por org.** Antes de criar um lead/prospect verifica-se se já
   existe `customer` ou `prospect` com o mesmo telefone/email normalizado na
   mesma org → se existir, **liga-se** em vez de criar.
2. **Promoção explícita.** `promote_lead_to_prospect(lead_id)` cria (ou liga) um
   `prospect` e grava `leads.prospect_id`. Quando o prospect é ganho, o fluxo do
   ERP cria o `customer` e preenche `prospects.customer_id`; um trigger propaga
   `leads.customer_id`.
3. **Vista 360.** `lead_360` junta lead + prospect + customer + métricas de
   mensagens para um histórico único do contacto.

## Plano de execução

- [x] **Fase 1 — Schema.** Enums, tabelas de outreach, FKs para
  `prospects`/`customers`, índices e RLS (padrão do ERP). Aditivo.
- [x] **Fase 2 — Funil.** `promote_lead_to_prospect`, trigger de propagação
  `customer_id` (`trg_sync_lead_customer`), vista `lead_360`.
- [x] **Fase 2b — Compat.** `outreach_org_settings` (limites + contexto IA),
  `current_org_id()`, defaults `organization_id`. Ficheiro consolidado:
  [`sql/0001_outreach_into_erp.sql`](sql/0001_outreach_into_erp.sql).
- [x] **Fase 4 — App.** `lib/supabase/config.ts` aponta para o ERP; `org_id` →
  `organization_id`; `lib/supabase/auth.ts` é um shim sobre
  `organization_members`/`organizations`/`outreach_org_settings`; Equipa gere
  `organization_members`; tipos regenerados. `npm run build` ✅.
- [x] **Fase 5 — Catálogo.** Função `sync_products_to_catalog()` + coluna
  `catalog_items.source_product_id` + backfill. Botão **Sincronizar produtos** na
  página Catálogo. (Sem trigger em `products` — refresh on-demand.)
- [x] **Funil na UI.** Ação `promoteLead` + item **Promover a prospect** no menu
  de cada lead (chama `promote_lead_to_prospect`; desativado se já for prospect).
- [x] **Fase 6 — Limpeza.** Projeto Supabase antigo (`ccmtswezlqrwwhrhdblk`) pausado.
- [ ] **Fase 3 — Dados (opcional).** Os 10 leads no projeto antigo eram de teste —
  descartados.

### Ação necessária na Vercel (projeto LeadsPro)

Atualizar as variáveis de ambiente para apontarem ao ERP:

- `NEXT_PUBLIC_SUPABASE_URL` = `https://yvlzskbnewmomnxnxyix.supabase.co`
  (ou remover — o fallback no código já aponta para o ERP).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = chave publishable do ERP (idem fallback).
- **`SUPABASE_SERVICE_ROLE_KEY`** = service role **do ERP** (crítico: convites de
  equipa e o worker de envio usam-na). A antiga aponta para o projeto errado.

### Auth

Login funciona já para os membros ativos da org do ERP
(`diogo.monteiro@hnhitnails.com` = admin/owner; `ola@dmcad.pt` = membro). Novos
membros criam-se em **Equipa → Convidar** (insere em `organization_members`).
