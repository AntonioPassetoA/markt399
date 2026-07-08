// Faz login e busca uma página autenticada, mostrando status e se renderizou.
// Uso: BASE_URL=... TEST_PROFILE_EMAIL=... PAGE=/dashboard/novo-cliente node scripts/diag-page.cjs
const fs = require("fs");
const path = require("path");
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
const EMAIL = process.env.TEST_PROFILE_EMAIL;
const PAGE = process.env.PAGE || "/dashboard/novo-cliente";

async function main() {
  // Descobre/garante um usuário de teste com senha conhecida
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const stamp = Date.now();
  const email = EMAIL || `diag_${stamp}@teste-painel.com`;
  const password = "SenhaDiag123!";
  let createdId = null;
  if (!EMAIL) {
    const { data } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    createdId = data?.user?.id;
    await admin.from("profiles").insert({ id: createdId, name: "Diag", email, role: "user" });
  } else {
    // redefine a senha do usuário informado para conseguir logar
    const { data: list } = await admin.auth.admin.listUsers();
    const u = list.users.find((x) => x.email === EMAIL);
    if (u) await admin.auth.admin.updateUserById(u.id, { password });
  }

  const jar = {};
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => Object.entries(jar).map(([name, value]) => ({ name, value })), setAll: (l) => l.forEach(({ name, value }) => (jar[name] = value)) },
  });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error("login: " + error.message);
  const cookie = Object.entries(jar).map(([n, v]) => `${n}=${v}`).join("; ");

  const res = await fetch(`${BASE}${PAGE}`, { headers: { Cookie: cookie }, redirect: "manual" });
  const html = await res.text();
  console.log(`GET ${PAGE} -> HTTP ${res.status}`);
  console.log(`  Renderizou "Novo cliente"? ${html.includes("Novo cliente") ? "SIM ✓" : "NÃO"}`);
  console.log(`  Contém erro Next? ${/application error|__next_error__|Internal Server Error/i.test(html) ? "SIM ✗" : "não"}`);
  console.log(`  Tamanho do HTML: ${html.length} bytes`);

  if (createdId) {
    await admin.from("clients").delete().eq("user_id", createdId);
    await admin.from("profiles").delete().eq("id", createdId);
    await admin.auth.admin.deleteUser(createdId);
  }
}
main().catch((e) => { console.error("ERRO:", e.message); process.exit(1); });
