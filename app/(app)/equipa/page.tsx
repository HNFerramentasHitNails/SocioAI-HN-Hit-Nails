import { PageHeader } from "@/components/page-header";
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
  const { supabase } = await requireAdmin();

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
      />

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Último acesso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        O convite de novos membros por email será adicionado quando configurarmos
        o envio de email (Fase 5).
      </p>
    </>
  );
}
