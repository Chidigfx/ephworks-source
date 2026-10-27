-- "I'm interested" saved per account. Employers and moderators only ever see a count per post,
-- never who is interested: passing candidate details on could count as recruitment under UAE rules.

create table public.job_interest (
  job_id uuid not null references public.jobs on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (job_id, user_id)
);

create index job_interest_user_idx on public.job_interest (user_id);

create trigger refuse_suspended before insert on public.job_interest
  for each row execute function public.refuse_suspended();

alter table public.job_interest enable row level security;

create policy "Members read own interest" on public.job_interest
  for select to authenticated using (user_id = auth.uid());

-- Only live posts can be marked; the jobs RLS inside the subquery already hides everything else
create policy "Members mark live posts" on public.job_interest
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.jobs j where j.id = job_id and j.status = 'published' and j.expires_at > now())
  );

create policy "Members remove own interest" on public.job_interest
  for delete to authenticated using (user_id = auth.uid());

-- Counts only, for the poster's own posts (moderators see every post's count)
create function public.interest_counts() returns table (job_id uuid, interested bigint)
language sql stable security definer set search_path = '' as $$
  select i.job_id, count(*) from public.job_interest i
  join public.jobs j on j.id = i.job_id
  where j.employer_id = auth.uid() or public.is_moderator()
  group by i.job_id
$$;

grant select, insert, delete on public.job_interest to authenticated;
grant execute on function public.interest_counts() to authenticated;
