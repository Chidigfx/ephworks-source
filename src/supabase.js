import { createClient } from '@supabase/supabase-js'

// Tolerate a value pasted as a whole .env line (NAME=value), or wrapped in quotes or spaces
const clean = value => (value || '').trim().replace(/^[A-Z0-9_]+=/, '').replace(/^(["'])(.*)\1$/, '$2').trim()
const url = clean(import.meta.env.VITE_SUPABASE_URL)
const key = clean(import.meta.env.VITE_SUPABASE_ANON_KEY)

// Set but unusable settings are a deployment problem: show it plainly instead of a blank page or the demo
export const configError = url && key && !/^https?:\/\/[^\s/]+\/?$/.test(url) ? 'VITE_SUPABASE_URL is not a valid web address' : null

// Without env vars the app runs as the local-only demo (sample data + localStorage)
export const supabase = url && key && !configError ? createClient(url, key) : null

const DAY = 86400000
const HUES = ['sage', 'sand', 'blue', 'rose']

// Shapes a jobs row like the sample jobs in data.js so existing components render it
export function toJob(row) {
  const posted = Math.floor((Date.now() - new Date(row.published_at || row.created_at)) / DAY)
  return {
    id: row.id,
    status: row.status,
    employerId: row.employer_id,
    title: row.title,
    company: row.company,
    emirate: row.emirate,
    type: row.type,
    mode: row.mode,
    salary: row.salary,
    category: row.category || '',
    initials: row.company.split(/\s+/).filter(w => /^[a-z]/i.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join(''),
    hue: HUES[row.company.length % HUES.length],
    hours: row.hours || 'Details at interview',
    daysLeft: row.expires_at ? Math.max(0, Math.ceil((new Date(row.expires_at) - Date.now()) / DAY)) : 30,
    postedAgo: posted < 1 ? 'today' : `${posted} day${posted === 1 ? '' : 's'} ago`,
    verificationNote: row.verification_note || 'Awaiting moderator verification with employer HR.',
    directEmail: row.direct_email,
    directPortal: row.direct_portal,
    sponsorship: row.sponsorship || 'Required work authorisation must be in place before any employment begins.',
    description: row.description,
    responsibilities: row.responsibilities || [],
    requirements: row.requirements || []
  }
}

// Returns rows or throws a readable message (e.g. the server-side fee-term block)
async function run(query) {
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

// RLS makes a forbidden write match zero rows rather than error, so "nothing changed" means refused
async function changed(query, refusal) {
  const rows = await run(query.select())
  if (!rows.length) throw new Error(refusal)
  return rows[0]
}

export const api = {
  // Which sign-in methods are switched on in the dashboard, so the UI only offers those
  providers: () => fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } }).then(r => r.json())
    .then(s => ({ google: Boolean(s.external?.google), email: Boolean(s.external?.email) })).catch(() => ({ google: false, email: false })),
  // The referral code rides along in the sign-up; the server links it to the member who invited them
  signUp: ({ name, email, password, code }) => supabase.auth.signUp({ email, password, options: { data: { full_name: name, referral_code: code }, emailRedirectTo: window.location.origin } })
    .then(({ data, error }) => { if (error) throw error; return data }),
  signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }).then(({ error }) => { if (error) throw error }),
  sendPasswordReset: email => supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin }).then(({ error }) => { if (error) throw error }),
  setPassword: password => supabase.auth.updateUser({ password }).then(({ error }) => { if (error) throw error }),
  profile: uid => run(supabase.from('profiles').select('role, church_id, suspended, status, referral_code, referred_by, display_name, phone, emirates, work_types, work_settings, keywords, min_pay, alerts_email').eq('id', uid)).then(rows => rows[0] || {}),
  // Joining: a waiting account enters a code; moderators and admins decide (see 20261102 migration)
  useReferralCode: code => run(supabase.rpc('use_referral_code', { code })),
  pendingMembers: () => run(supabase.rpc('pending_members')),
  decideMember: (target, approve) => run(supabase.rpc('decide_member', { target, approve })),
  joinedMembers: () => run(supabase.rpc('joined_members')),
  // Members change only their own details and job preferences (see 20261103 migration)
  updateProfile: f => run(supabase.rpc('update_my_profile', { new_name: f.display_name, new_phone: f.phone, new_emirates: f.emirates, new_work_types: f.work_types,
    new_work_settings: f.work_settings, new_keywords: f.keywords, new_min_pay: f.min_pay, new_alerts_email: f.alerts_email })),
  myMatches: () => run(supabase.rpc('my_job_matches')),
  markMatchesSeen: () => run(supabase.rpc('mark_matches_seen')),
  // From the link in an alert email; works without signing in
  unsubscribe: token => run(supabase.rpc('unsubscribe_alerts', { token })),
  churches: () => run(supabase.from('churches').select('id, name, emirate').order('name')),
  // RLS returns every suggestion to admins and only their own to everyone else
  churchSuggestions: () => run(supabase.from('church_suggestions').select('*').order('created_at', { ascending: false })),
  suggestChurch: row => run(supabase.from('church_suggestions').insert(row).select().single()),
  decideChurchSuggestion: (suggestion, approve, final_name = null) => run(supabase.rpc('decide_church_suggestion', { suggestion, approve, final_name })),
  myVouch: uid => run(supabase.from('vouches').select('*').eq('user_id', uid)).then(rows => rows[0] || null),
  // Members re-request after a decline by editing their row; the server resets it to pending
  requestVouch: (existing, request) => existing
    ? changed(supabase.from('vouches').update({ ...request, status: 'pending' }).eq('user_id', existing.user_id), 'Could not update your request.')
    : run(supabase.from('vouches').insert(request)),
  // RLS returns only requests for the signed-in admin's own church
  vouchRequests: () => run(supabase.from('vouches').select('*').order('created_at', { ascending: false })),
  decideVouch: (user_id, status) => changed(supabase.from('vouches').update({ status }).eq('user_id', user_id), 'Only this church’s admin can decide this request.'),
  posterVouches: () => run(supabase.rpc('pending_poster_vouches')),
  liveJobs: () => run(supabase.from('jobs').select('*').eq('status', 'published').gt('expires_at', new Date().toISOString()).order('published_at', { ascending: false })),
  myJobs: uid => run(supabase.from('jobs').select('*').eq('employer_id', uid).order('created_at', { ascending: false })),
  pendingJobs: () => run(supabase.from('jobs').select('*').eq('status', 'pending').order('created_at')),
  submitJob: job => run(supabase.from('jobs').insert(job).select().single()),
  deleteJob: id => changed(supabase.from('jobs').delete().eq('id', id), 'You can only remove your own posts.'),
  reviewJob: (id, status, verification_note) => changed(supabase.from('jobs').update({ status, verification_note }).eq('id', id), 'This post is no longer in the queue.'),
  reports: () => run(supabase.from('reports').select('*, jobs(title)').order('created_at', { ascending: false })),
  fileReport: (job_id, reason) => run(supabase.from('reports').insert({ job_id, reason })),
  // People management: the server checks who may change whom (see 20261029 migration)
  members: () => run(supabase.rpc('admin_members')),
  setMemberRole: (target, new_role, church = null) => run(supabase.rpc('set_member_role', { target, new_role, church })),
  setSuspended: (target, suspend) => run(supabase.rpc('set_member_suspended', { target, suspend })),
  // RLS returns every application to admins and only their own to everyone else
  applications: () => run(supabase.from('role_applications').select('*').order('created_at', { ascending: false })),
  apply: row => run(supabase.from('role_applications').insert(row)),
  decideApplication: (application, approve) => run(supabase.rpc('decide_application', { application, approve })),
  // Interest is per account; posters only get counts (interest_counts), never names
  myInterest: uid => run(supabase.from('job_interest').select('job_id').eq('user_id', uid)).then(rows => rows.map(r => r.job_id)),
  markInterest: job_id => run(supabase.from('job_interest').insert({ job_id })),
  unmarkInterest: (job_id, uid) => changed(supabase.from('job_interest').delete().eq('job_id', job_id).eq('user_id', uid), 'Could not remove your interest.'),
  interestCounts: () => run(supabase.rpc('interest_counts')).then(rows => Object.fromEntries(rows.map(r => [r.job_id, Number(r.interested)]))),
  // Career support: members ask, volunteer mentors take requests (email shown only to the mentor who took it)
  supportRequests: () => run(supabase.from('support_requests').select('*').order('created_at', { ascending: false })),
  requestSupport: row => run(supabase.from('support_requests').insert(row)),
  cancelSupport: request => run(supabase.rpc('cancel_support_request', { request })),
  volunteerRequests: () => run(supabase.rpc('volunteer_requests')),
  takeSupport: request => run(supabase.rpc('take_support_request', { request })),
  finishSupport: (request, done) => run(supabase.rpc('finish_support_request', { request, done })),
  // Church management (admins); the server refuses to remove a church anyone depends on
  churchOverview: () => run(supabase.rpc('church_overview')),
  addChurch: (church_name, church_emirate) => run(supabase.rpc('add_church', { church_name, church_emirate })),
  updateChurch: (church, church_name, church_emirate) => run(supabase.rpc('update_church', { church, church_name, church_emirate })),
  removeChurch: church => run(supabase.rpc('remove_church', { church })),
  // Pastoral care: only the member and a carer at their chosen church ever see a request
  myPastoral: () => run(supabase.from('pastoral_requests').select('*').order('created_at', { ascending: false })),
  requestPastoral: row => run(supabase.from('pastoral_requests').insert(row)),
  deletePastoral: id => changed(supabase.from('pastoral_requests').delete().eq('id', id), 'Could not delete this request.'),
  carerRequests: () => run(supabase.rpc('carer_requests')),
  takePastoral: request => run(supabase.rpc('take_pastoral_request', { request })),
  finishPastoral: (request, closed) => run(supabase.rpc('finish_pastoral_request', { request, closed })),
  resolveReport: id => changed(supabase.from('reports').update({ status: 'resolved' }).eq('id', id), 'Only moderators can resolve reports.')
}
