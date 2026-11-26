-- A declined join request can be looked at again from the dashboard, not only in SQL.
-- Moderators and admins see declined people next to the waiting ones, and either:
--   approve them straight away (only when someone invited them, as for any approval), or
--   reopen the request so they can enter a referral code and wait like a new sign-up.

drop function public.pending_members();
create function public.pending_members() returns table (
  id uuid, name text, email text, invited_by text, invited_by_email text, joined timestamptz, phone text,
  status text, decided_by text, decided_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select p.id, public.account_name(p.id), u.email::text, public.account_name(p.referred_by), r.email::text, p.created_at, p.phone,
    p.status, public.account_name(p.decided_by), p.decided_at
  from public.profiles p join auth.users u on u.id = p.id left join auth.users r on r.id = p.referred_by
  where public.is_moderator() and (p.status = 'pending' or (p.status = 'declined' and not p.suspended))
  order by p.created_at
$$;

-- Approving now also works on a declined account; declining still needs a waiting one
create or replace function public.decide_member(target uuid, approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_moderator() then
    raise exception 'Only moderators and admins can approve new members' using errcode = 'insufficient_privilege';
  end if;
  if target = auth.uid() then
    raise exception 'You cannot decide your own account' using errcode = 'insufficient_privilege';
  end if;
  update public.profiles
    set status = case when approve then 'approved' else 'declined' end,
        referral_code = case when approve then public.new_referral_code() end,
        decided_by = auth.uid(), decided_at = now()
    where id = target
      and (status = 'pending' or (approve and status = 'declined'))
      and (referred_by is not null or not approve);
  if not found then
    raise exception 'This person is no longer waiting, or has not entered a referral code yet' using errcode = 'no_data_found';
  end if;
end $$;

-- Put a declined request back in the queue, so the person can enter a code and be approved as normal
create function public.reopen_member(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_moderator() then
    raise exception 'Only moderators and admins can reopen a request' using errcode = 'insufficient_privilege';
  end if;
  if target = auth.uid() then
    raise exception 'You cannot decide your own account' using errcode = 'insufficient_privilege';
  end if;
  update public.profiles set status = 'pending', decided_by = auth.uid(), decided_at = now()
    where id = target and status = 'declined';
  if not found then
    raise exception 'This request is not declined' using errcode = 'no_data_found';
  end if;
end $$;

revoke execute on function public.reopen_member(uuid) from public, anon;
grant execute on function public.pending_members(), public.reopen_member(uuid) to authenticated;
