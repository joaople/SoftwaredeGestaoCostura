-- =====================================================================
-- PASSO 3: papéis (leitor, editor, administrador) com vários administradores
-- Pode ser executado de novo sem problema.
-- =====================================================================

-- 0) Limpeza: remove todas as regras antigas e a tabela de acessos do passo anterior
do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies
           where schemaname = 'public'
             and tablename in ('costureiras','sessoes_producao','apontamentos_producao',
                               'operacoes','tempos_operacao','acessos_leitura') loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

drop table if exists public.acessos_leitura;

-- 1) O espaço da fábrica e quem participa dele (cada pessoa tem um papel)
create table if not exists public.espacos (
  id uuid primary key,
  nome text not null default 'Fábrica',
  created_at timestamptz not null default now()
);

create table if not exists public.membros (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  espaco_id uuid not null references public.espacos(id) on delete cascade,
  papel text not null check (papel in ('leitor', 'editor', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.espacos enable row level security;
alter table public.membros enable row level security;

-- 2) Funções: "em qual espaço eu estou?" e "qual é o meu papel?"
create or replace function public.meu_espaco() returns uuid
language sql stable security definer set search_path = public as
$$ select espaco_id from public.membros where usuario_id = auth.uid() $$;

create or replace function public.meu_papel() returns text
language sql stable security definer set search_path = public as
$$ select papel from public.membros where usuario_id = auth.uid() $$;

revoke all on function public.meu_espaco() from public, anon;
revoke all on function public.meu_papel() from public, anon;
grant execute on function public.meu_espaco() to authenticated;
grant execute on function public.meu_papel() to authenticated;

-- 3) Sua conta vira a primeira administradora e dona do espaço dos dados atuais
do $$
declare
  dono uuid;
  qtd int;
  t text;
  tabelas text[] := array['costureiras','sessoes_producao','apontamentos_producao','operacoes','tempos_operacao'];
begin
  if not exists (select 1 from public.membros where papel = 'admin') then
    select count(distinct user_id) into qtd from public.costureiras;
    if qtd = 1 then
      select user_id into dono from public.costureiras limit 1;
    elsif qtd = 0 and (select count(*) from auth.users) = 1 then
      select id into dono from auth.users;
    else
      raise exception 'Não consegui descobrir quem é o dono dos dados atuais (donos encontrados: %).', qtd;
    end if;

    insert into public.espacos (id) values (dono) on conflict do nothing;
    insert into public.membros (usuario_id, espaco_id, papel) values (dono, dono, 'admin')
      on conflict (usuario_id) do update set papel = 'admin';

    -- quem já tinha conta entra como leitor (só na primeira execução, para não
    -- devolver acesso a quem um administrador tiver bloqueado depois)
    insert into public.membros (usuario_id, espaco_id, papel)
    select u.id, dono, 'leitor' from auth.users u
    where not exists (select 1 from public.membros m where m.usuario_id = u.id);
  end if;

  -- 4) As tabelas passam a pertencer ao "espaço" (antes pertenciam a uma conta)
  foreach t in array tabelas loop
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = t and column_name = 'user_id') then
      execute format('alter table public.%I rename column user_id to espaco_id', t);
    end if;
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_user_id_fkey');
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_espaco_id_fkey');
    execute format('alter table public.%I add constraint %I foreign key (espaco_id) references public.espacos(id)',
                   t, t || '_espaco_id_fkey');
    -- quem cadastra algo grava automaticamente no espaço da fábrica
    execute format('alter table public.%I alter column espaco_id set default public.meu_espaco()', t);
    execute format('alter table public.%I enable row level security', t);

    -- todos os membros veem; só editor e administrador alteram
    execute format($f$create policy "ver espaco" on public.%I
      for select to authenticated
      using (espaco_id = (select public.meu_espaco()))$f$, t);
    execute format($f$create policy "editar espaco" on public.%I
      for all to authenticated
      using (espaco_id = (select public.meu_espaco())
             and (select public.meu_papel()) in ('editor', 'admin'))
      with check (espaco_id = (select public.meu_espaco())
             and (select public.meu_papel()) in ('editor', 'admin'))$f$, t);
  end loop;
