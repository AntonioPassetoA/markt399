import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import { Alert } from "@/components/ui/Alert";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const userLabel = session.profile?.name || session.email;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userLabel={userLabel} isAdmin={session.isAdmin} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {session.isAdmin ? (
          children
        ) : (
          <Alert type="error">
            Acesso negado. Área restrita para administradores.
          </Alert>
        )}
      </main>
    </div>
  );
}
