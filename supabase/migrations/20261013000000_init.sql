-- Mosókonyha – initial schema
--
-- Model:
--   * Each floor has exactly one laundry-room key (floor_status row).
--   * A user picks up a key by scanning the printed QR code at the reception
--     (checkout_key) and returns it by scanning the same QR code again
--     (return_key). Every pickup is logged in key_checkouts.
--   * Users can ask to be notified when a floor's key becomes free
--     (free_watchers); the notification is sent as an Expo push via pg_net.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_net;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------------

-- Readable by the app (shown in the UI and used for client-side countdowns).
create table public.app_settings (
  id                 boolean primary key default true check (id),
  key_minutes        int not null default 240,  -- how long a key may be kept
  fee_huf            int not null default 500,  -- fee per started block of overtime
  fee_block_minutes  int not null default 30,
  grace_minutes      int not null default 0     -- overtime tolerated before fees start
);
insert into public.app_settings default values;

-- Secret part of the printed QR code. Never exposed through the API.
create table private.secrets (
  name  text primary key,
  value text not null
);
insert into private.secrets (name, value)
values ('reception_qr', encode(extensions.gen_random_bytes(18), 'hex'));

-- Only these e-mail domains may register (students: @edu.bme.hu).
create table private.allowed_email_domains (
  domain text primary key
);
insert into private.allowed_email_domains values ('edu.bme.hu');

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  email        text not null,
  display_name text check (char_length(btrim(display_name)) between 2 and 60),
  push_token   text,
  lang         text not null default 'hu' check (lang in ('hu', 'en')),
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "update own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid()));

-- Users may only change these columns (not is_admin / email).
revoke update on public.profiles from anon, authenticated;
grant update (display_name, push_token, lang) on public.profiles to authenticated;

create function private.check_email_domain() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from private.allowed_email_domains d
    where d.domain = lower(split_part(new.email, '@', 2))
  ) then
    raise exception 'email_domain_not_allowed';
  end if;
  return new;
end $$;

create function private.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end $$;

create trigger check_email_domain before insert on auth.users
  for each row execute function private.check_email_domain();
create trigger create_profile after insert on auth.users
  for each row execute function private.create_profile();

-- ---------------------------------------------------------------------------
-- Keys
-- ---------------------------------------------------------------------------

-- Current state of each floor's key. Readable by every signed-in student,
-- written only by the functions below.
create table public.floor_status (
  floor         smallint primary key check (floor between 1 and 6),
  holder_id     uuid references public.profiles on delete set null,
  holder_name   text,
  picked_up_at  timestamptz,
  checkout_id   bigint
);
insert into public.floor_status (floor) select generate_series(1, 6);

alter table public.floor_status enable row level security;
create policy "students see all keys" on public.floor_status
  for select to authenticated using (true);

-- History of every pickup (one row per pickup).
create table public.key_checkouts (
  id                bigint generated always as identity primary key,
  floor             smallint not null references public.floor_status,
  user_id           uuid not null references public.profiles on delete cascade,
  picked_up_at      timestamptz not null default now(),
  returned_at       timestamptz,
  force_returned_by uuid references public.profiles,
  overtime_minutes  int,
  fee_huf           int
);
create unique index one_active_key_per_floor on public.key_checkouts (floor) where returned_at is null;
create unique index one_active_key_per_user on public.key_checkouts (user_id) where returned_at is null;

alter table public.key_checkouts enable row level security;
create policy "read own checkouts" on public.key_checkouts
  for select to authenticated using (user_id = (select auth.uid()));

-- "Notify me when this floor's key is free". Deleted once notified.
create table public.free_watchers (
  user_id    uuid not null references public.profiles on delete cascade default auth.uid(),
  floor      smallint not null references public.floor_status,
  created_at timestamptz not null default now(),
  primary key (user_id, floor)
);
alter table public.free_watchers enable row level security;
create policy "manage own watches" on public.free_watchers
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Logic
-- ---------------------------------------------------------------------------

-- Overtime in whole minutes (rounded up) and the resulting fee.
create function public.overtime_fee(p_picked_up_at timestamptz, p_at timestamptz,
                                    out overtime_minutes int, out fee_huf int)
language sql stable set search_path = '' as $$
  select
    greatest(0, ceil(extract(epoch from (p_at - p_picked_up_at)) / 60 - s.key_minutes))::int,
    (ceil(greatest(0, extract(epoch from (p_at - p_picked_up_at)) / 60 - s.key_minutes - s.grace_minutes)
          / s.fee_block_minutes) * s.fee_huf)::int
  from public.app_settings s
$$;

create function private.qr_is_valid(p_code text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.secrets where name = 'reception_qr' and value = p_code)
$$;

