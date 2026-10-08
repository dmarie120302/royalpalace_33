-- Obra Clara: project-scoped data, cents, real beneficiary access and private receipts.
-- Apply using the Supabase CLI after reviewing the environment. No auth secrets are stored here.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
alter default privileges in schema private revoke execute on functions from public;

create domain public.money_cents as bigint check (value between 0 and 999999999999);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  name text not null check (length(btrim(name)) between 1 and 160),
  location text not null default '', description text not null default '',
  budget_cents public.money_cents not null default 0,
  start_date date, end_date date,
  status text not null default 'planning' check (status in ('planning','active','paused','completed')),
  created_at timestamptz not null default now(), archived_at timestamptz,
  check (start_date is null or end_date is null or end_date >= start_date)
);
create table public.project_members (
  project_id uuid not null references public.projects(id),
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('admin','contractor')),
  created_at timestamptz not null default now(), archived_at timestamptz,
  primary key (project_id,user_id)
);
create table public.contractors (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
  user_id uuid references auth.users(id), name text not null check (length(btrim(name)) between 1 and 160),
  trade text not null default '', phone text not null default '', email text not null default '',
  color text not null default '#4a4fc4' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(), archived_at timestamptz,
  unique (project_id,id), check (email = lower(btrim(email)))
);
create unique index contractors_active_email on public.contractors(project_id,email) where email <> '' and archived_at is null;
create unique index contractors_active_user on public.contractors(project_id,user_id) where user_id is not null and archived_at is null;
create table public.spaces (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
  name text not null check (length(btrim(name)) between 1 and 160),
  color text not null default '#4a4fc4' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(), archived_at timestamptz, unique (project_id,id)
);
create table public.phases (like public.spaces including defaults including constraints including indexes);
alter table public.phases add foreign key (project_id) references public.projects(id);
create table public.categories (like public.spaces including defaults including constraints including indexes);
alter table public.categories add foreign key (project_id) references public.projects(id);
create table public.work_items (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
  name text not null check (length(btrim(name)) between 1 and 160), description text not null default '',
  phase_id uuid, budget_cents public.money_cents not null default 0,
  start_date date, end_date date,
  status text not null default 'pending' check (status in ('pending','in_progress','blocked','completed')),
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(), archived_at timestamptz,
  unique (project_id,id), foreign key (project_id,phase_id) references public.phases(project_id,id),
  constraint work_completion_progress check (status <> 'completed' or progress = 100),
  check (start_date is null or end_date is null or end_date >= start_date)
);
create table public.work_spaces (
  project_id uuid not null, work_item_id uuid not null, space_id uuid not null,
  created_at timestamptz not null default now(), archived_at timestamptz,
  primary key (project_id,work_item_id,space_id),
  foreign key (project_id,work_item_id) references public.work_items(project_id,id),
  foreign key (project_id,space_id) references public.spaces(project_id,id)
);
create table public.phase_spaces (
  project_id uuid not null, phase_id uuid not null, space_id uuid not null,
  created_at timestamptz not null default now(), archived_at timestamptz,
  primary key (project_id,phase_id,space_id),
  foreign key (project_id,phase_id) references public.phases(project_id,id),
  foreign key (project_id,space_id) references public.spaces(project_id,id)
);
create table public.work_assignments (
  project_id uuid not null, work_item_id uuid not null, contractor_id uuid not null,
  allocation_cents public.money_cents not null default 0,
  created_at timestamptz not null default now(), archived_at timestamptz,
  primary key (project_id,work_item_id,contractor_id),
  foreign key (project_id,work_item_id) references public.work_items(project_id,id),
  foreign key (project_id,contractor_id) references public.contractors(project_id,id)
);
create table public.payments (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
  work_item_id uuid not null, contractor_id uuid not null,
  amount_cents public.money_cents not null check (amount_cents > 0), date date not null,
  description text not null check (length(btrim(description)) between 1 and 2000), method text not null default '',
  created_at timestamptz not null default now(), archived_at timestamptz,
  unique (project_id,id),
  foreign key (project_id,work_item_id) references public.work_items(project_id,id),
  foreign key (project_id,contractor_id) references public.contractors(project_id,id)
);
create unique index payments_no_accidental_duplicates on public.payments
  (project_id,work_item_id,contractor_id,date,amount_cents,md5(description),md5(method)) where archived_at is null;
