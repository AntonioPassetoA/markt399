// Lê os cabeçalhos atuais da planilha (e uma linha de exemplo).
// Uso: node scripts/read-sheet-headers.cjs
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

function colName(i) {
  let s = "";
  i++;
  while (i > 0) {
    i--;
    s = String.fromCharCode(65 + (i % 26)) + s;
    i = Math.floor(i / 26);
  }
  return s;
}

async function main() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const tab = process.env.GOOGLE_SHEET_TAB_NAME || "Clientes";
  const r = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${tab}!1:2`,
  });
  const rows = r.data.values || [];
  const headers = rows[0] || [];
  console.log("Total de colunas:", headers.length, "\n");
  headers.forEach((h, i) => console.log(`  ${colName(i)} -> ${h}`));
  console.log("\nExemplo (linha 2):");
  (rows[1] || []).forEach((v, i) =>
    console.log(`  ${colName(i)} (${headers[i] || "?"}) = ${v}`)
  );
}

main().catch((e) => console.error("ERRO:", e.message));
