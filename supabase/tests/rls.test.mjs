import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'

// Runs every migration, in order, in-memory Postgres with a stub auth schema and checks RLS + triggers.
const dir = new URL('../migrations/', import.meta.url)
const migration = readdirSync(dir).filter(f => f.endsWith('.sql')).sort().map(f => readFileSync(new URL(f, dir), 'utf8')).join('\n')
const db = new PGlite()

// Minimal stand-in for Supabase's auth schema and API roles
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}');
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as
    $$ select jsonb_build_object('aal', coalesce(nullif(current_setting('request.jwt.claim.aal', true), ''), 'aal1')) $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid(), auth.jwt() to anon, authenticated;
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
// New accounts wait for approval (20261102); the older checks run as approved members
const approveAll = () => db.exec(`update public.profiles set status = 'approved', referral_code = 'TEST-' || id where status = 'pending'`)
await db.exec(`insert into auth.users values ('${MOD}'), ('${EMP}'), ('${OTHER}'), ('${ADMIN}'), ('${ADMIN2}')`)
await approveAll()
await db.exec(`update public.profiles set role = 'moderator' where id = '${MOD}'`)
const [CHURCH, CHURCH2] = (await db.query(`select id from public.churches order by name`)).rows.map(r => r.id)
await db.exec(`update public.profiles set role = 'church_admin', church_id = '${CHURCH}' where id = '${ADMIN}'`)
await db.exec(`update public.profiles set role = 'church_admin', church_id = '${CHURCH2}' where id = '${ADMIN2}'`)

// Sessions pass two-step sign-in (aal2) unless a check says otherwise
const as = async (uid, sql, params, aal = 'aal2') => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid || ''}', false); select set_config('request.jwt.claim.aal', '${aal}', false); set role ${uid ? 'authenticated' : 'anon'}`)
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
await approveAll()
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
await approveAll()
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

