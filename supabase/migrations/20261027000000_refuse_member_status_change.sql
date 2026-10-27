-- Members changing a post's status used to be silently reset to 'pending', which let the
-- client report a false "Published". Refuse it instead so the caller gets a real error.

create or replace function public.guard_job() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  found text[] := public.fee_terms_in(concat_ws(' ',
    new.title, new.salary, new.description, new.sponsorship,
    array_to_string(new.responsibilities, ' '), array_to_string(new.requirements, ' ')));
begin
  if cardinality(found) > 0 then
    raise exception 'Prohibited fee terms: %', array_to_string(found, ', ') using errcode = 'check_violation';
  end if;

  new.updated_at := now();

  if not public.is_moderator() then
    if tg_op = 'UPDATE' and new.status is distinct from old.status then
      raise exception 'Only moderators can publish or reject posts' using errcode = 'insufficient_privilege';
    end if;
    -- Members cannot self-publish, reassign ownership or forge review fields.
    -- Any member edit sends the post back to the moderation queue.
    new.status := 'pending';
    new.verification_note := null;
    new.reviewed_by := null;
    new.published_at := null;
    new.expires_at := null;
    if tg_op = 'UPDATE' then new.employer_id := old.employer_id; end if;
    return new;
  end if;

  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    new.reviewed_by := auth.uid();
    new.published_at := now();
    new.expires_at := now() + interval '30 days';
  elsif new.status <> 'published' and tg_op = 'UPDATE' and new.status <> old.status then
    new.reviewed_by := auth.uid();
    new.published_at := null;
    new.expires_at := null;
  end if;
  return new;
end $$;
