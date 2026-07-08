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
// Colunas (A..F): CLIENTE, INFORMACOES, IMPULSIONAMENTO, SERVICO, WHATSAPP, CNPJ.
// Retorna o número da linha inserida (para atualizações futuras) ou null.
export async function appendClientToSheet(
  clientData: SheetClientData
): Promise<number | null> {
  const sheets = getSheetsClient();
  const { spreadsheetId, tabName } = getSheetConfig();

  const row = [
    clientData.cliente, // A
    clientData.informacoes, // B
    clientData.impulsionamento, // C
    clientData.servico, // D
    clientData.whatsapp, // E
    clientData.cnpj || "", // F
  ];

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A:F`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });

  // Extrai o número da linha a partir do range atualizado (ex: "Clientes!A5:F5").
  const updatedRange = response.data.updates?.updatedRange;
  if (updatedRange) {
    const match = updatedRange.match(/!A(\d+)/);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

// A planilha não tem mais coluna STATUS (apenas os 6 campos do cliente),
// então sincronizar status virou no-op. O status continua no banco e no painel.
export async function updateClientStatusInSheet(
  _rowNumber: number,
  _newStatus: string
): Promise<void> {
  return;
}

// Atualiza uma linha inteira da planilha (colunas A..F: os 6 campos do cliente).
export async function updateGoogleSheetRow(
  rowNumber: number,
  clientData: SheetClientData
): Promise<void> {
  const sheets = getSheetsClient();
  const { spreadsheetId, tabName } = getSheetConfig();

  const row = [
    clientData.cliente,
    clientData.informacoes,
    clientData.impulsionamento,
    clientData.servico,
    clientData.whatsapp,
    clientData.cnpj || "",
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A${rowNumber}:F${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}
