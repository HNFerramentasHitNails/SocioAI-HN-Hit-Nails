"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Send,
  UsersRound,
  Settings,
  Sparkles,
  LogOut,
  ChevronsUpDown,
  BarChart3,
  Store,
  Users2,
  MessagesSquare,
  BookText,
} from "lucide-react";

import { signOut } from "@/app/login/actions";
import { APP_CONFIG } from "@/lib/config";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Leads", href: "/leads", icon: Users },
  { title: "Marketplace", href: "/marketplace", icon: Store },
  { title: "Catálogo", href: "/catalogo", icon: BookText },
  { title: "Templates", href: "/templates", icon: FileText },
  { title: "Campanhas", href: "/campaigns", icon: Send },
  { title: "Conversas", href: "/conversas", icon: MessagesSquare },
  { title: "Grupos WhatsApp", href: "/whatsapp-groups", icon: Users2 },
  { title: "Análises", href: "/analytics", icon: BarChart3 },
  { title: "Equipa", href: "/equipa", icon: UsersRound, adminOnly: true },
  { title: "Definições", href: "/definicoes", icon: Settings, adminOnly: true },
];

function initials(name: string | null, email: string | null) {
  const source = name?.trim() || email || "?";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}

export function AppSidebar({
  fullName,
  email,
  role,
  orgName,
  logoUrl,
}: {
  fullName: string | null;
  email: string | null;
  role: "admin" | "member";
  orgName: string;
  logoUrl?: string | null;
}) {
  const pathname = usePathname();
  const items = NAV.filter((i) => !i.adminOnly || role === "admin");

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={orgName}
              width={32}
              height={32}
              unoptimized
              className="size-8 rounded-lg object-contain"
            />
          ) : (
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </div>
          )}
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">{APP_CONFIG.name}</span>
            <span className="text-xs text-muted-foreground">{orgName}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary/15 text-xs text-primary">
                      {initials(fullName, email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col text-left leading-tight">
                    <span className="truncate text-sm font-medium">
                      {fullName ?? "Utilizador"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{fullName}</span>
                    <span className="text-xs text-muted-foreground">
                      {role === "admin" ? "Administrador" : "Membro"}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <form action={signOut} className="w-full">
                  <DropdownMenuItem asChild>
                    <button type="submit" className="w-full cursor-pointer">
                      <LogOut className="size-4" />
                      Terminar sessão
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
