// Script de teste/configuração da integração com Google Sheets.
// Uso: node scripts/test-sheets.cjs
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

// --- Carrega .env.local manualmente (sem dependências) ---
const envPath = path.join(__dirname, "..", ".env.local");
const envRaw = fs.readFileSync(envPath, "utf8");
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
  "DATA_HORA_ENVIO", "CLIENTE", "INFORMACOES", "IMPULSIONAMENTO",
  "SERVICO", "WHATSAPP", "CNPJ", "PRINCIPAIS_INFORMACOES_CLIENTE",
  "STATUS", "EMAIL_USUARIO", "ID_USUARIO", "ID_REGISTRO",
];

async function main() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const tabName = process.env.GOOGLE_SHEET_TAB_NAME || "Clientes";

  console.log("→ Service account:", email);
  console.log("→ Spreadsheet ID:", spreadsheetId);
  console.log("→ Aba alvo:", tabName);

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  // 1) Lê metadados (valida credenciais + compartilhamento)
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const tabs = meta.data.sheets.map((s) => s.properties.title);
  console.log("✓ Acesso à planilha OK. Abas existentes:", tabs.join(", "));

  // 2) Garante que a aba "Clientes" exista (renomeia a primeira se preciso)
  if (!tabs.includes(tabName)) {
    const firstSheet = meta.data.sheets[0].properties;
    console.log(`→ Aba "${tabName}" não existe. Renomeando "${firstSheet.title}" → "${tabName}".`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          updateSheetProperties: {
            properties: { sheetId: firstSheet.sheetId, title: tabName },
            fields: "title",
          },
        }],
      },
    });
    console.log("✓ Aba renomeada.");
  }

  // 3) Cabeçalho na linha 1 (se estiver vazio)
  const firstRow = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}!A1:L1`,
  });
  if (!firstRow.data.values || firstRow.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tabName}!A1:L1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [HEADERS] },
    });
    console.log("✓ Cabeçalho (A1:L1) criado.");
  } else {
    console.log("✓ Cabeçalho já existe:", firstRow.data.values[0].slice(0, 3).join(", "), "...");
  }

  // 4) Linha de teste
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const dataHora = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const testRow = [
    dataHora, "CLIENTE DE TESTE ✅", "Teste de integração", "Sim",
    "Tráfego Pago", "(11) 99999-9999", "", "Linha inserida pelo script de teste",
    "Novo", "teste@painel.com", "test-user-id", "test-record-id",
  ];
  const appendRes = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A:L`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [testRow] },
  });
  console.log("✓ Linha de teste inserida em:", appendRes.data.updates.updatedRange);
  console.log("\n🎉 TUDO FUNCIONANDO! Abra a planilha e confira a linha 'CLIENTE DE TESTE ✅'.");
}

main().catch((err) => {
  console.error("\n❌ ERRO:", err.message);
  if (String(err.message).includes("permission") || err.code === 403) {
    console.error("→ Provavelmente a planilha NÃO foi compartilhada com o e-mail da conta de serviço (Editor).");
  }
  if (err.code === 404) {
    console.error("→ GOOGLE_SHEET_ID errado, ou a planilha não existe.");
  }
  process.exit(1);
});
