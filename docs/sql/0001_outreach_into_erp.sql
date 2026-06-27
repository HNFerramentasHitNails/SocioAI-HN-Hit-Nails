-- ============================================================================
-- Integração LeadsPro (outreach) → ERP (Sales Success Suite)
-- Alvo: projeto Supabase yvlzskbnewmomnxnxyix (HN Hit Nails Projects)
-- Estado: APLICADO em produção (migrações: outreach_into_erp,
--   outreach_harden_functions, outreach_rename_and_settings).
-- Natureza: ADITIVA — só cria objetos novos. A única exceção é a tabela nova
--   outreach_org_settings (não toca em `organizations`).
-- RLS: reutiliza is_org_member / is_org_admin / has_org_role do ERP.
-- ============================================================================

-- ---------- Enums -----------------------------------------------------------
do $$ begin create type public.lead_status as enum ('novo','contatado','respondeu','convertido','perdido'); exception when duplicate_object then null; end $$;
do $$ begin create type public.lead_source as enum ('manual','imported','marketplace','whatsapp_group','website'); exception when duplicate_object then null; end $$;
do $$ begin create type public.outreach_channel as enum ('whatsapp','email'); exception when duplicate_object then null; end $$;
do $$ begin create type public.outreach_message_status as enum ('queued','sent','delivered','failed','replied','skipped'); exception when duplicate_object then null; end $$;
do $$ begin create type public.outreach_campaign_status as enum ('draft','scheduled','running','paused','completed'); exception when duplicate_object then null; end $$;

-- ---------- Helper de dedupe ------------------------------------------------
create or replace function public.normalize_phone(_p text)
returns text language sql immutable set search_path = '' as $$
  select nullif(regexp_replace(coalesce(_p,''), '[^0-9]', '', 'g'), '');
$$;

-- helper de org única do utilizador (compat com a app LeadsPro single-tenant)
create or replace function public.current_org_id()
returns uuid language sql stable security definer set search_path to 'public' as $$
  select organization_id from public.organization_members
   where user_id = auth.uid() and status = 'active'
   order by created_at limit 1;
$$;
revoke execute on function public.current_org_id() from anon;

-- ---------- Tabelas de outreach (organization_id default = current_org_id) --
-- NOTA: nomes finais sem prefixo (sem colisão no ERP); organization_id consistente
-- com o resto do ERP; default permite à app omitir a org no insert.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.current_org_id() references public.organizations(id) on delete cascade,
  name text, company text, email text, phone text,
  country text, state text, city text, niche text,
  status public.lead_status not null default 'novo',
  source public.lead_source not null default 'manual',
  quality_score integer, rating numeric, has_website boolean,
  notes text, ai_paused boolean not null default false,
  prospect_id uuid references public.prospects(id) on delete set null,   -- funil
  customer_id uuid references public.customers(id) on delete set null,   -- funil
  created_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_org_idx        on public.leads(organization_id);
