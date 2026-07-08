"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUpFormData } from "@/lib/validations";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { maskPhone } from "@/lib/utils";

export default function CadastroPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormData>({ resolver: zodResolver(signUpSchema) });

  async function onSubmit(data: SignUpFormData) {
    setServerError(null);

    // 1) Cria a conta (usuário + perfil) no servidor.
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setServerError(json.error || "Não foi possível criar a conta.");
      return;
    }

    // 2) Faz login automaticamente após o cadastro.
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setServerError("Conta criada, mas houve falha ao entrar. Faça login.");
      router.push("/login");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
              PC
            </span>
            <span className="text-lg font-semibold text-gray-900">
              Painel de Clientes
            </span>
          </Link>
        </div>

        <Card>
          <h1 className="text-xl font-semibold text-gray-900">Criar conta</h1>
          <p className="mt-1 text-sm text-gray-500">
            Preencha seus dados para começar.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            {serverError && <Alert type="error">{serverError}</Alert>}

            <Input
              id="name"
              label="Nome completo"
              placeholder="Seu nome"
              error={errors.name?.message}
              {...register("name")}
            />
            <Input
              id="email"
              type="email"
              label="E-mail"
              placeholder="voce@email.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              id="whatsapp"
              label="WhatsApp"
              placeholder="(11) 99999-9999"
              error={errors.whatsapp?.message}
              {...register("whatsapp", {
                onChange: (e) => {
                  e.target.value = maskPhone(e.target.value);
                },
              })}
            />
            <Input
              id="password"
              type="password"
              label="Senha"
              placeholder="Mínimo 6 caracteres"
              error={errors.password?.message}
              {...register("password")}
            />
            <Input
              id="confirmPassword"
              type="password"
              label="Confirmar senha"
              placeholder="Repita a senha"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />

            <Button type="submit" className="w-full" loading={isSubmitting}>
              Criar conta
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-brand hover:underline">
              Entrar
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
