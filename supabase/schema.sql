create extension if not exists "pgcrypto";

create table if not exists public.garments (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
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

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'garments'
      and policyname = 'Users can read own garments'
  ) then
    create policy "Users can read own garments"
      on public.garments
      for select
      using (auth.uid()::text = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'garments'
      and policyname = 'Users can insert own garments'
  ) then
    create policy "Users can insert own garments"
      on public.garments
      for insert
      with check (auth.uid()::text = user_id);
  end if;
end $$;

-- Storage buckets you will want to create in Supabase:
-- garment-images
-- garment-tags
--
-- Recommended policy pattern:
-- allow authenticated users to upload to their own folder prefix (user_id/...)
-- and allow reads for public display or authenticated app access depending on your preference.
