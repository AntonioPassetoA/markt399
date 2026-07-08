// Teste end-to-end REAL: register -> login (cookies SSR) -> criar cliente pelo
// endpoint /api/clients -> conferir na planilha -> limpar tudo.
// Uso: node scripts/e2e-test.cjs
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const { createServerClient } = require("@supabase/ssr");
const { createClient } = require("@supabase/supabase-js");

// --- carrega .env.local ---
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

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const stamp = Date.now();
const TEST_EMAIL = `e2e_${stamp}@teste-painel.com`;
const TEST_PASS = "SenhaTeste123!";
const CLIENTE_NOME = `CLIENTE E2E ${stamp}`;

async function main() {
  console.log("=== TESTE END-TO-END: cadastro real -> planilha ===\n");

  // 1) REGISTER pela rota real
  console.log("1) Cadastrando usuário de teste via /api/auth/register ...");
  const regRes = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Usuario E2E",
      email: TEST_EMAIL,
      whatsapp: "(11) 98888-7777",
      password: TEST_PASS,
      confirmPassword: TEST_PASS,
    }),
  });
  const regJson = await regRes.json().catch(() => ({}));
  if (!regRes.ok) throw new Error(`Register falhou (${regRes.status}): ${JSON.stringify(regJson)}`);
  console.log("   ✓ Usuário criado:", TEST_EMAIL);

  // 2) LOGIN gerando cookies SSR reais (mesma lib que o app usa)
  console.log("2) Fazendo login e capturando cookies de sessão ...");
  const jar = {};
  const supabase = createServerClient(SUPABASE_URL, ANON, {
    cookies: {
      getAll: () => Object.entries(jar).map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => { jar[name] = value; }),
    },
  });
  const { error: loginErr } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASS,
  });
  if (loginErr) throw new Error(`Login falhou: ${loginErr.message}`);
  const cookieHeader = Object.entries(jar).map(([n, v]) => `${n}=${v}`).join("; ");
  console.log("   ✓ Sessão obtida. Cookies:", Object.keys(jar).join(", "));

  // 3) CRIAR CLIENTE pelo endpoint real /api/clients
  console.log("3) Cadastrando cliente via /api/clients ...");
  const clientPayload = {
    cliente: CLIENTE_NOME,
    informacoes: "Cliente criado pelo teste automatizado E2E",
    impulsionamento: "Sim",
    servico: "Google Ads",
    whatsapp: "(11) 97777-6666",
    cnpj: "",
    principais_informacoes_cliente: "Verificação de integração ponta a ponta",
    status: "Novo",
  };
  const cliRes = await fetch(`${BASE}/api/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify(clientPayload),
  });
  const cliJson = await cliRes.json().catch(() => ({}));
  if (!cliRes.ok) throw new Error(`Criar cliente falhou (${cliRes.status}): ${JSON.stringify(cliJson)}`);
  console.log("   ✓ Resposta da API:", cliJson.message);
  console.log("   → sheetSynced:", cliJson.sheetSynced, "| id:", cliJson.client?.id);
  const recordId = cliJson.client?.id;

  // 4) CONFERIR na planilha
  console.log("4) Conferindo se a linha apareceu na planilha ...");
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const tabName = process.env.GOOGLE_SHEET_TAB_NAME || "Clientes";
  const read = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${tabName}!A:L`,
  });
  const rows = read.data.values || [];
  const foundIdx = rows.findIndex((r) => (r[1] || "") === CLIENTE_NOME);
  if (foundIdx === -1) throw new Error("Cliente NÃO encontrado na planilha!");
  const row = rows[foundIdx];
  console.log(`   ✓ Encontrado na linha ${foundIdx + 1}:`);
  console.log(`     DATA=${row[0]} | CLIENTE=${row[1]} | SERVICO=${row[4]} | STATUS=${row[8]} | EMAIL=${row[9]}`);
  console.log(`     ID_REGISTRO na planilha (L)=${row[11]} | ID do banco=${recordId} | batem? ${row[11] === recordId ? "SIM ✓" : "NÃO ✗"}`);

  // 5) LIMPEZA
  console.log("5) Limpando dados de teste ...");
  const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  // 5a) remove cliente do banco
  if (recordId) await admin.from("clients").delete().eq("id", recordId);
  // 5b) remove usuário de teste (pega o id pela lista de usuários)
  const { data: usersList } = await admin.auth.admin.listUsers();
  const testUser = usersList?.users?.find((u) => u.email === TEST_EMAIL);
  if (testUser) {
    await admin.from("profiles").delete().eq("id", testUser.id);
    await admin.auth.admin.deleteUser(testUser.id);
  }
  // 5c) remove a linha da planilha
  const metaSheet = await sheets.spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID });
  const sheetId = metaSheet.data.sheets.find((s) => s.properties.title === tabName).properties.sheetId;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: "ROWS", startIndex: foundIdx, endIndex: foundIdx + 1 },
        },
      }],
    },
  });
  console.log("   ✓ Usuário, cliente e linha da planilha removidos.");

  console.log("\n🎉 TESTE END-TO-END PASSOU! O fluxo completo (cadastro no sistema → Google Sheets) funciona.");
}

main().catch((err) => {
  console.error("\n❌ TESTE FALHOU:", err.message);
  process.exit(1);
});
