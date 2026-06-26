# LeadsPro — HN Hit Nails · Plano do Projeto

Plataforma de **prospeção de leads + outreach multicanal** para uso interno da
**HN Hit Nails**, inspirada na análise de `leads.sociosai.com` (ver
`docs/analise-plataforma-sociosai.md`).

## Decisões fechadas com o cliente

| Tema | Decisão |
|------|---------|
| **Infraestrutura** | Projeto **Supabase novo dedicado** (`HN LeadsPro`, ref `ccmtswezlqrwwhrhdblk`, eu-west-2) + projeto **Vercel novo**, isolados do "Sales Success Suite". |
| **Âmbito** | **Single-tenant** — apenas HN Hit Nails e a sua equipa. Sem camada de revenda/white-label nem Super Admin. |
| **Fonte de leads (MVP)** | **CSV + criação manual.** O Marketplace (Google Places) fica para a Fase 2. |
| **Canais (MVP)** | **WhatsApp (WAHA)** + **Email (Resend)**. SMS fica para depois. |
| **Idioma** | **Português (PT-PT)**. |
| **IA copywriting** | **DeepSeek V4 Pro** (via API compatível com OpenAI). Camada abstrata p/ trocar de provedor. |
| **Billing/Stripe** | **Fora do MVP** (uso interno; sem revenda). |

## Stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript** + **React 19.2**
- **Tailwind v4** + **shadcn/ui** (tema escuro, primary violeta)
- **Supabase** — Postgres + Auth + RLS + Storage
- **Vercel** — deploy + Cron (fila de envio)
- **WhatsApp:** WAHA (self-hosted) · **Email:** Resend · **IA:** DeepSeek

> Nota Next 16: `middleware` foi substituído por `proxy.ts` (runtime Node);
> `cookies()/headers()/params/searchParams` são assíncronos; `next lint` removido.

## Modelo de dados (single-tenant)

Todas as tabelas têm `org_id` (uma só org semeada) para RLS limpo e futura
evolução multi-tenant sem migração dolorosa.

```
organization      (id, name, logo, colors, limits, created_at)
profiles          (id->auth.users, org_id, full_name, role: admin|member, last_login)
leads             (id, org_id, name, company, email, phone, country, state, city,
                   niche, status, source, quality_score, rating, has_website, notes,
                   deleted_at, created_at)
templates         (id, org_id, name, niche, channel, lead_stage, objective, tone,
                   body, variables[], about_context, created_at)
campaigns         (id, org_id, name, channels[], status, scheduled_at, stats, created_at)
campaign_leads    (campaign_id, lead_id, status)
messages          (id, org_id, campaign_id, lead_id, channel, body, status,
                   sent_at, replied_at, error)
integrations      (org_id, type: waha|email, config jsonb, status)
whatsapp_sessions (org_id, session_name, status)
```

## Fases de construção

- [x] **Fase 1 — Scaffold + infra.** Next 16, Tailwind v4, shadcn/ui, clientes
  Supabase (client/server/proxy), branding, env, build verde, projeto Supabase
  criado, deploy Vercel.
- [x] **Fase 2 — Auth + base single-tenant.** Supabase Auth (email/password),
  `organization`+`profiles`+roles, RLS, trigger de bootstrap (1º user = admin),
  login/registo, rotas de confirmação, shell com sidebar protegida, dashboard,
  página de Equipa (admin).
- [x] **Fase 3 — Leads.** Schema `leads` (+RLS, soft-delete), CRUD, import CSV,
  pipeline Novo/Contactado/Respondeu, filtros + pesquisa, lixeira (restaurar/
  eliminar), dashboard ligada às contagens reais.
- [ ] **Fase 4 — Templates + IA.** Editor multicanal, variáveis de merge,
  gerar/regenerar com DeepSeek, contexto "Sobre Você".
- [ ] **Fase 5 — Canais.** WAHA (QR + estado) e Email (Resend) + envio de teste.
- [ ] **Fase 6 — Campanhas.** Wizard 5 passos, fila de envio (Cron), rate-limiting,
  tracking de estado/respostas.
- [ ] **Fase 7 — Dashboard + Analytics.** KPIs, gráficos por canal, saúde das campanhas.
- [ ] **Fase 8 — Definições.** Branding (logo/cores) + config das integrações.

## Itens que dependem do cliente (chaves/infra)

- **Supabase service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (painel Supabase → Settings → API).
- **DeepSeek** → `AI_API_KEY` (+ confirmar `AI_MODEL`) — Fase 4.
- **Resend** → `RESEND_API_KEY` + domínio verificado + `EMAIL_FROM` — Fase 5.
- **WAHA** → VPS/Docker a correr WAHA → `WAHA_URL`, `WAHA_API_KEY`, `WAHA_SESSION` — Fase 5.

## Fora de âmbito (futuro)

Marketplace/Google Places · SMS · Stripe/billing por uso · revenda/white-label/Super Admin.
