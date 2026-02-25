create table if not exists public.profile_invites (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner','editor','viewer')),
  invite_token text unique not null,
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  invited_by_user_id uuid not null references auth.users(id),
  accepted_by_user_id uuid references auth.users(id),
  accepted_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_profile_invites_profile_created
  on public.profile_invites(profile_id, created_at desc);
create index if not exists idx_profile_invites_token
  on public.profile_invites(invite_token);

alter table public.profile_invites enable row level security;

drop policy if exists "profile_invites_select_owner" on public.profile_invites;
create policy "profile_invites_select_owner"
on public.profile_invites
for select
using (public.has_profile_role(profile_id, array['owner']));

drop policy if exists "profile_invites_insert_owner" on public.profile_invites;
create policy "profile_invites_insert_owner"
on public.profile_invites
for insert
with check (
  public.has_profile_role(profile_id, array['owner'])
  and invited_by_user_id = auth.uid()
);

drop policy if exists "profile_invites_update_owner" on public.profile_invites;
create policy "profile_invites_update_owner"
on public.profile_invites
for update
using (public.has_profile_role(profile_id, array['owner']))
with check (public.has_profile_role(profile_id, array['owner']));

drop policy if exists "profile_invites_delete_owner" on public.profile_invites;
create policy "profile_invites_delete_owner"
on public.profile_invites
for delete
using (public.has_profile_role(profile_id, array['owner']));
