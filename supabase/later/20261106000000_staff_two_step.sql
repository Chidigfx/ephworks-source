-- Two-step sign-in for staff. Moderators, church admins, pastoral carers, admins and the super admin can
-- approve people and see personal details, so their powers only work in a session that also passed an
-- authenticator-app code (Supabase marks it aal2). Signed in with a password or Google alone, they act as
-- an ordinary member until they enter the code. Volunteers and members are not affected.
-- Someone who loses their phone: in the SQL editor, delete from auth.mfa_factors where user_id = '<their id>';
-- then they set it up again.

create function public.two_step_passed() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
$$;

create or replace function public.my_role() returns text
language sql stable security definer set search_path = '' as $$
  select case when role in ('moderator', 'church_admin', 'pastoral_carer', 'admin', 'super_admin') and not public.two_step_passed()
    then 'member' else role end
  from public.profiles where id = auth.uid() and not suspended and status = 'approved'
$$;

create or replace function public.admin_church() returns uuid
language sql stable security definer set search_path = '' as $$
  select church_id from public.profiles
  where id = auth.uid() and role = 'church_admin' and not suspended and status = 'approved' and public.two_step_passed()
$$;

create or replace function public.pastoral_church() returns uuid
language sql stable security definer set search_path = '' as $$
  select church_id from public.profiles
  where id = auth.uid() and role = 'pastoral_carer' and not suspended and status = 'approved' and public.two_step_passed()
$$;
