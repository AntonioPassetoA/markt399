# Painel de Clientes

Plataforma web para cadastro de clientes/leads com autenticação, painel interno e
integração automática com o **Google Planilhas**.

Cada cliente cadastrado é salvo no **Supabase** e enviado automaticamente para uma
aba do Google Sheets. Usuários comuns veem apenas os próprios clientes; administradores
veem e gerenciam todos.

Além do cadastro interno, existe um **formulário público** (link fixo por conta) que o
próprio cliente preenche sem login — o registro cai automaticamente na conta que gerou o
link e na planilha. Veja a seção [Formulário público](#formulário-público).

> **Em produção:** https://painel.airesults.cloud

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Supabase** (autenticação + banco de dados PostgreSQL + RLS)
- **Google Sheets API** (Service Account)
- **Zod** + **React Hook Form** (validação de formulários)

---

## 1. Instalar dependências

```bash
npm install
```

---

## 2. Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **Project Settings → API**, copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (secreta — nunca exponha no front-end)
3. Em **Authentication → Providers → Email**, deixe o provedor de e-mail habilitado.
   (O cadastro é feito com o usuário já confirmado via service_role, então a confirmação
   de e-mail não bloqueia o fluxo. Se preferir, desative "Confirm email".)

### Criar as tabelas

Abra **SQL Editor** no Supabase e execute o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql).
Isso cria as tabelas `profiles` e `clients` com as políticas de RLS necessárias.

---

## 3. Configurar a Google Sheets API

### 3.1. Criar a Service Account

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie (ou selecione) um projeto.
3. Em **APIs e Serviços → Biblioteca**, habilite a **Google Sheets API**.
4. Em **APIs e Serviços → Credenciais → Criar credenciais → Conta de serviço**:
   - Dê um nome e clique em **Concluir**.
5. Abra a conta de serviço criada → aba **Chaves → Adicionar chave → Criar nova chave → JSON**.
   - Um arquivo `.json` será baixado. Dele você usará:
     - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
     - `private_key` → `GOOGLE_PRIVATE_KEY`

### 3.2. Criar a planilha e compartilhar

1. Crie uma planilha no Google Sheets.
2. Renomeie a aba para **Clientes** (ou o valor que usará em `GOOGLE_SHEET_TAB_NAME`).
3. (Opcional) Na primeira linha, adicione os cabeçalhos (colunas A–I):

   ```
   CLIENTE | AREA_DE_ATUACAO | SOBRE_O_NEGOCIO | IMPULSIONAMENTO | SERVICO | EMAIL | WHATSAPP | CNPJ | ENDERECO
   ```

   > Dica: rode `node scripts/rebuild-sheet.cjs` para criar/formatar a aba já com esse
   > cabeçalho (atenção: esse script **limpa** os dados). Para só adicionar uma coluna
   > sem perder dados, use um script de referência como `scripts/add-email-column.cjs`.

4. Clique em **Compartilhar** e adicione o **e-mail da Service Account**
   (`GOOGLE_SERVICE_ACCOUNT_EMAIL`) com permissão de **Editor**.
5. Copie o **ID da planilha** da URL:
   `https://docs.google.com/spreadsheets/d/`**`<ID>`**`/edit` → `GOOGLE_SHEET_ID`.

---

## 4. Criar o arquivo `.env.local`

