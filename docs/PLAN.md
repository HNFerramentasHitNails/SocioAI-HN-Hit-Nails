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
| **Canais (MVP)** | **WhatsApp (Evolution API)** + **Email (Resend)**. SMS fica para depois. |
| **Idioma** | **Português (PT-PT)**. |
| **IA copywriting** | **DeepSeek V4 Pro** (via API compatível com OpenAI). Camada abstrata p/ trocar de provedor. |
| **Billing/Stripe** | **Fora do MVP** (uso interno; sem revenda). |

## Stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript** + **React 19.2**
- **Tailwind v4** + **shadcn/ui** (tema escuro, primary violeta)
- **Supabase** — Postgres + Auth + RLS + Storage
- **Vercel** — deploy + Cron (fila de envio)
- **WhatsApp:** Evolution API (self-hosted) · **Email:** Resend · **IA:** DeepSeek

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
integrations      (org_id, type: whatsapp|email, config jsonb, status)
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
- [x] **Fase 4 — Templates + IA.** Schema `templates` (+RLS), editor multicanal
  (WhatsApp/Email), variáveis de merge, contexto "Sobre ti", gerar/regenerar com
  **DeepSeek V4 Pro** (`deepseek-v4-pro`, modelo de raciocínio), contagem de
  caracteres por canal, CRUD completo.
- [x] **Fase 5 — Canais.** Tabela `integrations` (admin-only, RLS), clientes Evolution API
  (estado/QR/iniciar/enviar) e Resend, render de variáveis de merge, dispatcher
  unificado, e Definições → Canais (config + estado + QR + envio de teste).
  Config por UI (DB) ou env. *Requer credenciais Evolution API/Resend para enviar.*
- [x] **Fase 6 — Campanhas.** Schema `campaigns`/`campaign_leads`/`messages`
  (+RLS), wizard de 5 passos (Info→Leads→Templates→Agendamento→Revisão), motor de
  fila (`enqueue`/`processQueue`), envio manual + agendado via **Vercel Cron**
  (`/api/cron/send`, protegido por `CRON_SECRET`, service role), pausar/retomar,
  tracking de estados, dashboard ligada às mensagens/campanhas.
- [x] **Fase 7 — Dashboard + Analytics.** Página Análises com KPIs e gráficos
  (recharts): leads ao longo do tempo, leads por estado, mensagens por canal,
  saúde das campanhas; taxa de resposta.
- [x] **Fase 8 — Definições/Branding.** Bucket de storage `branding`, edição de
  nome/cor principal/logótipo da organização, aplicação da cor (CSS var) e do
  logótipo em toda a app. (Canais já na Fase 5.)

---

**✅ MVP completo (8/8 fases).** Próximos passos opcionais (fora do MVP):
Marketplace/Google Places, SMS, Stripe/billing, convites de equipa por email.

## Itens que dependem do cliente (chaves/infra)

- **Supabase service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (painel Supabase → Settings → API).
- **DeepSeek** → `AI_API_KEY` (+ confirmar `AI_MODEL`) — Fase 4.
- **Resend** → `RESEND_API_KEY` + domínio verificado + `EMAIL_FROM` — Fase 5.
- **Evolution API** → VPS/Docker a correr Evolution API → `EVOLUTION_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE` — Fase 5.

## Variáveis a configurar na Vercel (produção)

A config pública do Supabase tem fallback no código (funciona sem env vars). As
**secretas** têm de ser adicionadas no painel da Vercel (Project → Settings →
Environment Variables) à medida que as fases as exigem:

- `AI_API_KEY` — necessária para a geração de IA funcionar em produção (Fase 4).
- `AI_MODEL=deepseek-v4-pro`, `AI_BASE_URL=https://api.deepseek.com` (opcional, têm defaults).
- `SUPABASE_SERVICE_ROLE_KEY` — tarefas de servidor/worker (Fases 5-6).
- `RESEND_API_KEY`, `EMAIL_FROM` — envio de email (Fase 5).
- `EVOLUTION_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE` — WhatsApp (Fase 5).
- `CRON_SECRET` — proteger o endpoint de envio agendado (Fase 6).

**Envio agendado (cron):** o endpoint é `GET /api/cron/send?secret=<CRON_SECRET>`.
Para o disparar periodicamente: Vercel Cron (sub-diário só no plano Pro; Hobby =
1x/dia) **ou** um cron externo gratuito (ex: cron-job.org) a cada 5 min. O envio
manual ("enviar agora") funciona em qualquer plano.

## Fora de âmbito (futuro)

Marketplace/Google Places · SMS · Stripe/billing por uso · revenda/white-label/Super Admin.
