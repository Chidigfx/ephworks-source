-- Employers asked for room to describe a job properly (team feedback, Nov 2026): 1,600 → 4,000 characters.
-- Safe to run more than once. Run it before deploying the app that allows the longer text.

alter table public.jobs drop constraint if exists jobs_description_check;
alter table public.jobs add constraint jobs_description_check check (char_length(description) between 20 and 4000);
