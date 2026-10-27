import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'

// Runs every migration, in order, in-memory Postgres with a stub auth schema and checks RLS + triggers.
const dir = new URL('../migrations/', import.meta.url)
const migration = readdirSync(dir).filter(f => f.endsWith('.sql')).sort().map(f => readFileSync(new URL(f, dir), 'utf8')).join('\n')
const db = new PGlite()

// Minimal stand-in for Supabase's auth schema and API roles
await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`)
await db.exec(migration)
await db.exec(`
  grant usage on schema public to anon, authenticated;
  grant select on all tables in schema public to anon, authenticated;
  grant insert, update, delete on all tables in schema public to authenticated;
`)

const MOD = '00000000-0000-0000-0000-00000000000a'
const EMP = '00000000-0000-0000-0000-00000000000b'
const OTHER = '00000000-0000-0000-0000-00000000000c'
const ADMIN = '00000000-0000-0000-0000-00000000000d' // church admin for the poster's church
const ADMIN2 = '00000000-0000-0000-0000-00000000000e' // church admin elsewhere
await db.exec(`insert into auth.users values ('${MOD}'), ('${EMP}'), ('${OTHER}'), ('${ADMIN}'), ('${ADMIN2}')`)
await db.exec(`update public.profiles set role = 'moderator' where id = '${MOD}'`)
const [CHURCH, CHURCH2] = (await db.query(`select id from public.churches order by name`)).rows.map(r => r.id)
await db.exec(`update public.profiles set role = 'church_admin', church_id = '${CHURCH}' where id = '${ADMIN}'`)
await db.exec(`update public.profiles set role = 'church_admin', church_id = '${CHURCH2}' where id = '${ADMIN2}'`)

const as = async (uid, sql, params) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid || ''}', false); set role ${uid ? 'authenticated' : 'anon'}`)
  try { return { rows: (await db.query(sql, params)).rows } }
  catch (e) { return { error: e.message } }
  finally { await db.exec('reset role') }
}

