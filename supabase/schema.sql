-- Stillpoint account sync — paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.

-- One row per user: every synced setting/notes key with its value and last-changed time.
create table if not exists public.user_data (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

-- Each person can only ever see and change their own row.
drop policy if exists "own data: read" on public.user_data;
drop policy if exists "own data: insert" on public.user_data;
drop policy if exists "own data: update" on public.user_data;
drop policy if exists "own data: delete" on public.user_data;
create policy "own data: read" on public.user_data for select to authenticated using (auth.uid() = user_id);
create policy "own data: insert" on public.user_data for insert to authenticated with check (auth.uid() = user_id);
create policy "own data: update" on public.user_data for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own data: delete" on public.user_data for delete to authenticated using (auth.uid() = user_id);

-- Save newer entries (per key, newest edit wins) and return everything that changed since `since`.
-- Entry shape: { "v": "<json text>", "t": <ms when edited on the device>, "s": <ms when the server saved it> }
-- Limits: 10 MB per sync, 25 MB per account.
create or replace function public.merge_user_data(patch jsonb, since bigint default 0)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  cur jsonb;
  k text;
  v jsonb;
  out_entries jsonb := '{}'::jsonb;
  now_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  cursor_ms bigint := coalesce(since, 0);
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if octet_length(coalesce(patch, '{}'::jsonb)::text) > 10485760 then
    raise exception 'Too much data in one sync (10 MB limit)';
  end if;

  insert into public.user_data (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  select data into cur from public.user_data where user_id = auth.uid() for update;

  for k, v in select * from jsonb_each(coalesce(patch, '{}'::jsonb)) loop
    if jsonb_typeof(v -> 'v') <> 'string' or jsonb_typeof(v -> 't') <> 'number' then
      continue; -- ignore malformed entries
    end if;
    if cur -> k is null or (cur -> k ->> 't')::bigint < (v ->> 't')::bigint then
      cur := jsonb_set(cur, array[k], jsonb_build_object('v', v -> 'v', 't', v -> 't', 's', now_ms));
    end if;
  end loop;

  if octet_length(cur::text) > 26214400 then
    raise exception 'Account storage limit reached (25 MB)';
  end if;

  update public.user_data set data = cur, updated_at = now() where user_id = auth.uid();

  for k, v in select * from jsonb_each(cur) loop
    if (v ->> 's')::bigint > coalesce(since, 0) then
      out_entries := out_entries || jsonb_build_object(k, jsonb_build_object('v', v -> 'v', 't', v -> 't'));
      cursor_ms := greatest(cursor_ms, (v ->> 's')::bigint);
    end if;
  end loop;

  return jsonb_build_object('entries', out_entries, 'cursor', cursor_ms);
end;
$$;

revoke all on function public.merge_user_data(jsonb, bigint) from public, anon;
grant execute on function public.merge_user_data(jsonb, bigint) to authenticated;

-- Private bucket for images (diagrams, custom backgrounds). Files live under <user id>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-files', 'user-files', false, 10485760, array['image/*'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "own files: read" on storage.objects;
drop policy if exists "own files: insert" on storage.objects;
drop policy if exists "own files: update" on storage.objects;
drop policy if exists "own files: delete" on storage.objects;
create policy "own files: read" on storage.objects for select to authenticated
  using (bucket_id = 'user-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files: insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'user-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files: update" on storage.objects for update to authenticated
  using (bucket_id = 'user-files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'user-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'user-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- "Delete my account": the app removes your files first, then this removes the account (and, via cascade, your data row).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