// Joining by referral ------------------------------------------------------------------
const NEW1 = '00000000-0000-0000-0000-0000000000a1' // signs in with Google, enters a code afterwards
const NEW2 = '00000000-0000-0000-0000-0000000000a2' // email sign-up with the code in the form
const NEW3 = '00000000-0000-0000-0000-0000000000a3' // never enters a code
await db.exec(`update public.profiles set referral_code = 'EPH-EMP001' where id = '${EMP}'`)
await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values
  ('${NEW1}', 'new1@ephworks.test', '{"full_name":"Grace New"}'),
  ('${NEW2}', 'new2@ephworks.test', '{"full_name":"Tunde New","referral_code":" eph-emp001 "}'),
  ('${NEW3}', 'new3@ephworks.test', '{}')`)
r = await db.query(`select id, status, referred_by from public.profiles where id in ('${NEW1}', '${NEW2}') order by id`)
check('new accounts wait for approval', r.rows.every(p => p.status === 'pending'), r.rows)
check('code in the sign-up form links the referrer', r.rows[0].referred_by === null && r.rows[1].referred_by === EMP, r.rows)
r = await as(NEW1, `select id from public.jobs where status = 'published'`)
check('waiting account can still browse live jobs', r.rows?.length > 0, r)
r = await as(NEW1, `insert into public.job_interest (job_id) values ($1)`, [jobId])
check('waiting account cannot mark interest', /waiting for approval/.test(r.error || ''), r)
r = await as(NEW1, job())
check('waiting account cannot post', /waiting for approval/.test(r.error || ''), r)
r = await as(NEW1, `select public.referrer_for('EPH-EMP001')`)
check('codes cannot be tested from the app', /permission denied/.test(r.error || ''), r)
r = await as(NEW1, `select public.use_referral_code('EPH-NOPE00')`)
check('wrong referral code refused', /isn't valid/.test(r.error || ''), r)
await db.exec(`update public.profiles set suspended = true where id = '${OTHER}'; update public.profiles set referral_code = 'EPH-OTH001' where id = '${OTHER}'`)
r = await as(NEW1, `select public.use_referral_code('EPH-OTH001')`)
check('suspended member\'s code refused', /isn't valid/.test(r.error || ''), r)
await db.exec(`update public.profiles set suspended = false where id = '${OTHER}'`)
r = await as(NEW1, `select public.use_referral_code('eph-emp001')`)
r = await db.query(`select referred_by from public.profiles where id = '${NEW1}'`)
check('code entered after Google sign-in links the referrer', r.rows[0].referred_by === EMP, r.rows)

r = await as(EMP, `select * from public.pending_members()`)
check('members see nobody waiting', r.rows?.length === 0, r)
r = await as(MOD, `select name, invited_by, invited_by_email from public.pending_members() where id = $1`, [NEW2])
check('moderators see who is waiting and who invited them', r.rows?.[0]?.name === 'Tunde New' && r.rows[0].invited_by_email === 'employer@ephworks.test', r)
r = await as(EMP, `select public.decide_member($1, true)`, [NEW1])
check('members cannot approve', /Only moderators/.test(r.error || ''), r)
r = await as(MOD, `select public.decide_member($1, true)`, [NEW3])
check('no approval without a referral code', /referral code/.test(r.error || ''), r)
r = await as(MOD, `select public.decide_member($1, true)`, [MOD])
check('nobody decides their own account', /own account/.test(r.error || ''), r)
r = await as(MOD, `select public.decide_member($1, true)`, [NEW1])
r = await db.query(`select status, referral_code, decided_by from public.profiles where id = '${NEW1}'`)
check('moderator approves; new member gets their own code', r.rows[0].status === 'approved' && /^EPH-[0-9A-F]{6}$/.test(r.rows[0].referral_code) && r.rows[0].decided_by === MOD, r.rows)
r = await as(MOD, `select public.decide_member($1, false)`, [NEW3])
r = await as(MOD, `select public.decide_member($1, true)`, [NEW3])
check('a declined account stays declined', /no longer waiting/.test(r.error || ''), r)
r = await as(NEW1, `insert into public.job_interest (job_id) values ($1)`, [jobId])
check('approved newcomer can take part', !r.error, r)

r = await as(SUPER, `select public.set_member_role($1, 'moderator')`, [NEW2])
r = await as(NEW2, `select * from public.pending_members()`)
check('a role does nothing until the account is approved', r.rows?.length === 0, r)
await as(SUPER, `select public.set_member_role($1, 'member')`, [NEW2])

r = await as(ADM, `select name, invited_by, decided_by, decided_by_role, status from public.joined_members() where id = $1`, [NEW1])
check('admins see who invited and who approved', r.rows?.[0]?.invited_by === 'employer' && r.rows[0].decided_by_role === 'moderator' && r.rows[0].status === 'approved', r)
r = await as(MOD, `select * from public.joined_members()`)
check('joined table is admins only', r.rows?.length === 0, r)

// Pastoral care --------------------------------------------------------------------------
const CARER = '00000000-0000-0000-0000-0000000000b1'
const CARER2 = '00000000-0000-0000-0000-0000000000b2'
await db.exec(`insert into auth.users (id, email) values ('${CARER}', 'carer@ephworks.test'), ('${CARER2}', 'carer2@ephworks.test')`)
await approveAll()
r = await as(SUPER, `select public.set_member_role($1, 'pastoral_carer')`, [CARER])
check('pastoral carer needs a church', /Choose the church/.test(r.error || ''), r)
await as(SUPER, `select public.set_member_role($1, 'pastoral_carer', $2)`, [CARER, CHURCH])
await as(SUPER, `select public.set_member_role($1, 'pastoral_carer', $2)`, [CARER2, CHURCH2])

const careRow = `insert into public.pastoral_requests (church_id, display_name, kind, note, may_contact, status) values ($1, 'Omar', 'prayer', 'Struggling since losing my job.', true, 'closed') returning status`
r = await as(NEW3, careRow, [CHURCH])
check('waiting or declined account cannot ask for pastoral care', /waiting for approval/.test(r.error || ''), r)
r = await as(EMP, careRow, [CHURCH])
check('member asks for pastoral care; status forced open', r.rows?.[0]?.status === 'open', r)
r = await as(EMP, careRow, [CHURCH])
check('one open pastoral request at a time', /one_open_pastoral_request/.test(r.error || ''), r)
r = await as(CARER, `select display_name, email from public.carer_requests()`)
check('carer sees their church\'s request without the email', r.rows?.length === 1 && r.rows[0].email === null, r)
r = await as(CARER2, `select * from public.carer_requests()`)
check('carer at another church sees nothing', r.rows?.length === 0, r)
for (const [who, label] of [[SUPER, 'super admin'], [ADM, 'admin'], [MOD, 'moderator'], [ADMIN, 'church admin'], [VOL, 'volunteer']]) {
  r = await as(who, `select id from public.pastoral_requests`)
  const direct = r.rows?.length
  r = await as(who, `select id from public.carer_requests()`)
  check(`${label} cannot read pastoral requests`, direct === 0 && r.rows?.length === 0, r)
}
const careId = (await as(EMP, `select id from public.pastoral_requests`)).rows[0].id
r = await as(MOD, `select public.take_pastoral_request($1)`, [careId])
check('only a carer for that church can take a request', /no longer open/.test(r.error || ''), r)
await as(CARER, `select public.take_pastoral_request($1)`, [careId])
r = await as(CARER, `select email from public.carer_requests() where id = $1`, [careId])
check('carer sees the email once they take it', r.rows?.[0]?.email === 'employer@ephworks.test', r)
r = await as(CARER, `delete from public.pastoral_requests where id = $1 returning id`, [careId])
check('carer cannot delete a member\'s request', r.rows?.length === 0, r)
r = await as(EMP, `delete from public.pastoral_requests where id = $1 returning id`, [careId])
check('member erases their own request', r.rows?.length === 1, r)
r = await as(ADM, `select public.remove_church($1)`, [CHURCH2])
check('church with a pastoral carer cannot be removed', /cannot be removed/.test(r.error || ''), r)

// The member chooses who is told (20261106): their own church's carers, or carers at other churches
r = await as(EMP, `insert into public.pastoral_requests (church_id, display_name, kind, may_contact) values ($1, 'Omar', 'prayer', true) returning share_with`, [CHURCH])
check('requests go to the member\'s own church by default', r.rows?.[0]?.share_with === 'own_church', r)
await as(EMP, `delete from public.pastoral_requests`)
r = await as(EMP, `insert into public.pastoral_requests (church_id, display_name, kind, may_contact, share_with) values ($1, 'Omar', 'prayer', true, 'everyone')`, [CHURCH])
check('only own_church or other_church is accepted', /check/.test(r.error || ''), r)
const otherRow = `insert into public.pastoral_requests (church_id, display_name, kind, note, may_contact, share_with) values ($1, 'Grace', 'talk', 'Rather not tell my own pastor yet.', true, 'other_church') returning id`
const otherId = (await as(OTHER, otherRow, [CHURCH])).rows?.[0]?.id
r = await as(CARER, `select id from public.carer_requests() where id = $1`, [otherId])
check('own church carer never sees an other_church request', r.rows?.length === 0, r)
r = await as(CARER, `select public.take_pastoral_request($1)`, [otherId])
check('own church carer cannot take an other_church request', /no longer open/.test(r.error || ''), r)
r = await as(CARER2, `select * from public.carer_requests() where id = $1`, [otherId])
check('carer at another church sees it, labelled other_church, without the church', r.rows?.length === 1 && r.rows[0].share_with === 'other_church' && !('church_id' in r.rows[0]), r)
r = await as(CARER2, `select public.take_pastoral_request($1)`, [otherId])
await db.exec(`update auth.users set email = 'other@ephworks.test' where id = '${OTHER}'`)
r = await as(CARER2, `select mine, email from public.carer_requests() where id = $1`, [otherId])
check('carer at another church takes it and sees the email', r.rows?.[0]?.mine === true && r.rows[0].email === 'other@ephworks.test', r)
r = await as(CARER2, `select public.carer_can_see(r) from public.pastoral_requests r`)
check('visibility helper is not callable from the app', !!r.error, r)
const CHURCH3 = (await db.query(`select id from public.churches where id not in ($1, $2) limit 1`, [CHURCH, CHURCH2])).rows[0].id
r = await as(OTHER, `select * from public.pastoral_carers_available($1)`, [CHURCH])
check('carers available: own and other church', r.rows?.[0]?.own_church === true && r.rows[0].other_church === true, r)
r = await as(OTHER, `select * from public.pastoral_carers_available($1)`, [CHURCH3])
check('carers available: none at a church without carers', r.rows?.[0]?.own_church === false && r.rows[0].other_church === true, r)
await as(OTHER, `delete from public.pastoral_requests`)
r = await as(null, `select * from public.pastoral_carers_available($1)`, [CHURCH])
check('logged-out visitors cannot ask whether a church has carers', /permission denied/.test(r.error || ''), r)
r = await as(null, `select * from public.carer_requests()`)
check('logged-out visitors cannot call the carer list', /permission denied/.test(r.error || ''), r)

// A request is only accepted when a carer can receive it (20261111)
const careTo = share => `insert into public.pastoral_requests (church_id, display_name, kind, may_contact, share_with) values ($1, 'Omar', 'prayer', true, '${share}') returning id`
const noCarer = /No pastoral carer is available/
r = await as(OTHER, careTo('own_church'), [CHURCH3])
check('own_church refused at a church with no carer', noCarer.test(r.error || ''), r)
r = await as(OTHER, `select id from public.pastoral_requests`)
check('nothing is saved when a request is refused', r.rows?.length === 0, r)
r = await as(OTHER, careTo('other_church'), [CHURCH3])
check('other_church accepted when another church has a carer', r.rows?.length === 1, r)
await as(OTHER, `delete from public.pastoral_requests`)
await db.exec(`update public.profiles set suspended = true where id = '${CARER2}'`)
r = await as(OTHER, careTo('other_church'), [CHURCH])
check('a suspended carer does not count', noCarer.test(r.error || ''), r)
r = await as(OTHER, `select * from public.pastoral_carers_available($1)`, [CHURCH])
check('form and server agree when the only other carer is suspended', r.rows?.[0]?.other_church === false, r)
await db.exec(`update public.profiles set suspended = false where id = '${CARER2}'`)
r = await as(CARER, careTo('own_church'), [CHURCH])
check('a carer cannot be the only carer for their own request', noCarer.test(r.error || ''), r)
r = await as(OTHER, `select public.pastoral_carer_exists($1, 'own_church', $2)`, [CHURCH, OTHER])
check('carer check helper is not callable from the app', !!r.error, r)

// Editable profile and job matches ---------------------------------------------------------
const setProfile = (who, args) => as(who, `select public.update_my_profile($1, $2, $3, $4, $5, $6, $7, $8)`, args)
r = await as(NEW1, `update public.profiles set role = 'admin' where id = $1 returning id`, [NEW1])
check('members still cannot write their profile row directly', Boolean(r.error) || r.rows?.length === 0, r)
r = await setProfile(NEW1, ['Grace B.', '+971 50 123 4567', ['Narnia'], [], [], null, null, false])
check('unknown emirate refused', Boolean(r.error), r)
r = await setProfile(NEW1, ['Grace B.', 'call me', [], [], [], null, null, false])
check('phone must look like a number', Boolean(r.error), r)
r = await setProfile(NEW1, ['Grace B.', '+971 50 123 4567', [], [], [], null, null, false])
r = await as(NEW1, `select * from public.my_job_matches()`)
check('no preferences, no matches', r.rows?.length === 0, r)
r = await setProfile(NEW1, ['Grace B.', '+971 50 123 4567', ['Dubai'], ['Full-time'], [], ' coordinator, nurse ', 4000, true])
r = await db.query(`select display_name, role, keywords, emirates from public.profiles where id = '${NEW1}'`)
check('member edits their own profile, role untouched', r.rows[0].display_name === 'Grace B.' && r.rows[0].role === 'member' && r.rows[0].keywords === 'coordinator, nurse', r.rows)
r = await as(ADM, `select name, phone from public.admin_members() where id = $1`, [NEW1])
check('chosen name and phone show to admins', r.rows?.[0]?.name === 'Grace B.' && r.rows[0].phone === '+971 50 123 4567', r)
await db.exec(`update public.profiles set alerts_seen_at = now() - interval '2 days' where id = '${NEW1}'`)
r = await as(NEW1, `select job_id, is_new from public.my_job_matches()`)
check('matching live job found and marked new', r.rows?.length === 1 && r.rows[0].job_id === jobId && r.rows[0].is_new === true, r)
r = await setProfile(NEW1, ['Grace B.', null, ['Dubai'], ['Full-time'], [], 'coordinator', 9000, true])
r = await as(NEW1, `select job_id from public.my_job_matches()`)
check('pay below the minimum does not match', r.rows?.length === 0, r)
r = await setProfile(NEW1, ['Grace B.', null, ['Sharjah'], [], [], null, null, true])
r = await as(NEW1, `select job_id from public.my_job_matches()`)
check('other emirate does not match', r.rows?.length === 0, r)
r = await setProfile(NEW1, ['Grace B.', null, ['Dubai'], [], [], 'coordinator', 5000, true])
await as(NEW1, `select public.mark_matches_seen()`)
r = await as(NEW1, `select is_new from public.my_job_matches()`)
check('seen matches are no longer new', r.rows?.length === 1 && r.rows[0].is_new === false, r)
r = await as(EMP, `select job_id from public.my_job_matches()`)
check('your own posts never match you', r.rows?.length === 0, r)
r = await as(NEW1, `select * from public.alert_digest()`)
check('digest is server only', /permission denied/.test(r.error || ''), r)
r = await as(NEW1, `select public.alert_sent(alerts_token, now()) from public.profiles where id = $1`, [NEW1])
check('marking an alert sent is server only', /permission denied/.test(r.error || ''), r)
await db.exec(`update public.profiles set alerts_emailed_at = now() - interval '2 days' where id = '${NEW1}'`)
r = await db.query(`select email, name, jobs, token, as_of from public.alert_digest()`)
check('digest lists new matches for opted-in members', r.rows.length === 1 && r.rows[0].email === 'new1@ephworks.test' && r.rows[0].jobs[0].title === 'Office Coordinator', r.rows)
const digestRow = r.rows[0]
r = await db.query(`select * from public.alert_digest()`)
check('a failed send is not lost: the digest still lists it until marked sent', r.rows.length === 1, r.rows)
await db.query(`select public.alert_sent($1, $2)`, [digestRow.token, digestRow.as_of])
r = await db.query(`select * from public.alert_digest()`)
check('the same job is not emailed twice once sent', r.rows.length === 0, r.rows)
r = await db.query(`select public.alert_sent($1, now() - interval '3 days') as moved`, [digestRow.token])
check('marking sent never moves the stamp backwards', r.rows[0].moved === false, r.rows)
r = await db.query(`select public.alert_sent($1, now() + interval '1 day') as moved`, [digestRow.token])
check('marking sent cannot skip future jobs', r.rows[0].moved === false, r.rows)

// Keywords match whole words, plurals included; regex characters are taken literally
for (const [words, expected, label] of [
  ['coord', 0, 'part of a word does not match'],
  ['schedule', 1, 'a plural in the job text matches the singular keyword'],
  ['Office Coordinator', 1, 'a two-word keyword matches'],
  ['c.ordinator', 0, 'regex characters are taken literally']
]) {
  await setProfile(NEW1, ['Grace B.', null, [], [], [], words, null, true])
  r = await as(NEW1, `select job_id from public.my_job_matches()`)
  check(`keywords: ${label}`, r.rows?.length === expected, { words, r })
}

// One-click unsubscribe from the email
await setProfile(NEW1, ['Grace B.', null, [], [], [], 'coordinator', null, true])
const token = (await db.query(`select alerts_token from public.profiles where id = '${NEW1}'`)).rows[0].alerts_token
r = await as(null, `select public.unsubscribe_alerts('00000000-0000-0000-0000-000000000000') as ok`)
check('unknown unsubscribe token changes nothing', r.rows?.[0]?.ok === false, r)
r = await as(null, `select public.unsubscribe_alerts($1) as ok`, [token])
r = await db.query(`select alerts_email from public.profiles where id = '${NEW1}'`)
check('unsubscribe link works without signing in', r.rows[0].alerts_email === false, r.rows)
await db.exec(`update public.profiles set alerts_email = true, alerts_emailed_at = now() - interval '2 days' where id = '${NEW1}'`)
r = await db.query(`select token from public.alert_digest()`)
check('digest carries the unsubscribe token', r.rows[0]?.token === token, r.rows)
r = await as(NEW1, `select public.alert_digest()`)
check('digest is still server only', /permission denied/.test(r.error || ''), r)

// Contact form ---------------------------------------------------------------------------
const contact = (who, email, topic, extra = '') => as(who, `insert into public.contact_messages (name, email, topic, message${extra ? ', status' : ''}) values ('Omar', $1, $2, 'Hello, I would like to know more about Ephworks.'${extra ? `, '${extra}'` : ''})`, [email, topic])
r = await contact(null, 'visitor@example.test', 'question', 'handled')
check('anyone can send a message without signing in', !r.error, r)
r = await db.query(`select status, sender_id from public.contact_messages where email = 'visitor@example.test'`)
check('a new message is always open and anonymous senders stay anonymous', r.rows[0]?.status === 'open' && r.rows[0].sender_id === null, r.rows)
r = await contact(null, 'not-an-email', 'question')
check('message needs a real-looking email', Boolean(r.error), r)
r = await as(null, `insert into public.contact_messages (name, email, topic, message) values ('Omar', 'short@example.test', 'question', 'Hi')`)
check('message needs some text', Boolean(r.error), r)
await contact(null, 'visitor@example.test', 'safety')
await contact(null, 'Visitor@Example.test', 'other')
r = await contact(null, 'visitor@example.test', 'question')
check('no more than three messages an hour from one address', /several messages/.test(r.error || ''), r)
r = await contact(EMP, 'employer@ephworks.test', 'account')
r = await db.query(`select sender_id from public.contact_messages where email = 'employer@ephworks.test'`)
check('a signed-in sender is linked to their account', r.rows[0]?.sender_id === EMP, r.rows)
r = await as(null, `select id from public.contact_messages`)
check('visitors cannot read messages', Boolean(r.error) || r.rows?.length === 0, r)
r = await as(EMP, `select id from public.contact_messages`)
check('members cannot read messages, not even their own', r.rows?.length === 0, r)
r = await as(MOD, `select topic from public.contact_messages`)
check('moderators read safety concerns only', r.rows?.length === 1 && r.rows[0].topic === 'safety', r)
r = await as(ADM, `select id, topic from public.contact_messages`)
check('admins read every message', r.rows?.length === 4, r)
const questionId = r.rows.find(m => m.topic === 'question').id
const safetyId = r.rows.find(m => m.topic === 'safety').id
r = await as(MOD, `select public.set_contact_handled($1, true)`, [questionId])
check('moderators cannot handle non-safety messages', /Only admins/.test(r.error || ''), r)
await as(MOD, `select public.set_contact_handled($1, true)`, [safetyId])
r = await db.query(`select status, handled_by from public.contact_messages where id = $1`, [safetyId])
check('moderator marks a safety concern handled', r.rows[0].status === 'handled' && r.rows[0].handled_by === MOD, r.rows)
r = await as(EMP, `select public.delete_contact_message($1)`, [questionId])
check('members cannot delete messages', /Only admins/.test(r.error || ''), r)
await as(ADM, `select public.delete_contact_message($1)`, [questionId])
r = await db.query(`select id from public.contact_messages where id = $1`, [questionId])
check('admin deletes a message', r.rows.length === 0, r.rows)

// Two-step sign-in for staff --------------------------------------------------------------
// Undoing a wrong vouch (20261109): the poster's live jobs leave the board, and come back if vouched again
const liveFromEmp = async who => (await as(who, `select id from public.jobs where status = 'published' and employer_id = $1`, [EMP])).rows?.length
const liveBefore = await liveFromEmp(OTHER)
r = await as(ADMIN, `update public.vouches set status = 'declined' where user_id = $1 returning status`, [EMP])
check('church admin withdraws a vouch', r.rows?.[0]?.status === 'declined', r)
check('withdrawn vouch hides the poster’s live jobs', liveBefore > 0 && await liveFromEmp(OTHER) === 0 && await liveFromEmp(null) === 0, { liveBefore })
r = await as(EMP, `select id from public.jobs where status = 'published'`)
check('the poster still sees their own posts', r.rows?.length === liveBefore, r)
await as(ADMIN, `update public.vouches set status = 'vouched' where user_id = $1`, [EMP])
check('vouching again brings the jobs back', await liveFromEmp(OTHER) === liveBefore, {})

// Rejection reasons and history, filled jobs, mentor comments (20261110) ---------------------
const outcomeJob = (await as(EMP, job())).rows?.[0]?.id
r = await as(MOD, `update public.jobs set status = 'rejected' where id = $1`, [outcomeJob])
check('rejecting needs a reason', /Choose a reason/.test(r.error || ''), r)
r = await as(MOD, `update public.jobs set status = 'rejected', reject_reason = 'scam' where id = $1`, [outcomeJob])
check('only the four reject categories are accepted', /check/.test(r.error || ''), r)
r = await as(MOD, `update public.jobs set status = 'rejected', reject_reason = 'incomplete', reject_note = 'No contact name' where id = $1 returning status`, [outcomeJob])
check('moderator rejects with a reason and note', r.rows?.[0]?.status === 'rejected', r)
r = await as(EMP, `select reject_reason, reject_note from public.jobs where id = $1`, [outcomeJob])
check('poster sees why their post was rejected', r.rows?.[0]?.reject_reason === 'incomplete' && r.rows[0].reject_note === 'No contact name', r)
r = await as(EMP, `update public.jobs set title = 'Office Coordinator (resubmitted)' where id = $1 returning status, reject_reason`, [outcomeJob])
check('editing a rejected post sends it back for review and clears the reason', r.rows?.[0]?.status === 'pending' && r.rows[0].reject_reason === null, r)
r = await as(MOD, `select previous, last_reason from public.rejection_history() where job_id = $1`, [outcomeJob])
check('moderator is warned about the earlier rejection', r.rows?.[0]?.previous == 1 && r.rows[0].last_reason === 'incomplete', r)
r = await as(OTHER, `select * from public.rejection_history()`)
check('rejection history is moderators only', r.rows?.length === 0, r)
r = await as(MOD, `select id from public.job_rejections`)
check('rejection records cannot be read directly', !!r.error || r.rows?.length === 0, r)
const sameCompany = (await as(OTHER, job())).rows?.[0]?.id
r = await as(MOD, `select previous from public.rejection_history() where job_id = $1`, [sameCompany])
check('a different poster with the same company name is flagged too', r.rows?.[0]?.previous == 1, r)
await as(OTHER, `delete from public.jobs where id = $1`, [sameCompany])

r = await as(EMP, `update public.jobs set status = 'filled' where id = $1`, [outcomeJob])
check('a waiting post cannot be marked filled', /Only moderators/.test(r.error || ''), r)
await as(MOD, `update public.jobs set status = 'published', verification_note = 'Called HR' where id = $1`, [outcomeJob])
r = await as(OTHER, `update public.jobs set status = 'filled' where id = $1 returning id`, [outcomeJob])
check('another member cannot mark a job filled', r.rows?.length === 0 || !!r.error, r)
r = await as(EMP, `update public.jobs set status = 'filled', title = 'Sneaky edit' where id = $1 returning status, title, filled_at`, [outcomeJob])
check('poster marks their live job filled, nothing else changes', r.rows?.[0]?.status === 'filled' && r.rows[0].title === 'Office Coordinator (resubmitted)' && !!r.rows[0].filled_at, r)
r = await as(OTHER, `select id from public.jobs where id = $1`, [outcomeJob])
check('a filled job leaves the board', r.rows?.length === 0, r)
r = await as(EMP, `update public.jobs set title = 'Office Coordinator' where id = $1 returning status, filled_at`, [outcomeJob])
check('editing a filled job reposts it for review', r.rows?.[0]?.status === 'pending' && r.rows[0].filled_at === null, r)
await as(MOD, `update public.jobs set status = 'published', verification_note = 'Called HR again' where id = $1`, [outcomeJob])
r = await as(MOD, `update public.jobs set status = 'filled' where id = $1 returning status`, [outcomeJob])
check('a moderator can mark a job filled', r.rows?.[0]?.status === 'filled', r)
await as(EMP, `delete from public.jobs where id = $1`, [outcomeJob])

r = await as(EMP, `insert into public.support_requests (service, display_name, preferred_time, may_email) values ('mock-interview', 'Omar', 'Evenings', true) returning id`)
const doneReq = r.rows?.[0]?.id
await as(VOL, `select public.take_support_request($1)`, [doneReq])
r = await as(VOL, `select public.finish_support_request($1, true, $2)`, [doneReq, '  Practised three questions; sent notes on answers.  '])
check('mentor marks done with a comment', !r.error, r)
r = await as(ADM, `select outcome_note, finished_at from public.support_outcomes() where id = $1`, [doneReq])
check('admins see the mentor comment for reports', r.rows?.[0]?.outcome_note === 'Practised three questions; sent notes on answers.' && !!r.rows[0].finished_at, r)
r = await as(VOL, `select * from public.support_outcomes()`)
check('support outcomes are admins only', r.rows?.length === 0, r)

// Parked in supabase/later/ for now; these checks run once that migration is moved back into migrations/
if (migration.includes('two_step_passed')) {
const oneStep = (uid, sql, params) => as(uid, sql, params, 'aal1')
r = await oneStep(MOD, `select id from public.pending_members()`)
check('moderator without the second step sees nobody waiting', r.rows?.length === 0, r)
r = await oneStep(MOD, `select id from public.jobs where status = 'pending'`)
check('moderator without the second step cannot see the review queue', r.rows?.length === 0, r)
r = await oneStep(MOD, `select public.decide_member($1, false)`, [NEW2])
check('moderator without the second step cannot decide members', /Only moderators/.test(r.error || ''), r)
r = await oneStep(ADM, `select id from public.joined_members()`)
check('admin without the second step sees no joined table', r.rows?.length === 0, r)
r = await oneStep(ADM, `select id from public.contact_messages`)
check('admin without the second step cannot read the inbox', r.rows?.length === 0, r)
r = await oneStep(ADMIN, `select user_id from public.vouches where user_id <> $1`, [ADMIN])
const vouchesOneStep = r.rows?.length
r = await as(ADMIN, `select user_id from public.vouches where user_id <> $1`, [ADMIN])
check('church admin needs the second step to see other members’ vouch requests', vouchesOneStep === 0 && r.rows?.length > 0, { vouchesOneStep, r })
await as(EMP, careRow, [CHURCH])
r = await oneStep(CARER, `select id from public.carer_requests()`)
const careOneStep = r.rows?.length
r = await as(CARER, `select id from public.carer_requests()`)
check('pastoral carer needs the second step to see requests', careOneStep === 0 && r.rows?.length === 1, { careOneStep, r })
r = await oneStep(VOL, `select id from public.volunteer_requests()`)
check('volunteer mentors work without the second step', !r.error && Array.isArray(r.rows), r)
r = await oneStep(NEW1, `select job_id from public.my_job_matches()`)
check('members work without the second step', !r.error, r)

}

console.log(failed ? `\n${failed} failed` : '\nAll checks passed')
process.exit(failed ? 1 : 0)
