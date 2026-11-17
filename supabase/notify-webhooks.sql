-- Creates the nine Database Webhooks that call the `notify` Edge Function (README step 7), in one go.
-- Not a migration: it holds your project's address and secret. Run it in the SQL editor AFTER:
--   1. Integrations → Database Webhooks → Enable (that creates supabase_functions.http_request), and
--   2. the `notify` function is deployed with WEBHOOK_SECRET set.
-- Replace PASTE_YOUR_WEBHOOK_SECRET_HERE below with the same WEBHOOK_SECRET (keep the quotes). Safe to run again.
-- They then show under Integrations → Database Webhooks like ones made by hand.

do $$
declare
  url text := 'https://wotgedzrzqqocdzqjfmp.supabase.co/functions/v1/notify';
  secret text := 'PASTE_YOUR_WEBHOOK_SECRET_HERE';
  hooks text[][] := array[
    ['profiles', 'insert or update'],
    ['vouches', 'insert or update'],
    ['role_applications', 'insert or update'],
    ['jobs', 'insert or update'],
    ['support_requests', 'insert or update'],
    ['pastoral_requests', 'insert or update'],
    ['reports', 'insert'],
    ['contact_messages', 'insert'],
    ['church_suggestions', 'insert']
  ];
  h text[];
begin
  if secret = 'PASTE_YOUR_WEBHOOK_SECRET_HERE' or length(secret) < 20 then
    raise exception 'Paste your WEBHOOK_SECRET (20+ characters) into the script first.';
  end if;
  foreach h slice 1 in array hooks loop
    execute format('drop trigger if exists %I on public.%I', 'notify_' || h[1], h[1]);
    execute format(
      'create trigger %I after %s on public.%I for each row execute function supabase_functions.http_request(%L, %L, %L, %L, %L)',
      'notify_' || h[1], h[2], h[1],
      url, 'POST', json_build_object('Content-Type', 'application/json', 'x-webhook-secret', secret)::text, '{}', '5000'
    );
  end loop;
end $$;

select event_object_table as "table", string_agg(event_manipulation, ', ') as events
from information_schema.triggers
where trigger_name like 'notify\_%' and event_object_schema = 'public'
group by 1 order by 1;
