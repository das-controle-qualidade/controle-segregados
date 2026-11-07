-- =====================================================================
-- Controle de Segregados — tabelas no mesmo projeto Supabase do QC.
-- Só acrescenta objetos com prefixo seg_; não altera nada do QC.
-- Usa public.is_admin() e public.perfis, que já existem no QC.
-- =====================================================================

-- ---------- Dados do sistema ----------
-- Cada item (ocorrência, produto, preço, fechamento...) é uma linha.
-- col = coleção, id = identificador do item, dados = o item inteiro.
create table if not exists public.seg_docs (
  col            text not null,
  id             text not null,
  dados          jsonb not null,
  origem         text,
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid default auth.uid() references auth.users(id) on delete set null,
  primary key (col, id)
);

-- ---------- Papel de cada pessoa neste sistema ----------
-- Admin do QC é admin aqui. Quem não está nesta tabela só consulta.
create table if not exists public.seg_papeis (
  id    uuid primary key references auth.users(id) on delete cascade,
  papel text not null check (papel in ('operator', 'viewer'))
);

create or replace function public.seg_pode_editar() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or exists (select 1 from public.seg_papeis where id = auth.uid() and papel = 'operator');
$$;

create or replace function public.seg_marcar() returns trigger
language plpgsql as $$
begin
  new.atualizado_em = now();
  new.atualizado_por = auth.uid();
  return new;
end;
$$;

drop trigger if exists seg_docs_atualizado on public.seg_docs;
create trigger seg_docs_atualizado
  before update on public.seg_docs
  for each row execute function public.seg_marcar();

alter table public.seg_docs enable row level security;
drop policy if exists "seg_docs: logados leem" on public.seg_docs;
create policy "seg_docs: logados leem" on public.seg_docs
  for select to authenticated using (true);
drop policy if exists "seg_docs: editores inserem" on public.seg_docs;
create policy "seg_docs: editores inserem" on public.seg_docs
  for insert to authenticated with check (public.seg_pode_editar());
drop policy if exists "seg_docs: editores alteram" on public.seg_docs;
create policy "seg_docs: editores alteram" on public.seg_docs
  for update to authenticated using (public.seg_pode_editar()) with check (public.seg_pode_editar());
drop policy if exists "seg_docs: editores excluem" on public.seg_docs;
create policy "seg_docs: editores excluem" on public.seg_docs
  for delete to authenticated using (public.seg_pode_editar());

alter table public.seg_papeis enable row level security;
drop policy if exists "seg_papeis: logados leem" on public.seg_papeis;
create policy "seg_papeis: logados leem" on public.seg_papeis
  for select to authenticated using (true);
drop policy if exists "seg_papeis: admin insere" on public.seg_papeis;
create policy "seg_papeis: admin insere" on public.seg_papeis
  for insert to authenticated with check (public.is_admin());
drop policy if exists "seg_papeis: admin altera" on public.seg_papeis;
create policy "seg_papeis: admin altera" on public.seg_papeis
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "seg_papeis: admin exclui" on public.seg_papeis;
create policy "seg_papeis: admin exclui" on public.seg_papeis
  for delete to authenticated using (public.is_admin());

-- ---------- Senha de autorização (fica só como hash, ninguém lê) ----------
create table if not exists public.seg_senha (
  id   int primary key default 1 check (id = 1),
  hash text not null
);
alter table public.seg_senha enable row level security;

create or replace function public.seg_senha_definida() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.seg_senha);
$$;

create or replace function public.seg_senha_conferir(p text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from public.seg_senha where hash = extensions.crypt(p, hash));
$$;

create or replace function public.seg_senha_definir(p text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then raise exception 'Somente o administrador define a senha'; end if;
  if length(coalesce(p, '')) < 4 then raise exception 'Senha muito curta'; end if;
  insert into public.seg_senha (id, hash) values (1, extensions.crypt(p, extensions.gen_salt('bf')))
  on conflict (id) do update set hash = excluded.hash;
end;
$$;

-- ---------- Uso de espaço (aba Dados & Backup) ----------
create or replace function public.seg_uso() returns json
language sql stable security definer set search_path = public, storage as $$
  select json_build_object(
    'banco_bytes', pg_database_size(current_database()),
    'seg_bytes', pg_total_relation_size('public.seg_docs'),
    'docs', (select count(*) from public.seg_docs),
    'ocorrencias', (select count(*) from public.seg_docs where col = 'occurrences'),
    'fotos_seg_n', (select count(*) from storage.objects where bucket_id = 'fotos' and name like 'seg/%'),
    'fotos_seg_bytes', (select coalesce(sum((metadata ->> 'size')::bigint), 0) from storage.objects where bucket_id = 'fotos' and name like 'seg/%'),
    'storage_bytes', (select coalesce(sum((metadata ->> 'size')::bigint), 0) from storage.objects)
  );
$$;

-- ---------- Permissões ----------
revoke all on public.seg_docs, public.seg_papeis, public.seg_senha from anon;
revoke all on public.seg_senha from authenticated;
grant select, insert, update, delete on public.seg_docs   to authenticated;
grant select, insert, update, delete on public.seg_papeis to authenticated;
revoke execute on function public.seg_pode_editar(), public.seg_senha_definida(), public.seg_senha_conferir(text), public.seg_senha_definir(text), public.seg_uso() from anon, public;
grant execute on function public.seg_pode_editar(), public.seg_senha_definida(), public.seg_senha_conferir(text), public.seg_senha_definir(text), public.seg_uso() to authenticated;

-- ---------- Tempo real ----------
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and tablename = 'seg_docs') then
    alter publication supabase_realtime add table public.seg_docs;
  end if;
end;
$$;
