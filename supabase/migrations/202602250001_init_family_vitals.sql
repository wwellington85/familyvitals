create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  created_by_user_id uuid not null references auth.users(id),
  full_name text not null,
  birth_date date,
  sex text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.profile_access (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','editor','viewer')),
  created_at timestamptz default now(),
  primary key (profile_id, user_id)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  uploaded_by_user_id uuid not null references auth.users(id),
  filename text not null,
  storage_path text not null,
  collected_at date,
  doc_type text check (doc_type in ('lab','imaging','note')) default 'lab',
  status text check (status in ('uploaded','extracting','extracted','reviewed','error')) default 'uploaded',
  extracted_json jsonb,
  created_at timestamptz default now()
);

create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  source_document_id uuid references public.documents(id) on delete set null,
  category text not null check (category in ('lab','vital')),
  name text not null,
  code_system text,
  code text,
  effective_datetime timestamptz not null,
  issued_datetime timestamptz,
  value_number double precision,
  value_text text,
  unit text,
  reference_low double precision,
  reference_high double precision,
  flagged text check (flagged in ('H','L','N','U')) default 'U',
  extraction_confidence double precision,
  status text not null check (status in ('extracted','user_edited','manual')),
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  medication_name text not null,
  code_system text,
  code text,
  indication text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.medication_events (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medications(id) on delete cascade,
  event_type text not null check (event_type in ('start','dose_change','pause','resume','stop')),
  event_date date not null,
  dosage text,
  frequency text,
  route text,
  prescribed_by text,
  reason text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.snapshots (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_by_user_id uuid not null references auth.users(id),
  share_token text unique not null,
  expires_at timestamptz not null,
  snapshot_json jsonb not null,
  snapshot_markdown text not null,
  pdf_storage_path text,
  created_at timestamptz default now()
);

create table if not exists public.insights (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_by_user_id uuid not null references auth.users(id),
  metrics text[] not null default '{}',
  summary text not null,
  clinician_questions text[] not null default '{}',
  disclaimer text not null default 'This is not medical advice and not a diagnosis.',
  created_at timestamptz default now()
);

create index if not exists idx_profile_access_user on public.profile_access(user_id);
create index if not exists idx_documents_profile_created on public.documents(profile_id, created_at desc);
create index if not exists idx_observations_profile_effective on public.observations(profile_id, effective_datetime desc);
create index if not exists idx_observations_source_doc on public.observations(source_document_id);
create index if not exists idx_medications_profile on public.medications(profile_id);
create index if not exists idx_medication_events_med_date on public.medication_events(medication_id, event_date desc);
create index if not exists idx_snapshots_token on public.snapshots(share_token);
create index if not exists idx_snapshots_profile_created on public.snapshots(profile_id, created_at desc);
create index if not exists idx_insights_profile_created on public.insights(profile_id, created_at desc);

create or replace function public.has_profile_role(profile_uuid uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profile_access pa
    where pa.profile_id = profile_uuid
      and pa.user_id = auth.uid()
      and pa.role = any(allowed_roles)
  );
$$;

create or replace function public.profile_id_for_medication(med_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.profile_id from public.medications m where m.id = med_uuid;
$$;

create or replace function public.auto_add_profile_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profile_access(profile_id, user_id, role)
  values (new.id, new.created_by_user_id, 'owner')
  on conflict (profile_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_auto_add_profile_owner on public.profiles;
create trigger trg_auto_add_profile_owner
after insert on public.profiles
for each row execute function public.auto_add_profile_owner();

alter table public.profiles enable row level security;
alter table public.profile_access enable row level security;
alter table public.documents enable row level security;
alter table public.observations enable row level security;
alter table public.medications enable row level security;
alter table public.medication_events enable row level security;
alter table public.snapshots enable row level security;
alter table public.insights enable row level security;

create policy "profiles_select_member" on public.profiles
for select using (public.has_profile_role(id, array['owner','editor','viewer']));

create policy "profiles_insert_self" on public.profiles
for insert with check (created_by_user_id = auth.uid());

create policy "profiles_update_owner_editor" on public.profiles
for update using (public.has_profile_role(id, array['owner','editor']))
with check (public.has_profile_role(id, array['owner','editor']));

create policy "profiles_delete_owner" on public.profiles
for delete using (public.has_profile_role(id, array['owner']));

create policy "profile_access_select_member" on public.profile_access
for select using (public.has_profile_role(profile_id, array['owner','editor','viewer']));

create policy "profile_access_insert_owner_only" on public.profile_access
for insert with check (
  public.has_profile_role(profile_id, array['owner'])
  and role in ('owner','editor','viewer')
);

create policy "profile_access_update_owner_only" on public.profile_access
for update using (public.has_profile_role(profile_id, array['owner']))
with check (public.has_profile_role(profile_id, array['owner']));

create policy "profile_access_delete_owner_only" on public.profile_access
for delete using (public.has_profile_role(profile_id, array['owner']));

create policy "documents_select_member" on public.documents
for select using (public.has_profile_role(profile_id, array['owner','editor','viewer']));

create policy "documents_insert_owner_editor" on public.documents
for insert with check (
  public.has_profile_role(profile_id, array['owner','editor'])
  and uploaded_by_user_id = auth.uid()
);

create policy "documents_update_owner_editor" on public.documents
for update using (public.has_profile_role(profile_id, array['owner','editor']))
with check (public.has_profile_role(profile_id, array['owner','editor']));

create policy "documents_delete_owner_editor" on public.documents
for delete using (public.has_profile_role(profile_id, array['owner','editor']));

create policy "observations_select_member" on public.observations
for select using (public.has_profile_role(profile_id, array['owner','editor','viewer']));

create policy "observations_insert_owner_editor" on public.observations
for insert with check (public.has_profile_role(profile_id, array['owner','editor']));

create policy "observations_update_owner_editor" on public.observations
for update using (public.has_profile_role(profile_id, array['owner','editor']))
with check (public.has_profile_role(profile_id, array['owner','editor']));

create policy "observations_delete_owner_editor" on public.observations
for delete using (public.has_profile_role(profile_id, array['owner','editor']));

create policy "medications_select_member" on public.medications
for select using (public.has_profile_role(profile_id, array['owner','editor','viewer']));

create policy "medications_insert_owner_editor" on public.medications
for insert with check (public.has_profile_role(profile_id, array['owner','editor']));

create policy "medications_update_owner_editor" on public.medications
for update using (public.has_profile_role(profile_id, array['owner','editor']))
with check (public.has_profile_role(profile_id, array['owner','editor']));

create policy "medications_delete_owner_editor" on public.medications
for delete using (public.has_profile_role(profile_id, array['owner','editor']));

create policy "medication_events_select_member" on public.medication_events
for select using (
  public.has_profile_role(public.profile_id_for_medication(medication_id), array['owner','editor','viewer'])
);

create policy "medication_events_insert_owner_editor" on public.medication_events
for insert with check (
  public.has_profile_role(public.profile_id_for_medication(medication_id), array['owner','editor'])
);

create policy "medication_events_update_owner_editor" on public.medication_events
for update using (
  public.has_profile_role(public.profile_id_for_medication(medication_id), array['owner','editor'])
)
with check (
  public.has_profile_role(public.profile_id_for_medication(medication_id), array['owner','editor'])
);

create policy "medication_events_delete_owner_editor" on public.medication_events
for delete using (
  public.has_profile_role(public.profile_id_for_medication(medication_id), array['owner','editor'])
);

create policy "snapshots_select_owner_only" on public.snapshots
for select using (public.has_profile_role(profile_id, array['owner']));

create policy "snapshots_insert_owner_only" on public.snapshots
for insert with check (
  public.has_profile_role(profile_id, array['owner'])
  and created_by_user_id = auth.uid()
);

create policy "snapshots_update_owner_only" on public.snapshots
for update using (public.has_profile_role(profile_id, array['owner']))
with check (public.has_profile_role(profile_id, array['owner']));

create policy "snapshots_delete_owner_only" on public.snapshots
for delete using (public.has_profile_role(profile_id, array['owner']));

create policy "insights_select_member" on public.insights
for select using (public.has_profile_role(profile_id, array['owner','editor','viewer']));

create policy "insights_insert_owner_editor" on public.insights
for insert with check (
  public.has_profile_role(profile_id, array['owner','editor'])
  and created_by_user_id = auth.uid()
);

create policy "insights_update_owner_editor" on public.insights
for update using (public.has_profile_role(profile_id, array['owner','editor']))
with check (public.has_profile_role(profile_id, array['owner','editor']));

create policy "insights_delete_owner_editor" on public.insights
for delete using (public.has_profile_role(profile_id, array['owner','editor']));

insert into storage.buckets (id, name, public)
values ('health_docs', 'health_docs', false)
on conflict (id) do nothing;

create or replace function public.storage_object_profile_uuid(object_name text)
returns uuid
language sql
stable
as $$
  select case
    when split_part(object_name, '/', 1) ~* '^[0-9a-fA-F-]{36}$' then split_part(object_name, '/', 1)::uuid
    else null
  end;
$$;

create policy "health_docs_select_member" on storage.objects
for select to authenticated
using (
  bucket_id = 'health_docs'
  and public.has_profile_role(public.storage_object_profile_uuid(name), array['owner','editor','viewer'])
);

create policy "health_docs_insert_owner_editor" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'health_docs'
  and public.has_profile_role(public.storage_object_profile_uuid(name), array['owner','editor'])
);

create policy "health_docs_update_owner_editor" on storage.objects
for update to authenticated
using (
  bucket_id = 'health_docs'
  and public.has_profile_role(public.storage_object_profile_uuid(name), array['owner','editor'])
)
with check (
  bucket_id = 'health_docs'
  and public.has_profile_role(public.storage_object_profile_uuid(name), array['owner','editor'])
);

create policy "health_docs_delete_owner_editor" on storage.objects
for delete to authenticated
using (
  bucket_id = 'health_docs'
  and public.has_profile_role(public.storage_object_profile_uuid(name), array['owner','editor'])
);
