import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { requireProfile } from "@/lib/supabase/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireProfile();
  const org = profile.organization;

  const brandStyle = org?.primary_color
    ? ({
        "--primary": org.primary_color,
        "--sidebar-primary": org.primary_color,
        "--ring": org.primary_color,
      } as React.CSSProperties)
    : undefined;

  return (
    <SidebarProvider style={brandStyle}>
      <AppSidebar
        fullName={profile.full_name}
        email={profile.email}
        role={profile.role}
        orgName={org?.name ?? "HN Hit Nails"}
        logoUrl={org?.logo_url ?? null}
      />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-5" />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
