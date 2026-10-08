-- Run only against the isolated local project: supabase test db --local.
-- Fixtures are synthetic, transaction-scoped and never create passwords or accounts remotely.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(65);

insert into auth.users(id,email,email_confirmed_at,created_at,updated_at) values
 ('00000000-0000-4000-8000-000000000001','owner@example.invalid',now(),now(),now()),
 ('00000000-0000-4000-8000-000000000002','contractor@example.invalid',now(),now(),now()),
 ('00000000-0000-4000-8000-000000000003','other-contractor@example.invalid',now(),now(),now()),
 ('00000000-0000-4000-8000-000000000004','outsider@example.invalid',now(),now(),now()),
 ('00000000-0000-4000-8000-000000000005','other-owner@example.invalid',now(),now(),now()),
 ('00000000-0000-4000-8000-000000000006','unconfirmed@example.invalid',null,now(),now());
insert into public.projects(id,owner_id,name) values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Test project'),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000005','Other project');
insert into public.contractors(id,project_id,name,email) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Contractor','contractor@example.invalid'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Other contractor','other-contractor@example.invalid'),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','Unconfirmed','unconfirmed@example.invalid');
insert into public.spaces(id,project_id,name) values
 ('60000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Space'),
 ('60000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Other space');
insert into public.work_items(id,project_id,name,budget_cents) values
 ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Shared work',100000),
 ('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Other contractor work',20000),
 ('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','Other project work',20000);
insert into public.work_assignments(project_id,work_item_id,contractor_id,allocation_cents) values
 ('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',60000),
 ('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002',40000),
 ('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002',20000);
insert into public.payments(id,project_id,work_item_id,contractor_id,amount_cents,date,description) values
 ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',60000,'2026-01-01','First payment'),
 ('40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002',40000,'2026-01-01','Second payment');
insert into public.material_purchases(id,project_id,work_item_id,contractor_id,covered_by_payment_id,amount_cents,date,description) values
 ('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',10000,'2026-01-01','Covered material'),
 ('50000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002',null,null,10000,'2026-01-01','Other work material'),
 ('50000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001',null,'20000000-0000-4000-8000-000000000001',null,5000,'2026-01-01','Explicitly assigned material'),
 ('50000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001',null,null,null,2500,'2026-01-01','Unassigned material');
insert into public.attachments(id,project_id,payment_id,path,name,mime_type,size) values
 ('70000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001/payment/40000000-0000-4000-8000-000000000001/70000000-0000-4000-8000-000000000001.jpg','receipt.jpg','image/jpeg',100),
 ('70000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001/payment/40000000-0000-4000-8000-000000000002/70000000-0000-4000-8000-000000000002.jpg','other.jpg','image/jpeg',100);
insert into storage.objects(bucket_id,name) select 'receipts',path from public.attachments;
set constraints all immediate;
set constraints all deferred;

