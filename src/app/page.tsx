import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Cabeçalho simples */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
              PC
            </span>
            <span className="text-lg font-semibold text-gray-900">
              Painel de Clientes
            </span>
          </div>
          <Link href="/login">
            <Button variant="secondary" size="sm">
              Entrar
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
            Gestão de clientes e leads
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Painel de Clientes
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
            Cadastre, organize e envie informações de clientes automaticamente
            para o Google Planilhas.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/login" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">Entrar</Button>
            </Link>
            <Link href="/cadastro" className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full sm:w-auto">
                Criar conta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-400">
        Painel de Clientes &middot; MVP
      </footer>
    </main>
  );
}
