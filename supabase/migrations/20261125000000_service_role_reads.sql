-- The notify Edge Function looks up who to email with the service role, but this project does not
-- grant tables to service_role by default, so every look-up was refused (403) and no staff or member
-- email was ever sent (found 25 Nov 2026). Grant only the reads the function makes.
-- Safe to run more than once.

grant usage on schema public to service_role;
grant select on public.profiles, public.churches, public.jobs to service_role;
-- job-alerts: the daily digest functions already are; the one-click unsubscribe link needs this too
grant execute on function public.unsubscribe_alerts(uuid) to service_role;
