import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";

export default async function DashboardLayout({
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
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
