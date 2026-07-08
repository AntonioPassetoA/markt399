# Painel de Clientes

Plataforma web para cadastro de clientes/leads com autenticação, painel interno e
integração automática com o **Google Planilhas**.

Cada cliente cadastrado é salvo no **Supabase** e enviado automaticamente para uma
aba do Google Sheets. Usuários comuns veem apenas os próprios clientes; administradores
veem e gerenciam todos.

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
3. (Opcional) Na primeira linha, adicione os cabeçalhos:

   ```
   DATA_HORA_ENVIO | CLIENTE | INFORMACOES | IMPULSIONAMENTO | SERVICO | WHATSAPP | CNPJ | PRINCIPAIS_INFORMACOES_CLIENTE | STATUS | EMAIL_USUARIO | ID_USUARIO | ID_REGISTRO
   ```

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

Recomendado: **Vercel**.

1. Suba o repositório para o GitHub.
2. Em [vercel.com](https://vercel.com), importe o projeto.
3. Em **Settings → Environment Variables**, adicione TODAS as variáveis do `.env.local`.
   - Para `GOOGLE_PRIVATE_KEY`, cole o valor com `\n` (com aspas) — funciona igual.
4. Faça o deploy. As rotas de API e a integração com o Google Sheets rodam no servidor.

---

## Estrutura da planilha (colunas A–L)

| Coluna | Campo |
|--------|-------|
| A | DATA_HORA_ENVIO (`DD/MM/YYYY HH:mm`) |
| B | CLIENTE |
| C | INFORMACOES |
| D | IMPULSIONAMENTO |
| E | SERVICO |
| F | WHATSAPP |
| G | CNPJ |
| H | PRINCIPAIS_INFORMACOES_CLIENTE |
| I | STATUS |
| J | EMAIL_USUARIO |
| K | ID_USUARIO |
| L | ID_REGISTRO |

Cada novo cadastro gera uma nova linha. Se o envio ao Sheets falhar, o cliente ainda
é salvo no banco com `google_sheet_synced = false`.

---

## Fluxo de teste completo

1. Acesse `/` → **Criar conta**.
2. Faça login → **/dashboard**.
3. **Novo cadastro** → preencha e salve.
4. Veja o cliente no dashboard e na planilha do Google.
5. Faça logout e entre com um usuário **admin**.
6. Acesse **/admin** → filtre, busque e altere status.

## Rotas / API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/register` | Cria usuário + perfil |
| POST | `/api/clients` | Cria cliente (banco + Sheets) |
| GET | `/api/clients` | Lista clientes (próprios ou todos, se admin) |
| PATCH | `/api/clients/[id]` | Edita cliente / status (sincroniza status no Sheets) |
| DELETE | `/api/clients/[id]` | Exclui cliente (somente admin) |
