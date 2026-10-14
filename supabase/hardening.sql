-- Stillpoint security hardening — run once in Supabase → SQL Editor → New query → Run.
-- (Already included in schema.sql for new projects. Safe to run more than once.)

-- 1. Files: you can only ever rename/move a file within YOUR folder (closes a gap where an
--    update could move one of your files into someone else's folder).
drop policy if exists "own files: update" on storage.objects;
create policy "own files: update" on storage.objects for update to authenticated
  using (bucket_id = 'user-files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'user-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- 2. Files: images only, max 10 MB each (stops anyone using your storage for other files).
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/*']
where id = 'user-files';

-- 3. Data: cap each sync at 10 MB and each account at 25 MB, so one account can't fill the free plan.
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
