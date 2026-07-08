// Reconstrói a planilha "Clientes" com o novo layout (sem PRINCIPAIS_INFORMACOES_CLIENTE).
// Colunas A..K: DATA_HORA_ENVIO, CLIENTE, INFORMACOES, IMPULSIONAMENTO, SERVICO,
// WHATSAPP, CNPJ, STATUS, EMAIL_USUARIO, ID_USUARIO, ID_REGISTRO.
// Uso: node scripts/rebuild-sheet.cjs
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const envRaw = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
for (const line of envRaw.split(/\r?\n/)) {
  if (!line || line.trim().startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq === -1) continue;
  const key = line.slice(0, eq).trim();
  let val = line.slice(eq + 1).trim();
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  process.env[key] = val;
}

const HEADERS = [
  "DATA_HORA_ENVIO", "CLIENTE", "INFORMACOES", "IMPULSIONAMENTO", "SERVICO",
  "WHATSAPP", "CNPJ", "STATUS", "EMAIL_USUARIO", "ID_USUARIO", "ID_REGISTRO",
];
const STATUS_COL = 7; // coluna H (0-based)
const WIDTHS = [140, 200, 230, 130, 130, 145, 150, 155, 220, 190, 190];

const rgb = (hex) => ({
  red: parseInt(hex.slice(1, 3), 16) / 255,
  green: parseInt(hex.slice(3, 5), 16) / 255,
  blue: parseInt(hex.slice(5, 7), 16) / 255,
});
const STATUS_STYLE = {
  "Novo": ["#DBEAFE", "#1E40AF"],
  "Em análise": ["#FEF9C3", "#854D0E"],
  "Em atendimento": ["#E0E7FF", "#3730A3"],
  "Contrato enviado": ["#F3E8FF", "#6B21A8"],
  "Cliente ativo": ["#DCFCE7", "#166534"],
  "Cliente pausado": ["#FFEDD5", "#9A3412"],
  "Cliente finalizado": ["#E5E7EB", "#1F2937"],
  "Perdido": ["#FEE2E2", "#991B1B"],
};

async function main() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const tabName = process.env.GOOGLE_SHEET_TAB_NAME || "Clientes";

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = meta.data.sheets.find((s) => s.properties.title === tabName);
  const sheetId = sheet.properties.sheetId;

  // 1) Cabeçalho novo (A1:K1) + limpa a coluna L (antigo ID_REGISTRO)
  await sheets.spreadsheets.values.update({
    spreadsheetId, range: `${tabName}!A1:K1`,
    valueInputOption: "USER_ENTERED", requestBody: { values: [HEADERS] },
  });
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${tabName}!L1:L` });
  console.log("✓ Cabeçalho atualizado para 11 colunas (A..K) e coluna L limpa.");

  const requests = [];
  requests.push({ updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: "gridProperties.frozenRowCount" } });
  requests.push({ repeatCell: {
    range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: HEADERS.length },
    cell: { userEnteredFormat: { backgroundColor: rgb("#1E3A8A"), horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE", textFormat: { foregroundColor: rgb("#FFFFFF"), bold: true, fontSize: 10 } } },
    fields: "userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,textFormat)",
  } });
  requests.push({ updateDimensionProperties: { range: { sheetId, dimension: "ROWS", startIndex: 0, endIndex: 1 }, properties: { pixelSize: 34 }, fields: "pixelSize" } });
  WIDTHS.forEach((w, i) => requests.push({ updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 }, properties: { pixelSize: w }, fields: "pixelSize" } }));

  // Remove regras condicionais antigas
  const existing = (sheet.conditionalFormats || []).length;
  for (let i = existing - 1; i >= 0; i--) requests.push({ deleteConditionalFormatRule: { sheetId, index: i } });
  // Cores por STATUS na coluna H
  Object.entries(STATUS_STYLE).forEach(([status, [bg, fg]]) => {
    requests.push({ addConditionalFormatRule: { index: 0, rule: {
      ranges: [{ sheetId, startRowIndex: 1, startColumnIndex: STATUS_COL, endColumnIndex: STATUS_COL + 1 }],
      booleanRule: { condition: { type: "TEXT_EQ", values: [{ userEnteredValue: status }] }, format: { backgroundColor: rgb(bg), textFormat: { foregroundColor: rgb(fg), bold: true } } },
    } } });
  });
  requests.push({ setBasicFilter: { filter: { range: { sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: HEADERS.length } } } });

  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
  console.log("✓ Formatação aplicada (cabeçalho azul, congelado, larguras, cores de STATUS na coluna H, filtro A:K).");
  console.log("\n🎨 Planilha reconstruída! Colunas:", HEADERS.join(" | "));
}

main().catch((e) => { console.error("ERRO:", e.message); process.exit(1); });
