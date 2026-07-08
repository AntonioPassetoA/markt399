import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { clientSchema } from "@/lib/validations";
import { appendClientToSheet } from "@/lib/googleSheets";
import type { Client } from "@/types";

// POST /api/clients — cria um cliente, salva no banco e envia ao Google Sheets.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Você precisa estar logado para acessar essa página." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = clientSchema.safeParse(body);
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
  const supabase = await createClient();

  // 1) Salva no Supabase (RLS garante user_id = usuário logado).
  const { data: inserted, error: insertError } = await supabase
    .from("clients")
    .insert({
      user_id: session.userId,
      user_email: session.email,
      cliente: data.cliente,
      informacoes: data.informacoes,
      impulsionamento: data.impulsionamento,
      servico: data.servico,
      whatsapp: data.whatsapp,
      cnpj: data.cnpj || null,
      principais_informacoes_cliente: data.principais_informacoes_cliente || "",
      status: data.status,
      google_sheet_synced: false,
    })
    .select()
    .single<Client>();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: "Não foi possível cadastrar o cliente." },
      { status: 500 }
    );
  }

  // 2) Envia para o Google Sheets. Se falhar, mantém o registro com synced=false.
  let sheetSynced = false;
  try {
    const rowNumber = await appendClientToSheet({
      cliente: data.cliente,
      informacoes: data.informacoes,
      impulsionamento: data.impulsionamento,
      servico: data.servico,
      whatsapp: data.whatsapp,
      cnpj: data.cnpj || null,
    });

    sheetSynced = true;

    // Atualiza o registro com o status de sincronização (usa admin p/ garantir escrita).
    const admin = createAdminClient();
    await admin
      .from("clients")
      .update({ google_sheet_synced: true, google_sheet_row: rowNumber })
      .eq("id", inserted.id);
  } catch (err) {
    console.error("Falha ao sincronizar com Google Sheets:", err);
    sheetSynced = false;
  }

  return NextResponse.json(
    {
      client: inserted,
      sheetSynced,
      message: sheetSynced
        ? "Cliente cadastrado com sucesso."
        : "Cliente cadastrado, mas houve falha ao sincronizar com Google Planilhas.",
    },
    { status: 201 }
  );
}

// GET /api/clients — lista clientes (próprios para usuário comum, todos para admin).
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Você precisa estar logado para acessar essa página." },
      { status: 401 }
    );
  }

  if (session.isAdmin) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      return NextResponse.json(
        { error: "Erro ao carregar clientes." },
        { status: 500 }
      );
    }
    return NextResponse.json({ clients: data ?? [] });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Erro ao carregar clientes." },
      { status: 500 }
    );
  }

  return NextResponse.json({ clients: data ?? [] });
}
