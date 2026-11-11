-- =====================================================================
-- Controle de Segregados — regras de segurança no banco (2026-11-11)
-- 1) Fotos da pasta seg/: só Inspetor e Administrador enviam, trocam ou apagam;
--    quem está "Sem acesso" não lê. As fotos do QC continuam com as regras de antes.
-- 2) Custos, configurações e reabertura de mês: só o administrador.
--    Registros de auditoria não podem ser alterados nem apagados.
-- 3) Semana e mês fechados travados também no banco. Liberação e reabertura de
--    semana só com a senha de autorização, conferida no servidor.
-- =====================================================================

-- ---------- 1) Fotos (bucket "fotos", mesmas políticas do QC + condição para seg/) ----------
drop policy if exists "fotos: logados leem" on storage.objects;
create policy "fotos: logados leem" on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos' and (name not like 'seg/%' or not public.seg_bloqueado()));
drop policy if exists "fotos: logados enviam" on storage.objects;
create policy "fotos: logados enviam" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos' and (name not like 'seg/%' or public.seg_pode_editar()));
drop policy if exists "fotos: logados substituem" on storage.objects;
create policy "fotos: logados substituem" on storage.objects
  for update to authenticated
  using (bucket_id = 'fotos' and (name not like 'seg/%' or public.seg_pode_editar()))
  with check (bucket_id = 'fotos' and (name not like 'seg/%' or public.seg_pode_editar()));
drop policy if exists "fotos: admin exclui" on storage.objects;
create policy "fotos: admin exclui" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos' and (public.is_admin() or (name like 'seg/%' and public.seg_pode_editar())));

-- ---------- 3) Trava: a data está em semana ou mês fechado (sem liberação ativa)? ----------
create or replace function public.seg_travado(p_data text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare ym text; wk text;
begin
  if p_data is null or length(p_data) < 10 then return false; end if;
  ym := left(p_data, 7);
  wk := ym || '-' || least(4, ceil(substr(p_data, 9, 2)::int / 7.0)::int);
  if not exists (select 1 from seg_docs where col = 'closures' and id = ym and dados ->> 'status' = 'closed')
     and not exists (select 1 from seg_docs where col = 'weekDone' and id = wk and dados ->> 'locked' = 'true') then
    return false;
  end if;
  -- liberação de 15 minutos dada com a senha (registrada pelo servidor)
  return not exists (
    select 1 from seg_docs where col = 'authLog' and dados ->> 'act' = 'grant' and dados ->> 'per' = ym
      and dados ->> 'uid' = auth.uid()::text and (dados ->> 'at')::timestamptz > now() - interval '15 minutes');
end;
$$;

-- ---------- 2) e 3) Regras por tipo de dado ----------
create or replace function public.seg_regras() returns trigger
language plpgsql security definer set search_path = public as $$
declare c text := coalesce(new.col, old.col);
begin
  -- administrador, funções do servidor e o SQL Editor não são limitados aqui
  if auth.uid() is null or public.is_admin() or current_setting('seg.servidor', true) = 'sim' then
    return coalesce(new, old);
  end if;
  if c in ('costs', 'costImports', 'costLog', 'settings') then
    raise exception 'Somente o administrador pode alterar %', c;
  end if;
  if c in ('authLog', 'closureLog') and tg_op <> 'INSERT' then
    raise exception 'O registro de auditoria não pode ser alterado nem apagado';
  end if;
  if c = 'authLog' and new.dados ->> 'act' in ('grant', 'weekOpen', 'pass') then
    raise exception 'Esta ação exige a senha de autorização';
  end if;
  if c = 'closures' and (tg_op = 'DELETE' or (new.dados ->> 'status' = 'open' and (tg_op = 'INSERT' or old.dados ->> 'status' = 'closed'))) then
    raise exception 'Somente o administrador reabre o mês';
  end if;
  if c = 'weekDone' and old.dados ->> 'locked' = 'true'
     and (tg_op = 'DELETE' or coalesce(new.dados ->> 'locked', 'false') <> 'true') then
    raise exception 'Reabrir a semana exige a senha de autorização';
  end if;
  if c = 'occurrences' then
    if tg_op <> 'INSERT' and public.seg_travado(old.dados ->> 'date') then
      raise exception 'Semana ou mês fechado: use Autorizar alteração';
    end if;
    if tg_op <> 'DELETE' and public.seg_travado(new.dados ->> 'date') then
      raise exception 'Semana ou mês fechado: use Autorizar alteração';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists seg_docs_regras on public.seg_docs;
create trigger seg_docs_regras
  before insert or update or delete on public.seg_docs
  for each row execute function public.seg_regras();

-- ---------- 3) Senha conferida no servidor ----------
-- Autorizar alteração: confere a senha e registra a liberação de 15 minutos.
create or replace function public.seg_autorizar(p_per text, p_senha text, p_motivo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d jsonb; i text := 'srv' || replace(gen_random_uuid()::text, '-', '');
begin
  if not public.seg_pode_editar() then raise exception 'Sem permissão'; end if;
  if not public.seg_senha_conferir(p_senha) then raise exception 'SENHA_ERRADA'; end if;
  if coalesce(trim(p_motivo), '') = '' then raise exception 'Informe o motivo'; end if;
  d := jsonb_build_object('id', i, 'act', 'grant', 'per', p_per, 'note', trim(p_motivo), 'uid', auth.uid()::text,
       'user', coalesce((select nome from perfis where id = auth.uid()), ''), 'at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
  perform set_config('seg.servidor', 'sim', true);
  insert into seg_docs (col, id, dados, origem) values ('authLog', i, d, 'servidor');
  perform set_config('seg.servidor', '', true);
  return d;
end;
$$;

-- Reabrir semana: confere a senha, tira a trava e registra quem e por quê.
create or replace function public.seg_reabrir_semana(p_chave text, p_senha text, p_motivo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d jsonb; i text := 'srv' || replace(gen_random_uuid()::text, '-', '');
begin
  if not public.seg_pode_editar() then raise exception 'Sem permissão'; end if;
  if not public.seg_senha_conferir(p_senha) then raise exception 'SENHA_ERRADA'; end if;
  if coalesce(trim(p_motivo), '') = '' then raise exception 'Informe o motivo'; end if;
  d := jsonb_build_object('id', i, 'act', 'weekOpen', 'per', left(p_chave, 7), 'w', right(p_chave, 1)::int, 'note', trim(p_motivo),
       'uid', auth.uid()::text, 'user', coalesce((select nome from perfis where id = auth.uid()), ''),
       'at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
  perform set_config('seg.servidor', 'sim', true);
  delete from seg_docs where col = 'weekDone' and id = p_chave;
  insert into seg_docs (col, id, dados, origem) values ('authLog', i, d, 'servidor');
  perform set_config('seg.servidor', '', true);
  return d;
end;
$$;

revoke execute on function public.seg_travado(text), public.seg_autorizar(text, text, text), public.seg_reabrir_semana(text, text, text) from anon, public;
grant execute on function public.seg_travado(text), public.seg_autorizar(text, text, text), public.seg_reabrir_semana(text, text, text) to authenticated;