Copie o exemplo e preencha os valores:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=
GOOGLE_SHEET_TAB_NAME=Clientes
ADMIN_EMAILS=seu-email-admin@email.com
```

> **Importante:** ao colar a `GOOGLE_PRIVATE_KEY`, mantenha as aspas e as quebras de
> linha como `\n`. O código já converte `\n` em quebras de linha reais.

---

## 5. Rodar o projeto localmente

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## 6. Criar um usuário admin

Há duas formas (basta uma):

- **Via variável de ambiente:** adicione o e-mail em `ADMIN_EMAILS`
  (separados por vírgula). Ao se cadastrar com esse e-mail, o usuário já vira admin.
- **Via banco:** no SQL Editor do Supabase, rode:

  ```sql
  update public.profiles set role = 'admin' where email = 'admin@email.com';
  ```

Faça login com esse usuário e acesse **/admin**.

---

## 7. Publicar o projeto (produção)

O projeto está publicado em uma **VPS Hostinger** (Ubuntu) com **PM2** (gerenciador de
processo) + **Nginx** (proxy reverso) + **Certbot/Let's Encrypt** (SSL) no subdomínio
**https://painel.airesults.cloud**.

Fluxo de atualização (a partir da máquina local):

1. `git push` para o GitHub.
2. Sincronizar o código para a VPS (o repositório é privado; usa-se `tar` over SSH).
3. Na VPS, **sempre build limpo**:

   ```bash
   cd /var/www/painel-de-clientes
   rm -rf .next && npm run build && pm2 restart painel-clientes
   ```

   > Deploy incremental (sem apagar `.next`) já causou "client-side exception" por
   > chunks inconsistentes — por isso o `rm -rf .next` é obrigatório.

O `.env.local` fica **apenas na VPS** (não vai para o Git). As rotas de API e a
integração com o Google Sheets rodam no servidor.

> Alternativa: a Vercel também funciona — importe o repositório e adicione todas as
> variáveis do `.env.local` em **Settings → Environment Variables** (para
> `GOOGLE_PRIVATE_KEY`, cole o valor com `\n`, entre aspas).

---

## Estrutura da planilha (colunas A–I)

| Coluna | Campo |
|--------|-------|
| A | CLIENTE |
| B | AREA_DE_ATUACAO |
| C | SOBRE_O_NEGOCIO (informações do negócio) |
| D | IMPULSIONAMENTO |
| E | SERVICO (fixo: "Gestão de Tráfego") |
| F | EMAIL |
| G | WHATSAPP |
| H | CNPJ |
| I | ENDERECO |

Cada novo cadastro gera uma nova linha. Se o envio ao Sheets falhar, o cliente ainda
é salvo no banco com `google_sheet_synced = false`. O status do cliente é controlado
no banco/painel (não fica mais na planilha). Quando o **admin exclui** um cliente, a
linha correspondente também é **removida da planilha**.

---

## Formulário público

Cada conta tem um **link fixo** (`/formulario/<token>`, onde o token é o id do perfil)
que pode ser enviado ao cliente final. Ele preenche os dados **sem login** e o registro
cai automaticamente na conta que gerou o link + na planilha.

- Campos preenchidos pelo cliente: **Cliente, Área de atuação, Conte mais sobre o seu
  negócio, Impulsionamento, E-mail, WhatsApp, CNPJ, Endereço** (todos obrigatórios).
- O **Serviço** ("Gestão de Tráfego") e o **Status** ("Novo") são definidos
  automaticamente no servidor.
- No dashboard há um cartão **"Compartilhar formulário"** para copiar/abrir o link.

Teste de ponta a ponta em produção:

```bash
BASE_URL=https://painel.airesults.cloud TEST_PROFILE_EMAIL=seu-email@conta.com \
  node scripts/test-public-form.cjs
```

---

## Fluxo de teste completo

1. Acesse `/` → **Criar conta**.
2. Faça login → **/dashboard**.
3. **Novo cadastro** → preencha e salve.
4. Veja o cliente no dashboard e na planilha do Google.
5. Copie o link em **"Compartilhar formulário"** e teste o cadastro público em
   `/formulario/<token>`.
6. Faça logout e entre com um usuário **admin**.
7. Acesse **/admin** → filtre, busque, altere status e exclua (a exclusão também
   remove a linha da planilha).

## Rotas / API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/register` | Cria usuário + perfil |
| POST | `/api/clients` | Cria cliente (banco + Sheets) |
| GET | `/api/clients` | Lista clientes (próprios ou todos, se admin) |
| PATCH | `/api/clients/[id]` | Edita cliente / status |
| DELETE | `/api/clients/[id]` | Exclui cliente + remove da planilha (somente admin) |
| POST | `/api/public/clients` | Recebe o formulário público (sem login) |
