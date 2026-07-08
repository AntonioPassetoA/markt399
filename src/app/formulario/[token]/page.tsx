import { createAdminClient } from "@/lib/supabase/server";
import { PublicClientForm } from "@/components/PublicClientForm";
import type { Profile } from "@/types";

export const dynamic = "force-dynamic";

// Página PÚBLICA (sem login). O [token] é o id do perfil da agência.
export default async function FormularioPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, name")
    .eq("id", token)
    .single<Pick<Profile, "id" | "name">>();

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-card">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-3xl">
            ⚠️
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            Formulário indisponível
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Este link não é válido ou expirou. Confira com quem enviou o
            formulário e tente novamente.
          </p>
        </div>
      </div>
    );
  }

  return <PublicClientForm token={profile.id} agencyName={profile.name} />;
}
