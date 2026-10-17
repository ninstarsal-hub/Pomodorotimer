-- ---------- tables ----------

create table if not exists public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  invite_code text not null unique,
  owner uuid not null references auth.users on delete cascade,
  weekly_goal_min int not null default 0 check (weekly_goal_min between 0 and 20000),
  created_at timestamptz not null default now()
);

create table if not exists public.circle_members (
  circle_id uuid not null references public.circles on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 30),
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);
create index if not exists circle_members_user_idx on public.circle_members (user_id);

-- One row per person, shared with every circle they're in.
create table if not exists public.member_stats (
  user_id uuid primary key references auth.users on delete cascade,
  week_start date not null,
  week_minutes int not null default 0 check (week_minutes between 0 and 10080),
  week_days int not null default 0 check (week_days between 0 and 127), -- bit per day, Monday = 1
  streak int not null default 0 check (streak between 0 and 3650),
  today_minutes int not null default 0 check (today_minutes between 0 and 1440),
  studying_until timestamptz,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.cheers (
  id bigint generated always as identity primary key,
  circle_id uuid not null references public.circles on delete cascade,
  from_user uuid not null references auth.users on delete cascade,
  to_user uuid not null references auth.users on delete cascade,
  day date not null default current_date,
  created_at timestamptz not null default now(),
  unique (circle_id, from_user, to_user, day)
);

-- ---------- helpers (answer questions about the caller only) ----------

create or replace function public.is_circle_member(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.circle_members where circle_id = c and user_id = auth.uid());
$$;

create or replace function public.shares_circle(other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.circle_members a
    join public.circle_members b on a.circle_id = b.circle_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

revoke all on function public.is_circle_member(uuid) from public, anon;
revoke all on function public.shares_circle(uuid) from public, anon;
grant execute on function public.is_circle_member(uuid) to authenticated;
grant execute on function public.shares_circle(uuid) to authenticated;

-- ---------- row-level security ----------

alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.member_stats enable row level security;
alter table public.cheers enable row level security;

-- Read: only circles you're in, and only their members. All changes go through the functions below.
drop policy if exists "circles: members read" on public.circles;
create policy "circles: members read" on public.circles for select to authenticated using (public.is_circle_member(id));

drop policy if exists "members: members read" on public.circle_members;
create policy "members: members read" on public.circle_members for select to authenticated using (public.is_circle_member(circle_id));

-- Stats: you can write only your own; you can read your own, and others' only if you share a circle and they haven't hidden them.
drop policy if exists "stats: read" on public.member_stats;
drop policy if exists "stats: insert own" on public.member_stats;
drop policy if exists "stats: update own" on public.member_stats;
create policy "stats: read" on public.member_stats for select to authenticated
  using (user_id = auth.uid() or (visible and public.shares_circle(user_id)));
create policy "stats: insert own" on public.member_stats for insert to authenticated with check (user_id = auth.uid());
create policy "stats: update own" on public.member_stats for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "cheers: read own" on public.cheers;
create policy "cheers: read own" on public.cheers for select to authenticated using (to_user = auth.uid() or from_user = auth.uid());

-- ---------- actions ----------

create or replace function public.new_code() returns text language sql volatile set search_path = public as $$
  select substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
$$;
revoke all on function public.new_code() from public, anon, authenticated;

create or replace function public.create_circle(p_name text, p_display_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if (select count(*) from circle_members where user_id = auth.uid()) >= 10 then raise exception 'You can be in up to 10 circles'; end if;
  insert into circles (name, invite_code, owner) values (trim(p_name), new_code(), auth.uid()) returning id into cid;
  insert into circle_members (circle_id, user_id, display_name) values (cid, auth.uid(), trim(p_display_name));
  return cid;
end; $$;

-- Before joining: the circle's name and size, for an invite code you hold.
create or replace function public.circle_preview(p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', c.id, 'name', c.name, 'members', (select count(*) from circle_members m where m.circle_id = c.id))
  from circles c where c.invite_code = p_code;
$$;

create or replace function public.join_circle(p_code text, p_display_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select id into cid from circles where invite_code = p_code;
  if cid is null then raise exception 'That invite link isn’t valid any more — ask for a new one'; end if;
  if exists (select 1 from circle_members where circle_id = cid and user_id = auth.uid()) then return cid; end if;
  if (select count(*) from circle_members where circle_id = cid) >= 12 then raise exception 'This circle is full (12 people)'; end if;
  if (select count(*) from circle_members where user_id = auth.uid()) >= 10 then raise exception 'You can be in up to 10 circles'; end if;
  insert into circle_members (circle_id, user_id, display_name) values (cid, auth.uid(), trim(p_display_name));
  return cid;
end; $$;

create or replace function public.leave_circle(p_circle uuid)
returns void language plpgsql security definer set search_path = public as $$
declare next_owner uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from circle_members where circle_id = p_circle and user_id = auth.uid();
  if exists (select 1 from circles where id = p_circle and owner = auth.uid()) then
    select user_id into next_owner from circle_members where circle_id = p_circle order by joined_at limit 1;
    if next_owner is null then delete from circles where id = p_circle;
    else update circles set owner = next_owner where id = p_circle; end if;
  end if;
end; $$;

create or replace function public.update_circle(p_circle uuid, p_name text, p_goal int)
returns void language plpgsql security definer set search_path = public as $$
begin
  update circles set name = trim(p_name), weekly_goal_min = greatest(0, least(20000, p_goal))
  where id = p_circle and owner = auth.uid();
  if not found then raise exception 'Only the circle’s creator can change it'; end if;
end; $$;

create or replace function public.new_invite_code(p_circle uuid)
returns text language plpgsql security definer set search_path = public as $$
declare code text := new_code();
begin
  update circles set invite_code = code where id = p_circle and owner = auth.uid();
  if not found then raise exception 'Only the circle’s creator can do that'; end if;
  return code;
end; $$;

create or replace function public.remove_member(p_circle uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from circles where id = p_circle and owner = auth.uid()) then raise exception 'Only the circle’s creator can remove people'; end if;
  if p_user = auth.uid() then raise exception 'Use Leave instead'; end if;
  delete from circle_members where circle_id = p_circle and user_id = p_user;
end; $$;

create or replace function public.set_display_name(p_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update circle_members set display_name = trim(p_name) where user_id = auth.uid();
end; $$;

create or replace function public.send_cheer(p_circle uuid, p_to uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_to = auth.uid() then return false; end if;
  if not exists (select 1 from circle_members where circle_id = p_circle and user_id = auth.uid())
     or not exists (select 1 from circle_members where circle_id = p_circle and user_id = p_to) then
    raise exception 'You can only cheer people in your circle';
  end if;
  insert into cheers (circle_id, from_user, to_user) values (p_circle, auth.uid(), p_to) on conflict do nothing;
  return found;
end; $$;

do $$
declare f text;
begin
  foreach f in array array[
    'create_circle(text, text)', 'circle_preview(text)', 'join_circle(text, text)', 'leave_circle(uuid)',
    'update_circle(uuid, text, int)', 'new_invite_code(uuid)', 'remove_member(uuid, uuid)',
    'set_display_name(text)', 'send_cheer(uuid, uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- Deleting your account hands circles you created to the next member instead of deleting them for everyone.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare c uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  for c in select circle_id from circle_members where user_id = auth.uid() loop
    perform public.leave_circle(c);
  end loop;
  delete from auth.users where id = auth.uid();
end; $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
