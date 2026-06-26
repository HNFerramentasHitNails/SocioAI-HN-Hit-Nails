# Análise da Plataforma "Sócios AI / LeadsPro" (leads.sociosai.com)

> Análise feita a partir da conta de **Revendedor da Hit Nails** (csantos@hnhitnails.com).
> Objetivo: servir de blueprint para construirmos a nossa própria plataforma.

---

## 1. O que é a plataforma (resumo executivo)

É um **SaaS B2B de prospeção de leads + outreach multicanal**, vendido em modelo **white-label / revenda**.
O produto final chama-se **"LeadsPro"** (marca interna "by Sócios AI"). Cada revendedor (ex: Hit Nails)
pode criar a sua própria marca, domínio e clientes, e revender a ferramenta com preços próprios.

**Proposta de valor em 1 frase:** "Encontra negócios locais (por nicho + cidade), importa-os como leads,
e contacta-os automaticamente por WhatsApp / SMS / Email com mensagens geradas por IA."

A plataforma tem **3 níveis de utilizador**:

| Nível | Rota | Quem | Faz o quê |
|-------|------|------|-----------|
| **Super Admin** | `(super-admin)` | Dono da Sócios AI | Gere todos os revendedores (não acedido — fora do nosso login) |
| **Revendedor / Master Admin** | `/master-admin/*` | Hit Nails | Cria clientes, define preços, white-label, faturação |
| **Cliente final** | `/dashboard`, `/leads`, etc. | Empresa cliente | Usa o produto de prospeção |

---

## 2. Portal do Revendedor (`/master-admin`)

Menu: Dashboard · Clientes · Usuários · Análises · White Label · Faturamento · Configurações

### 2.1 Dashboard
KPIs: nº de Clientes (organizações), Total de Clientes, Recorrência Mensal (MRR), Receita Total.
Lista rápida de clientes.

### 2.2 Clientes (`/master-admin/clients`)
Tabela de organizações-cliente: **Name, Slug, Email, Status, Created, Actions**. Pesquisa + filtro de status.

**Modal "Create New Client"** (revela o modelo de negócio):
- Company Name, Contact Name, Email, Password (cria org + utilizador admin de uma vez)
- **Plan**: `Starter · Pro · Business · Enterprise`
- **Monthly Price ($)** (ex: 99,90)
- **Price per Lead ($)** (ex: 0,50) → cobrança por uso
- **Leads Limit** (ex: 200), **Users Limit** (ex: 1), **Messages Limit** (ex: 1000)
- **Coupon (opcional)** com validação

### 2.3 Usuários (`/master-admin/users`)
KPIs: Total Users, Active Users, Organizations. Tabela: User, Organization, **Role** (`Master Admin`, `Admin`, ...),
Status, Last Login. Filtros por status / role / organização.

### 2.4 Análises (`/master-admin/analytics`)
KPIs: Total Users, Total Leads, Campaigns, Messages Sent, Your Clients, Avg Leads per Client.
Gráfico "Growth Over Time" (Campaigns / Leads / Users) com filtro de período (Last 30 days).

### 2.5 White Label (`/master-admin/white-label`) — peça central da revenda
4 separadores:
- **Branding**: Brand Name, Logo (light + dark), Favicon, paleta de cores (Primary, Secondary, Accent,
  Background, Text) com **Live Preview**.
- **Domain**: domínio personalizado (`app.teudominio.com`) + botão "Ativar HTTPS".
- **Email**: From Name / From Email + **SMTP próprio** (host, port, user, pass — encriptada).
- **WhatsApp**: usa **WAHA** (WhatsApp HTTP API self-hosted) → campos WAHA URL, Session Name, WAHA API Key.
  Por defeito usa "infraestrutura partilhada"; WAHA próprio é opcional.

### 2.6 Faturamento (`/master-admin/billing`)
KPIs de uso (Monthly Leads `0/200` com reset mensal, Total Users, Overall Usage %).
"Usage Summary" com barras de progresso. Tabela "Clients Billing": Client, Plan, Monthly Price, Price/Lead,
Status, Leads Usage, Users, **Stripe**, Actions → **integração Stripe** + billing por uso.

### 2.7 Configurações
**Em desenvolvimento** (mostra chaves i18n não traduzidas → confirma stack com i18next e secção inacabada).

---

## 3. Produto Cliente Final ("LeadsPro" — `/dashboard`)

Menu: Dashboard · Leads · Marketplace · Grupos WhatsApp · Templates · Campanhas · Billing · Equipe ·
Documentação · CRM (link externo) · **Canais: WhatsApp / SMS / Email**