create table public.material_purchases (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
  work_item_id uuid, contractor_id uuid, phase_id uuid, category_id uuid, covered_by_payment_id uuid,
  amount_cents public.money_cents not null check (amount_cents > 0), date date not null,
  store text not null default '', description text not null check (length(btrim(description)) between 1 and 2000),
  quantity text not null default '', created_at timestamptz not null default now(), archived_at timestamptz,
  unique (project_id,id),
  foreign key (project_id,work_item_id) references public.work_items(project_id,id),
  foreign key (project_id,contractor_id) references public.contractors(project_id,id),
  foreign key (project_id,phase_id) references public.phases(project_id,id),
  foreign key (project_id,category_id) references public.categories(project_id,id),
  foreign key (project_id,covered_by_payment_id) references public.payments(project_id,id)
);
create table public.material_spaces (
  project_id uuid not null, material_id uuid not null, space_id uuid not null,
  created_at timestamptz not null default now(), archived_at timestamptz,
  primary key (project_id,material_id,space_id),
  foreign key (project_id,material_id) references public.material_purchases(project_id,id),
  foreign key (project_id,space_id) references public.spaces(project_id,id)
);
create table public.attachments (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
  payment_id uuid, material_id uuid, path text not null unique, name text not null,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','application/pdf')),
  size bigint not null check (size between 1 and 10485760),
  created_at timestamptz not null default now(), archived_at timestamptz,
  unique (project_id,id), check (num_nonnulls(payment_id,material_id) = 1),
  foreign key (project_id,payment_id) references public.payments(project_id,id),
  foreign key (project_id,material_id) references public.material_purchases(project_id,id),
  check (path ~ ('^' || project_id::text || '/' || case when payment_id is not null then 'payment/' || payment_id::text else 'material/' || material_id::text end || '/[0-9a-fA-F-]{36}(\.[a-zA-Z0-9]{1,8})?$'))
);
create table public.audit_events (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
  actor_id uuid, entity_type text not null, entity_id uuid not null, action text not null,
  created_at timestamptz not null default now(), archived_at timestamptz
);

create index project_members_user on public.project_members(user_id,project_id) where archived_at is null;
create index projects_owner on public.projects(owner_id);
create index contractors_user on public.contractors(user_id,project_id) where archived_at is null;
create index work_assignments_contractor on public.work_assignments(project_id,contractor_id,work_item_id) where archived_at is null;
create index work_items_project on public.work_items(project_id) where archived_at is null;
create index payments_project_work on public.payments(project_id,work_item_id) where archived_at is null;
create index payments_project_contractor on public.payments(project_id,contractor_id) where archived_at is null;
create index materials_project_work on public.material_purchases(project_id,work_item_id) where archived_at is null;
create index materials_project_contractor on public.material_purchases(project_id,contractor_id) where archived_at is null;
create index materials_covered_payment on public.material_purchases(project_id,covered_by_payment_id) where archived_at is null;
create index attachments_payment on public.attachments(project_id,payment_id) where archived_at is null;
create index attachments_material on public.attachments(project_id,material_id) where archived_at is null;
create index audit_project_created on public.audit_events(project_id,created_at desc);
create index spaces_project on public.spaces(project_id);
create index phases_project on public.phases(project_id);
create index categories_project on public.categories(project_id);
create index work_spaces_space on public.work_spaces(project_id,space_id);
create index phase_spaces_space on public.phase_spaces(project_id,space_id);
create index material_spaces_space on public.material_spaces(project_id,space_id);

-- Helpers bypass policy recursion, but only answer access for the authenticated caller.
create function private.can_admin(p_project uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.projects p where p.id = p_project and
    (p.owner_id = auth.uid() or exists (select 1 from public.project_members m
      where m.project_id = p.id and m.user_id = auth.uid() and m.role = 'admin' and m.archived_at is null))
  );
