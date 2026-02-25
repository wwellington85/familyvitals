alter table public.medications
add column if not exists item_type text not null default 'medication'
check (item_type in ('medication','supplement'));

create index if not exists idx_medications_profile_item_type
  on public.medications(profile_id, item_type);
