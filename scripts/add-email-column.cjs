// Insere a coluna EMAIL na planilha "Clientes" SEM apagar dados existentes.
// Nova ordem A..I: CLIENTE, AREA_DE_ATUACAO, SOBRE_O_NEGOCIO, IMPULSIONAMENTO,
// SERVICO, [EMAIL <- inserida], WHATSAPP, CNPJ, ENDERECO.
// A EMAIL entra na posição F (índice 5), empurrando WHATSAPP/CNPJ/ENDERECO.
// Uso: node scripts/add-email-column.cjs
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

  // Já existe EMAIL? (evita inserir duas vezes)
  const header = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tabName}!A1:I1` });
  const cur = (header.data.values && header.data.values[0]) || [];
  if (cur.includes("EMAIL")) {
    console.log("Coluna EMAIL já existe. Nada a fazer. Cabeçalho:", cur.join(" | "));
    return;
  }
  const dataRows = (await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tabName}!A2:A` })).data.values || [];
  console.log(`Linhas de dados preservadas: ${dataRows.length}`);

  // 1) Insere uma coluna na posição F (índice 5), herdando o formato da coluna E.
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        { insertDimension: { range: { sheetId, dimension: "COLUMNS", startIndex: 5, endIndex: 6 }, inheritFromBefore: true } },
        { updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: 5, endIndex: 6 }, properties: { pixelSize: 220 }, fields: "pixelSize" } },
        { repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 5, endColumnIndex: 6 },
          cell: { userEnteredFormat: { backgroundColor: rgb("#1E3A8A"), horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE", textFormat: { foregroundColor: rgb("#FFFFFF"), bold: true, fontSize: 10 } } },
          fields: "userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,textFormat)",
        } },
        { setBasicFilter: { filter: { range: { sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: 9 } } } },
      ],
    },
  });

  // 2) Escreve o cabeçalho EMAIL em F1.
  await sheets.spreadsheets.values.update({
    spreadsheetId, range: `${tabName}!F1`,
    valueInputOption: "USER_ENTERED", requestBody: { values: [["EMAIL"]] },
  });

  const after = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tabName}!A1:I1` });
  console.log("✓ Coluna EMAIL inserida. Cabeçalho agora:", (after.data.values[0] || []).join(" | "));
}

main().catch((e) => { console.error("ERRO:", e.message); process.exit(1); });
