-- A material purchase can belong to several phases. phase_id keeps the first
-- phase for compatibility; material_phases holds the full list.
create table public.material_phases (
  project_id uuid not null, material_id uuid not null, phase_id uuid not null,
  created_at timestamptz not null default now(), archived_at timestamptz,
  primary key (project_id,material_id,phase_id),
  foreign key (project_id,material_id) references public.material_purchases(project_id,id),
  foreign key (project_id,phase_id) references public.phases(project_id,id)
);
create index material_phases_phase on public.material_phases(project_id,phase_id);
alter table public.material_phases enable row level security;
revoke all on public.material_phases from public, anon, authenticated;
grant select, insert, update on public.material_phases to authenticated;
create trigger identity_guard before update on public.material_phases for each row execute function private.guard_identity();
create trigger record_audit after insert or update on public.material_phases for each row execute function private.audit_change();
create policy admin_insert on public.material_phases for insert to authenticated with check (private.can_admin(project_id));
create policy admin_update on public.material_phases for update to authenticated using (private.can_admin(project_id)) with check (private.can_admin(project_id));
create policy material_phases_read on public.material_phases for select to authenticated using (private.can_admin(project_id) or (archived_at is null and private.can_read_material(project_id,material_id)));

insert into public.material_phases(project_id,material_id,phase_id)
select project_id,id,phase_id from public.material_purchases where phase_id is not null;

-- Links cannot be moved to another material or phase; archive and create instead.
do $$
declare d text;
begin
  d := pg_get_functiondef('private.guard_identity()'::regprocedure);
  if position($o$('work_spaces','phase_spaces','work_assignments','material_spaces')$o$ in d) = 0 then
    raise exception 'guard_identity body not as expected';
  end if;
  execute replace(d, $o$('work_spaces','phase_spaces','work_assignments','material_spaces')$o$,
    $n$('work_spaces','phase_spaces','work_assignments','material_spaces','material_phases')$n$);
end;
$$;

-- save_entity accepts phase_ids for material purchases.
do $$
declare d text; o text; n text;
begin
  d := pg_get_functiondef('public.save_entity(text,jsonb)'::regprocedure);
  o := $o$  -- Make deferred aggregate checks fail inside this RPC rather than after returning its result.$o$;
  n := $n$  if p_resource = 'material_purchases' and p_data ? 'phase_ids' then
    if jsonb_typeof(p_data->'phase_ids') <> 'array' then raise exception 'La lista de fases no es válida.' using errcode='22023'; end if;
    update public.material_phases set archived_at=now() where project_id=pid and material_id=eid and archived_at is null;
    for sid in select value::uuid from jsonb_array_elements_text(p_data->'phase_ids') loop
      insert into public.material_phases(project_id,material_id,phase_id) values(pid,eid,sid)
        on conflict(project_id,material_id,phase_id) do update set archived_at=null;
    end loop;
  end if;
  -- Make deferred aggregate checks fail inside this RPC rather than after returning its result.$n$;
  if position(o in d) = 0 then raise exception 'save_entity body not as expected'; end if;
  execute replace(d, o, n);
end;
$$;
revoke all on function public.save_entity(text,jsonb) from public, anon;
grant execute on function public.save_entity(text,jsonb) to authenticated;
