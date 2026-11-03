-- Contact form: anyone, signed in or not, can send the team a message. Admins read every message;
-- moderators read safety concerns. Staff reply by email, then mark a message handled or delete it.

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid default auth.uid() references auth.users on delete set null,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  email text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  topic text not null check (topic in ('question', 'safety', 'partnership', 'account', 'other')),
  message text not null check (char_length(btrim(message)) between 10 and 2000),
  status text not null default 'open' check (status in ('open', 'handled')),
  handled_by uuid references auth.users on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

-- Senders only ever create open messages in their own name, and can't flood the inbox:
-- three an hour from one address, and a hundred an hour across the whole site.
create function public.guard_contact_message() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.sender_id := auth.uid();
  new.status := 'open';
  new.handled_by := null;
  new.handled_at := null;
  new.created_at := now();
  if (select count(*) from public.contact_messages where lower(email) = lower(new.email) and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'You have sent several messages in the last hour. Please wait a little before sending another.' using errcode = 'check_violation';
  end if;
  if (select count(*) from public.contact_messages where created_at > now() - interval '1 hour') >= 100 then
    raise exception 'We are receiving a lot of messages right now. Please try again in an hour.' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger guard_contact_message before insert on public.contact_messages
  for each row execute function public.guard_contact_message();

alter table public.contact_messages enable row level security;

create policy "Anyone sends a message" on public.contact_messages
  for insert to anon, authenticated with check (true);
create policy "Staff read their messages" on public.contact_messages
  for select to authenticated using (public.is_admin() or (public.is_moderator() and topic = 'safety'));

create function public.can_handle_contact(entry uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or (public.is_moderator() and exists (select 1 from public.contact_messages where id = entry and topic = 'safety'))
$$;

create function public.set_contact_handled(entry uuid, handled boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_handle_contact(entry) then
    raise exception 'Only admins, or moderators for safety concerns, can change this message' using errcode = 'insufficient_privilege';
  end if;
  update public.contact_messages
    set status = case when handled then 'handled' else 'open' end,
        handled_by = case when handled then auth.uid() end,
        handled_at = case when handled then now() end
    where id = entry;
end $$;

create function public.delete_contact_message(entry uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_handle_contact(entry) then
    raise exception 'Only admins, or moderators for safety concerns, can delete this message' using errcode = 'insufficient_privilege';
  end if;
  delete from public.contact_messages where id = entry;
end $$;

grant insert on public.contact_messages to anon, authenticated;
grant select on public.contact_messages to authenticated;
grant execute on function public.set_contact_handled(uuid, boolean), public.delete_contact_message(uuid) to authenticated;
revoke execute on function public.can_handle_contact(uuid) from public, anon, authenticated;
