-- Members can suggest a church that is not a partner yet. Admins check it and add it (or match it to an
-- existing church), so the church list stays clean and every church can end up with an admin who vouches.

alter table public.churches add column emirate text
  check (emirate in ('Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'));

create table public.church_suggestions (
  id uuid primary key default gen_random_uuid(),
  suggested_by uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 2 and 95),
  emirate text not null check (emirate in ('Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  church_id uuid references public.churches on delete set null,
  decided_by uuid references auth.users on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index one_open_suggestion on public.church_suggestions (suggested_by, lower(name)) where status = 'pending';

-- Members only ever create pending suggestions; decisions go through decide_church_suggestion()
create function public.guard_church_suggestion() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.name := btrim(new.name);
  new.status := 'pending';
  new.church_id := null;
  new.decided_by := null;
  new.decided_at := null;
  return new;
end $$;

create trigger guard_church_suggestion before insert on public.church_suggestions
  for each row execute function public.guard_church_suggestion();
create trigger refuse_suspended before insert on public.church_suggestions
  for each row execute function public.refuse_suspended();

alter table public.church_suggestions enable row level security;

create policy "Members suggest churches" on public.church_suggestions
  for insert to authenticated with check (suggested_by = auth.uid());

create policy "Suggesters and admins read suggestions" on public.church_suggestions
  for select to authenticated using (suggested_by = auth.uid() or public.is_admin());

-- Approve adds the church (or reuses one with the same name, so a duplicate suggestion maps onto it).
-- final_name lets the admin correct spelling or pick the existing church's name.
create function public.decide_church_suggestion(suggestion uuid, approve boolean, final_name text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  s public.church_suggestions := (select x from public.church_suggestions x where x.id = suggestion);
  chosen text := btrim(coalesce(nullif(btrim(final_name), ''), s.name));
  church uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can add churches' using errcode = 'insufficient_privilege';
  end if;
  if s.id is null or s.status <> 'pending' then
    raise exception 'This suggestion is no longer waiting' using errcode = 'no_data_found';
  end if;
  if approve then
    select id into church from public.churches where lower(name) = lower(chosen);
    if church is null then
      insert into public.churches (name, emirate) values (chosen, s.emirate) returning id into church;
    end if;
  end if;
  update public.church_suggestions
    set status = case when approve then 'approved' else 'declined' end, church_id = church,
        decided_by = auth.uid(), decided_at = now()
    where id = suggestion;
  return church;
end $$;

-- Church admin applications may name a suggested church; it must be added before the application is approved
alter table public.role_applications add column church_suggestion_id uuid references public.church_suggestions on delete cascade;
alter table public.role_applications drop constraint church_admin_names_church;
alter table public.role_applications add constraint church_admin_names_church
  check ((role = 'church_admin') = (church_id is not null or church_suggestion_id is not null));

create or replace function public.decide_application(application uuid, approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  app public.role_applications := (select a from public.role_applications a where a.id = application);
  church uuid;
begin
  if app.id is null or app.status <> 'pending' then
    raise exception 'This application is no longer waiting' using errcode = 'no_data_found';
  end if;
  church := coalesce(app.church_id, (select church_id from public.church_suggestions where id = app.church_suggestion_id));
  if approve then
    if public.is_suspended(app.user_id) then
      raise exception 'Restore this account before approving it' using errcode = 'check_violation';
    end if;
    if app.role = 'church_admin' and church is null then
      raise exception 'Add their church first (Your work, Churches)' using errcode = 'check_violation';
    end if;
    perform public.set_member_role(app.user_id, app.role, church);
  else
    perform public.check_can_manage(app.user_id, app.role);
  end if;
  update public.role_applications
    set status = case when approve then 'approved' else 'declined' end, church_id = church, decided_by = auth.uid(), decided_at = now()
    where id = application;
end $$;

grant select, insert on public.church_suggestions to authenticated;
grant execute on function public.decide_church_suggestion(uuid, boolean, text) to authenticated;
