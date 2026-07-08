// Testa exclusão pelo admin removendo também da planilha (e reindexando linhas).
// Cria um admin descartável + 2 clientes, exclui 1 via API e confere a planilha/banco.
// Uso: BASE_URL=https://painel.airesults.cloud node scripts/test-delete-sheet.cjs
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const { createServerClient } = require("@supabase/ssr");
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
const stamp = Date.now();
const N1 = `DEL TESTE A ${stamp}`;
const N2 = `DEL TESTE B ${stamp}`;

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sheetsClient = () => {
  const auth = new google.auth.JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"), scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  return google.sheets({ version: "v4", auth });
};
const TAB = process.env.GOOGLE_SHEET_TAB_NAME || "Clientes";
const SID = process.env.GOOGLE_SHEET_ID;

async function readSheet() {
  const r = await sheetsClient().spreadsheets.values.get({ spreadsheetId: SID, range: `${TAB}!A:F` });
  return r.data.values || [];
}
async function createClientViaForm(token, nome) {
  const res = await fetch(`${BASE}/api/public/clients`, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, cliente: nome, informacoes: "teste delete", impulsionamento: "R$ 500", whatsapp: "(11) 90000-0000", cnpj: "11.222.333/0001-81" }) });
  if (!res.ok) throw new Error(`criar ${nome} falhou: ${res.status} ${await res.text()}`);
}

async function main() {
  console.log("=== TESTE: exclusão do admin remove da planilha ===\n");

  // 1) Admin descartável
  const email = `deladmin_${stamp}@teste-painel.com`;
  const password = "DelAdmin123!";
  const { data: created } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  const adminId = created.user.id;
  await admin.from("profiles").insert({ id: adminId, name: "Del Admin", email, role: "admin" });
  console.log("1) Admin descartável criado:", email);

  // 2) Cria 2 clientes via formulário público (token = id do admin)
  await createClientViaForm(adminId, N1);
  await createClientViaForm(adminId, N2);
  console.log("2) 2 clientes criados via formulário.");

  // 3) Estado inicial na planilha e no banco
  let rows = await readSheet();
  const idxA0 = rows.findIndex((r) => r[0] === N1);
  const idxB0 = rows.findIndex((r) => r[0] === N2);
  console.log(`3) Planilha: "${N1}" na linha ${idxA0 + 1}, "${N2}" na linha ${idxB0 + 1}`);
  const { data: cliA } = await admin.from("clients").select("id, google_sheet_row").eq("cliente", N1).single();
  const { data: cliB } = await admin.from("clients").select("id, google_sheet_row").eq("cliente", N2).single();
  console.log(`   Banco: A.row=${cliA.google_sheet_row}, B.row=${cliB.google_sheet_row}`);

  // 4) Login como admin (cookies SSR) e DELETE do cliente A
  const jar = {};
  const supa = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => Object.entries(jar).map(([name, value]) => ({ name, value })), setAll: (l) => l.forEach(({ name, value }) => (jar[name] = value)) } });
  const { error: le } = await supa.auth.signInWithPassword({ email, password });
  if (le) throw new Error("login admin: " + le.message);
  const cookie = Object.entries(jar).map(([n, v]) => `${n}=${v}`).join("; ");
  const del = await fetch(`${BASE}/api/clients/${cliA.id}`, { method: "DELETE", headers: { Cookie: cookie } });
  console.log(`4) DELETE cliente A: HTTP ${del.status} (${JSON.stringify(await del.json())})`);

  // 5) Verifica planilha e banco
  rows = await readSheet();
  const aStill = rows.some((r) => r[0] === N1);
  const idxB1 = rows.findIndex((r) => r[0] === N2);
  const { data: cliB2 } = await admin.from("clients").select("google_sheet_row").eq("id", cliB.id).single();
  console.log(`5) Planilha: A ainda existe? ${aStill ? "SIM ✗" : "NÃO ✓ (removido)"} | B agora na linha ${idxB1 + 1}`);
  console.log(`   Banco: B.google_sheet_row atualizado para ${cliB2.google_sheet_row} (esperado ${idxB1 + 1}) -> ${cliB2.google_sheet_row === idxB1 + 1 ? "OK ✓" : "DESALINHADO ✗"}`);

  const ok = !aStill && cliB2.google_sheet_row === idxB1 + 1;

  // 6) Limpeza
  console.log("6) Limpando...");
  if (cliB?.id) {
    const del2 = await fetch(`${BASE}/api/clients/${cliB.id}`, { method: "DELETE", headers: { Cookie: cookie } });
    if (!del2.ok) await admin.from("clients").delete().eq("id", cliB.id);
  }
  await admin.from("profiles").delete().eq("id", adminId);
  await admin.auth.admin.deleteUser(adminId);
  // remove qualquer linha residual de teste
  rows = await readSheet();
  const sid = (await sheetsClient().spreadsheets.get({ spreadsheetId: SID })).data.sheets.find((s) => s.properties.title === TAB).properties.sheetId;
  for (let i = rows.length - 1; i >= 0; i--) {
    if ((rows[i][0] || "").startsWith("DEL TESTE")) {
      await sheetsClient().spreadsheets.batchUpdate({ spreadsheetId: SID, requestBody: { requests: [{ deleteDimension: { range: { sheetId: sid, dimension: "ROWS", startIndex: i, endIndex: i + 1 } } }] } });
    }
  }
  console.log("   ✓ Limpo.");

  console.log(ok ? "\n🎉 EXCLUSÃO SINCRONIZADA! Cliente sai do banco E da planilha, e as linhas se reajustam." : "\n❌ Algo não bateu — revisar.");
  if (!ok) process.exit(1);
}
main().catch((e) => { console.error("\n❌ FALHOU:", e.message); process.exit(1); });
