import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

// Lista de e-mails admins definida por variável de ambiente.
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export interface SessionInfo {
  userId: string;
  email: string;
  isAdmin: boolean;
  profile: Profile | null;
}

// Retorna informações do usuário logado (ou null se não houver sessão).
// isAdmin = role "admin" no perfil OU e-mail presente em ADMIN_EMAILS.
export async function getSession(): Promise<SessionInfo | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Busca o perfil com o cliente admin (evita problemas de RLS na leitura do próprio perfil).
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  const email = (user.email || "").toLowerCase();
  const isAdmin =
    profile?.role === "admin" || adminEmails().includes(email);

  return {
    userId: user.id,
    email: user.email || "",
    isAdmin,
    profile: profile ?? null,
  };
}
