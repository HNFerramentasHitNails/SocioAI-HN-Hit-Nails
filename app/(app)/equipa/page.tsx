import { PageHeader } from "@/components/page-header";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import { MemberActions } from "@/components/team/member-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/supabase/auth";

type MemberRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "admin" | "member";
  created_at: string;
};

export default async function EquipaPage() {
  const { supabase, user, profile } = await requireAdmin();

  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id, role, created_at")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: true });

  const ids = (members ?? []).map((m) => m.user_id);
  const { data: profs } = ids.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
    : { data: [] };
  const profById = new Map((profs ?? []).map((p) => [p.id, p]));

  const rows: MemberRow[] = (members ?? []).map((m) => ({
    id: m.user_id,
    full_name: profById.get(m.user_id)?.full_name ?? null,
    email: profById.get(m.user_id)?.email ?? null,
    role: m.role === "owner" || m.role === "admin" ? "admin" : "member",
    created_at: m.created_at,
  }));

  return (
    <>
      <PageHeader
        title="Equipa"
        description="Gere os utilizadores da tua organização."
      >
        <InviteMemberDialog />
      </PageHeader>

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Membro desde</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Ainda não há membros.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    {m.full_name ?? "—"}
                    {m.id === user.id && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (tu)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.role === "admin" ? "default" : "secondary"}>
                      {m.role === "admin" ? "Administrador" : "Membro"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(m.created_at).toLocaleDateString("pt-PT")}
                  </TableCell>
                  <TableCell>
                    <MemberActions
                      id={m.id}
                      role={m.role}
                      isSelf={m.id === user.id}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
