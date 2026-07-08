"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  SERVICO_OPTIONS,
  STATUS_OPTIONS,
} from "@/lib/constants";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { formatDate } from "@/lib/utils";
import type { Client } from "@/types";

export function AdminClientList({
  initialClients,
}: {
  initialClients: Client[];
}) {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [statusFilter, setStatusFilter] = useState("");
  const [servicoFilter, setServicoFilter] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [phoneQuery, setPhoneQuery] = useState("");
  const [selected, setSelected] = useState<Client | null>(null);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (servicoFilter && c.servico !== servicoFilter) return false;
      if (
        nameQuery &&
        !c.cliente.toLowerCase().includes(nameQuery.toLowerCase())
      )
        return false;
      if (
        phoneQuery &&
        !c.whatsapp.replace(/\D/g, "").includes(phoneQuery.replace(/\D/g, ""))
      )
        return false;
      return true;
    });
  }, [clients, statusFilter, servicoFilter, nameQuery, phoneQuery]);

  function handleSaved(updated: Client) {
    setClients((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
    setSelected(null);
    router.refresh();
  }

  function handleDeleted(id: string) {
    setClients((prev) => prev.filter((c) => c.id !== id));
    setSelected(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Filtros e buscas */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Status"
          placeholder="Todos"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
        <Select
          label="Serviço"
          placeholder="Todos"
          options={SERVICO_OPTIONS}
          value={servicoFilter}
          onChange={(e) => setServicoFilter(e.target.value)}
        />
        <Input
          label="Buscar por cliente"
          placeholder="Nome do cliente"
          value={nameQuery}
          onChange={(e) => setNameQuery(e.target.value)}
        />
        <Input
          label="Buscar por WhatsApp"
          placeholder="Número"
          value={phoneQuery}
          onChange={(e) => setPhoneQuery(e.target.value)}
        />
      </div>

      <p className="text-sm text-gray-500">
        Exibindo {filtered.length} de {clients.length} cliente(s).
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum cliente encontrado"
          description="Ajuste os filtros para ver outros resultados."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Cliente</TH>
              <TH>Serviço</TH>
              <TH>WhatsApp</TH>
              <TH>CNPJ</TH>
              <TH>Status</TH>
              <TH>Responsável</TH>
              <TH>Cadastro</TH>
              <TH>Ações</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((c) => (
              <TR key={c.id}>
                <TD className="font-medium text-gray-900">{c.cliente}</TD>
                <TD>{c.servico}</TD>
                <TD>{c.whatsapp}</TD>
                <TD>{c.cnpj || "-"}</TD>
                <TD>
                  <StatusBadge status={c.status} />
                </TD>
                <TD className="max-w-[160px] truncate">{c.user_email}</TD>
                <TD className="whitespace-nowrap">{formatDate(c.created_at)}</TD>
                <TD>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelected(c)}
                  >
                    Ver / editar
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {selected && (
        <EditClientModal
          client={selected}
          onClose={() => setSelected(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}

// ---------- Modal de edição ----------
function EditClientModal({
  client,
  onClose,
  onSaved,
  onDeleted,
}: {
  client: Client;
  onClose: () => void;
  onSaved: (c: Client) => void;
  onDeleted: (id: string) => void;
}) {
  const [form, setForm] = useState({
    cliente: client.cliente,
    informacoes: client.informacoes,
    impulsionamento: client.impulsionamento,
    servico: client.servico,
    whatsapp: client.whatsapp,
    cnpj: client.cnpj || "",
    principais_informacoes_cliente: client.principais_informacoes_cliente,
    status: client.status,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setWarning(null);
    const res = await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(json.error || "Não foi possível salvar as alterações.");
      return;
    }
    if (json.sheetSynced === false) {
      setWarning(
        "Alterações salvas, mas houve falha ao sincronizar com Google Planilhas."
      );
      // Mesmo com aviso, atualiza a lista após breve confirmação.
    }
    onSaved(json.client as Client);
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/clients/${client.id}`, {
      method: "DELETE",
    });
    setDeleting(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || "Não foi possível excluir o cliente.");
      return;
    }
    onDeleted(client.id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Editar cliente
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {error && <Alert type="error">{error}</Alert>}
          {warning && <Alert type="warning">{warning}</Alert>}

          <Input
            label="Cliente"
            value={form.cliente}
            onChange={(e) => update("cliente", e.target.value)}
          />
          <Textarea
            label="Informações"
            value={form.informacoes}
            onChange={(e) => update("informacoes", e.target.value)}
          />
          <Input
            label="Impulsionamento"
            value={form.impulsionamento}
            onChange={(e) => update("impulsionamento", e.target.value)}
          />
          <Select
            label="Serviço"
            options={SERVICO_OPTIONS}
            value={form.servico}
            onChange={(e) => update("servico", e.target.value)}
          />
          <Input
            label="WhatsApp"
            value={form.whatsapp}
            onChange={(e) => update("whatsapp", e.target.value)}
          />
          <Input
            label="CNPJ"
            value={form.cnpj}
            onChange={(e) => update("cnpj", e.target.value)}
          />
          <Textarea
            label="Principais informações do cliente"
            value={form.principais_informacoes_cliente}
            onChange={(e) =>
              update("principais_informacoes_cliente", e.target.value)
            }
          />
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(e) => update("status", e.target.value)}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              Excluir
            </Button>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleSave} loading={saving}>
                Salvar alterações
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