-- Sends an Expo push to everybody waiting for this floor, then forgets them.
create function private.notify_floor_free(p_floor smallint) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_messages jsonb;
begin
  select jsonb_agg(jsonb_build_object(
           'to', p.push_token,
           'sound', 'default',
           'channelId', 'key-free',
           'title', case p.lang when 'en' then 'Key available!' else 'Szabad a kulcs!' end,
           'body', case p.lang
                     when 'en' then format('The laundry key for floor %s is free.', p_floor)
                     else format('A(z) %s. emeleti mosókonyha kulcsa szabad.', p_floor) end,
           'data', jsonb_build_object('floor', p_floor)))
    into v_messages
    from public.free_watchers w
    join public.profiles p on p.id = w.user_id
   where w.floor = p_floor and p.push_token is not null;

  delete from public.free_watchers where floor = p_floor;

  if v_messages is not null then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := v_messages,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
    );
  end if;
end $$;

-- Closes a checkout and frees the floor. Returns the closed row.
create function private.close_checkout(p_checkout_id bigint, p_forced_by uuid)
returns public.key_checkouts
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.key_checkouts;
begin
  update public.key_checkouts c
     set returned_at = now(),
         force_returned_by = p_forced_by,
         (overtime_minutes, fee_huf) =
           (select f.overtime_minutes, f.fee_huf from public.overtime_fee(c.picked_up_at, now()) f)
   where c.id = p_checkout_id and c.returned_at is null
  returning c.* into v_row;

  update public.floor_status
     set holder_id = null, holder_name = null, picked_up_at = null, checkout_id = null
   where floor = v_row.floor;

  perform private.notify_floor_free(v_row.floor);
  return v_row;
end $$;

-- Pick up the key of a floor. p_code is the content of the reception QR code.
create function public.checkout_key(p_floor int, p_code text)
returns public.key_checkouts
language plpgsql security definer set search_path = '' as $$
declare
  v_uid    uuid := auth.uid();
  v_name   text;
  v_status public.floor_status;
  v_row    public.key_checkouts;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not private.qr_is_valid(p_code) then raise exception 'invalid_qr'; end if;

  select display_name into v_name from public.profiles where id = v_uid;
  if v_name is null then raise exception 'no_display_name'; end if;

  -- Lock the floor so two people can't take the same key at once.
  select * into v_status from public.floor_status where floor = p_floor for update;
  if not found then raise exception 'unknown_floor'; end if;
  if v_status.holder_id is not null then raise exception 'floor_taken'; end if;
  if exists (select 1 from public.key_checkouts where user_id = v_uid and returned_at is null) then
    raise exception 'already_holding_key';
  end if;

  insert into public.key_checkouts (floor, user_id) values (p_floor, v_uid)
  returning * into v_row;

  update public.floor_status
     set holder_id = v_uid, holder_name = v_name,
         picked_up_at = v_row.picked_up_at, checkout_id = v_row.id
   where floor = p_floor;

  -- You obviously don't need a "free" notification for a key you hold.
  delete from public.free_watchers where user_id = v_uid and floor = p_floor;
  return v_row;
end $$;

-- Return the key you hold. p_code is the content of the reception QR code.
create function public.return_key(p_code text)
returns public.key_checkouts
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id  bigint;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not private.qr_is_valid(p_code) then raise exception 'invalid_qr'; end if;

  select c.id into v_id
    from public.key_checkouts c
    join public.floor_status s on s.floor = c.floor
   where c.user_id = v_uid and c.returned_at is null
     for update of s;
  if v_id is null then raise exception 'no_active_key'; end if;

  return private.close_checkout(v_id, null);
end $$;

-- For admins: free a key someone forgot to return in the app.
create function public.admin_force_return(p_floor int)
returns public.key_checkouts
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id  bigint;
begin
  if not exists (select 1 from public.profiles where id = v_uid and is_admin) then
    raise exception 'not_admin';
  end if;

  select checkout_id into v_id from public.floor_status where floor = p_floor for update;
  if v_id is null then raise exception 'floor_already_free'; end if;

  return private.close_checkout(v_id, v_uid);
end $$;

revoke execute on all functions in schema public from public, anon;
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function public.checkout_key(int, text),
                          public.return_key(text),
                          public.admin_force_return(int),
                          public.overtime_fee(timestamptz, timestamptz)
  to authenticated;

grant select on public.app_settings to authenticated;
alter table public.app_settings enable row level security;
create policy "everyone reads settings" on public.app_settings
  for select to authenticated using (true);

-- Live updates of the key list.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.floor_status;
  end if;
end $$;
