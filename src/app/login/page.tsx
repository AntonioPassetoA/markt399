"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "@/lib/validations";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginFormData) {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setServerError("E-mail ou senha incorretos. Tente novamente.");
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  return (
    <Card>
      <h1 className="text-xl font-semibold text-gray-900">Entrar</h1>
      <p className="mt-1 text-sm text-gray-500">
        Acesse seu painel de clientes.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        {serverError && <Alert type="error">{serverError}</Alert>}

        <Input
          id="email"
          type="email"
          label="E-mail"
          placeholder="voce@email.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          id="password"
          type="password"
          label="Senha"
          placeholder="Sua senha"
          error={errors.password?.message}
          {...register("password")}
        />

        <Button type="submit" className="w-full" loading={isSubmitting}>
          Entrar
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-500">
        Não tem conta?{" "}
        <Link href="/cadastro" className="font-medium text-brand hover:underline">
          Criar conta
        </Link>
      </p>
    </Card>
  );
}

export default function LoginPage() {
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
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
