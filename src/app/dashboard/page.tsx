import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { formatDate } from "@/lib/utils";
import type { Client } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Usuário comum vê apenas os próprios clientes (garantido pela RLS).
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false });

  const clients = (data ?? []) as Client[];
  const firstName = (session.profile?.name || session.email).split(" ")[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Olá, {firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Você tem {clients.length}{" "}
            {clients.length === 1 ? "cliente cadastrado" : "clientes cadastrados"}.
          </p>
        </div>
        <Link href="/dashboard/novo-cliente">
          <Button>+ Novo cadastro</Button>
        </Link>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          title="Nenhum cliente cadastrado ainda"
          description="Cadastre seu primeiro cliente para começar a organizar seus dados."
          action={
            <Link href="/dashboard/novo-cliente">
              <Button>+ Novo cadastro</Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* Tabela (desktop) */}
          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH>Cliente</TH>
                  <TH>Serviço</TH>
                  <TH>WhatsApp</TH>
                  <TH>Status</TH>
                  <TH>Data de cadastro</TH>
                </TR>
              </THead>
              <TBody>
                {clients.map((c) => (
                  <TR key={c.id}>
                    <TD className="font-medium text-gray-900">{c.cliente}</TD>
                    <TD>{c.servico}</TD>
                    <TD>{c.whatsapp}</TD>
                    <TD>
                      <StatusBadge status={c.status} />
                    </TD>
                    <TD>{formatDate(c.created_at)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          {/* Cards (mobile) */}
          <div className="grid gap-3 md:hidden">
            {clients.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-gray-900">{c.cliente}</h3>
                  <StatusBadge status={c.status} />
                </div>
                <dl className="mt-3 space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-400">Serviço</dt>
                    <dd>{c.servico}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-400">WhatsApp</dt>
                    <dd>{c.whatsapp}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-400">Cadastro</dt>
                    <dd>{formatDate(c.created_at)}</dd>
                  </div>
                </dl>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