create index if not exists leads_status_idx      on public.leads(organization_id, status);
create index if not exists leads_prospect_idx    on public.leads(prospect_id);
create index if not exists leads_customer_idx     on public.leads(customer_id);
create index if not exists leads_phone_norm_idx   on public.leads(organization_id, public.normalize_phone(phone));
create index if not exists leads_email_idx        on public.leads(organization_id, lower(email));

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.current_org_id() references public.organizations(id) on delete cascade,
  name text not null, channel public.outreach_channel not null,
  niche text, lead_stage text, objective text, tone text, about_context text,
  body text, variables text[] not null default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.current_org_id() references public.organizations(id) on delete cascade,
  name text not null, channels public.outreach_channel[] not null default '{}',
  status public.outreach_campaign_status not null default 'draft', scheduled_at timestamptz,
  whatsapp_template_id uuid references public.templates(id) on delete set null,
  email_template_id uuid references public.templates(id) on delete set null,
  email_subject text, daily_limit integer,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.campaign_leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.current_org_id() references public.organizations(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  status text not null default 'pending', created_at timestamptz not null default now(),
  unique (campaign_id, lead_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.current_org_id() references public.organizations(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  channel public.outreach_channel not null, body text,
  status public.outreach_message_status not null default 'queued',
  error text, provider_message_id text,
  scheduled_at timestamptz, sent_at timestamptz, replied_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists messages_lead_idx on public.messages(lead_id);
create index if not exists messages_campaign_idx on public.messages(campaign_id);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.current_org_id() references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  role text not null, body text not null, created_at timestamptz not null default now()
);
create index if not exists conv_msgs_lead_idx on public.conversation_messages(lead_id);

create table if not exists public.agent_flows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.current_org_id() references public.organizations(id) on delete cascade,
  name text not null, description text, active boolean not null default false,
  graph jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.integrations (
  organization_id uuid not null default public.current_org_id() references public.organizations(id) on delete cascade,
  type text not null, config jsonb not null default '{}',
  enabled boolean not null default false, status text,
  updated_at timestamptz not null default now(),
  primary key (organization_id, type)
);

create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.current_org_id() references public.organizations(id) on delete cascade,
  type text not null, category text, name text not null, description text,
  url text, price text, tags text[] not null default '{}', active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- Settings de outreach por org (limites + contexto IA) — específico do LeadsPro,
-- fora da tabela core `organizations` para não a poluir.
create table if not exists public.outreach_org_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  leads_limit integer not null default 1000,
  monthly_message_limit integer not null default 5000,
  weekly_send_limit integer not null default 1500,
  about_context text,
  updated_at timestamptz not null default now()
);
insert into public.outreach_org_settings (organization_id)
  select id from public.organizations on conflict (organization_id) do nothing;

-- ---------- RLS (padrão do ERP) ---------------------------------------------
do $$ declare t text; begin
  foreach t in array array['leads','templates','campaigns','campaign_leads','messages',
    'conversation_messages','agent_flows','integrations','catalog_items','outreach_org_settings'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('create policy %1$I on public.%1$I for select using (public.is_org_member(organization_id));', t);
    execute format('create policy %1$I_ins on public.%1$I for insert with check (public.is_org_member(organization_id) and (public.is_org_admin(organization_id) or public.has_org_role(organization_id, ''sales_director''::public.app_role) or public.has_org_role(organization_id, ''sales_rep''::public.app_role)));', t);
    execute format('create policy %1$I_upd on public.%1$I for update using (public.is_org_member(organization_id) and (public.is_org_admin(organization_id) or public.has_org_role(organization_id, ''sales_director''::public.app_role) or public.has_org_role(organization_id, ''sales_rep''::public.app_role))) with check (public.is_org_member(organization_id));', t);
    execute format('create policy %1$I_del on public.%1$I for delete using (public.is_org_admin(organization_id));', t);
  end loop;
exception when duplicate_object then null; end $$;

-- ============================================================================
-- Funil: promoção lead → prospect + propagação de customer_id + vista 360
-- ============================================================================
create or replace function public.promote_lead_to_prospect(_lead_id uuid)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare _lead public.leads%rowtype; _prospect_id uuid; _customer_id uuid; _ph text;
begin
  select * into _lead from public.leads where id = _lead_id;
  if not found then raise exception 'lead % nao existe', _lead_id; end if;
  if not public.is_org_member(_lead.organization_id) then
    raise exception 'sem permissao para promover este lead';
  end if;
  _ph := public.normalize_phone(_lead.phone);
  select id into _customer_id from public.customers c
   where c.organization_id = _lead.organization_id
     and ((_ph is not null and public.normalize_phone(c.phone) = _ph)
       or (_lead.email is not null and lower(c.email) = lower(_lead.email))) limit 1;
  select id into _prospect_id from public.prospects p
   where p.organization_id = _lead.organization_id
     and ((_ph is not null and public.normalize_phone(p.phone) = _ph)
       or (_lead.email is not null and lower(p.email) = lower(_lead.email))) limit 1;
  if _prospect_id is null then
    insert into public.prospects (organization_id, name, company_name, email, phone, source,
      pipeline_stage, customer_id, notes_short, created_by)
    values (_lead.organization_id, coalesce(_lead.name, _lead.company, 'Lead sem nome'),
      _lead.company, _lead.email, _lead.phone, coalesce(_lead.source::text, 'leadspro'),
      'novo', _customer_id, _lead.notes, _lead.created_by)
    returning id into _prospect_id;
  end if;
  update public.leads
     set prospect_id = _prospect_id, customer_id = coalesce(_customer_id, customer_id),
         status = case when status = 'novo' then 'contatado' else status end, updated_at = now()
   where id = _lead_id;
  return _prospect_id;
end $$;
revoke execute on function public.promote_lead_to_prospect(uuid) from anon;

create or replace function public.sync_lead_customer_from_prospect()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.customer_id is distinct from old.customer_id and new.customer_id is not null then
    update public.leads set customer_id = new.customer_id, status = 'convertido', updated_at = now()
     where prospect_id = new.id;
  end if;
  return new;
end $$;
revoke execute on function public.sync_lead_customer_from_prospect() from anon, authenticated, public;

drop trigger if exists trg_sync_lead_customer on public.prospects;
create trigger trg_sync_lead_customer after update of customer_id on public.prospects
  for each row execute function public.sync_lead_customer_from_prospect();

create or replace view public.lead_360 as
select l.id as lead_id, l.organization_id, l.name, l.company, l.email, l.phone,
  l.status as lead_status, l.source, l.quality_score,
  p.id as prospect_id, p.pipeline_stage, p.estimated_value, p.lead_score,
  c.id as customer_id, c.total_spent, c.orders_count, c.segment, c.churn_risk,
  (select count(*) from public.messages m where m.lead_id = l.id) as messages_sent,
  (select max(m.replied_at) from public.messages m where m.lead_id = l.id) as last_reply_at
from public.leads l
left join public.prospects p on p.id = l.prospect_id
left join public.customers c on c.id = l.customer_id
where l.deleted_at is null;
