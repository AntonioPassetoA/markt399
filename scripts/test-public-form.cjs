// Testa o formulário PÚBLICO em produção: pega o id da conta admin (token do link),
// abre a página, envia um cadastro e confere na planilha. Depois limpa.
// Uso: BASE_URL=https://painel.airesults.cloud node scripts/test-public-form.cjs
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const { createClient } = require("@supabase/supabase-js");

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

const BASE = process.env.BASE_URL || "http://localhost:3000";
const ADMIN_EMAIL = process.env.TEST_PROFILE_EMAIL || "odontoresults.conteudos@gmail.com";
const stamp = Date.now();
const CLIENTE_NOME = `FORM PUBLICO ${stamp}`;

async function main() {
  console.log("=== TESTE DO FORMULÁRIO PÚBLICO (produção) ===\n");
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  // 1) Descobre o token (id do perfil da conta admin)
  const { data: profile } = await admin
    .from("profiles").select("id, name, email").eq("email", ADMIN_EMAIL).single();
  if (!profile) throw new Error(`Perfil ${ADMIN_EMAIL} não encontrado. Faça login/cadastro nele primeiro.`);
  const token = profile.id;
  console.log(`1) Token (id do perfil de ${profile.name || ADMIN_EMAIL}): ${token}`);
  console.log(`   Link do formulário: ${BASE}/formulario/${token}`);

  // 2) A página pública abre?
  const pageRes = await fetch(`${BASE}/formulario/${token}`);
  const pageHtml = await pageRes.text();
  console.log(`2) GET página do formulário: HTTP ${pageRes.status} | contém "Formulário de cadastro"? ${pageHtml.includes("Formulário de cadastro") ? "SIM ✓" : "NÃO ✗"}`);

  // 3) Link inválido mostra "indisponível"?
  const badRes = await fetch(`${BASE}/formulario/00000000-0000-0000-0000-000000000000`);
  const badHtml = await badRes.text();
  console.log(`3) Link inválido mostra "indisponível"? ${badHtml.includes("indispon") ? "SIM ✓" : "NÃO ✗"}`);

  // 4) Envia o formulário
  const payload = {
    token,
    cliente: CLIENTE_NOME,
    informacoes: "Enviado pelo formulário público (teste)",
    impulsionamento: "R$ 1.000 por mês",
    whatsapp: "(11) 96666-5555",
    cnpj: "",
    principais_informacoes_cliente: "Cliente preencheu sozinho via link",
  };
  const res = await fetch(`${BASE}/api/public/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Envio falhou (${res.status}): ${JSON.stringify(json)}`);
  console.log(`4) Envio do formulário: HTTP ${res.status} | success=${json.success} ✓`);

  // 5) Apareceu na planilha e vinculado à conta admin?
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const tabName = process.env.GOOGLE_SHEET_TAB_NAME || "Clientes";
  const read = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: `${tabName}!A:L` });
  const rows = read.data.values || [];
  const idx = rows.findIndex((r) => (r[1] || "") === CLIENTE_NOME);
  if (idx === -1) throw new Error("Não encontrado na planilha!");
  const row = rows[idx];
  console.log(`5) Na planilha (linha ${idx + 1}): SERVICO=${row[4]} | STATUS=${row[8]} | EMAIL_USUARIO=${row[9]}`);
  console.log(`   → Serviço gravado como "Gestão de Tráfego"? ${row[4] === "Gestão de Tráfego" ? "SIM ✓" : "NÃO ✗ (" + row[4] + ")"} | vinculado à conta? ${row[9] === ADMIN_EMAIL ? "SIM ✓" : "NÃO ✗"}`);

  // 6) Confere no banco e limpa
  const { data: dbClient } = await admin.from("clients").select("id, user_id, status").eq("cliente", CLIENTE_NOME).single();
  console.log(`6) No banco: user_id == token? ${dbClient?.user_id === token ? "SIM ✓" : "NÃO ✗"} | status=${dbClient?.status}`);

  console.log("7) Limpando o cadastro de teste ...");
  if (dbClient?.id) await admin.from("clients").delete().eq("id", dbClient.id);
  const metaSheet = await sheets.spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID });
  const sheetId = metaSheet.data.sheets.find((s) => s.properties.title === tabName).properties.sheetId;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    requestBody: { requests: [{ deleteDimension: { range: { sheetId, dimension: "ROWS", startIndex: idx, endIndex: idx + 1 } } }] },
  });
  console.log("   ✓ Removido do banco e da planilha.");

  console.log("\n🎉 FORMULÁRIO PÚBLICO FUNCIONANDO! O cliente preenche pelo link e cai na sua conta + planilha.");
}

main().catch((err) => { console.error("\n❌ FALHOU:", err.message); process.exit(1); });
