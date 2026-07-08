// Personaliza visualmente a planilha "Clientes".
// Uso: node scripts/customize-sheets.cjs
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

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

// Converte #RRGGBB -> {red,green,blue} (0..1)
const rgb = (hex) => ({
  red: parseInt(hex.slice(1, 3), 16) / 255,
  green: parseInt(hex.slice(3, 5), 16) / 255,
  blue: parseInt(hex.slice(5, 7), 16) / 255,
});

// Status -> [cor de fundo, cor do texto]
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

// Larguras das colunas A..L (px)
const WIDTHS = [140, 200, 230, 130, 130, 145, 150, 270, 155, 220, 190, 190];

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
  console.log(`→ Personalizando aba "${tabName}" (sheetId ${sheetId})`);

  const requests = [];

  // 1) Congela a linha do cabeçalho
  requests.push({
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
      fields: "gridProperties.frozenRowCount",
    },
  });

  // 2) Formata o cabeçalho (A1:L1): azul da marca, texto branco, negrito, centralizado
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 12 },
      cell: {
        userEnteredFormat: {
          backgroundColor: rgb("#1E3A8A"),
          horizontalAlignment: "CENTER",
          verticalAlignment: "MIDDLE",
          textFormat: { foregroundColor: rgb("#FFFFFF"), bold: true, fontSize: 10 },
        },
      },
      fields: "userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,textFormat)",
    },
  });

  // 3) Altura do cabeçalho
  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: "ROWS", startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 34 },
      fields: "pixelSize",
    },
  });

  // 4) Larguras das colunas
  WIDTHS.forEach((w, i) => {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: w },
        fields: "pixelSize",
      },
    });
  });

  // 5) Remove regras de formatação condicional antigas (se rodar 2x) — ignora erro
  const existingRules = (sheet.conditionalFormats || []).length;
  for (let i = existingRules - 1; i >= 0; i--) {
    requests.push({ deleteConditionalFormatRule: { sheetId, index: i } });
  }

  // 6) Cores automáticas por STATUS (coluna I = índice 8), da linha 2 pra baixo
  Object.entries(STATUS_STYLE).forEach(([status, [bg, fg]]) => {
    requests.push({
      addConditionalFormatRule: {
        index: 0,
        rule: {
          ranges: [{ sheetId, startRowIndex: 1, startColumnIndex: 8, endColumnIndex: 9 }],
          booleanRule: {
            condition: { type: "TEXT_EQ", values: [{ userEnteredValue: status }] },
            format: { backgroundColor: rgb(bg), textFormat: { foregroundColor: rgb(fg), bold: true } },
          },
        },
      },
    });
  });

  // 7) Filtro automático no topo
  requests.push({
    setBasicFilter: {
      filter: { range: { sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: 12 } },
    },
  });

  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
  console.log("✓ Visual aplicado (cabeçalho, congelamento, larguras, cores por status, filtro).");

  // 8) Remove a linha de teste, se ainda existir (procura "CLIENTE DE TESTE")
  const data = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tabName}!A:L` });
  const rows = data.data.values || [];
  const testIdx = rows.findIndex((r) => (r[1] || "").includes("CLIENTE DE TESTE"));
  if (testIdx > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: { sheetId, dimension: "ROWS", startIndex: testIdx, endIndex: testIdx + 1 },
          },
        }],
      },
    });
    console.log(`✓ Linha de teste removida (linha ${testIdx + 1}).`);
  }

  console.log("\n🎨 Planilha personalizada com sucesso! Recarregue a página do Google Sheets pra ver.");
}

main().catch((err) => {
  console.error("\n❌ ERRO:", err.message);
  process.exit(1);
});
