import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { AdminClientList } from "@/components/admin/AdminClientList";
import type { Client } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.isAdmin) return null; // O layout já exibe "Acesso negado".

  // Admin: busca todos os clientes com service_role (ignora RLS).
  const admin = createAdminClient();
  const { data } = await admin
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  const clients = (data ?? []) as Client[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Painel administrativo</h1>
        <p className="mt-1 text-sm text-gray-500">
          {clients.length} cliente(s) cadastrado(s) no total.
        </p>
      </div>
      <AdminClientList initialClients={clients} />
    </div>
  );
}