$$;
create function private.can_member(p_project uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.can_admin(p_project) or (auth.uid() is not null and exists (
    select 1 from public.projects p join public.project_members m on m.project_id = p.id
    where p.id = p_project and p.archived_at is null and m.user_id = auth.uid() and m.archived_at is null
      and m.role = 'contractor' and exists(select 1 from public.contractors c
        where c.project_id=p.id and c.user_id=auth.uid() and c.archived_at is null)
  ));
$$;
create function private.owns_contractor(p_project uuid, p_contractor uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and private.can_member(p_project) and exists (
    select 1 from public.contractors c where c.project_id = p_project and c.id = p_contractor
      and c.user_id = auth.uid() and c.archived_at is null
  );
$$;
create function private.can_read_work(p_project uuid, p_work uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.can_admin(p_project) or exists (
    select 1 from public.work_items w join public.work_assignments a on a.project_id = w.project_id and a.work_item_id = w.id
    where w.project_id = p_project and w.id = p_work and a.archived_at is null
      and private.owns_contractor(p_project,a.contractor_id)
  );
$$;
create function private.can_read_payment(p_project uuid, p_payment uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.can_admin(p_project) or exists (
    select 1 from public.payments p where p.project_id = p_project and p.id = p_payment and p.archived_at is null
      and private.owns_contractor(p_project,p.contractor_id)
  );
$$;
create function private.can_read_material(p_project uuid, p_material uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.can_admin(p_project) or exists (
    select 1 from public.material_purchases m where m.project_id = p_project and m.id = p_material and m.archived_at is null
    and (private.owns_contractor(p_project,m.contractor_id)
      or (m.contractor_id is null and m.work_item_id is not null and private.can_read_work(p_project,m.work_item_id)))
  );
$$;
create function private.receipt_access(p_path text, p_manage boolean default false) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare parts text[]; pid uuid; eid uuid;
begin
  parts := string_to_array(p_path,'/');
  if array_length(parts,1) <> 4 or parts[1] !~ '^[0-9a-fA-F-]{36}$'
    or parts[3] !~ '^[0-9a-fA-F-]{36}$' or parts[4] !~ '^[0-9a-fA-F-]{36}(\.[a-zA-Z0-9]{1,8})?$' then return false; end if;
  begin pid := parts[1]::uuid; eid := parts[3]::uuid; exception when invalid_text_representation then return false; end;
  if p_manage and not private.can_admin(pid) then return false; end if;
  if not p_manage and not exists(select 1 from public.attachments a where a.project_id=pid and a.path=p_path and a.archived_at is null) then
    return false;
  end if;
  if parts[2] = 'payment' then
    return exists(select 1 from public.payments p where p.project_id = pid and p.id = eid and p.archived_at is null)
      and (p_manage or private.can_read_payment(pid,eid));
  elsif parts[2] = 'material' then
    return exists(select 1 from public.material_purchases m where m.project_id = pid and m.id = eid and m.archived_at is null)
      and (p_manage or private.can_read_material(pid,eid));
  end if;
  return false;
end;
$$;

-- Immutable identities and ownership prevent moving an authorized row into another project.
create function private.guard_identity() returns trigger language plpgsql set search_path = '' as $$
begin
  if to_jsonb(new)->>'id' is distinct from to_jsonb(old)->>'id'
    or to_jsonb(new)->>'project_id' is distinct from to_jsonb(old)->>'project_id'
    or to_jsonb(new)->>'owner_id' is distinct from to_jsonb(old)->>'owner_id'
    or new.created_at is distinct from old.created_at then
    raise exception 'No se puede cambiar la identidad ni el propietario del registro.' using errcode = '23514';
  end if;
  if tg_table_name in ('work_spaces','phase_spaces','work_assignments','material_spaces')
    and (to_jsonb(new) - array['allocation_cents','archived_at']) is distinct from (to_jsonb(old) - array['allocation_cents','archived_at']) then
    raise exception 'No se puede mover una asignación existente; archívala y crea una nueva.' using errcode='23514';
  end if;
  if tg_table_name = 'contractors' and to_jsonb(old)->>'user_id' is not null
    and to_jsonb(new)->>'email' is distinct from to_jsonb(old)->>'email' then
    raise exception 'No se puede cambiar el correo de un contratista con acceso vinculado. Archiva este contratista y crea otro para el nuevo beneficiario.' using errcode='23514';
  end if;
  return new;
end;
$$;
create function private.audit_change() returns trigger language plpgsql security definer set search_path = '' as $$
declare data jsonb; pid uuid; eid uuid; act text;
begin
  data := to_jsonb(new);
  pid := case when tg_table_name = 'projects' then (data->>'id')::uuid else (data->>'project_id')::uuid end;
  eid := coalesce(data->>'id',data->>'work_item_id',data->>'phase_id',data->>'material_id',data->>'user_id')::uuid;
  act := case when tg_op = 'INSERT' then 'created'
    when new.archived_at is not null and old.archived_at is null then 'archived'
    when new.archived_at is null and old.archived_at is not null then 'restored' else 'updated' end;
  insert into public.audit_events(project_id,actor_id,entity_type,entity_id,action)
    values(pid,auth.uid(),tg_table_name,eid,act);
  return new;
end;
$$;
create function private.add_owner_membership() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.project_members(project_id,user_id,role) values(new.id,new.owner_id,'admin');
  return new;
end;
$$;
create trigger project_owner_membership after insert on public.projects for each row execute function private.add_owner_membership();

-- Lock the work before changing its allocations or payment beneficiary.
create function private.lock_work() returns trigger language plpgsql set search_path = '' as $$
begin
  perform 1 from public.work_items w where w.project_id = new.project_id and w.id = new.work_item_id for update;
  return new;
end;
$$;
create trigger assignments_lock_work before insert or update on public.work_assignments for each row execute function private.lock_work();
create trigger payments_lock_work before insert or update on public.payments for each row execute function private.lock_work();

-- Deferred constraints evaluate the final state of a complete save_entity transaction.
create function private.validate_work_finances() returns trigger language plpgsql security definer set search_path = '' as $$
declare wid uuid; pid uuid; budget bigint;
begin
  pid := new.project_id; wid := coalesce(to_jsonb(new)->>'work_item_id',to_jsonb(new)->>'id')::uuid;
  select w.budget_cents into budget from public.work_items w where w.project_id = pid and w.id = wid for update;
  if (select coalesce(sum(a.allocation_cents),0) from public.work_assignments a
      where a.project_id = pid and a.work_item_id = wid and a.archived_at is null) > budget then
    raise exception 'La suma asignada a contratistas supera el presupuesto del trabajo.' using errcode = '23514';
  end if;
  if exists (select 1 from public.payments p where p.project_id = pid and p.work_item_id = wid and p.archived_at is null
    and not exists(select 1 from public.work_assignments a where a.project_id = pid and a.work_item_id = wid
      and a.contractor_id = p.contractor_id and a.archived_at is null)) then
    raise exception 'El beneficiario del pago debe estar asignado al trabajo.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create constraint trigger work_finances after insert or update on public.work_items deferrable initially deferred for each row execute function private.validate_work_finances();
create constraint trigger assignment_finances after insert or update on public.work_assignments deferrable initially deferred for each row execute function private.validate_work_finances();
create constraint trigger payment_finances after insert or update on public.payments deferrable initially deferred for each row execute function private.validate_work_finances();

-- Keep the historical relationship when archiving a payment. Coverage is active only
-- while the referenced payment is active, so restoring it cannot double-count costs.
create function private.validate_material_coverage() returns trigger language plpgsql security definer set search_path = '' as $$
declare payment public.payments;
begin
  if new.archived_at is not null or new.covered_by_payment_id is null then return new; end if;
  select * into payment from public.payments where project_id = new.project_id and id = new.covered_by_payment_id for update;
  if payment.id is null
    or (payment.archived_at is not null and (tg_op = 'INSERT' or new.covered_by_payment_id is distinct from old.covered_by_payment_id))
    or (new.work_item_id is not null and new.work_item_id <> payment.work_item_id)
    or new.contractor_id is null or new.contractor_id <> payment.contractor_id then
    raise exception 'El material cubierto debe indicar al beneficiario del pago y pertenecer a su trabajo. Para una cobertura nueva, el pago debe estar activo.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger material_coverage before insert or update on public.material_purchases for each row execute function private.validate_material_coverage();
create function private.validate_payment_coverage() returns trigger language plpgsql security definer set search_path = '' as $$
declare pid uuid; payment_id uuid; payment public.payments;
begin
  pid := new.project_id;
  payment_id := case when tg_table_name = 'payments' then to_jsonb(new)->>'id' else to_jsonb(new)->>'covered_by_payment_id' end;
  if payment_id is null then return new; end if;
  select * into payment from public.payments where project_id = pid and id = payment_id for update;
  if exists(select 1 from public.material_purchases m where m.project_id=pid and m.covered_by_payment_id=payment_id and m.archived_at is null
    and ((m.work_item_id is not null and m.work_item_id<>payment.work_item_id)
      or m.contractor_id is null or m.contractor_id<>payment.contractor_id)) then
    raise exception 'Los materiales cubiertos deben conservar el trabajo y beneficiario de su pago.' using errcode='23514';
  end if;
  if (select coalesce(sum(m.amount_cents),0) from public.material_purchases m
      where m.project_id=pid and m.covered_by_payment_id=payment_id and m.archived_at is null) > payment.amount_cents then
    raise exception 'El total de materiales cubiertos supera el monto del pago.' using errcode='23514';
  end if;
  return new;
end;
$$;
create constraint trigger payment_coverage after insert or update on public.payments deferrable initially deferred for each row execute function private.validate_payment_coverage();
create constraint trigger material_payment_coverage after insert or update on public.material_purchases deferrable initially deferred for each row execute function private.validate_payment_coverage();

-- Explicit grants: anonymous visitors receive no table access or mutation RPC.
do $$
declare t text;
begin
  foreach t in array array['projects','project_members','contractors','spaces','phases','categories','work_items','work_spaces','phase_spaces','work_assignments','payments','material_purchases','material_spaces','attachments','audit_events'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('create trigger identity_guard before update on public.%I for each row execute function private.guard_identity()',t);
    if t <> 'audit_events' then
      execute format('create trigger record_audit after insert or update on public.%I for each row execute function private.audit_change()',t);
    end if;
  end loop;
  foreach t in array array['spaces','phases','categories','work_items','work_spaces','phase_spaces','work_assignments','payments','material_purchases','material_spaces','attachments'] loop
    execute format('grant insert, update on public.%I to authenticated',t);
    execute format('create policy admin_insert on public.%I for insert to authenticated with check (private.can_admin(project_id))',t);
    execute format('create policy admin_update on public.%I for update to authenticated using (private.can_admin(project_id)) with check (private.can_admin(project_id))',t);
  end loop;
  foreach t in array array['spaces','phases','categories','phase_spaces'] loop
    execute format('create policy member_read on public.%I for select to authenticated using (private.can_admin(project_id) or (archived_at is null and private.can_member(project_id)))',t);
  end loop;
end;
$$;
grant insert(id,owner_id,name,location,description,budget_cents,start_date,end_date,status,archived_at),
  update(name,location,description,budget_cents,start_date,end_date,status,archived_at) on public.projects to authenticated;
grant insert(id,project_id,name,trade,phone,email,color,archived_at),
  update(name,trade,phone,email,color,archived_at) on public.contractors to authenticated;
grant insert(project_id,user_id,role,archived_at), update(role,archived_at) on public.project_members to authenticated;
create policy projects_read on public.projects for select to authenticated using (private.can_member(id));
create policy projects_insert on public.projects for insert to authenticated with check (
  owner_id = (select auth.uid()) and (select auth.jwt()->'app_metadata'->>'app_role') = 'admin'
);
create policy projects_update on public.projects for update to authenticated using (private.can_admin(id)) with check (private.can_admin(id));
create policy members_read on public.project_members for select to authenticated using (private.can_admin(project_id) or (user_id = (select auth.uid()) and archived_at is null));
create policy members_insert on public.project_members for insert to authenticated with check (private.can_admin(project_id));
create policy members_update on public.project_members for update to authenticated using (private.can_admin(project_id)) with check (private.can_admin(project_id));
create policy contractors_read on public.contractors for select to authenticated using (private.can_admin(project_id) or (archived_at is null and private.owns_contractor(project_id,id)));
create policy contractors_insert on public.contractors for insert to authenticated with check (private.can_admin(project_id) and user_id is null);
create policy contractors_update on public.contractors for update to authenticated using (private.can_admin(project_id)) with check (private.can_admin(project_id));
create policy work_read on public.work_items for select to authenticated using (private.can_read_work(project_id,id));
create policy assignments_read on public.work_assignments for select to authenticated using (private.can_admin(project_id) or (archived_at is null and private.owns_contractor(project_id,contractor_id) and private.can_read_work(project_id,work_item_id)));
create policy work_spaces_read on public.work_spaces for select to authenticated using (private.can_admin(project_id) or (archived_at is null and private.can_read_work(project_id,work_item_id)));
create policy payments_read on public.payments for select to authenticated using (private.can_read_payment(project_id,id));
create policy materials_read on public.material_purchases for select to authenticated using (private.can_read_material(project_id,id));
create policy material_spaces_read on public.material_spaces for select to authenticated using (private.can_admin(project_id) or (archived_at is null and private.can_read_material(project_id,material_id)));
create policy attachments_read on public.attachments for select to authenticated using (private.can_admin(project_id) or (archived_at is null and (
  (payment_id is not null and private.can_read_payment(project_id,payment_id)) or (material_id is not null and private.can_read_material(project_id,material_id)))));
create policy audit_admin_read on public.audit_events for select to authenticated using (private.can_admin(project_id));

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.can_admin(uuid), private.can_member(uuid), private.owns_contractor(uuid,uuid),
  private.can_read_work(uuid,uuid), private.can_read_payment(uuid,uuid), private.can_read_material(uuid,uuid), private.receipt_access(text,boolean) to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('receipts','receipts',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']);
create policy receipts_read on storage.objects for select to authenticated using (bucket_id = 'receipts' and private.receipt_access(name,false));
create policy receipts_insert on storage.objects for insert to authenticated with check (bucket_id = 'receipts' and private.receipt_access(name,true));
create policy receipts_update on storage.objects for update to authenticated using (bucket_id = 'receipts' and private.receipt_access(name,true)) with check (bucket_id = 'receipts' and private.receipt_access(name,true));
create policy receipts_delete on storage.objects for delete to authenticated using (bucket_id = 'receipts' and private.receipt_access(name,true));

-- Confirmed email is read from auth.users, never from editable JWT user_metadata.
create function private.claim_contractor_access() returns integer language plpgsql security definer set search_path = '' as $$
declare verified_email text; claimed integer;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.' using errcode = '42501'; end if;
  select lower(btrim(u.email)) into verified_email from auth.users u
    where u.id = auth.uid() and u.email_confirmed_at is not null;
  if verified_email is null or verified_email = '' then return 0; end if;
  with linked as (
    update public.contractors c set user_id = auth.uid()
    from public.projects p where p.id = c.project_id and p.archived_at is null and c.archived_at is null
      and c.email = verified_email and c.user_id is null
    returning c.project_id
  ), memberships as (
    insert into public.project_members(project_id,user_id,role)
    select project_id,auth.uid(),'contractor' from linked
    on conflict(project_id,user_id) do nothing
    returning project_id
  ) select count(*) into claimed from memberships;
  return claimed;
end;
$$;
revoke all on function private.claim_contractor_access() from public, anon, authenticated;
grant execute on function private.claim_contractor_access() to authenticated;
create function public.claim_contractor_access() returns integer language sql security invoker set search_path = '' as $$
  select private.claim_contractor_access();
$$;
revoke all on function public.claim_contractor_access() from public, anon;
grant execute on function public.claim_contractor_access() to authenticated;

-- Whitelisted mutation gateway. Invoker privileges and table RLS remain effective.
create function public.save_entity(p_resource text, p_data jsonb) returns uuid
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
    execute format('insert into public.%I(id,project_id,name,color,archived_at) values($1,$2,$3,$4,$5)
      on conflict(id) do update set name=excluded.name,color=excluded.color,archived_at=excluded.archived_at',p_resource)
      using eid,pid,btrim(data->>'name'),coalesce(data->>'color','#4a4fc4'),archived;
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
