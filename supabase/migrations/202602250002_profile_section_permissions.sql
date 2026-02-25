create table if not exists public.profile_section_permissions (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  section text not null check (section in ('documents','labs','vitals','medications','snapshots','insights')),
  can_read boolean not null default true,
  created_by_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (profile_id, user_id, section)
);

create index if not exists idx_profile_section_permissions_user on public.profile_section_permissions(user_id);

alter table public.profile_section_permissions enable row level security;

drop policy if exists "profile_section_permissions_select_member" on public.profile_section_permissions;
create policy "profile_section_permissions_select_member"
on public.profile_section_permissions
for select
using (public.has_profile_role(profile_id, array['owner','editor','viewer']));

drop policy if exists "profile_section_permissions_owner_insert" on public.profile_section_permissions;
create policy "profile_section_permissions_owner_insert"
on public.profile_section_permissions
for insert
with check (
  public.has_profile_role(profile_id, array['owner'])
  and created_by_user_id = auth.uid()
);

drop policy if exists "profile_section_permissions_owner_update" on public.profile_section_permissions;
create policy "profile_section_permissions_owner_update"
on public.profile_section_permissions
for update
using (public.has_profile_role(profile_id, array['owner']))
with check (public.has_profile_role(profile_id, array['owner']));

drop policy if exists "profile_section_permissions_owner_delete" on public.profile_section_permissions;
create policy "profile_section_permissions_owner_delete"
on public.profile_section_permissions
for delete
using (public.has_profile_role(profile_id, array['owner']));

create or replace function public.has_section_read_access(profile_uuid uuid, section_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with my_role as (
    select pa.role
    from public.profile_access pa
    where pa.profile_id = profile_uuid
      and pa.user_id = auth.uid()
    limit 1
  ),
  override_row as (
    select psp.can_read
    from public.profile_section_permissions psp
    where psp.profile_id = profile_uuid
      and psp.user_id = auth.uid()
      and psp.section = section_name
    limit 1
  )
  select case
    when exists (select 1 from my_role where role = 'owner') then true
    when exists (select 1 from override_row) then (select can_read from override_row)
    when exists (select 1 from my_role where role in ('editor','viewer')) then true
    else false
  end;
$$;

drop policy if exists "documents_select_member" on public.documents;
create policy "documents_select_member"
on public.documents
for select
using (public.has_section_read_access(profile_id, 'documents'));

drop policy if exists "observations_select_member" on public.observations;
create policy "observations_select_member"
on public.observations
for select
using (
  (category = 'lab' and public.has_section_read_access(profile_id, 'labs'))
  or
  (category = 'vital' and public.has_section_read_access(profile_id, 'vitals'))
);

drop policy if exists "medications_select_member" on public.medications;
create policy "medications_select_member"
on public.medications
for select
using (public.has_section_read_access(profile_id, 'medications'));

drop policy if exists "medication_events_select_member" on public.medication_events;
create policy "medication_events_select_member"
on public.medication_events
for select
using (
  public.has_section_read_access(public.profile_id_for_medication(medication_id), 'medications')
);

drop policy if exists "snapshots_select_owner_only" on public.snapshots;
drop policy if exists "snapshots_select_member" on public.snapshots;
create policy "snapshots_select_member"
on public.snapshots
for select
using (public.has_section_read_access(profile_id, 'snapshots'));

drop policy if exists "insights_select_member" on public.insights;
create policy "insights_select_member"
on public.insights
for select
using (public.has_section_read_access(profile_id, 'insights'));

drop policy if exists "health_docs_select_member" on storage.objects;
create policy "health_docs_select_member" on storage.objects
for select to authenticated
using (
  bucket_id = 'health_docs'
  and (
    (
      split_part(name, '/', 2) = 'documents'
      and public.has_section_read_access(public.storage_object_profile_uuid(name), 'documents')
    )
    or
    (
      split_part(name, '/', 2) = 'snapshots'
      and public.has_section_read_access(public.storage_object_profile_uuid(name), 'snapshots')
    )
  )
);
