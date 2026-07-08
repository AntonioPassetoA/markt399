"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  publicClientSchema,
  type PublicClientFormData,
} from "@/lib/validations";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { maskCNPJ, maskPhone } from "@/lib/utils";

export function PublicClientForm({
  token,
  agencyName,
}: {
  token: string;
  agencyName: string | null;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PublicClientFormData>({
    resolver: zodResolver(publicClientSchema),
  });

  async function onSubmit(data: PublicClientFormData) {
    setServerError(null);
    const res = await fetch("/api/public/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, token }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setServerError(json.error || "Não foi possível enviar o formulário.");
      return;
    }

    setSent(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cabeçalho */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">
            PC
          </span>
          <span className="font-semibold text-gray-900">Painel de Clientes</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {sent ? (
          <Card className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl">
              ✅
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              Formulário enviado com sucesso!
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Recebemos suas informações. Obrigado! Em breve entraremos em
              contato. Você já pode fechar esta página.
            </p>
          </Card>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                Formulário de cadastro
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {agencyName
                  ? `Você foi convidado por ${agencyName}. `
                  : ""}
                Preencha seus dados abaixo. Os campos com * são obrigatórios.
              </p>
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
                  placeholder="Informações gerais sobre o seu negócio"
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
                  label="Principais informações *"
                  placeholder="Conte o que for importante: demanda, objetivos, detalhes do seu negócio..."
                  rows={5}
                  error={errors.principais_informacoes_cliente?.message}
                  {...register("principais_informacoes_cliente")}
                />

                <div className="pt-2">
                  <Button type="submit" loading={isSubmitting} className="w-full">
                    Enviar formulário
                  </Button>
                </div>
              </form>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
