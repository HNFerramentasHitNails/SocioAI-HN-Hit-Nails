# LeadsPro — HN Hit Nails

Plataforma interna de **prospeção de leads + outreach multicanal** (WhatsApp e
Email) com mensagens geradas por IA, para a **HN Hit Nails**.

> Planeamento, decisões e roadmap completos em [`docs/PLAN.md`](docs/PLAN.md).
> Análise de referência em [`docs/analise-plataforma-sociosai.md`](docs/analise-plataforma-sociosai.md).

## Stack

- **Next.js 16** (App Router, Turbopack) · **TypeScript** · **React 19.2**
- **Tailwind v4** · **shadcn/ui** (tema escuro)
- **Supabase** (Postgres + Auth + RLS + Storage)
- **Vercel** (deploy + Cron)
- WhatsApp via **Evolution API** · Email via **Resend** · IA via **DeepSeek**

## Desenvolvimento

```bash
npm install
cp .env.example .env.local   # preencher as variáveis
npm run dev                  # http://localhost:3000
```

### Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (Turbopack) |
| `npm run build` | Build de produção |
| `npm run start` | Servir o build |
| `npm run lint` | ESLint |

## Variáveis de ambiente

Ver [`.env.example`](.env.example). As essenciais para arrancar são
`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`. As restantes
(Resend, Evolution API, DeepSeek, service role) são necessárias nas respetivas fases.

## Estrutura

```
app/                 Rotas (App Router)
components/ui/       Componentes shadcn/ui
lib/
  config.ts          Configuração de marca e constantes do domínio
  supabase/          Clientes Supabase (browser / server / proxy) + tipos
proxy.ts             Proxy do Next 16 (sessão + guarda de rotas)
docs/                Plano e análise de referência
```
