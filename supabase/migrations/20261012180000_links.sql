-- Links (URLs) attached to a payment or a material purchase, next to the files.
create table public.links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  payment_id uuid, material_id uuid,
  name text not null check (length(btrim(name)) between 1 and 160),
  url text not null check (length(url) <= 2000 and url ~ '^https?://[^\s]+$'),
  created_at timestamptz not null default now(), archived_at timestamptz,
  unique (project_id,id), check (num_nonnulls(payment_id,material_id) = 1),
  foreign key (project_id,payment_id) references public.payments(project_id,id),
  foreign key (project_id,material_id) references public.material_purchases(project_id,id)
);
create index links_payment on public.links(project_id,payment_id) where archived_at is null;
create index links_material on public.links(project_id,material_id) where archived_at is null;
alter table public.links enable row level security;
revoke all on public.links from public, anon, authenticated;
grant select, insert, update on public.links to authenticated;
create trigger identity_guard before update on public.links for each row execute function private.guard_identity();
create trigger record_audit after insert or update on public.links for each row execute function private.audit_change();
create policy admin_insert on public.links for insert to authenticated with check (private.can_admin(project_id));
create policy admin_update on public.links for update to authenticated using (private.can_admin(project_id)) with check (private.can_admin(project_id));
create policy links_read on public.links for select to authenticated using (private.can_admin(project_id) or (archived_at is null and (
  (payment_id is not null and private.can_read_payment(project_id,payment_id)) or (material_id is not null and private.can_read_material(project_id,material_id)))));
