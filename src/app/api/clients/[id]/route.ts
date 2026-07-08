import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { clientUpdateSchema } from "@/lib/validations";
import { updateClientStatusInSheet } from "@/lib/googleSheets";
import type { Client } from "@/types";

// PATCH /api/clients/[id] — edita dados e/ou status do cliente.
// Permitido para o dono do registro ou para admin.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Você precisa estar logado para acessar essa página." },
      { status: 401 }
    );
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("clients")
    .select("*")
    .eq("id", id)
    .single<Client>();

  if (!existing) {
    return NextResponse.json(
      { error: "Cliente não encontrado." },
      { status: 404 }
    );
  }

  // Autorização: apenas o dono ou um admin pode editar.
  if (!session.isAdmin && existing.user_id !== session.userId) {
    return NextResponse.json(
      { error: "Acesso negado." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = clientUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };
  if ("cnpj" in updates && !updates.cnpj) updates.cnpj = null;

  const { data: updated, error } = await admin
    .from("clients")
    .update(updates)
    .eq("id", id)
    .select()
    .single<Client>();

  if (error || !updated) {
    return NextResponse.json(
      { error: "Não foi possível atualizar o cliente." },
      { status: 500 }
    );
  }

  // Sincroniza o status com o Google Sheets, se a linha for conhecida.
  let sheetSynced = true;
  const statusChanged =
    parsed.data.status && parsed.data.status !== existing.status;
  if (statusChanged && updated.google_sheet_row) {
    try {
      await updateClientStatusInSheet(
        updated.google_sheet_row,
        updated.status
      );
    } catch (err) {
      console.error("Falha ao atualizar status no Google Sheets:", err);
      sheetSynced = false;
    }
  }

  return NextResponse.json({ client: updated, sheetSynced });
}

// DELETE /api/clients/[id] — remove o registro (somente admin).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Você precisa estar logado para acessar essa página." },
      { status: 401 }
    );
  }

  if (!session.isAdmin) {
    return NextResponse.json(
      { error: "Acesso negado. Área restrita para administradores." },
      { status: 403 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.from("clients").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível excluir o cliente." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