### 3.1 Dashboard
Cards: Leads da Plataforma, Leads Importados, Mensagens Enviadas, Taxa de Resposta.
"Performance por Canal" (gráfico). "Uso do Plano" (Leads 0/200, **Disparos Semanais 0/100**, fim do período).
"Saúde das Campanhas" (Ativas/Pausadas/Concluídas). "Qualidade de Leads" (scoring). "Pipeline de Enriquecimento".

### 3.2 Leads (`/leads`)
Pipeline de estados: **Novo → Contatado → Respondeu** (+ "Com WhatsApp"). Importar CSV, Novo Lead, Lixeira, Filtros.
**Modelo de Lead**: Nome, País, Email, Telefone, Empresa, Estado/Região, Cidade, **Nicho** (ex: Restaurantes,
Clínicas, Lojas). → foco em **negócios locais**.

### 3.3 Marketplace de Leads (`/marketplace`) — o motor de geração ⭐
"Descubra e compre leads qualificados para seu negócio."
- **Categoria/Nicho**: Accounting, Beauty Salon, Consulting, Legal, Marketing, Pizza, Real Estate,
  Restaurant, + "Other Category" (nicho personalizado). Cada uma com keywords de pesquisa
  (ex: "restaurant, restaurante").
- **Quantidade**: 10 / 20 / 50 / 100 leads
- **Min Rating** (filtro por estrelas) + **Website** (tem/não tem site)
- **Localização**: País + Cidade → botão "Search Leads"

➡️ Os filtros (rating, website, categorias com keywords) indicam fortemente que a fonte é o
**Google Maps / Google Places API** (scraping de negócios locais). É o coração do valor do produto.

### 3.4 Grupos WhatsApp (`/whatsapp-groups`)
Lista os grupos de WhatsApp onde o utilizador participa (via WAHA) — para extrair membros como leads
e/ou difundir mensagens. Requer WhatsApp conectado.

### 3.5 Templates (`/templates`) — copywriting com IA ⭐
Templates por canal (WhatsApp / SMS / Email). Editor com:
- Nome, Nicho, **Estágio do Lead** (Frio/primeiro contato…), **Objetivo da Mensagem** (Iniciar conversa…),
  **Tom de Voz** (Humano / Direto / Consultivo / Curto)
- Bloco "**Sobre Você (contexto para IA)**": O que ofereces? Que problema resolves? Prova/diferencial.
- Corpo da mensagem + Prévia, **"Regenerar" por IA** por canal, limite de caracteres (360 WhatsApp/SMS)
- **Variáveis de merge**: `{{name}} {{full_name}} {{company}} {{city}} {{email}} {{phone}} {{niche}}`

### 3.6 Campanhas (`/campaigns`) — orquestração de outreach ⭐
KPIs: Total, Em Execução, Agendadas, Total de Leads, Total de Respostas.
**Wizard de 5 passos**: Informações (nome + selecionar canais WhatsApp/SMS/Email) → Selecionar Leads →
Templates → **Agendamento** → Revisão.

### 3.7 Outros
Billing (do cliente), Equipe (`/settings/team` — gestão de utilizadores da org), Documentação (`/docs`),
CRM (link externo).

---

## 4. Stack técnica (reverse-engineering via DevTools/network)

| Camada | Tecnologia (confirmada) |
|--------|--------------------------|
| **Frontend** | **Next.js** (App Router — `_next/static`, route groups `(dashboard)` e `(super-admin)`), React |
| **Estilo** | Tailwind (provável), tema dark, gradientes |
| **i18n** | i18next / react-i18next (PT-BR / EN) |
| **Backend / DB** | **Supabase** (`yssmfjsrlnpfxfmawbbk.supabase.co`) — PostgREST `/rest/v1/` + Auth `/auth/v1/` |
| **API interna** | Next.js API routes (ex: `/api/whatsapp/status`) |
| **WhatsApp** | **WAHA** (WhatsApp HTTP API, self-hosted/Docker) |
| **Pagamentos** | **Stripe** |
| **Leads** | **Google Places/Maps** (inferido pelos filtros) |
| **Email** | SMTP configurável por revendedor |
| **Analytics** | Google Analytics (Measurement Protocol) |
| **IA** | LLM para gerar/regenerar mensagens (provável OpenAI/Claude) |

**Tabelas Supabase observadas:** `organizations`, `users`, `user_permissions`, `integrations`, `whatsapp_sessions`.
(Em falta mas garantidamente existentes: `leads`, `campaigns`, `templates`, `messages`, `plans`,
`billing/subscriptions`, `white_label_settings`, `coupons`.)

---

## 5. Modelo de dados (reconstruído)

