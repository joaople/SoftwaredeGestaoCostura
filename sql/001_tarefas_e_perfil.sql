-- =====================================================================
-- Tarefas (operações + tempo médio por costureira) e Meu perfil
-- Rode no Supabase: SQL Editor > New query > colar > Run.
-- O script pode ser executado mais de uma vez sem duplicar nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) CONFERIR ANTES (rode só esta consulta primeiro)
--    O resultado precisa ser "uuid". Se vier outro tipo (ex.: bigint),
--    pare aqui e me avise: o campo costureira_id abaixo precisa casar.
--
--   select data_type
--   from information_schema.columns
--   where table_schema = 'public'
--     and table_name = 'costureiras'
--     and column_name = 'id';
-- ---------------------------------------------------------------------

-- 1) Papel de administrador (quem pode ver e editar as tarefas)
do $$
begin
  create type public.app_role as enum ('admin');
exception when duplicate_object then null;
end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

drop policy if exists "Read own roles" on public.user_roles;
create policy "Read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

revoke all on function public.has_role(uuid, public.app_role) from public;
revoke all on function public.has_role(uuid, public.app_role) from anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

-- 2) Tarefas (operações), ex.: "20 - FECHAR LATERAL"
create table if not exists public.operacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now()
);

-- 3) Tempo médio (minutos por peça) de cada costureira em cada tarefa
create table if not exists public.tempos_operacao (
  id uuid primary key default gen_random_uuid(),
  operacao_id uuid not null references public.operacoes(id) on delete cascade,
  costureira_id uuid not null references public.costureiras(id) on delete cascade,
  minutos_por_peca numeric not null default 1,
  updated_at timestamptz not null default now(),
  unique (operacao_id, costureira_id)
);

-- 4) Perfil do usuário (nome de exibição)
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome_exibicao text check (char_length(nome_exibicao) <= 80),
  updated_at timestamptz not null default now()
);

-- 5) Permissões e RLS: tarefas e tempos só para administrador
revoke all on public.operacoes from anon;
revoke all on public.tempos_operacao from anon;
revoke all on public.perfis from anon;

grant select, insert, update, delete on public.operacoes to authenticated;
grant select, insert, update, delete on public.tempos_operacao to authenticated;
grant select, insert, update on public.perfis to authenticated;
grant all on public.operacoes to service_role;
grant all on public.tempos_operacao to service_role;
grant all on public.perfis to service_role;

alter table public.operacoes enable row level security;
alter table public.tempos_operacao enable row level security;
alter table public.perfis enable row level security;

drop policy if exists "Somente administrador" on public.operacoes;
create policy "Somente administrador" on public.operacoes
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Somente administrador" on public.tempos_operacao;
create policy "Somente administrador" on public.tempos_operacao
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Perfil: cada pessoa vê e altera apenas o próprio
drop policy if exists "Perfil proprio - leitura" on public.perfis;
create policy "Perfil proprio - leitura" on public.perfis
  for select to authenticated using (auth.uid() = id);

drop policy if exists "Perfil proprio - criacao" on public.perfis;
create policy "Perfil proprio - criacao" on public.perfis
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "Perfil proprio - edicao" on public.perfis;
create policy "Perfil proprio - edicao" on public.perfis
  for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------------
-- 6) TORNAR A SUA CONTA ADMINISTRADORA (passo manual, feito uma vez)
--    Sem isso, a tela de Tarefas abre vazia e não deixa salvar.
--    Troque pelo e-mail com que você faz login, tire os "--" e rode.
--
--   insert into public.user_roles (user_id, role)
--   select id, 'admin' from auth.users where email = 'SEU_EMAIL_AQUI'
--   on conflict do nothing;
-- ---------------------------------------------------------------------

-- 7) CONFERIR DEPOIS (rode separado)
--
--   select tablename, policyname, roles, cmd
--   from pg_policies
--   where schemaname = 'public'
--     and tablename in ('operacoes','tempos_operacao','perfis','user_roles');
--
--   Seus dados antigos: veja quem pode acessá-los hoje.
--   select tablename, policyname, roles, qual
--   from pg_policies
--   where schemaname = 'public'
--     and tablename in ('costureiras','sessoes_producao','apontamentos_producao');
