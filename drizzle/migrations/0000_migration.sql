
create type public.app_role as enum ('admin','masseur','customer');
create type public.listing_status as enum ('pending','approved','rejected','suspended');
create type public.payment_status as enum ('pending','success','failed','cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.guard_profile_update() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.is_suspended is distinct from old.is_suspended and not public.has_role(auth.uid(),'admin') and coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'Not allowed';
  end if;
  return new;
end $$;
create trigger trg_guard_profile before update on public.profiles for each row execute function public.guard_profile_update();

create table public.platform_settings (
  id int primary key default 1 check (id = 1),
  fee_type text not null default 'fixed' check (fee_type in ('fixed','percent')),
  fee_value integer not null default 1000 check (fee_value >= 0),
  min_base_price integer not null default 1000,
  max_base_price integer not null default 100000,
  access_hours integer not null default 24,
  updated_at timestamptz not null default now()
);
insert into public.platform_settings (id) values (1);
grant select on public.platform_settings to authenticated;
grant all on public.platform_settings to service_role;
alter table public.platform_settings enable row level security;
create policy "settings read" on public.platform_settings for select to authenticated using (true);

create or replace function public.compute_fee(_base integer) returns integer language sql stable security definer set search_path=public as $$
  select case when fee_type = 'percent' then round(_base * fee_value / 100.0)::int else fee_value end from public.platform_settings where id = 1
$$;

create table public.masseurs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  display_name text not null,
  location text not null default '',
  massage_types text[] not null default '{}',
  short_bio text not null default '',
  bio text not null default '',
  experience_years integer not null default 0,
  base_price integer not null default 5000,
  status listing_status not null default 'pending',
  is_published boolean not null default false,
  demo_cover text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.masseurs to authenticated;
grant all on public.masseurs to service_role;
alter table public.masseurs enable row level security;
create policy "masseur own read" on public.masseurs for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "masseur own update" on public.masseurs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.guard_masseur_update() returns trigger language plpgsql security definer set search_path=public as $$
declare s public.platform_settings;
begin
  if coalesce(auth.role(),'') = 'service_role' or auth.uid() is null then
    new.updated_at = now(); return new;
  end if;
  new.status = old.status; new.is_published = old.is_published; new.user_id = old.user_id; new.is_demo = old.is_demo; new.demo_cover = old.demo_cover;
  select * into s from public.platform_settings where id = 1;
  if new.base_price < s.min_base_price or new.base_price > s.max_base_price then
    raise exception 'Base price must be between % and % RWF', s.min_base_price, s.max_base_price;
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger trg_guard_masseur before update on public.masseurs for each row execute function public.guard_masseur_update();

create table public.masseur_contacts (
  masseur_id uuid primary key references public.masseurs(id) on delete cascade,
  phone text, whatsapp text, email text, other_info text,
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.masseur_contacts to authenticated;
grant all on public.masseur_contacts to service_role;
alter table public.masseur_contacts enable row level security;
create policy "contacts owner" on public.masseur_contacts for all to authenticated
  using (exists (select 1 from public.masseurs m where m.id = masseur_id and m.user_id = auth.uid()) or public.has_role(auth.uid(),'admin'))
  with check (exists (select 1 from public.masseurs m where m.id = masseur_id and m.user_id = auth.uid()));

create table public.masseur_services (
  id uuid primary key default gen_random_uuid(),
  masseur_id uuid not null references public.masseurs(id) on delete cascade,
  name text not null, description text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.masseur_services to authenticated;
grant all on public.masseur_services to service_role;
alter table public.masseur_services enable row level security;
create policy "services owner" on public.masseur_services for all to authenticated
  using (exists (select 1 from public.masseurs m where m.id = masseur_id and m.user_id = auth.uid()) or public.has_role(auth.uid(),'admin'))
  with check (exists (select 1 from public.masseurs m where m.id = masseur_id and m.user_id = auth.uid()));

create table public.masseur_photos (
  id uuid primary key default gen_random_uuid(),
  masseur_id uuid not null references public.masseurs(id) on delete cascade,
  storage_path text not null,
  is_public boolean not null default false,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.masseur_photos to authenticated;
grant all on public.masseur_photos to service_role;
alter table public.masseur_photos enable row level security;
create policy "photos owner" on public.masseur_photos for all to authenticated
  using (exists (select 1 from public.masseurs m where m.id = masseur_id and m.user_id = auth.uid()) or public.has_role(auth.uid(),'admin'))
  with check (exists (select 1 from public.masseurs m where m.id = masseur_id and m.user_id = auth.uid()) and storage_path like auth.uid()::text || '/%');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  masseur_id uuid not null references public.masseurs(id) on delete restrict,
  base_price integer not null,
  platform_fee integer not null,
  total integer not null,
  status payment_status not null default 'pending',
  backend_reference text,
  instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant all on public.payments to service_role;
alter table public.payments enable row level security;

create table public.access_grants (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  masseur_id uuid not null references public.masseurs(id) on delete cascade,
  payment_id uuid not null unique references public.payments(id),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
grant all on public.access_grants to service_role;
alter table public.access_grants enable row level security;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  target text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare r app_role;
begin
  insert into public.profiles (id, display_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)), new.email);
  r := case when new.raw_user_meta_data->>'account_type' = 'masseur' then 'masseur'::app_role else 'customer'::app_role end;
  insert into public.user_roles (user_id, role) values (new.id, r);
  if r = 'masseur' then
    insert into public.masseurs (user_id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create policy "photo upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'masseur-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photo delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'masseur-photos' and (storage.foldername(name))[1] = auth.uid()::text);

with ins as (
  insert into public.masseurs (display_name, location, massage_types, short_bio, bio, experience_years, base_price, status, is_published, demo_cover, is_demo) values
  ('Aline Uwase','Kigali', array['Swedish','Deep tissue'], 'Calm, restorative sessions focused on tension relief.', 'Certified therapist with a gentle approach. Home visits and hotel calls across Kigali.', 6, 5000, 'approved', true, '/images/demo-1.jpg', true),
  ('Eric Habimana','Kigali', array['Sports','Deep tissue'], 'Sports recovery for runners and gym regulars.', 'Former athletics coach specialising in recovery and mobility.', 8, 7000, 'approved', true, '/images/demo-2.jpg', true),
  ('Grace Mukamana','Musanze', array['Aromatherapy','Swedish'], 'Aromatherapy with locally sourced oils.', 'Relaxing aromatherapy sessions near Volcanoes park lodges.', 4, 4000, 'approved', true, '/images/demo-3.jpg', true),
  ('Jean Claude Niyonzima','Rubavu', array['Hot stone','Reflexology'], 'Hot stone and reflexology by Lake Kivu.', 'Lakeside wellness sessions for visitors and residents.', 10, 9000, 'approved', true, '/images/demo-4.jpg', true)
  returning id
)
insert into public.masseur_contacts (masseur_id, phone, whatsapp, email, other_info)
select id, '+250788000000', '+250788000000', 'demo@example.rw', 'Demo listing – not a real person' from ins;

insert into public.masseur_services (masseur_id, name, description)
select id, unnest(massage_types) || ' massage', '60 or 90 minute sessions' from public.masseurs where is_demo;
