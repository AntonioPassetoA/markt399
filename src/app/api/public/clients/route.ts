import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { publicClientSchema } from "@/lib/validations";
import { appendClientToSheet } from "@/lib/googleSheets";
import { STATUS_DEFAULT, SERVICO_PADRAO } from "@/lib/constants";
import type { Client, Profile } from "@/types";

// POST /api/public/clients — recebe o formulário PÚBLICO (sem login).
// O "token" é o id do perfil da agência que gerou o link. Cada envio cria
// um cliente vinculado a essa agência e sincroniza com o Google Sheets.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const token = typeof body?.token === "string" ? body.token : "";
  if (!token) {
    return NextResponse.json({ error: "Formulário inválido." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Valida o token: precisa existir um perfil com esse id.
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", token)
    .single<Profile>();

  if (!profile) {
    return NextResponse.json(
      { error: "Este formulário não está mais disponível." },
      { status: 404 }
    );
  }

  const parsed = publicClientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Preencha todos os campos obrigatórios.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // 1) Salva no banco vinculado à agência dona do link (admin ignora RLS).
  const { data: inserted, error: insertError } = await admin
    .from("clients")
    .insert({
      user_id: profile.id,
      user_email: profile.email,
      cliente: data.cliente,
      area_de_atuacao: data.area_de_atuacao,
      informacoes: data.informacoes,
      impulsionamento: data.impulsionamento,
      servico: SERVICO_PADRAO,
      email: data.email,
      whatsapp: data.whatsapp,
      cnpj: data.cnpj || null,
      endereco: data.endereco,
      principais_informacoes_cliente: data.principais_informacoes_cliente || "",
      status: STATUS_DEFAULT,
      google_sheet_synced: false,
    })
    .select()
    .single<Client>();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: "Não foi possível enviar o formulário. Tente novamente." },
      { status: 500 }
    );
  }

  // 2) Sincroniza com o Google Sheets (se falhar, mantém o registro salvo).
  try {
    const rowNumber = await appendClientToSheet({
      cliente: data.cliente,
      area_de_atuacao: data.area_de_atuacao,
      informacoes: data.informacoes,
      impulsionamento: data.impulsionamento,
      servico: SERVICO_PADRAO,
      email: data.email,
      whatsapp: data.whatsapp,
      cnpj: data.cnpj || null,
      endereco: data.endereco,
    });

    await admin
      .from("clients")
      .update({ google_sheet_synced: true, google_sheet_row: rowNumber })
      .eq("id", inserted.id);
  } catch (err) {
    console.error("Falha ao sincronizar formulário público com Google Sheets:", err);
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
