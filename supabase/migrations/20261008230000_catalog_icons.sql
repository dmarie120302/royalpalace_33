-- Icons for spaces, phases and categories, as in the PH 33 Royal Palace template.
do $$
declare t text;
begin
  foreach t in array array['spaces','phases','categories'] loop
    execute format('alter table public.%I add column icon text not null default ''casa'' check (icon ~ ''^[a-z]{2,20}$'')',t);
    execute format('grant insert(icon), update(icon) on public.%I to authenticated',t);
  end loop;
end;
$$;

create or replace function public.save_entity(p_resource text, p_data jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare eid uuid; pid uuid; existing jsonb; data jsonb; sid uuid; entry jsonb; archived timestamptz;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.' using errcode = '42501'; end if;
  if p_resource not in ('projects','spaces','phases','categories','contractors','work_items','payments','material_purchases')
    or jsonb_typeof(p_data) <> 'object' then raise exception 'El tipo de registro o los datos no son válidos.' using errcode = '22023'; end if;
  eid := coalesce(nullif(p_data->>'id','')::uuid,gen_random_uuid());
  execute format('select to_jsonb(e) from public.%I e where id = $1 for update',p_resource) into existing using eid;
  data := coalesce(existing,'{}'::jsonb) || p_data;
  if existing is not null and p_resource <> 'projects' and p_data ? 'project_id'
    and p_data->>'project_id' is distinct from existing->>'project_id' then
    raise exception 'No se puede mover el registro a otra obra.' using errcode='23514';
  end if;
  pid := case when p_resource = 'projects' then eid else nullif(data->>'project_id','')::uuid end;
  if p_resource <> 'projects' and (pid is null or not private.can_admin(pid))
    or p_resource = 'projects' and existing is not null and not private.can_admin(eid) then
    raise exception 'Necesitas permisos de administrador para esta obra.' using errcode = '42501';
  end if;
  archived := nullif(data->>'archived_at','')::timestamptz;
  if p_resource = 'projects' then
    if existing is null and coalesce(auth.jwt()->'app_metadata'->>'app_role','') <> 'admin' then
      raise exception 'Sólo los administradores habilitados pueden crear obras.' using errcode='42501';
    end if;
    if existing is not null then
      update public.projects set name=btrim(data->>'name'),location=coalesce(data->>'location',''),description=coalesce(data->>'description',''),
        budget_cents=coalesce((data->>'budget_cents')::bigint,0),start_date=nullif(data->>'start_date','')::date,
        end_date=nullif(data->>'end_date','')::date,status=coalesce(data->>'status','planning'),archived_at=archived where id=eid;
    else
    insert into public.projects(id,owner_id,name,location,description,budget_cents,start_date,end_date,status,archived_at)
    values(eid,auth.uid(),btrim(data->>'name'),coalesce(data->>'location',''),coalesce(data->>'description',''),
      coalesce((data->>'budget_cents')::bigint,0),nullif(data->>'start_date','')::date,nullif(data->>'end_date','')::date,coalesce(data->>'status','planning'),archived)
    on conflict(id) do update set name=excluded.name,location=excluded.location,description=excluded.description,
      budget_cents=excluded.budget_cents,start_date=excluded.start_date,end_date=excluded.end_date,status=excluded.status,archived_at=excluded.archived_at;
    end if;
  elsif p_resource in ('spaces','phases','categories') then
    execute format('insert into public.%I(id,project_id,name,color,icon,archived_at) values($1,$2,$3,$4,$5,$6)
      on conflict(id) do update set name=excluded.name,color=excluded.color,icon=excluded.icon,archived_at=excluded.archived_at',p_resource)
      using eid,pid,btrim(data->>'name'),coalesce(data->>'color','#4a4fc4'),coalesce(nullif(data->>'icon',''),'casa'),archived;
  elsif p_resource = 'contractors' then
    insert into public.contractors(id,project_id,name,trade,phone,email,color,archived_at)
    values(eid,pid,btrim(data->>'name'),coalesce(data->>'trade',''),coalesce(data->>'phone',''),lower(btrim(coalesce(data->>'email',''))),coalesce(data->>'color','#4a4fc4'),archived)
    on conflict(id) do update set name=excluded.name,trade=excluded.trade,phone=excluded.phone,email=excluded.email,color=excluded.color,archived_at=excluded.archived_at;
  elsif p_resource = 'work_items' then
    insert into public.work_items(id,project_id,name,description,phase_id,budget_cents,start_date,end_date,status,progress,archived_at)
    values(eid,pid,btrim(data->>'name'),coalesce(data->>'description',''),nullif(data->>'phase_id','')::uuid,
      coalesce((data->>'budget_cents')::bigint,0),nullif(data->>'start_date','')::date,nullif(data->>'end_date','')::date,
      coalesce(data->>'status','pending'),coalesce((data->>'progress')::integer,0),archived)
    on conflict(id) do update set name=excluded.name,description=excluded.description,phase_id=excluded.phase_id,budget_cents=excluded.budget_cents,
      start_date=excluded.start_date,end_date=excluded.end_date,status=excluded.status,progress=excluded.progress,archived_at=excluded.archived_at;
    if p_data ? 'assignments' then
      if jsonb_typeof(p_data->'assignments') <> 'array' then raise exception 'La lista de asignaciones no es válida.' using errcode='22023'; end if;
      update public.work_assignments set archived_at=now() where project_id=pid and work_item_id=eid and archived_at is null;
      for entry in select value from jsonb_array_elements(p_data->'assignments') loop
        insert into public.work_assignments(project_id,work_item_id,contractor_id,allocation_cents)
        values(pid,eid,(entry->>'contractor_id')::uuid,(entry->>'allocation_cents')::bigint)
        on conflict(project_id,work_item_id,contractor_id) do update set allocation_cents=excluded.allocation_cents,archived_at=null;
      end loop;
    end if;
  elsif p_resource = 'payments' then
    insert into public.payments(id,project_id,work_item_id,contractor_id,amount_cents,date,description,method,archived_at)
    values(eid,pid,(data->>'work_item_id')::uuid,(data->>'contractor_id')::uuid,(data->>'amount_cents')::bigint,
      (data->>'date')::date,btrim(data->>'description'),coalesce(data->>'method',''),archived)
    on conflict(id) do update set work_item_id=excluded.work_item_id,contractor_id=excluded.contractor_id,amount_cents=excluded.amount_cents,
      date=excluded.date,description=excluded.description,method=excluded.method,archived_at=excluded.archived_at;
  elsif p_resource = 'material_purchases' then
    if existing is not null then
      update public.material_purchases set work_item_id=nullif(data->>'work_item_id','')::uuid,contractor_id=nullif(data->>'contractor_id','')::uuid,
        phase_id=nullif(data->>'phase_id','')::uuid,category_id=nullif(data->>'category_id','')::uuid,
        covered_by_payment_id=nullif(data->>'covered_by_payment_id','')::uuid,amount_cents=(data->>'amount_cents')::bigint,
        date=(data->>'date')::date,store=coalesce(data->>'store',''),description=btrim(data->>'description'),
        quantity=coalesce(data->>'quantity',''),archived_at=archived where id=eid;
    else
    insert into public.material_purchases(id,project_id,work_item_id,contractor_id,phase_id,category_id,covered_by_payment_id,amount_cents,date,store,description,quantity,archived_at)
    values(eid,pid,nullif(data->>'work_item_id','')::uuid,nullif(data->>'contractor_id','')::uuid,nullif(data->>'phase_id','')::uuid,
      nullif(data->>'category_id','')::uuid,nullif(data->>'covered_by_payment_id','')::uuid,(data->>'amount_cents')::bigint,
      (data->>'date')::date,coalesce(data->>'store',''),btrim(data->>'description'),coalesce(data->>'quantity',''),archived)
    on conflict(id) do update set work_item_id=excluded.work_item_id,contractor_id=excluded.contractor_id,phase_id=excluded.phase_id,
      category_id=excluded.category_id,covered_by_payment_id=excluded.covered_by_payment_id,amount_cents=excluded.amount_cents,
      date=excluded.date,store=excluded.store,description=excluded.description,quantity=excluded.quantity,archived_at=excluded.archived_at;
    end if;
  end if;
  if p_resource in ('work_items','phases','material_purchases') and p_data ? 'space_ids' then
    if jsonb_typeof(p_data->'space_ids') <> 'array' then raise exception 'La lista de espacios no es válida.' using errcode='22023'; end if;
    if p_resource = 'work_items' then
      update public.work_spaces set archived_at=now() where project_id=pid and work_item_id=eid and archived_at is null;
      for sid in select value::uuid from jsonb_array_elements_text(p_data->'space_ids') loop
        insert into public.work_spaces(project_id,work_item_id,space_id) values(pid,eid,sid)
          on conflict(project_id,work_item_id,space_id) do update set archived_at=null;
      end loop;
    elsif p_resource = 'phases' then
      update public.phase_spaces set archived_at=now() where project_id=pid and phase_id=eid and archived_at is null;
      for sid in select value::uuid from jsonb_array_elements_text(p_data->'space_ids') loop
        insert into public.phase_spaces(project_id,phase_id,space_id) values(pid,eid,sid)
          on conflict(project_id,phase_id,space_id) do update set archived_at=null;
      end loop;
    else
      update public.material_spaces set archived_at=now() where project_id=pid and material_id=eid and archived_at is null;
      for sid in select value::uuid from jsonb_array_elements_text(p_data->'space_ids') loop
        insert into public.material_spaces(project_id,material_id,space_id) values(pid,eid,sid)
          on conflict(project_id,material_id,space_id) do update set archived_at=null;
      end loop;
    end if;
  end if;
  -- Make deferred aggregate checks fail inside this RPC rather than after returning its result.
  set constraints public.work_finances, public.assignment_finances, public.payment_finances, public.payment_coverage, public.material_payment_coverage immediate;
  set constraints public.work_finances, public.assignment_finances, public.payment_finances, public.payment_coverage, public.material_payment_coverage deferred;
  return eid;
end;
$$;
revoke all on function public.save_entity(text,jsonb) from public, anon;
grant execute on function public.save_entity(text,jsonb) to authenticated;
