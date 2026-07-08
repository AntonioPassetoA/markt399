-- ===================================================================
-- Painel de Clientes — Esquema do banco de dados (Supabase / PostgreSQL)
-- Execute este script no Supabase Dashboard > SQL Editor.
-- ===================================================================

-- Extensão para gerar UUIDs
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------
-- Tabela: profiles
-- ------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  email text,
  whatsapp text,
  role text not null default 'user',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- Tabela: clients
-- ------------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  user_id uuid not null references auth.users (id) on delete cascade,
  user_email text not null,
  cliente text not null,
  informacoes text not null,
  impulsionamento text not null,
  servico text not null,
  whatsapp text not null,
  cnpj text,
  principais_informacoes_cliente text not null,
  status text not null default 'Novo',
  google_sheet_synced boolean not null default false,
  google_sheet_row integer
);

create index if not exists clients_user_id_idx on public.clients (user_id);
create index if not exists clients_status_idx on public.clients (status);

-- ------------------------------------------------------------------
-- Row Level Security (RLS)
-- ------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.clients enable row level security;

-- Profiles: cada usuário lê/edita apenas o próprio perfil.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Clients: usuário comum acessa apenas os próprios registros.
-- (O acesso de admin a todos os registros é feito no servidor via service_role.)
drop policy if exists "clients_select_own" on public.clients;
create policy "clients_select_own" on public.clients
  for select using (auth.uid() = user_id);

drop policy if exists "clients_insert_own" on public.clients;
create policy "clients_insert_own" on public.clients
  for insert with check (auth.uid() = user_id);

drop policy if exists "clients_update_own" on public.clients;
create policy "clients_update_own" on public.clients
  for update using (auth.uid() = user_id);

drop policy if exists "clients_delete_own" on public.clients;
create policy "clients_delete_own" on public.clients
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------------
-- Como tornar um usuário admin manualmente (opcional):
--   update public.profiles set role = 'admin' where email = 'admin@email.com';
-- Ou adicione o e-mail à variável de ambiente ADMIN_EMAILS.
-- ------------------------------------------------------------------
