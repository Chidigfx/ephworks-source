-- Vouch requests carry what a church admin needs to place the person (Norhatta's request, Nov 2026):
-- a mobile number, and either the ministry they serve in and its leader, or someone in the church who knows them
-- and that person's number. Only the member and their church's admin can read a request (existing policy).
-- Older requests have none of this; they can still be decided. A member sending or re-sending a request must add it.
-- Written to be safe to run more than once.

alter table public.vouches
  add column if not exists phone text check (phone ~ '^\+?[0-9 ()-]{7,20}$'),
  add column if not exists ministry text check (char_length(ministry) between 2 and 120),
  add column if not exists ministry_leader text check (char_length(ministry_leader) between 2 and 80),
  add column if not exists reference_name text check (char_length(reference_name) between 2 and 80),
  add column if not exists reference_phone text check (reference_phone ~ '^\+?[0-9 ()-]{7,20}$');

create or replace function public.guard_vouch() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.user_id <> old.user_id then
    raise exception 'A vouch request cannot change owner' using errcode = 'insufficient_privilege';
  end if;

  if new.user_id = auth.uid() then
    -- Members (re)request for themselves only; any change goes back to the church for a fresh decision
    if new.status <> 'pending' and (tg_op = 'INSERT' or new.status is distinct from old.status) then
      raise exception 'Only your church admin can vouch for you' using errcode = 'insufficient_privilege';
    end if;
    if new.phone is null or not (
      (new.ministry is not null and new.ministry_leader is not null)
      or (new.reference_name is not null and new.reference_phone is not null)
    ) then
      raise exception 'Add your mobile number, and either your ministry and its leader, or someone in the church who knows you and their number.'
        using errcode = 'check_violation';
    end if;
    new.status := 'pending';
    new.decided_by := null;
    new.decided_at := null;
  elsif tg_op = 'UPDATE' and old.church_id = public.admin_church() then
    if (new.church_id, new.display_name, new.note, new.phone, new.ministry, new.ministry_leader, new.reference_name, new.reference_phone)
       is distinct from (old.church_id, old.display_name, old.note, old.phone, old.ministry, old.ministry_leader, old.reference_name, old.reference_phone) then
      raise exception 'Church admins can only vouch or decline' using errcode = 'insufficient_privilege';
    end if;
    new.decided_by := auth.uid();
    new.decided_at := now();
  else
    raise exception 'Not allowed to change this vouch request' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;
