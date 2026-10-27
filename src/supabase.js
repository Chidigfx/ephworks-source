import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Without env vars the app runs as the local-only demo (sample data + localStorage)
export const supabase = url && key ? createClient(url, key) : null

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
  // Lets the UI hide "Continue with Google" until the provider is switched on in the dashboard
  googleEnabled: () => fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } }).then(r => r.json()).then(s => Boolean(s.external?.google)).catch(() => false),
  profile: uid => run(supabase.from('profiles').select('role, church_id, suspended').eq('id', uid)).then(rows => rows[0] || {}),
  churches: () => run(supabase.from('churches').select('id, name').order('name')),
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
  resolveReport: id => changed(supabase.from('reports').update({ status: 'resolved' }).eq('id', id), 'Only moderators can resolve reports.')
}
