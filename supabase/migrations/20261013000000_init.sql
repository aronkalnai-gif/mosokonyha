-- Mosókonyha – initial schema
--
-- Model:
--   * No login: users sign in anonymously and register with a name plus the
--     code from the reception QR code (public.register).
--   * Each floor has exactly one laundry-room key (floor_status row).
--   * A user picks up a key by scanning the printed QR code at the reception
--     (checkout_key) and returns it by scanning the same QR code again
--     (return_key). Every pickup is logged in key_checkouts.
--   * Machine timers are stored per user (machine_timers).
--   * Notifications (key time reminders, machine finished, key free) are
--     queued in private.push_outbox with the time they are due. A cron job
--     calls the send-pushes Edge Function, which delivers them as Web Push
--     messages to the user's browsers (push_subscriptions).

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_net;
create extension if not exists pg_cron;

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

alter table public.app_settings enable row level security;
create policy "everyone reads settings" on public.app_settings
  for select to authenticated using (true);

-- Secret part of the printed QR code. Never exposed through the API.
create table private.secrets (
  name  text primary key,
  value text not null
);
insert into private.secrets (name, value)
values ('reception_qr', encode(extensions.gen_random_bytes(18), 'hex'));

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

-- There is no login: the page signs in anonymously (Supabase anonymous
-- sign-ins), and the user becomes "registered" by entering a name together
-- with the code from the reception QR code (public.register). Only
-- registered users can see the keys.
create table public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  display_name  text check (char_length(btrim(display_name)) between 2 and 60),
  room          text check (room ~ '^[0-9A-Za-z./ -]{1,10}$'),
  registered_at timestamptz,
  lang          text not null default 'hu' check (lang in ('hu', 'en')),
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now(),
  check (registered_at is null or (display_name is not null and room is not null))
);

alter table public.profiles enable row level security;

create policy "read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "update own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid()));

-- Users may only change these columns (not registered_at / is_admin).
revoke update on public.profiles from anon, authenticated;
grant update (display_name, room, lang) on public.profiles to authenticated;

create function private.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end $$;

create trigger create_profile after insert on auth.users
  for each row execute function private.create_profile();

-- Used by the row-level security policies below.
create function public.is_registered() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and registered_at is not null)
$$;

-- ---------------------------------------------------------------------------
-- Keys
-- ---------------------------------------------------------------------------

-- Current state of each floor's key. Readable by every registered user,
-- written only by the functions below.
create table public.floor_status (
  floor         smallint primary key check (floor between 1 and 6),
  holder_id     uuid references public.profiles on delete set null,
  holder_name   text,
  holder_room   text,
  picked_up_at  timestamptz,
  checkout_id   bigint
);
insert into public.floor_status (floor) select generate_series(1, 6);

alter table public.floor_status enable row level security;
create policy "registered users see all keys" on public.floor_status
  for select to authenticated using ((select public.is_registered()));

-- Renaming yourself (or changing your room) while holding a key updates the list.
create function private.sync_holder_name() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.floor_status
     set holder_name = new.display_name, holder_room = new.room
   where holder_id = new.id;
  return null;
end $$;

create trigger sync_holder_name after update of display_name, room on public.profiles
  for each row execute function private.sync_holder_name();

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
  with check (user_id = (select auth.uid()) and (select public.is_registered()));

-- ---------------------------------------------------------------------------
-- Machine timers
-- ---------------------------------------------------------------------------

-- machine_id is "<floor>-w1", "<floor>-w2" (washers) or "<floor>-d1" (dryer).
create table public.machine_timers (
  user_id    uuid not null references public.profiles on delete cascade default auth.uid(),
  machine_id text not null check (machine_id ~ '^[1-6]-(w[12]|d1)$'),
  started_at timestamptz not null default now(),
  ends_at    timestamptz not null,
  primary key (user_id, machine_id)
);
alter table public.machine_timers enable row level security;
create policy "read own timers" on public.machine_timers
  for select to authenticated using (user_id = (select auth.uid()));
create policy "delete own timers" on public.machine_timers
  for delete to authenticated using (user_id = (select auth.uid()));
-- You can only set timers in the laundry room whose key you hold.
create policy "set timers in your room" on public.machine_timers
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.floor_status s
                where s.holder_id = (select auth.uid())
                  and s.floor = split_part(machine_id, '-', 1)::smallint)
  );
create policy "change own timers" on public.machine_timers
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Push notifications
-- ---------------------------------------------------------------------------

-- One row per browser that allowed notifications.
create table public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null references public.profiles on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "read own subscriptions" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "delete own subscriptions" on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

