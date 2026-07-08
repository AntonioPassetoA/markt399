"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

interface NavbarProps {
  userLabel: string;
  isAdmin: boolean;
}

export function Navbar({ userLabel, isAdmin }: NavbarProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
              PC
            </span>
            <span className="hidden text-sm font-semibold text-gray-900 sm:inline">
              Painel de Clientes
            </span>
          </Link>
          <div className="hidden items-center gap-1 text-sm sm:flex">
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-100"
            >
              Dashboard
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-100"
              >
                Admin
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden max-w-[160px] truncate text-xs text-gray-500 sm:inline">
            {userLabel}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLogout}
            loading={loading}
          >
            Sair
          </Button>
        </div>
      </nav>
    </header>
  );
}