let failed = 0
const check = (name, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + JSON.stringify(detail)}`); if (!ok) failed++ }

const job = (extra = '') => `insert into public.jobs (title, company, emirate, type, salary, direct_email, description${extra ? ', ' + extra.split('=')[0] : ''})
  values ('Office Coordinator', 'Cedar Lane', 'Dubai', 'Full-time', 'AED 5,000', 'hr@cedarlane.test', 'Coordinate schedules and give feedback to a friendly team.'${extra ? ', ' + extra.split('=')[1] : ''}) returning *`

let r = await as(EMP, job("status='published'"))
check('member insert forced to pending', r.rows?.[0]?.status === 'pending', r)
const jobId = r.rows?.[0]?.id
check('"feedback" does not trip fee filter', !r.error, r)

r = await as(EMP, `insert into public.jobs (title, company, emirate, type, salary, direct_email, description) values ('Driver', 'X Co', 'Dubai', 'Full-time', 'AED 3,000', 'hr@x.test', 'Visa fee of AED 2,000 payable upfront by candidate.')`)
check('fee terms rejected by server', /Prohibited fee terms: .*visa fee/.test(r.error || ''), r)

r = await as(null, `insert into public.jobs (title, company, emirate, type, salary, direct_email, description) values ('Driver', 'X Co', 'Dubai', 'Full-time', 'AED 3,000', 'hr@x.test', 'Anonymous attempt to post a job here.')`)
check('anon cannot submit', Boolean(r.error), r)

r = await as(null, `select id from public.jobs`)
check('anon cannot see pending job', r.rows?.length === 0, r)
r = await as(OTHER, `select id from public.jobs`)
check('other member cannot see pending job', r.rows?.length === 0, r)
r = await as(EMP, `select id from public.jobs`)
check('employer sees own pending job', r.rows?.length === 1, r)

r = await as(EMP, `update public.jobs set status = 'published', verification_note = 'self' where id = $1 returning status`, [jobId])
check('employer self-publish refused', /Only moderators/.test(r.error || ''), r)
r = await as(EMP, `select status from public.jobs where id = $1`, [jobId])
check('job still pending after refusal', r.rows?.[0]?.status === 'pending', r)
r = await as(EMP, `update public.jobs set status = 'rejected' where id = $1`, [jobId])
check('employer self-reject refused', /Only moderators/.test(r.error || ''), r)

r = await as(OTHER, `update public.jobs set title = 'Hijacked' where id = $1 returning id`, [jobId])
check('other member cannot edit', r.rows?.length === 0, r)

r = await as(EMP, `insert into public.jobs (title, company, emirate, type, salary, direct_email, description) values ('Driver', 'X Co', 'Dubai', 'Full-time', 'AED 3,000', 'hr@x.test', 'Pay by Western Union to secure the role.')`)
check('payment-scam terms rejected by server', /western union/.test(r.error || ''), r)

r = await as(MOD, `update public.jobs set status = 'published', verification_note = 'Confirmed with HR' where id = $1 returning id`, [jobId])
check('publish refused until poster is vouched', /church membership is not verified/.test(r.error || ''), r)

r = await as(EMP, `insert into public.vouches (church_id, display_name, status) values ($1, 'Test Employer', 'vouched') returning status`, [CHURCH])
check('member cannot self-vouch on request', /Only your church admin/.test(r.error || ''), r)
r = await as(EMP, `insert into public.vouches (church_id, display_name, note) values ($1, 'Test Employer', 'Hiring manager at Cedar Lane') returning status`, [CHURCH])
check('member requests a vouch (pending)', r.rows?.[0]?.status === 'pending', r)
r = await as(EMP, `update public.vouches set status = 'vouched' where user_id = $1 returning status`, [EMP])
check('member cannot vouch own request', /Only your church admin/.test(r.error || ''), r)
r = await as(OTHER, `select user_id from public.vouches`)
check('other member cannot see vouch requests', r.rows?.length === 0, r)
r = await as(ADMIN2, `update public.vouches set status = 'vouched' where user_id = $1 returning user_id`, [EMP])
check('other church admin cannot vouch', r.rows?.length === 0, r)
r = await as(ADMIN, `update public.vouches set note = 'edited' where user_id = $1 returning user_id`, [EMP])
check('church admin cannot edit request details', /only vouch or decline/.test(r.error || ''), r)
r = await as(MOD, `select * from public.pending_poster_vouches()`)
check('moderator sees poster pending', r.rows?.[0]?.status === 'pending', r)
r = await as(OTHER, `select * from public.pending_poster_vouches()`)
check('member cannot read poster statuses', r.rows?.length === 0, r)
r = await as(ADMIN, `update public.vouches set status = 'vouched' where user_id = $1 returning decided_by`, [EMP])
check('church admin vouches poster', r.rows?.[0]?.decided_by === ADMIN, r)

r = await as(ADMIN, `insert into public.vouches (church_id, display_name) values ($1, 'Admin Self') returning status`, [CHURCH])
r = await as(ADMIN, `update public.vouches set status = 'vouched' where user_id = $1 returning status`, [ADMIN])
check('church admin cannot vouch themself', /Only your church admin/.test(r.error || ''), r)

r = await as(MOD, `update public.jobs set status = 'published' where id = $1 returning id`, [jobId])
check('publish requires verification note', /published_has_review/.test(r.error || ''), r)

r = await as(MOD, `update public.jobs set status = 'published', verification_note = 'Confirmed with HR by phone' where id = $1 returning status, reviewed_by, expires_at - published_at as ttl`, [jobId])
check('moderator publishes with 30-day expiry', r.rows?.[0]?.status === 'published' && r.rows[0].reviewed_by === MOD && r.rows[0].ttl === '30 days', r)

r = await as(null, `select id from public.jobs`)
check('anon sees live job', r.rows?.length === 1, r)

r = await as(EMP, `update public.jobs set salary = 'AED 6,000' where id = $1 returning status, expires_at`, [jobId])
check('employer edit sends job back to queue', r.rows?.[0]?.status === 'pending' && r.rows[0].expires_at === null, r)

await as(MOD, `update public.jobs set status = 'published', verification_note = 'Re-checked' where id = $1`, [jobId])
await db.exec(`update public.jobs set expires_at = now() - interval '1 day' where id = '${jobId}'`)
r = await as(null, `select id from public.jobs`)
check('expired job hidden from public', r.rows?.length === 0, r)
await db.exec(`update public.jobs set expires_at = now() + interval '1 day' where id = '${jobId}'`)

r = await as(OTHER, `insert into public.reports (job_id, reason, status) values ($1, 'Request for payment / fee', 'resolved') returning status`, [jobId])
check('member report forced open', r.rows?.[0]?.status === 'open', r)
r = await as(OTHER, `insert into public.reports (job_id, reason) values ($1, 'Misleading job terms or salary')`, [jobId])
check('duplicate report blocked', /duplicate key/.test(r.error || ''), r)
r = await as(EMP, `select id from public.reports`)
check('employer cannot read others\' reports', r.rows?.length === 0, r)
r = await as(OTHER, `update public.reports set status = 'resolved' returning id`)
check('member cannot resolve report', Boolean(r.error) || r.rows?.length === 0, r)
r = await as(MOD, `update public.reports set status = 'resolved' returning resolved_by`)
check('moderator resolves report', r.rows?.[0]?.resolved_by === MOD, r)

r = await as(OTHER, `update public.profiles set role = 'moderator' where id = $1 returning id`, [OTHER])
check('member cannot self-promote', Boolean(r.error) || r.rows?.length === 0, r)

console.log(failed ? `\n${failed} failed` : '\nAll checks passed')
process.exit(failed ? 1 : 0)