select ok(not has_table_privilege('anon','public.projects','SELECT'),'Anonymous users have no project read grant');
select ok(not has_function_privilege('anon','public.save_entity(text,jsonb)','EXECUTE'),'Anonymous users cannot call mutation RPC');
select ok(not has_function_privilege('anon','public.claim_contractor_access()','EXECUTE'),'Anonymous users cannot claim contractor access');
select ok(not has_table_privilege('authenticated','public.audit_events','INSERT'),'Clients cannot forge audit records');
select ok(not has_column_privilege('authenticated','public.contractors','user_id','UPDATE'),'Clients cannot bind arbitrary auth user IDs');
select ok(not (select public from storage.buckets where id='receipts'),'Receipts bucket is private');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000006","role":"authenticated"}',true);
select is(public.claim_contractor_access(),0,'An unconfirmed email cannot claim a contractor');

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated","user_metadata":{"role":"admin"}}',true);
select is(public.claim_contractor_access(),1,'A confirmed email claims only its matching project');
select is((select role from public.project_members where user_id=auth.uid()),'contractor','Claim creates a contractor membership');
select throws_ok($$select public.save_entity('projects','{"name":"Unauthorized project"}'::jsonb)$$,'42501',null,'Contractors cannot create a project through the RPC');
select throws_ok($$insert into public.projects(owner_id,name) values(auth.uid(),'Unauthorized project')$$,'42501',null,'Contractors cannot create a project through the Data API');
select throws_ok($$update auth.users set raw_app_meta_data='{"app_role":"admin"}'::jsonb where id=auth.uid()$$,'42501',null,'Clients cannot mutate trusted auth app_metadata');
select ok(not private.can_admin('10000000-0000-4000-8000-000000000001'),'Editable JWT metadata cannot elevate project role');
select is((select count(*) from public.projects),1::bigint,'Contractor sees only the member project');
select is((select count(*) from public.work_items),1::bigint,'Contractor sees assigned works only');
select is((select count(*) from public.work_assignments),1::bigint,'Contractor sees their own allocations only');
select is((select count(*) from public.payments),1::bigint,'A shared work does not expose another beneficiary payment');
select is((select count(*) from public.material_purchases),2::bigint,'Materials require explicit assignment or assigned work');
select is((select count(*) from public.contractors),1::bigint,'Contractor cannot read other contractor profiles');
select is((select count(*) from public.attachments),1::bigint,'Attachment metadata follows payment beneficiary access');
select is((select count(*) from storage.objects where bucket_id='receipts'),1::bigint,'Storage bytes follow the same beneficiary rule');
select is((select count(*) from public.audit_events),0::bigint,'Audit history is administrative');
select throws_ok($$select public.save_entity('payments','{"project_id":"10000000-0000-4000-8000-000000000001"}'::jsonb)$$,'42501',null,'Contractor cannot mutate payments');
select throws_ok($$insert into public.project_members(project_id,user_id,role) values('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000004','admin')$$,'42501',null,'Contractor cannot create administrator membership');
update public.project_members set role='admin' where user_id=auth.uid();
select is((select role from public.project_members where user_id=auth.uid()),'contractor','Contractor cannot promote existing membership');
select throws_ok($$insert into storage.objects(bucket_id,name) values('receipts','10000000-0000-4000-8000-000000000001/payment/40000000-0000-4000-8000-000000000001/80000000-0000-4000-8000-000000000001.jpg')$$,'42501',null,'Contractor cannot upload receipts');

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select is((select count(*) from public.projects),0::bigint,'Unrelated user cannot enumerate projects');
select is((select count(*) from public.work_items),0::bigint,'Unrelated user cannot read work rows');
select is((select count(*) from storage.objects where bucket_id='receipts'),0::bigint,'Unrelated user cannot read receipts');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is(public.claim_contractor_access(),1,'The other contractor can claim their own account');
select is((select count(*) from public.material_purchases),1::bigint,'Explicitly assigned covered material is hidden from the other shared-work contractor');

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.work_items),2::bigint,'Owner can read their works, not the other project');
select throws_ok($$update public.work_items set status='completed',progress=99 where id='30000000-0000-4000-8000-000000000001'$$,'23514',null,'Database rejects completed work with physical progress below 100');
select throws_ok($$update public.contractors set email='replacement@example.invalid' where id='20000000-0000-4000-8000-000000000001'$$,'23514',null,'Linked contractor email cannot be reassigned to a different beneficiary');
select throws_ok($$update public.work_assignments set work_item_id='30000000-0000-4000-8000-000000000002' where work_item_id='30000000-0000-4000-8000-000000000001' and contractor_id='20000000-0000-4000-8000-000000000001'$$,'23514',null,'Direct updates cannot move an allocation away from an existing payment');
select throws_ok($$select public.save_entity('work_items','{"id":"30000000-0000-4000-8000-000000000001","project_id":"10000000-0000-4000-8000-000000000001","budget_cents":99999}'::jsonb)$$,'23514',null,'Budget cannot drop below active allocations');
select throws_ok($$select public.save_entity('payments','{"project_id":"10000000-0000-4000-8000-000000000001","work_item_id":"30000000-0000-4000-8000-000000000001","contractor_id":"20000000-0000-4000-8000-000000000003","amount_cents":100,"date":"2026-01-02","description":"Unassigned"}'::jsonb)$$,'23514',null,'Beneficiary must be assigned to the work');
select throws_ok($$select public.save_entity('payments','{"project_id":"10000000-0000-4000-8000-000000000001","work_item_id":"30000000-0000-4000-8000-000000000001","contractor_id":"20000000-0000-4000-8000-000000000001","amount_cents":-1,"date":"2026-01-02","description":"Negative"}'::jsonb)$$,'23514',null,'Negative amounts are rejected by database constraints');
select throws_ok($$select public.save_entity('payments','{"project_id":"10000000-0000-4000-8000-000000000001","work_item_id":"30000000-0000-4000-8000-000000000001","contractor_id":"20000000-0000-4000-8000-000000000001","amount_cents":60000,"date":"2026-01-01","description":"First payment"}'::jsonb)$$,'23505',null,'Identical live payment cannot be entered twice');
select throws_ok($$select public.save_entity('work_items','{"id":"30000000-0000-4000-8000-000000000001","space_ids":["60000000-0000-4000-8000-000000000002"]}'::jsonb)$$,'23503',null,'Composite FKs reject spaces belonging to another project');
select throws_ok($$update public.projects set owner_id='00000000-0000-4000-8000-000000000004' where id='10000000-0000-4000-8000-000000000001'$$,'42501',null,'Owner cannot be reassigned through client privileges');
select lives_ok($$select public.save_entity('payments','{"id":"40000000-0000-4000-8000-000000000001","archived_at":"2026-01-03T00:00:00Z"}'::jsonb)$$,'Partial RPC can archive a payment atomically');
select is((select covered_by_payment_id from public.material_purchases where id='50000000-0000-4000-8000-000000000001'),'40000000-0000-4000-8000-000000000001'::uuid,'Archiving payment preserves its historical material relationship');
select ok(exists(select 1 from public.audit_events where entity_type='payments' and entity_id='40000000-0000-4000-8000-000000000001' and action='archived' and actor_id=auth.uid()),'Payment archive is audited');
select ok(not private.receipt_access('10000000-0000-4000-8000-000000000001/payment/40000000-0000-4000-8000-000000000001/70000000-0000-4000-8000-000000000001.jpg',false),'Archived payment receipts cannot be read through Storage');
select lives_ok($$select public.save_entity('material_purchases','{"id":"50000000-0000-4000-8000-000000000001","store":"Updated store"}'::jsonb)$$,'Existing historical coverage may be retained while editing a material');
select throws_ok($$select public.save_entity('material_purchases','{"project_id":"10000000-0000-4000-8000-000000000001","work_item_id":"30000000-0000-4000-8000-000000000001","contractor_id":"20000000-0000-4000-8000-000000000001","covered_by_payment_id":"40000000-0000-4000-8000-000000000001","amount_cents":100,"date":"2026-01-02","description":"New coverage"}'::jsonb)$$,'23514',null,'New coverage cannot point to an archived payment');
select lives_ok($$select public.save_entity('payments','{"id":"40000000-0000-4000-8000-000000000001","archived_at":null}'::jsonb)$$,'Payment can be restored with its original coverage');
select is((select sum(m.amount_cents)::bigint from public.material_purchases m where m.archived_at is null and not exists(select 1 from public.payments p where p.id=m.covered_by_payment_id and p.archived_at is null)),17500::bigint,'Restored payment prevents material expense from being counted twice');
select throws_ok($$select public.save_entity('material_purchases','{"id":"50000000-0000-4000-8000-000000000001","contractor_id":"20000000-0000-4000-8000-000000000002"}'::jsonb)$$,'23514',null,'Covered material must be assigned to the actual payment beneficiary');
update public.attachments set archived_at=now() where id='70000000-0000-4000-8000-000000000002';
select ok(not private.receipt_access('10000000-0000-4000-8000-000000000001/payment/40000000-0000-4000-8000-000000000002/70000000-0000-4000-8000-000000000002.jpg',false),'Known Storage path cannot bypass archived attachment metadata');
select throws_ok($$select public.save_entity('work_items','{"id":"30000000-0000-4000-8000-000000000001","assignments":[{"contractor_id":"20000000-0000-4000-8000-000000000001","allocation_cents":100001}]}'::jsonb)$$,'23514',null,'Assignment totals cannot exceed budget');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"app_role":"admin"}}',true);
select lives_ok($$select public.save_entity('projects','{"id":"10000000-0000-4000-8000-000000000009","name":"Provisioned project","owner_id":"00000000-0000-4000-8000-000000000004"}'::jsonb)$$,'Provisioned administrator can create a project');
select is((select owner_id from public.projects where id='10000000-0000-4000-8000-000000000009'),auth.uid(),'RPC sets real owner instead of trusting supplied owner_id');
select is((select role from public.project_members where project_id='10000000-0000-4000-8000-000000000009' and user_id=auth.uid()),'admin','Owner membership is created transactionally');
select lives_ok($$select public.save_entity('work_items','{"id":"30000000-0000-4000-8000-000000000001","archived_at":"2026-01-04T00:00:00Z"}'::jsonb)$$,'Work may be archived without deleting financial history');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select ok((select archived_at is not null from public.work_items where id='30000000-0000-4000-8000-000000000001'),'Assigned archived work remains readable for its contractor');
select is((select allocation_cents::bigint from public.work_assignments where work_item_id='30000000-0000-4000-8000-000000000001'),60000::bigint,'Archived work preserves the beneficiary allocation for historical debt');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$select public.save_entity('contractors','{"id":"20000000-0000-4000-8000-000000000001","archived_at":"2026-01-04T00:00:00Z"}'::jsonb)$$,'Contractor can be archived without deleting payments');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.projects),0::bigint,'Archived contractor cannot read project metadata even with a membership');
select is((select count(*) from public.spaces),0::bigint,'Archived contractor cannot read project catalogs');
select is((select count(*) from public.payments),0::bigint,'Archived contractor cannot read financial rows');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
update public.contractors set archived_at=null where id='20000000-0000-4000-8000-000000000001';
update public.project_members set archived_at=now() where project_id='10000000-0000-4000-8000-000000000001' and user_id='00000000-0000-4000-8000-000000000002';
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(public.claim_contractor_access(),0,'Repeated claim is idempotent and does not restore revoked membership');
select is((select count(*) from public.projects),0::bigint,'Archived membership revokes project visibility');
select is((select count(*) from public.payments),0::bigint,'Revoked member cannot read beneficiary payments');

reset role;
select * from finish();
rollback;
