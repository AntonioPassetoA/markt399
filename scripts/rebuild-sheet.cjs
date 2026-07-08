// Reconstrói a planilha "Clientes" com os 8 campos do cliente.
// Colunas A..H: CLIENTE, AREA_DE_ATUACAO, SOBRE_O_NEGOCIO, IMPULSIONAMENTO,
// SERVICO, WHATSAPP, CNPJ, ENDERECO.
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
  "CLIENTE", "AREA_DE_ATUACAO", "SOBRE_O_NEGOCIO", "IMPULSIONAMENTO",
  "SERVICO", "WHATSAPP", "CNPJ", "ENDERECO",
];
const WIDTHS = [200, 170, 280, 150, 150, 150, 160, 240];

const rgb = (hex) => ({
  red: parseInt(hex.slice(1, 3), 16) / 255,
  green: parseInt(hex.slice(3, 5), 16) / 255,
  blue: parseInt(hex.slice(5, 7), 16) / 255,
});

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

  // Relata quantas linhas de dados existem antes (a reordenação exige limpar).
  const before = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tabName}!A2:L` });
  const dataRows = (before.data.values || []).filter((r) => r.some((c) => (c || "").trim() !== ""));
  console.log(`Linhas de dados encontradas antes: ${dataRows.length}`);

  // 1) Limpa TUDO (dados e colunas antigas) e escreve o novo cabeçalho
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${tabName}!A1:L` });
  await sheets.spreadsheets.values.update({
    spreadsheetId, range: `${tabName}!A1:H1`,
    valueInputOption: "USER_ENTERED", requestBody: { values: [HEADERS] },
  });
  console.log("✓ Planilha limpa e cabeçalho (8 colunas A..H) definido.");

  const requests = [];
  requests.push({ updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: "gridProperties.frozenRowCount" } });
  requests.push({ repeatCell: {
    range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: HEADERS.length },
    cell: { userEnteredFormat: { backgroundColor: rgb("#1E3A8A"), horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE", textFormat: { foregroundColor: rgb("#FFFFFF"), bold: true, fontSize: 10 } } },
    fields: "userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,textFormat)",
  } });
  requests.push({ updateDimensionProperties: { range: { sheetId, dimension: "ROWS", startIndex: 0, endIndex: 1 }, properties: { pixelSize: 34 }, fields: "pixelSize" } });
  WIDTHS.forEach((w, i) => requests.push({ updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 }, properties: { pixelSize: w }, fields: "pixelSize" } }));
  const existing = (sheet.conditionalFormats || []).length;
  for (let i = existing - 1; i >= 0; i--) requests.push({ deleteConditionalFormatRule: { sheetId, index: i } });
  requests.push({ setBasicFilter: { filter: { range: { sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: HEADERS.length } } } });

  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
  console.log("✓ Formatação aplicada (cabeçalho azul, congelado, larguras, filtro A:H).");
  console.log("\n🎨 Planilha reconstruída! Colunas:", HEADERS.join(" | "));
}

main().catch((e) => { console.error("ERRO:", e.message); process.exit(1); });
