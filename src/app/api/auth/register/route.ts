import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { signUpSchema } from "@/lib/validations";

// Cria o usuário no Supabase Auth (já confirmado) e o perfil correspondente.
// Usa service_role para que o fluxo funcione mesmo com confirmação de e-mail ativa.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = signUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Dados inválidos." },
      { status: 400 }
    );
  }

  const { name, email, whatsapp, password } = parsed.data;
  const admin = createAdminClient();

  // Define role admin automaticamente se o e-mail estiver em ADMIN_EMAILS.
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const role = adminEmails.includes(email.toLowerCase()) ? "admin" : "user";

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, whatsapp },
    });

  if (createError || !created.user) {
    const msg = createError?.message?.includes("already")
      ? "Este e-mail já está cadastrado."
      : "Não foi possível criar a conta.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    name,
    email,
    whatsapp,
    role,
  });

  if (profileError) {
    // Desfaz a criação do usuário para não deixar conta órfã.
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json(
      { error: "Não foi possível criar o perfil do usuário." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
