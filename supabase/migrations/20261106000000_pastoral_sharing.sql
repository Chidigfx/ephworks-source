-- Pastoral care: the member decides who is told. church_id is always the member's own church;
-- share_with says which carers see the request:
--   own_church   - only pastoral carers at the member's church (how every request worked before)
--   other_church - only pastoral carers at other churches, never the member's own pastor
-- Carers never see which church a request came from. Requests made before this keep own_church.

alter table public.pastoral_requests
  add column share_with text not null default 'own_church' check (share_with in ('own_church', 'other_church'));

-- Whether the calling carer may see (and take) this request
create function public.carer_can_see(r public.pastoral_requests) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.pastoral_church() is not null
    and r.member_id <> auth.uid()
    and case r.share_with
      when 'own_church' then r.church_id = public.pastoral_church()
      else r.church_id <> public.pastoral_church()
    end
$$;
revoke execute on function public.carer_can_see(public.pastoral_requests) from public, anon, authenticated;

-- Carers see the open requests shared with them and the ones they took; the email only for the ones they took
drop function public.carer_requests();
create function public.carer_requests() returns table (
  id uuid, kind text, display_name text, note text, status text, created_at timestamptz, mine boolean, email text, share_with text
)
language sql stable security definer set search_path = '' as $$
  select r.id, r.kind, r.display_name, r.note, r.status, r.created_at,
    coalesce(r.carer_id = auth.uid(), false),
    case when r.carer_id = auth.uid() then u.email::text end,
    r.share_with
  from public.pastoral_requests r join auth.users u on u.id = r.member_id
  where public.carer_can_see(r)
    and (r.status = 'open' or (r.status = 'taken' and r.carer_id = auth.uid()))
  order by r.created_at
$$;

create or replace function public.take_pastoral_request(request uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.pastoral_requests r set status = 'taken', carer_id = auth.uid(), taken_at = now()
    where r.id = request and r.status = 'open' and public.carer_can_see(r);
  if not found then
    raise exception 'This request is no longer open' using errcode = 'no_data_found';
  end if;
end $$;

-- For the request form: is there anyone to send it to? Only says yes or no, never names or counts.
create function public.pastoral_carers_available(church uuid) returns table (own_church boolean, other_church boolean)
language sql stable security definer set search_path = '' as $$
  select
    exists (select 1 from public.profiles p where p.role = 'pastoral_carer' and p.church_id = church
      and p.status = 'approved' and not p.suspended and p.id <> auth.uid()),
    exists (select 1 from public.profiles p where p.role = 'pastoral_carer' and p.church_id <> church
      and p.status = 'approved' and not p.suspended and p.id <> auth.uid())
$$;

grant execute on function public.carer_requests(), public.pastoral_carers_available(uuid) to authenticated;
