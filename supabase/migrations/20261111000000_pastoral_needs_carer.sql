-- Pastoral care: a request is only accepted when someone can receive it.
-- The form already greys out an option with no carer; this makes the database refuse it too,
-- so a request can never sit unseen if the form's check is skipped or fails.

-- Is there an approved, active carer for this choice, other than the person asking?
-- One rule for the form (pastoral_carers_available) and for saving a request (guard_pastoral_request).
create function public.pastoral_carer_exists(church uuid, share text, asker uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.role = 'pastoral_carer' and p.status = 'approved' and not p.suspended
      and p.id is distinct from asker
      and case share when 'own_church' then p.church_id = church else p.church_id <> church end
  )
$$;
revoke execute on function public.pastoral_carer_exists(uuid, text, uuid) from public, anon, authenticated;

create or replace function public.pastoral_carers_available(church uuid) returns table (own_church boolean, other_church boolean)
language sql stable security definer set search_path = '' as $$
  select public.pastoral_carer_exists(church, 'own_church', auth.uid()),
         public.pastoral_carer_exists(church, 'other_church', auth.uid())
$$;

create or replace function public.guard_pastoral_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.pastoral_carer_exists(new.church_id, new.share_with, new.member_id) then
    raise exception 'No pastoral carer is available for this choice yet. Choose the other option, or try again later.'
      using errcode = 'check_violation';
  end if;
  new.status := 'open';
  new.carer_id := null;
  new.taken_at := null;
  return new;
end $$;