end $$;

-- 5) Quem pode ler as tabelas de espaço e de membros (ninguém escreve direto: só pelas funções abaixo)
drop policy if exists "ver membros" on public.membros;
create policy "ver membros" on public.membros
  for select to authenticated
  using (usuario_id = auth.uid()
         or (espaco_id = (select public.meu_espaco()) and (select public.meu_papel()) = 'admin'));

drop policy if exists "ver espaco proprio" on public.espacos;
create policy "ver espaco proprio" on public.espacos
  for select to authenticated
  using (id = (select public.meu_espaco()));

revoke all on public.espacos, public.membros from anon;
revoke insert, update, delete, truncate on public.espacos, public.membros from authenticated;
grant select on public.espacos, public.membros to authenticated;

-- 6) Tela "Usuários" (só administrador): lista todas as contas e muda papéis
create or replace function public.listar_contas()
returns table (id uuid, email text, criado_em timestamptz, papel text)
language plpgsql stable security definer set search_path = public as $$
begin
  if public.meu_papel() is distinct from 'admin' then
    raise exception 'Apenas administradores podem ver as contas.';
  end if;
  return query
    select u.id, u.email::text, u.created_at, m.papel
    from auth.users u
    left join public.membros m
           on m.usuario_id = u.id and m.espaco_id = public.meu_espaco()
    order by u.created_at;
end $$;

create or replace function public.definir_papel(alvo uuid, novo text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  espaco uuid := public.meu_espaco();
begin
  if public.meu_papel() is distinct from 'admin' then
    raise exception 'Apenas administradores podem alterar acessos.';
  end if;
  if novo is null or novo not in ('nenhum', 'leitor', 'editor', 'admin') then
    raise exception 'Papel inválido.';
  end if;
  if not exists (select 1 from auth.users where id = alvo) then
    raise exception 'Conta não encontrada.';
  end if;

  -- nunca deixar a fábrica sem administrador
  if novo <> 'admin'
     and exists (select 1 from public.membros
                 where usuario_id = alvo and espaco_id = espaco and papel = 'admin')
     and (select count(*) from public.membros
          where espaco_id = espaco and papel = 'admin') <= 1 then
    raise exception 'A fábrica precisa ter pelo menos um administrador.';
  end if;

  if novo = 'nenhum' then
    delete from public.membros where usuario_id = alvo and espaco_id = espaco;
  else
    insert into public.membros (usuario_id, espaco_id, papel)
    values (alvo, espaco, novo)
    on conflict (usuario_id) do update set papel = excluded.papel
      where public.membros.espaco_id = espaco;
  end if;
end $$;

revoke all on function public.listar_contas() from public, anon;
revoke all on function public.definir_papel(uuid, text) from public, anon;
grant execute on function public.listar_contas() to authenticated;
grant execute on function public.definir_papel(uuid, text) to authenticated;

-- 7) Toda conta nova entra automaticamente como LEITOR.
--    Quem decide quem vira editor ou administrador é um administrador.
create or replace function public.novo_usuario_vira_leitor() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  espaco uuid;
begin
  select id into espaco from public.espacos order by created_at limit 1;
  if espaco is not null then
    insert into public.membros (usuario_id, espaco_id, papel)
    values (new.id, espaco, 'leitor')
    on conflict (usuario_id) do nothing;
  end if;
  return new;
exception when others then
  -- nunca impedir alguém de criar conta; no pior caso a pessoa fica sem acesso
  -- e um administrador libera pela tela Usuários
  raise warning 'novo_usuario_vira_leitor falhou: %', sqlerrm;
  return new;
end $$;

revoke all on function public.novo_usuario_vira_leitor() from public, anon, authenticated;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.novo_usuario_vira_leitor();

notify pgrst, 'reload schema';
