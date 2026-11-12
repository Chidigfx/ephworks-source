-- Ephworks test accounts: one per role, sample people only. See docs/test-accounts.md.
-- 1. Create the 8 users first: Supabase → Authentication → Users → Add user → Create new user (tick Auto Confirm).
-- 2. Change 'yourname@gmail.com' below to the inbox you used (the only line to edit), then run all of this.
-- Safe to run again: it only sets roles, approvals and the employer's vouch.

-- The SQL editor runs the whole script as one transaction, so a failure changes nothing.
drop table if exists pg_temp.test_accounts;
create temp table test_accounts as
with inbox(addr) as (values ('yourname@gmail.com')),
list(tag, full_name, role, church) as (values
  ('employer',    'Amara Okafor',   'member',         'St. Luke''s Dubai (sample)'),
  ('seeker',      'Joseph Mwangi',  'member',         null),
  ('moderator',   'Priya Nair',     'moderator',      null),
  ('churchadmin', 'Ruth Thomas',    'church_admin',   'St. Luke''s Dubai (sample)'),
  ('mentor',      'Grace Lim',      'volunteer',      null),
  ('carer',       'Esther Bello',   'pastoral_carer', 'St. Luke''s Dubai (sample)'),
  ('carer2',      'Miriam Haddad',  'pastoral_carer', 'Grace Fellowship Abu Dhabi (sample)'),
  ('admin',       'Ben Carter',     'admin',          null)
)
select l.tag, l.full_name, l.role, l.church,
  lower(split_part(i.addr, '@', 1) || '+' || l.tag || '@' || split_part(i.addr, '@', 2)) as email,
  u.id, c.id as church_id
from list l
cross join inbox i
left join auth.users u on lower(u.email) = lower(split_part(i.addr, '@', 1) || '+' || l.tag || '@' || split_part(i.addr, '@', 2))
left join public.churches c on c.name = l.church;

-- Stop before changing anything if a user or church is missing
do $$
declare
  missing text := (select string_agg(email, ', ') from test_accounts where id is null);
  no_church text := (select string_agg(church, ', ') from test_accounts where church is not null and church_id is null);
begin
  if missing is not null then
    raise exception 'Create these users first (Authentication → Users → Add user): %', missing;
  end if;
  if no_church is not null then
    raise exception 'These churches are not in public.churches: %', no_church;
  end if;
end $$;

-- Display names, as if they had typed them at sign-up
update auth.users u set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', t.full_name)
from test_accounts t where u.id = t.id;

-- Approve each account with its role. Invited by the super admin, like a real member.
update public.profiles p set
  role = t.role,
  church_id = case when t.role in ('church_admin', 'pastoral_carer') then t.church_id end,
  status = 'approved',
  decided_at = coalesce(p.decided_at, now()),
  referral_code = coalesce(p.referral_code, public.new_referral_code()),
  referred_by = coalesce(p.referred_by, (select id from public.profiles where role = 'super_admin'))
from test_accounts t where p.id = t.id;

-- The employer asks St. Luke's for a vouch, and the test church admin says yes.
-- This goes through the same checks as the app, acting as each person in turn.
do $$
declare
  emp uuid := (select id from test_accounts where tag = 'employer');
  emp_church uuid := (select church_id from test_accounts where tag = 'employer');
  church_admin uuid := (select id from test_accounts where tag = 'churchadmin');
begin
  perform set_config('request.jwt.claim.sub', emp::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', emp)::text, true);
  insert into public.vouches (user_id, church_id, display_name, note)
  values (emp, emp_church, 'Amara Okafor', 'Test account: hires for Cedar Lane Interiors (sample)')
  on conflict (user_id) do update set church_id = excluded.church_id, display_name = excluded.display_name, note = excluded.note;

  perform set_config('request.jwt.claim.sub', church_admin::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', church_admin)::text, true);
  update public.vouches set status = 'vouched' where user_id = emp;

  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

-- What you should see: 8 rows, all approved, the employer vouched
select t.tag, t.email, p.role, c.name as church, p.status, public.is_vouched(t.id) as vouched
from test_accounts t
join public.profiles p on p.id = t.id
left join public.churches c on c.id = p.church_id
order by t.tag;
