-- ---------- study together: shared focus blocks in a circle (run after circles.sql) ----------

create table if not exists public.circle_blocks (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles on delete cascade,
  started_by uuid not null references auth.users on delete cascade,
  minutes int not null check (minutes between 5 and 120),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists circle_blocks_circle_idx on public.circle_blocks (circle_id, ends_at desc);

create table if not exists public.circle_block_joins (
  block_id uuid not null references public.circle_blocks on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (block_id, user_id)
);

alter table public.circle_blocks enable row level security;
alter table public.circle_block_joins enable row level security;

-- Read: only blocks in circles you're in. All changes go through the functions below.
drop policy if exists "blocks: members read" on public.circle_blocks;
create policy "blocks: members read" on public.circle_blocks for select to authenticated using (public.is_circle_member(circle_id));

drop policy if exists "block joins: members read" on public.circle_block_joins;
create policy "block joins: members read" on public.circle_block_joins for select to authenticated
  using (exists (select 1 from public.circle_blocks b where b.id = block_id and public.is_circle_member(b.circle_id)));

-- Start a block (or join the one already running in that circle). Returns { id, ends_at }.
create or replace function public.start_circle_block(p_circle uuid, p_minutes int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b public.circle_blocks;
begin
  if not public.is_circle_member(p_circle) then raise exception 'You’re not in this circle'; end if;
  delete from circle_blocks where circle_id = p_circle and ends_at < now() - interval '1 day';
  select * into b from circle_blocks where circle_id = p_circle and ends_at > now() + interval '1 minute' order by ends_at desc limit 1;
  if b.id is null then
    insert into circle_blocks (circle_id, started_by, minutes, ends_at)
    values (p_circle, auth.uid(), greatest(5, least(120, p_minutes)), now() + make_interval(mins => greatest(5, least(120, p_minutes))))
    returning * into b;
  end if;
  insert into circle_block_joins (block_id, user_id) values (b.id, auth.uid()) on conflict do nothing;
  return jsonb_build_object('id', b.id, 'ends_at', b.ends_at);
end; $$;

create or replace function public.join_circle_block(p_block uuid)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare b public.circle_blocks;
begin
  select * into b from circle_blocks where id = p_block;
  if b.id is null or not public.is_circle_member(b.circle_id) then raise exception 'That block isn’t available'; end if;
  if b.ends_at <= now() + interval '1 minute' then raise exception 'That block has just finished'; end if;
  insert into circle_block_joins (block_id, user_id) values (b.id, auth.uid()) on conflict do nothing;
  return b.ends_at;
end; $$;

create or replace function public.leave_circle_block(p_block uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.circle_block_joins where block_id = p_block and user_id = auth.uid();
$$;

revoke all on function public.start_circle_block(uuid, int) from public, anon;
revoke all on function public.join_circle_block(uuid) from public, anon;
revoke all on function public.leave_circle_block(uuid) from public, anon;
grant execute on function public.start_circle_block(uuid, int) to authenticated;
grant execute on function public.join_circle_block(uuid) to authenticated;
grant execute on function public.leave_circle_block(uuid) to authenticated;