-- Messages waiting to be sent. kind: key_soon, key_over, machine_done, key_free.
create table private.push_outbox (
  id       bigint generated always as identity primary key,
  user_id  uuid not null references public.profiles on delete cascade,
  kind     text not null,
  ref      text,                -- checkout id / machine id, used to cancel
  title    text not null,
  body     text not null,
  url      text not null default '/',
  send_at  timestamptz not null default now(),
  sent_at  timestamptz
);
create index push_outbox_due on private.push_outbox (send_at) where sent_at is null;

-- Message texts in the user's language.
create function private.message(p_lang text, p_kind text, p_floor int, p_machine text default null,
                                out title text, out body text)
language plpgsql stable set search_path = '' as $$
declare
  v_block   int := (select fee_block_minutes from public.app_settings);
  v_fee     int := (select fee_huf from public.app_settings);
  v_machine text := case
    when p_machine like '%-w%' then
      case p_lang when 'en' then 'Washer ' else '' end || right(p_machine, 1)
      || case p_lang when 'en' then '' else '. mosógép' end
    when p_machine like '%-d%' then case p_lang when 'en' then 'Dryer' else 'Szárítógép' end
  end;
begin
  if p_lang = 'en' then
    case p_kind
      when 'key_soon' then title := 'Your key time is almost up';
                           body  := format('Return the floor %s key in 15 minutes.', p_floor);
      when 'key_over' then title := 'Your key time is up';
                           body  := format('Please return the key! Every started %s minutes costs %s Ft.',
                                           v_block, v_fee);
      when 'machine_done' then title := v_machine || ' finished!';
                               body  := format('Take your laundry out on floor %s.', p_floor);
      when 'key_free' then title := 'Key available!';
                           body  := format('The laundry key for floor %s is free.', p_floor);
    end case;
  else
    case p_kind
      when 'key_soon' then title := 'Hamarosan lejár a kulcsidőd';
                           body  := format('15 perc múlva vissza kell vinned a(z) %s. emeleti kulcsot.', p_floor);
      when 'key_over' then title := 'Lejárt a kulcsidőd';
                           body  := format('Vidd vissza a kulcsot! Minden megkezdett %s perc %s Ft.',
                                           v_block, v_fee);
      when 'machine_done' then title := v_machine || ' kész!';
                               body  := format('Vedd ki a ruhákat a(z) %s. emeleten.', p_floor);
      when 'key_free' then title := 'Szabad a kulcs!';
                           body  := format('A(z) %s. emeleti mosókonyha kulcsa szabad.', p_floor);
    end case;
  end if;
end $$;

create function private.queue_push(p_user uuid, p_kind text, p_ref text, p_floor int,
                                   p_send_at timestamptz, p_machine text default null, p_url text default '/')
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_lang text;
  v_msg  record;
begin
  select lang into v_lang from public.profiles where id = p_user;
  select * into v_msg from private.message(coalesce(v_lang, 'hu'), p_kind, p_floor, p_machine);
  insert into private.push_outbox (user_id, kind, ref, title, body, url, send_at)
  values (p_user, p_kind, p_ref, v_msg.title, v_msg.body, p_url, p_send_at);
end $$;

-- Keep the "machine finished" message in step with the timer.
create function private.sync_machine_push() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.machine_timers := coalesce(new, old);
begin
  delete from private.push_outbox
   where user_id = v_row.user_id and kind = 'machine_done' and ref = v_row.machine_id and sent_at is null;
  if tg_op <> 'DELETE' then
    perform private.queue_push(new.user_id, 'machine_done', new.machine_id,
                               split_part(new.machine_id, '-', 1)::int, new.ends_at, new.machine_id, '/room');
  end if;
  return null;
end $$;

create trigger sync_machine_push after insert or update or delete on public.machine_timers
  for each row execute function private.sync_machine_push();

-- Save this browser's push subscription for the current user. If the browser
-- was used by somebody else before, it now belongs to the current user.
create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_registered() then raise exception 'not_registered'; end if;
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth;
end $$;

-- For the send-pushes Edge Function: takes the due messages and returns one
-- row per (message, browser). Messages more than 30 minutes late are dropped.
create function public.claim_due_pushes()
returns table (endpoint text, p256dh text, auth text, title text, body text, url text, tag text)
language sql security definer set search_path = '' as $$
  with due as (
    update private.push_outbox o
       set sent_at = now()
     where o.sent_at is null and o.send_at <= now()
    returning o.*
  )
  select s.endpoint, s.p256dh, s.auth, due.title, due.body, due.url, due.kind || ':' || coalesce(due.ref, '')
    from due
    join public.push_subscriptions s on s.user_id = due.user_id
   where due.send_at > now() - interval '30 minutes'
$$;

-- For the send-pushes Edge Function: forget a browser that unsubscribed.
create function public.delete_push_subscription(p_endpoint text)
returns void
language sql security definer set search_path = '' as $$
  delete from public.push_subscriptions where endpoint = p_endpoint