```
organizations        (id, name, slug, type: reseller|client, parent_org_id, status, created_at)
users                (id, org_id, name, email, role: super_admin|master_admin|admin|member, last_login)
user_permissions     (user_id, permission)
white_label_settings (org_id, brand_name, logo_light, logo_dark, favicon, colors{...}, custom_domain,
                      smtp{...}, waha_url, waha_session, waha_api_key)
plans / subscriptions(org_id, plan, monthly_price, price_per_lead, leads_limit, users_limit,
                      messages_limit, stripe_customer_id, stripe_subscription_id, period_end)
coupons              (code, discount, ...)
leads                (id, org_id, name, email, phone, company, country, state, city, niche,
                      status: novo|contatado|respondeu, source: platform|imported|marketplace,
                      quality_score, rating, has_website)
templates            (id, org_id, name, niche, lead_stage, objective, tone, channel, body, variables)
campaigns            (id, org_id, name, channels[], status, scheduled_at, stats{sent,replies})
campaign_leads       (campaign_id, lead_id, status)
messages             (id, campaign_id, lead_id, channel, body, status, sent_at, replied_at)
integrations         (org_id, type, config)         -- WAHA, SMTP, Stripe, etc.
whatsapp_sessions    (org_id, session_name, status)
```

---

## 6. Blueprint para construirmos a NOSSA plataforma

### 6.1 Stack recomendada (próxima da original, para velocidade)
- **Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui** — frontend + API routes
- **Supabase** — Postgres + Auth + RLS (multi-tenant por `org_id`) + Storage (logos) + Edge Functions
- **Stripe** — subscriptions + usage-based billing (metered: price per lead)
- **WAHA** (Docker) — WhatsApp; 1 sessão por org. Alternativa oficial: WhatsApp Cloud API (Meta)
- **SMS**: Twilio / Zenvia (BR). **Email**: Resend / SMTP do revendedor
- **Geração de leads**: Google Places API (oficial, pago) ou serviço de scraping
- **IA copywriting**: Claude (Anthropic) ou OpenAI para gerar/regenerar mensagens
- **Deploy**: Vercel (frontend) + WAHA num VPS/Render/Fly

### 6.2 Multi-tenancy & white-label (o diferenciador)
- Tabela `organizations` com `type` (reseller/client) e `parent_org_id` (hierarquia).
- **RLS no Supabase** por `org_id` — isolamento total entre clientes.
- Middleware Next.js que resolve a marca pelo **domínio** (host → org → carrega cores/logo/SMTP/WAHA).
- Branding aplicado via CSS variables (a partir da paleta guardada).

### 6.3 Fases de construção (MVP → completo)
1. **Auth + multi-tenant** (Supabase Auth, orgs, roles, RLS, convites de equipa).
2. **Leads core**: CRUD, import CSV, pipeline de estados, filtros.
3. **Motor de leads (Marketplace)**: integração Google Places (categoria+cidade+rating+website → leads).
4. **Templates + IA**: editor multicanal, variáveis de merge, geração/regeneração com LLM.
5. **Canais**: conectar WhatsApp (WAHA + QR), SMS, Email.
6. **Campanhas**: wizard 5 passos, agendamento, fila de envio (cron/queue), tracking de respostas.
7. **Billing**: Stripe (planos + metered por lead), limites/quotas, reset mensal.
8. **Portal Revendedor**: criar clientes, white-label (branding/domínio/SMTP/WAHA), analytics, faturação.
9. **Analytics & dashboards**.

### 6.4 Pontos críticos / riscos a decidir
- ⚖️ **Legalidade dos leads**: scraping de Google Maps viola ToS; a Places API oficial é cara e limita
  alguns campos. Decidir fonte de dados e conformidade RGPD/LGPD (consentimento, opt-out, base legal).
- 📵 **WhatsApp não-oficial (WAHA)**: risco de ban de números. A Cloud API oficial é mais segura mas tem
  custo por conversa e exige aprovação de templates. Decidir cedo.
- 🛡️ **Anti-spam / deliverability**: rate-limiting (daí os "Disparos Semanais 0/100"), aquecimento de números,
  opt-out obrigatório.
- 💳 **Billing por uso** com Stripe metered + enforcement de limites (leads/users/messages).

---

## 7. O que ainda não foi inspecionado (próximos passos)
- Fluxo real do Marketplace (não corri pesquisa para não gastar a quota de 200 leads da conta).
- Página de conexão do WhatsApp (QR via WAHA).
- Detalhe de Billing/Equipe do lado cliente, Documentação, e o portal Super Admin.
- Os bundles JS do Next.js poderiam ser lidos para extrair nomes exatos de endpoints/colunas, se quiseres
  um mapa ainda mais fino.
```
