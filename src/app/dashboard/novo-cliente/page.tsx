"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema, type ClientFormData } from "@/lib/validations";
import {
  SERVICO_OPTIONS,
  STATUS_OPTIONS,
  STATUS_DEFAULT,
} from "@/lib/constants";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { maskCNPJ, maskPhone } from "@/lib/utils";

export default function NovoClientePage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: { status: STATUS_DEFAULT },
  });

  async function onSubmit(data: ClientFormData) {
    setServerError(null);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setServerError(json.error || "Não foi possível cadastrar o cliente.");
      return;
    }

    // Se o Sheets falhou, avisa mas ainda redireciona (registro foi salvo).
    if (json.sheetSynced === false) {
      alert(
        "Cliente cadastrado, mas houve falha ao sincronizar com Google Planilhas."
      );
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo cliente</h1>
          <p className="mt-1 text-sm text-gray-500">
            Preencha os dados do cliente. Os campos com * são obrigatórios.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-brand hover:underline"
        >
          Voltar
        </Link>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {serverError && <Alert type="error">{serverError}</Alert>}

          <Input
            id="cliente"
            label="Cliente *"
            placeholder="Nome da clínica, empresa ou responsável"
            error={errors.cliente?.message}
            {...register("cliente")}
          />

          <Textarea
            id="informacoes"
            label="Informações *"
            placeholder="Informações gerais sobre o cliente"
            error={errors.informacoes?.message}
            {...register("informacoes")}
          />

          <Input
            id="impulsionamento"
            label="Impulsionamento *"
            placeholder='Ex.: "R$ 1.000 por mês", "R$ 50 por dia"'
            error={errors.impulsionamento?.message}
            {...register("impulsionamento")}
          />

          <Select
            id="servico"
            label="Serviço *"
            placeholder="Selecione um serviço"
            options={SERVICO_OPTIONS}
            error={errors.servico?.message}
            {...register("servico")}
          />

          <Input
            id="whatsapp"
            label="WhatsApp *"
            placeholder="(11) 99999-9999"
            error={errors.whatsapp?.message}
            {...register("whatsapp", {
              onChange: (e) => {
                e.target.value = maskPhone(e.target.value);
              },
            })}
          />

          <Input
            id="cnpj"
            label="CNPJ"
            placeholder="00.000.000/0001-00"
            error={errors.cnpj?.message}
            {...register("cnpj", {
              onChange: (e) => {
                e.target.value = maskCNPJ(e.target.value);
              },
            })}
          />

          <Textarea
            id="principais_informacoes_cliente"
            label="Principais informações do cliente *"
            placeholder="Demanda, histórico, dores, alinhamentos, detalhes de contrato..."
            rows={5}
            error={errors.principais_informacoes_cliente?.message}
            {...register("principais_informacoes_cliente")}
          />

          <Select
            id="status"
            label="Status *"
            options={STATUS_OPTIONS}
            error={errors.status?.message}
            {...register("status")}
          />

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={isSubmitting}>
              Salvar cliente
            </Button>
            <Link href="/dashboard">
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