$$;

-- Called by cron: wakes the Edge Function, but only if something is due.
-- Needs two Vault secrets (see README): project_url and cron_secret.
create function private.kick_push_sender() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_url    text;
  v_secret text;
begin
  if not exists (select 1 from private.push_outbox where sent_at is null and send_at <= now()) then
    return;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cron_secret';
  if v_url is null or v_secret is null then return; end if;
  perform net.http_post(
    url := v_url || '/functions/v1/send-pushes',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret)
  );
end $$;

-- ---------------------------------------------------------------------------
-- Key logic
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

-- Closes a checkout and frees the floor. Returns the closed row.
create function private.close_checkout(p_checkout_id bigint, p_forced_by uuid)
returns public.key_checkouts
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.key_checkouts;
  v_watcher uuid;
begin
  update public.key_checkouts c
     set returned_at = now(),
         force_returned_by = p_forced_by,
         (overtime_minutes, fee_huf) =
           (select f.overtime_minutes, f.fee_huf from public.overtime_fee(c.picked_up_at, now()) f)
   where c.id = p_checkout_id and c.returned_at is null
  returning c.* into v_row;

  update public.floor_status
     set holder_id = null, holder_name = null, holder_room = null, picked_up_at = null, checkout_id = null
   where floor = v_row.floor;

  -- The holder's reminders and machine timers are no longer needed.
  delete from public.machine_timers where user_id = v_row.user_id;
  delete from private.push_outbox
   where user_id = v_row.user_id and sent_at is null and kind in ('key_soon', 'key_over', 'machine_done');

  -- Tell everyone who was waiting for this key.
  for v_watcher in delete from public.free_watchers where floor = v_row.floor returning user_id loop
    perform private.queue_push(v_watcher, 'key_free', v_row.floor::text, v_row.floor, now());
  end loop;

  return v_row;
end $$;

-- Join with a name and room number, using the code from the reception QR code.
create function public.register(p_name text, p_room text, p_code text)
returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_room text := btrim(coalesce(p_room, ''));
  v_row  public.profiles;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not private.qr_is_valid(p_code) then raise exception 'invalid_qr'; end if;
  if char_length(v_name) not between 2 and 60 then raise exception 'invalid_name'; end if;
  if v_room !~ '^[0-9A-Za-z./ -]{1,10}$' then raise exception 'invalid_room'; end if;

  update public.profiles
     set display_name = v_name, room = v_room, registered_at = coalesce(registered_at, now())
   where id = auth.uid()
  returning * into v_row;
  if not found then raise exception 'not_authenticated'; end if;
  return v_row;
end $$;

-- Pick up the key of a floor. p_code is the secret from the reception QR code.
create function public.checkout_key(p_floor int, p_code text)
returns public.key_checkouts
language plpgsql security definer set search_path = '' as $$
declare
  v_uid    uuid := auth.uid();
  v_name   text;
  v_room   text;
  v_status public.floor_status;
  v_row    public.key_checkouts;
  v_due    timestamptz;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not private.qr_is_valid(p_code) then raise exception 'invalid_qr'; end if;

  select display_name, room into v_name, v_room from public.profiles where id = v_uid and registered_at is not null;
  if v_name is null then raise exception 'not_registered'; end if;

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
     set holder_id = v_uid, holder_name = v_name, holder_room = v_room,
         picked_up_at = v_row.picked_up_at, checkout_id = v_row.id
   where floor = p_floor;

  -- You obviously don't need a "free" notification for a key you hold.
  delete from public.free_watchers where user_id = v_uid and floor = p_floor;

  -- Reminders: 15 minutes before the key time ends, and when it ends.
  select v_row.picked_up_at + make_interval(mins => key_minutes) into v_due from public.app_settings;
  perform private.queue_push(v_uid, 'key_soon', v_row.id::text, p_floor, v_due - interval '15 minutes');
  perform private.queue_push(v_uid, 'key_over', v_row.id::text, p_floor, v_due);
  return v_row;
end $$;

-- Return the key you hold. p_code is the secret from the reception QR code.
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

-- ---------------------------------------------------------------------------
-- Permissions, realtime, cron
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function public.register(text, text, text),
                          public.is_registered(),
                          public.checkout_key(int, text),
                          public.return_key(text),
                          public.admin_force_return(int),
                          public.overtime_fee(timestamptz, timestamptz),
                          public.save_push_subscription(text, text, text)
  to authenticated;
grant execute on function public.claim_due_pushes(),
                          public.delete_push_subscription(text)
  to service_role;

-- Live updates of the key list.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.floor_status;
  end if;
end $$;

-- Check for due notifications every 15 seconds.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('send-pushes', '15 seconds', 'select private.kick_push_sender()');
  end if;
end $$;
