create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.garments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  brand text,
  size text,
  primary_color text not null,
  secondary_colors text[] not null default '{}',
  pattern text,
  style_tags text[] not null default '{}',
  season text[] not null default '{}',
  occasion text[] not null default '{}',
  fit text,
  material_composition jsonb not null default '[]'::jsonb,
  care_instructions text[] not null default '{}',
  confidence numeric(4,3) not null default 0.5,
  image_url text not null,
  tag_image_url text,
  notes text,
  last_worn_at date,
  ai_analysis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists garments_user_id_idx on public.garments (user_id);
create index if not exists garments_category_idx on public.garments (category);
create index if not exists garments_primary_color_idx on public.garments (primary_color);
create index if not exists garments_created_at_idx on public.garments (created_at desc);

alter table public.garments enable row level security;

drop policy if exists "Users can read own garments" on public.garments;
create policy "Users can read own garments"
  on public.garments
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own garments" on public.garments;
create policy "Users can insert own garments"
  on public.garments
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own garments" on public.garments;
create policy "Users can update own garments"
  on public.garments
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own garments" on public.garments;
create policy "Users can delete own garments"
  on public.garments
  for delete
  to authenticated
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('garment-images', 'garment-images', true)
on conflict (id) do update
  set name = excluded.name,
      public = excluded.public;

insert into storage.buckets (id, name, public)
values ('garment-tags', 'garment-tags', true)
on conflict (id) do update
  set name = excluded.name,
      public = excluded.public;

drop policy if exists "Users can read garment files" on storage.objects;
create policy "Users can read garment files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id in ('garment-images', 'garment-tags')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can upload garment files" on storage.objects;
create policy "Users can upload garment files"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id in ('garment-images', 'garment-tags')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update garment files" on storage.objects;
create policy "Users can update garment files"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id in ('garment-images', 'garment-tags')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('garment-images', 'garment-tags')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete garment files" on storage.objects;
create policy "Users can delete garment files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id in ('garment-images', 'garment-tags')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
