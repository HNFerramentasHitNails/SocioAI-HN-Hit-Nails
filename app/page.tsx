import Link from "next/link";
import { ArrowRight, MessageCircle, Sparkles, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/lib/config";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10%] h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[5%] h-[360px] w-[360px] rounded-full bg-chart-4/15 blur-[120px]" />
      </div>

      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            {APP_CONFIG.name}
            <span className="ml-1 text-muted-foreground">
              · {APP_CONFIG.company}
            </span>
          </span>
        </div>
        <Button asChild variant="ghost">
          <Link href="/login">Entrar</Link>
        </Button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          Prospeção + outreach multicanal com IA
        </span>

        <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Encontra leads e contacta-os por{" "}
          <span className="text-primary">WhatsApp</span> e{" "}
          <span className="text-primary">Email</span> em piloto automático.
        </h1>

        <p className="mt-6 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
          {APP_CONFIG.description}
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="gap-2">
            <Link href="/login">
              Começar agora <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-20 grid w-full max-w-4xl gap-4 sm:grid-cols-3">
          {[
            {
              icon: Users,
              title: "Gestão de leads",
              text: "Importa por CSV, organiza por nicho e acompanha o pipeline Novo → Contactado → Respondeu.",
            },
            {
              icon: Sparkles,
              title: "Mensagens com IA",
              text: "Gera e regenera copy personalizada por canal, com variáveis de merge automáticas.",
            },
            {
              icon: MessageCircle,
              title: "Campanhas multicanal",
              text: "Orquestra envios por WhatsApp e Email, com agendamento e tracking de respostas.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card/40 p-5 text-left backdrop-blur"
            >
              <f.icon className="mb-3 size-5 text-primary" />
              <h3 className="font-medium">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground">
        © {APP_CONFIG.company} · {APP_CONFIG.name}
      </footer>
    </div>
  );
}
