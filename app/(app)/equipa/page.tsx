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
import type { Tables } from "@/lib/supabase/types";

export default async function EquipaPage() {
  const { supabase, user } = await requireAdmin();

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, last_login, created_at")
    .order("created_at", { ascending: true });

  const rows = (members ?? []) as Pick<
    Tables<"profiles">,
    "id" | "full_name" | "email" | "role" | "last_login" | "created_at"
  >[];

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
              <TableHead>Último acesso</TableHead>
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
                    {m.last_login
                      ? new Date(m.last_login).toLocaleDateString("pt-PT")
                      : "Nunca"}
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
