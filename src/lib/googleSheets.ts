import { google } from "googleapis";

// ===================================================================
// Integração com Google Sheets via Service Account.
// TODA a comunicação com o Google acontece no servidor.
// ===================================================================

export interface SheetClientData {
  cliente: string;
  informacoes: string;
  impulsionamento: string;
  servico: string;
  whatsapp: string;
  cnpj?: string | null;
  principais_informacoes_cliente: string;
  status: string;
  user_email: string;
  user_id: string;
  record_id: string;
}

// Formata uma data para o padrão brasileiro: DD/MM/YYYY HH:mm
export function formatDateToBrazilian(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Cria o cliente autenticado do Google Sheets.
// A GOOGLE_PRIVATE_KEY funciona mesmo quando as quebras de linha vêm como "\n".
function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !privateKey) {
    throw new Error(
      "Credenciais do Google Sheets ausentes (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY)."
    );
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

function getSheetConfig() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const tabName = process.env.GOOGLE_SHEET_TAB_NAME || "Clientes";
  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEET_ID não configurado.");
  }
  return { spreadsheetId, tabName };
}

// Adiciona uma nova linha na planilha com os dados do cliente.
// Colunas (A..L): DATA_HORA_ENVIO, CLIENTE, INFORMACOES, IMPULSIONAMENTO,
// SERVICO, WHATSAPP, CNPJ, PRINCIPAIS_INFORMACOES_CLIENTE, STATUS,
// EMAIL_USUARIO, ID_USUARIO, ID_REGISTRO.
// Retorna o número da linha inserida (para atualizações futuras) ou null.
export async function appendClientToSheet(
  clientData: SheetClientData
): Promise<number | null> {
  const sheets = getSheetsClient();
  const { spreadsheetId, tabName } = getSheetConfig();

  const row = [
    formatDateToBrazilian(new Date()), // A
    clientData.cliente, // B
    clientData.informacoes, // C
    clientData.impulsionamento, // D
    clientData.servico, // E
    clientData.whatsapp, // F
    clientData.cnpj || "", // G
    clientData.principais_informacoes_cliente, // H
    clientData.status, // I
    clientData.user_email, // J
    clientData.user_id, // K
    clientData.record_id, // L
  ];

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A:L`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });

  // Extrai o número da linha a partir do range atualizado (ex: "Clientes!A5:L5").
  const updatedRange = response.data.updates?.updatedRange;
  if (updatedRange) {
    const match = updatedRange.match(/!A(\d+)/);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

// Atualiza o STATUS (coluna I) de uma linha específica da planilha.
// Só funciona se o número da linha (google_sheet_row) tiver sido salvo.
export async function updateClientStatusInSheet(
  rowNumber: number,
  newStatus: string
): Promise<void> {
  const sheets = getSheetsClient();
  const { spreadsheetId, tabName } = getSheetConfig();

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!I${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[newStatus]] },
  });
}

// Atualiza uma linha inteira da planilha (colunas A..L), preservando a data original.
// Deixado preparado e documentado para edições completas feitas pelo admin.
export async function updateGoogleSheetRow(
  rowNumber: number,
  clientData: SheetClientData,
  originalDateHora?: string
): Promise<void> {
  const sheets = getSheetsClient();
  const { spreadsheetId, tabName } = getSheetConfig();

  const row = [
    originalDateHora || formatDateToBrazilian(new Date()), // A
    clientData.cliente,
    clientData.informacoes,
    clientData.impulsionamento,
    clientData.servico,
    clientData.whatsapp,
    clientData.cnpj || "",
    clientData.principais_informacoes_cliente,
    clientData.status,
    clientData.user_email,
    clientData.user_id,
    clientData.record_id,
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A${rowNumber}:L${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}
