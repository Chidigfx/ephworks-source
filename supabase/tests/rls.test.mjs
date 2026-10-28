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
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}');
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
await as(MOD, `update public.jobs set expires_at = now() - interval '1 day' where id = $1`, [jobId])
r = await as(null, `select id from public.jobs`)
check('expired job hidden from public', r.rows?.length === 0, r)
await as(MOD, `update public.jobs set expires_at = now() + interval '1 day' where id = $1`, [jobId])

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

// People management ---------------------------------------------------------------
const SUPER = '00000000-0000-0000-0000-0000000000f1'
const ADM = '00000000-0000-0000-0000-0000000000f2'
const APPLICANT = '00000000-0000-0000-0000-0000000000f3'
await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values
  ('${SUPER}', 'owner@ephworks.test', '{"full_name":"Site Owner"}'), ('${ADM}', 'admin@ephworks.test', '{}'), ('${APPLICANT}', 'helper@ephworks.test', '{}')`)
await db.exec(`update public.profiles set role = 'super_admin' where id = '${SUPER}'`)
r = await db.query(`update public.profiles set role = 'super_admin' where id = '${ADM}'`).catch(e => ({ error: e.message }))
check('only one super admin', /one_super_admin/.test(r.error || ''), r)

r = await as(ADM, `select public.set_member_role($1, 'moderator')`, [APPLICANT])
check('member cannot assign roles', /Only admins/.test(r.error || ''), r)
r = await as(SUPER, `select public.set_member_role($1, 'admin')`, [ADM])
check('super admin appoints an admin', !r.error, r)
r = await as(ADM, `select public.set_member_role($1, 'admin')`, [OTHER])
check('admin cannot appoint admins', /Only the super admin/.test(r.error || ''), r)
r = await as(ADM, `select public.set_member_role($1, 'member')`, [SUPER])
check('nobody can change the super admin', /SQL editor/.test(r.error || ''), r)
r = await as(ADM, `select public.set_member_role($1, 'moderator')`, [ADM])
check('admin cannot change own role', /your own account/.test(r.error || ''), r)
r = await as(ADM, `select public.set_member_role($1, 'church_admin')`, [OTHER])
check('church admin needs a church', /Choose the church/.test(r.error || ''), r)

r = await as(SUPER, `select email, name, role, posts from public.admin_members() where id = $1`, [ADM])
check('admins see members with email', r.rows?.[0]?.email === 'admin@ephworks.test' && r.rows[0].role === 'admin', r)
r = await as(EMP, `select * from public.admin_members()`)
check('member cannot list members', r.rows?.length === 0, r)

r = await as(APPLICANT, `insert into public.role_applications (role, display_name, note, status) values ('volunteer', 'Helper', 'HR manager, 10 years in recruitment.', 'approved') returning status`)
check('application forced to pending', r.rows?.[0]?.status === 'pending', r)
const appId = (await as(APPLICANT, `select id from public.role_applications`)).rows?.[0]?.id
r = await as(APPLICANT, `insert into public.role_applications (role, display_name, note) values ('volunteer', 'Helper', 'Applying a second time today.')`)
check('one open application per role', /one_open_application/.test(r.error || ''), r)
r = await as(APPLICANT, `insert into public.role_applications (role, display_name, note) values ('church_admin', 'Helper', 'Church office volunteer here.')`)
check('church admin application names a church', /church_admin_names_church/.test(r.error || ''), r)
r = await as(APPLICANT, `insert into public.role_applications (role, display_name, note) values ('moderator', 'Helper', 'I would like to moderate posts.')`)
check('moderator is invite-only, not applied for', /role_applications_role_check/.test(r.error || ''), r)
r = await as(APPLICANT, `update public.role_applications set status = 'approved' returning id`)
check('applicant cannot approve self', Boolean(r.error) || r.rows?.length === 0, r)
r = await as(EMP, `select id from public.role_applications`)
check('other members cannot read applications', r.rows?.length === 0, r)
r = await as(APPLICANT, `select public.decide_application($1, true)`, [appId])
check('applicant cannot decide own application', /Only admins/.test(r.error || ''), r)
r = await as(ADM, `select public.decide_application($1, true)`, [appId])
r = await as(APPLICANT, `select role from public.profiles where id = $1`, [APPLICANT])
check('approval grants the role', r.rows?.[0]?.role === 'volunteer', r)
r = await as(ADM, `select public.decide_application($1, false)`, [appId])
check('decided application cannot be decided again', /no longer waiting/.test(r.error || ''), r)

r = await as(ADM, `select public.set_member_suspended($1, true)`, [EMP])
check('admin suspends a member', !r.error, r)
r = await as(null, `select id from public.jobs`)
check('suspended poster\'s posts hidden', r.rows?.length === 0, r)
r = await as(EMP, job())
check('suspended member cannot post', /suspended/.test(r.error || ''), r)
r = await as(ADM, `select public.set_member_role($1, 'moderator')`, [APPLICANT])
check('admin invites a moderator directly', !r.error, r)
await as(ADM, `select public.set_member_suspended($1, true)`, [APPLICANT])
r = await as(APPLICANT, `select id from public.jobs where status = 'pending'`)
check('suspended moderator loses review access', r.rows?.length === 0, r)
r = await as(ADM, `select public.set_member_suspended($1, false)`, [EMP])
r = await as(null, `select id from public.jobs`)
check('restored poster\'s posts return', r.rows?.length === 1, r)
r = await as(ADM, `select public.set_member_suspended($1, true)`, [SUPER])
check('super admin cannot be suspended', /SQL editor/.test(r.error || ''), r)

// I'm interested --------------------------------------------------------------------
r = await as(OTHER, `insert into public.job_interest (job_id) values ($1) returning user_id`, [jobId])
check('member marks a live post', r.rows?.[0]?.user_id === OTHER, r)
r = await as(OTHER, `insert into public.job_interest (job_id) values ($1)`, [jobId])
check('interest counted once per member', /duplicate key/.test(r.error || ''), r)
r = await as(OTHER, `insert into public.job_interest (job_id, user_id) values ($1, $2)`, [jobId, ADMIN])
check('cannot mark interest for someone else', Boolean(r.error), r)
r = await as(null, `insert into public.job_interest (job_id) values ($1)`, [jobId])
check('anon cannot mark interest', Boolean(r.error), r)
const pendingId = (await as(EMP, job())).rows?.[0]?.id
r = await as(OTHER, `insert into public.job_interest (job_id) values ($1)`, [pendingId])
check('cannot mark a post that is not live', /row-level security/.test(r.error || ''), r)
r = await as(APPLICANT, `insert into public.job_interest (job_id) values ($1)`, [jobId])
check('suspended member cannot mark interest', /suspended/.test(r.error || ''), r)
r = await as(EMP, `select user_id from public.job_interest`)
check('poster cannot see who is interested', r.rows?.length === 0, r)
r = await as(EMP, `select job_id, interested from public.interest_counts()`)
check('poster sees the count for their post', r.rows?.length === 1 && r.rows[0].job_id === jobId && Number(r.rows[0].interested) === 1, r)
r = await as(ADMIN2, `select * from public.interest_counts()`)
check('other members see no counts', r.rows?.length === 0, r)
r = await as(ADM, `select * from public.interest_counts()`)
check('moderators see counts', r.rows?.length === 1, r)
r = await as(OTHER, `delete from public.job_interest where job_id = $1 returning job_id`, [jobId])
check('member removes own interest', r.rows?.length === 1, r)

// Church suggestions ---------------------------------------------------------------
r = await as(OTHER, `insert into public.church_suggestions (name, emirate, status) values ('  New Life Church Ajman ', 'Ajman', 'approved') returning id, name, status`)
check('suggestion forced to pending and trimmed', r.rows?.[0]?.status === 'pending' && r.rows[0].name === 'New Life Church Ajman', r)
const sugId = r.rows?.[0]?.id
r = await as(OTHER, `insert into public.church_suggestions (name, emirate) values ('new life church ajman', 'Ajman')`)
check('same suggestion twice refused', /one_open_suggestion/.test(r.error || ''), r)
r = await as(OTHER, `insert into public.church_suggestions (name, emirate) values ('Somewhere Church', 'Narnia')`)
check('suggestion needs a real emirate', Boolean(r.error), r)
r = await as(EMP, `select id from public.church_suggestions`)
check('other members cannot read suggestions', r.rows?.length === 0, r)
r = await as(OTHER, `select public.decide_church_suggestion($1, true)`, [sugId])
check('member cannot add a church', /Only admins/.test(r.error || ''), r)
r = await as(OTHER, `insert into public.churches (name) values ('Sneaky Church')`)
check('member cannot insert churches directly', Boolean(r.error), r)

r = await as(OTHER, `insert into public.role_applications (role, display_name, note, church_suggestion_id) values ('church_admin', 'Other', 'I run the church office there.', $1) returning id`, [sugId])
check('church admin can apply for a suggested church', r.rows?.length === 1, r)
const sugApp = r.rows?.[0]?.id
r = await as(ADM, `select public.decide_application($1, true)`, [sugApp])
check('application waits until the church is added', /Add their church first/.test(r.error || ''), r)

r = await as(ADM, `select public.decide_church_suggestion($1, true, 'New Life Church, Ajman') as church`, [sugId])
const newChurch = r.rows?.[0]?.church
check('admin adds the suggested church', Boolean(newChurch), r)
r = await as(OTHER, `select name, emirate from public.churches where id = $1`, [newChurch])
check('church added with corrected name and emirate', r.rows?.[0]?.name === 'New Life Church, Ajman' && r.rows[0].emirate === 'Ajman', r)
r = await as(ADM, `select public.decide_church_suggestion($1, false)`, [sugId])
check('suggestion cannot be decided twice', /no longer waiting/.test(r.error || ''), r)

r = await as(EMP, `insert into public.church_suggestions (name, emirate) values ('St. Luke''s Dubai (sample)', 'Dubai') returning id`)
r = await as(ADM, `select public.decide_church_suggestion($1, true) as church`, [r.rows?.[0]?.id])
const stLuke = (await as(EMP, `select id from public.churches where name ilike 'st. luke%'`)).rows
check('duplicate suggestion maps onto the existing church', stLuke.length === 1 && r.rows?.[0]?.church === stLuke[0].id, { r, stLuke })

r = await as(ADM, `select public.decide_application($1, true)`, [sugApp])
r = await as(OTHER, `select role, church_id from public.profiles where id = $1`, [OTHER])
check('approved church admin is tied to the new church', r.rows?.[0]?.role === 'church_admin' && r.rows[0].church_id === newChurch, r)

// Volunteer mentoring ----------------------------------------------------------------
const VOL = '00000000-0000-0000-0000-0000000000f4'
await db.exec(`insert into auth.users (id, email) values ('${VOL}', 'mentor@ephworks.test')`)
await db.exec(`update auth.users set email = 'employer@ephworks.test' where id = '${EMP}'`)
await as(SUPER, `select public.set_member_role($1, 'volunteer')`, [VOL])
r = await as(EMP, `insert into public.support_requests (service, display_name, preferred_time, may_email) values ('cv-review', 'Omar', 'Weekday evening', false)`)
check('support request needs consent to be emailed', Boolean(r.error), r)
r = await as(EMP, `insert into public.support_requests (service, display_name, preferred_time, may_email, status, volunteer_id) values ('cv-review', 'Omar', 'Weekday evening', true, 'done', $1) returning id, status, volunteer_id`, [VOL])
check('support request forced open', r.rows?.[0]?.status === 'open' && r.rows[0].volunteer_id === null, r)
const reqId = r.rows?.[0]?.id
r = await as(EMP, `insert into public.support_requests (service, display_name, preferred_time, may_email) values ('cv-review', 'Omar', 'Weekend', true)`)
check('one open request per service', /one_open_support_request/.test(r.error || ''), r)
r = await as(OTHER, `select * from public.volunteer_requests()`)
check('non-mentors see no requests', r.rows?.length === 0, r)
r = await as(OTHER, `select id from public.support_requests`)
check('other members cannot read requests', r.rows?.length === 0, r)
r = await as(VOL, `select id, email, mine from public.volunteer_requests()`)
check('mentor sees open request without email', r.rows?.length === 1 && r.rows[0].email === null && r.rows[0].mine === false, r)
r = await as(OTHER, `select public.take_support_request($1)`, [reqId])
check('member cannot take a request', /Only volunteer mentors/.test(r.error || ''), r)
r = await as(VOL, `select public.take_support_request($1)`, [reqId])
check('mentor takes a request', !r.error, r)
r = await as(VOL, `select email, mine from public.volunteer_requests() where id = $1`, [reqId])
check('mentor who took it sees the email', r.rows?.[0]?.email === 'employer@ephworks.test' && r.rows[0].mine === true, r)
r = await as(ADM, `select email from public.volunteer_requests() where id = $1`, [reqId])
check('taken request hidden from other mentors', r.rows?.length === 0, r)
r = await as(ADM, `select public.take_support_request($1)`, [reqId])
check('a taken request cannot be taken again', /already taken/.test(r.error || ''), r)
r = await as(ADM, `select public.finish_support_request($1, true)`, [reqId])
check('only the taking mentor can finish it', /Only the mentor who took/.test(r.error || ''), r)
r = await as(EMP, `select status from public.support_requests where id = $1`, [reqId])
check('member sees it was taken', r.rows?.[0]?.status === 'taken', r)
r = await as(VOL, `select public.finish_support_request($1, false)`, [reqId])
r = await as(EMP, `select status, volunteer_id from public.support_requests where id = $1`, [reqId])
check('mentor can hand a request back', r.rows?.[0]?.status === 'open' && r.rows[0].volunteer_id === null, r)
r = await as(EMP, `select public.cancel_support_request($1)`, [reqId])
r = await as(EMP, `select status from public.support_requests where id = $1`, [reqId])
check('member cancels own request', r.rows?.[0]?.status === 'cancelled', r)
r = await as(OTHER, `select public.cancel_support_request($1)`, [reqId])
check('nobody else can cancel it', /no longer be cancelled/.test(r.error || ''), r)

// Church management ------------------------------------------------------------------
r = await as(EMP, `select public.add_church('Fake Church', 'Dubai')`)
check('members cannot add churches', /Only admins/.test(r.error || ''), r)
r = await as(ADM, `select public.add_church('  Living Water Church  ', 'Sharjah') as id`)
const addedChurch = r.rows?.[0]?.id
r = await as(EMP, `select name, emirate from public.churches where id = $1`, [addedChurch])
check('admin adds a church', r.rows?.[0]?.name === 'Living Water Church' && r.rows[0].emirate === 'Sharjah', r)
r = await as(ADM, `select public.add_church('Living Water Church', 'Sharjah')`)
check('duplicate church name refused', /duplicate key/.test(r.error || ''), r)
r = await as(ADM, `select public.update_church($1, 'Living Water Church Sharjah', 'Sharjah')`, [addedChurch])
r = await as(EMP, `select name from public.churches where id = $1`, [addedChurch])
check('admin renames a church', r.rows?.[0]?.name === 'Living Water Church Sharjah', r)
r = await as(EMP, `select public.update_church($1, 'Hijacked', 'Dubai')`, [addedChurch])
check('members cannot rename churches', /Only admins/.test(r.error || ''), r)
r = await as(ADM, `select public.remove_church($1)`, [CHURCH])
check('church in use cannot be removed', /cannot be removed/.test(r.error || ''), r)
r = await as(ADM, `select name, admins, vouched from public.church_overview()`)
check('admins see church overview', r.rows?.length >= 4 && r.rows.some(c => Number(c.admins) > 0), r)
r = await as(EMP, `select * from public.church_overview()`)
check('members see no overview', r.rows?.length === 0, r)
r = await as(ADM, `select public.remove_church($1)`, [addedChurch])
r = await as(EMP, `select id from public.churches where id = $1`, [addedChurch])
check('unused church can be removed', r.rows?.length === 0, r)

// The owner stays out of other admins' People list
r = await as(ADM, `select id from public.admin_members() where role = 'super_admin'`)
check('super admin hidden from other admins', r.rows?.length === 0, r)
r = await as(ADM, `select email from public.admin_members() where id = $1`, [EMP])
check('admins still see other members with email', r.rows?.[0]?.email === 'employer@ephworks.test', r)
r = await as(SUPER, `select name from public.admin_members() where id = $1`, [SUPER])
check('super admin still sees themself', r.rows?.[0]?.name === 'Site Owner', r)

console.log(failed ? `\n${failed} failed` : '\nAll checks passed')
process.exit(failed ? 1 : 0)
