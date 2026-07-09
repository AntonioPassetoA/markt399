"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema, type ClientFormData } from "@/lib/validations";
import { STATUS_DEFAULT, SERVICO_PADRAO } from "@/lib/constants";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
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
    defaultValues: { servico: SERVICO_PADRAO, status: STATUS_DEFAULT },
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

          <Input
            id="area_de_atuacao"
            label="Área de atuação *"
            placeholder="Ex.: Odontologia, Estética, Advocacia..."
            error={errors.area_de_atuacao?.message}
            {...register("area_de_atuacao")}
          />

          <Textarea
            id="informacoes"
            label="Conte mais sobre o seu negócio *"
            placeholder="Fale sobre o negócio: o que faz, diferenciais, objetivos..."
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

          {/* Serviço fixo ("Gestão de Tráfego") — não é exibido, vai no envio. */}
          <input type="hidden" {...register("servico")} />

          <Input
            id="email"
            type="email"
            label="E-mail *"
            placeholder="nome@email.com"
            error={errors.email?.message}
            {...register("email")}
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
            label="CNPJ *"
            placeholder="00.000.000/0001-00"
            error={errors.cnpj?.message}
            {...register("cnpj", {
              onChange: (e) => {
                e.target.value = maskCNPJ(e.target.value);
              },
            })}
          />

          <Input
            id="endereco"
            label="Endereço *"
            placeholder="Rua, número, bairro, cidade - UF"
            error={errors.endereco?.message}
            {...register("endereco")}
          />

          {/* Status fixo "Novo" — não é exibido, entra automático no envio. */}
          <input type="hidden" {...register("status")} />

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
