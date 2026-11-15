-- Volunteers and church admins give details an admin can check before approving them
-- (team observations, Nov 2026): a phone number, a volunteer's church or organisation and highest
-- qualification, and a church admin's pastor. The form asks for them; older rows simply have none.
-- Written to be safe to run more than once. Run it before deploying the app that sends these fields.

alter table public.role_applications
  add column if not exists phone text check (phone ~ '^\+?[0-9 ()-]{7,20}$'),
  add column if not exists organisation text check (char_length(organisation) between 2 and 120),
  add column if not exists qualification text check (char_length(qualification) between 2 and 120),
  add column if not exists pastor_name text check (char_length(pastor_name) between 2 and 80);
