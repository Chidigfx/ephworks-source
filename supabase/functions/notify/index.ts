// Every "something happened" email: the person it is about hears what happens next, and the staff who act on it
// hear there is something waiting. Called by Supabase Database Webhooks (see README, "Notification emails") on:
//   profiles (insert, update) · vouches (insert, update) · role_applications (insert, update) · jobs (insert, update)
//   reports (insert) · support_requests (insert, update) · pastoral_requests (insert, update)
//   contact_messages (insert) · church_suggestions (insert)
// Stays switched off, and does nothing, until RESEND_API_KEY and EMAIL_FROM are set as function secrets.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase inside the function; they never reach the browser.
// Pastoral-care emails never include what the member wrote: only that a request is waiting or has been taken.

const env = (name: string) => Deno.env.get(name) ?? ''
const SITE = () => env('SITE_URL') || 'https://www.ephworks.com'
const NAME = 'EphWorks'
type Row = Record<string, any>

// ---------- Look-ups (service role, so row-level security does not apply) ----------
const auth = () => ({ apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}` })
const rest = (path: string) => fetch(`${env('SUPABASE_URL')}/rest/v1/${path}`, { headers: auth() }).then(r => r.ok ? r.json() : [])
const person = async (id?: string | null): Promise<{ email: string, name: string } | null> => {
  if (!id) return null
  const u = await fetch(`${env('SUPABASE_URL')}/auth/v1/admin/users/${id}`, { headers: auth() }).then(r => r.ok ? r.json() : null)
  return u?.email ? { email: u.email, name: u.user_metadata?.full_name || u.user_metadata?.name || 'there' } : null
}
// Approved, active staff in these roles; optionally only one church, or every church except one
const staff = async (roles: string[], church?: { is?: string, not?: string }, skip?: string) => {
  let q = `profiles?select=id&status=eq.approved&suspended=eq.false&role=in.(${roles.join(',')})`
  if (church?.is) q += `&church_id=eq.${church.is}`
  if (church?.not) q += `&church_id=neq.${church.not}`
  const rows: Row[] = await rest(q)
  const people = await Promise.all(rows.filter(r => r.id !== skip).map(r => person(r.id)))
  return people.filter(Boolean) as { email: string, name: string }[]
}
const MODERATORS = ['moderator', 'admin', 'super_admin']
const ADMINS = ['admin', 'super_admin']
const churchName = async (id?: string | null) => id ? ((await rest(`churches?select=name&id=eq.${id}`))[0]?.name || 'your church') : 'your church'
const jobTitle = async (id?: string | null) => id ? ((await rest(`jobs?select=title,company&id=eq.${id}`))[0] || null) : null

// ---------- The look: same as supabase/email-templates ----------
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
const html = (title: string, paras: string[], button?: [string, string], note?: string) => `<div style="margin:0;padding:24px 12px;background:#f3f9fc;font-family:'Open Sans',Arial,sans-serif;color:#111c2d">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #dbe7eb;border-radius:12px">
    <tr><td style="padding:28px 28px 8px"><img src="${esc(SITE())}/apple-touch-icon.png" width="48" height="48" alt="${NAME}" style="display:block;border:0"></td></tr>
    <tr><td style="padding:8px 28px 8px">
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#111c2d">${esc(title)}</h1>
      ${paras.map(p => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155">${p}</p>`).join('\n      ')}
      ${button ? `<p style="margin:0 0 20px"><a href="${esc(SITE() + button[1])}" style="display:inline-block;padding:12px 22px;background:#086d96;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:8px">${esc(button[0])}</a></p>` : ''}
      ${note ? `<p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#475569">${note}</p>` : ''}
    </td></tr>
    <tr><td style="padding:16px 28px 24px;border-top:1px solid #dbe7eb">
      <p style="margin:0;font-size:12px;line-height:1.6;color:#475569">${NAME} · www.ephworks.com · Free for everyone, always. We will never ask you for money.</p>
    </td></tr>
  </table>
</div>`
const plain = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")

type Mail = { to: { email: string, name: string } | null, subject: string, title: string, paras: string[], button?: [string, string], note?: string }
const mail = (to: Mail['to'], subject: string, paras: string[], button?: [string, string], note?: string, title = subject): Mail =>
  ({ to, subject, title, paras, button, note })
const toAll = (people: { email: string, name: string }[], make: (p: { email: string, name: string }) => Mail) => people.map(make)

const send = async (m: Mail) => {
  if (!m.to) return false
  const paras = [`Hello ${esc(m.to.name)},`, ...m.paras]
  const text = [...paras.map(plain), m.button ? `${m.button[0]}: ${SITE()}${m.button[1]}` : '', m.note ? plain(m.note) : '', '',
    `${NAME} is free for everyone, always. We will never ask you for money.`].filter(Boolean).join('\n\n')
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env('EMAIL_FROM'), to: m.to.email, subject: m.subject, text, html: html(m.title, paras, m.button, m.note) })
  }).then(r => r.ok, () => false)
}

// ---------- What each change means, and who hears about it ----------
const SERVICES: Record<string, string> = { 'cv-review': 'CV review', 'mock-interview': 'mock interview', 'linkedin-help': 'LinkedIn profile help' }
const ROLES: Record<string, string> = { volunteer: 'volunteer mentor', church_admin: 'church admin', pastoral_carer: 'pastoral carer' }
const REJECT: Record<string, string> = { incomplete: 'some information was missing', misleading: 'some details could mislead job seekers', suspected_scam: 'it looked like it might not be a genuine job', other: 'it did not meet our posting rules' }
const changed = (rec: Row, old: Row | null, key: string) => !old || old[key] !== rec[key]

const handlers: Record<string, (type: string, rec: Row, old: Row | null) => Promise<Mail[]>> = {
  async profiles(type, rec, old) {
    const out: Mail[] = []
    const joined = rec.status === 'pending' && rec.referred_by && (type === 'INSERT' || !old?.referred_by)
    if (joined) {
      const who = await person(rec.id)
      const name = esc(who?.name || 'A new member')
      // Email sign-ups already get the confirmation email; Google sign-ups hear here once they enter their code
      if (type === 'UPDATE') out.push(mail(who, `We’ve received your ${NAME} registration`, [
        'Thank you for joining. A moderator will now check with the member who invited you, usually within a day or two.',
        'We’ll email you as soon as your account is approved. Until then you can browse jobs.'], ['Browse jobs', '/jobs']))
      out.push(...toAll(await staff(MODERATORS), s => mail(s, `New member waiting for approval: ${who?.name || 'new member'}`, [
        `<b>${name}</b> has joined with a referral code and is waiting for approval.`,
        'Please check with the member who invited them before approving.'], ['Review new members', '/work/joining'])))
    }
    if (type === 'UPDATE' && old?.status === 'pending' && rec.status === 'approved') {
      out.push(mail(await person(rec.id), `Your ${NAME} account is approved`, [
        `A moderator has approved your ${NAME} account. You can now save jobs, mark your interest, apply to employers, post jobs, and ask for career support or pastoral care.`,
        `Your own referral code is <b style="color:#111c2d">${esc(rec.referral_code)}</b>. Give it only to people you know: you will be shown as the person who invited them.`],
        [`Go to ${NAME}`, '/'], `Didn’t ask to join ${NAME}? Reply to this email and we’ll remove the account.`))
    }
    if (type === 'UPDATE' && old?.status === 'pending' && rec.status === 'declined') {
      out.push(mail(await person(rec.id), `About your ${NAME} registration`, [
        'We weren’t able to approve your account this time, usually because we couldn’t confirm it with the member who invited you.',
        'If you think this is a mistake, send us a message and we’ll look again.'], ['Contact us', '/contact']))
    }
    return out
  },

  async vouches(type, rec, old) {
    const church = await churchName(rec.church_id)
    if (rec.status === 'pending' && (type === 'INSERT' || old?.status !== 'pending' || changed(rec, old, 'church_id'))) {
      return [
        mail(await person(rec.user_id), `Your vouch request was sent to ${church}`, [
          `We’ve asked ${esc(church)} to confirm you are known to their community. Your posts go live once they confirm and a moderator has checked each job.`]),
        ...toAll(await staff(['church_admin'], { is: rec.church_id }), s => mail(s, `Vouch request from ${rec.display_name}`, [
          `<b>${esc(rec.display_name)}</b> has asked ${esc(church)} to vouch for them so they can post jobs.`,
          'Please confirm only if they are known to your church community. You only say yes or no; no other details are stored.'],
          ['Review vouch requests', '/work/vouches']))
      ]
    }
    if (type === 'UPDATE' && old?.status === 'pending' && rec.status === 'vouched') {
      return [mail(await person(rec.user_id), `${church} has vouched for you`, [
        `${esc(church)} has confirmed you are known to their community. A moderator will check each job you post with you before it goes live.`], ['Post a job', '/post'])]
    }
    if (type === 'UPDATE' && old?.status === 'pending' && rec.status === 'declined') {
      return [mail(await person(rec.user_id), `${church} couldn’t confirm you`, [
        `${esc(church)} wasn’t able to confirm you this time. Check you chose the right church, add a note about how they know you, and ask again.`], ['Ask again', '/profile'])]
    }
    return []
  },

  async role_applications(type, rec, old) {
    const role = ROLES[rec.role] || rec.role
    // Pastoral carers: that church's admin confirms first, then an admin approves (admins step in if the church has no admin)
    if (rec.role === 'pastoral_carer' && type === 'INSERT') {
      const church = await churchName(rec.church_id)
      const churchAdmins = await staff(['church_admin'], { is: rec.church_id }, rec.user_id)
      const ask = (s: { email: string, name: string }) => mail(s, `Pastoral carer application: ${rec.display_name}`, [
        `<b>${esc(rec.display_name)}</b> has offered to be a pastoral carer for ${esc(church)}.`,
        'Pastoral carers read private care requests from members of the church, so please confirm only someone you know serves there.'],
        churchAdmins.length ? ['Review carer applications', '/work/vouches'] : ['Review applications', '/work/applications'])
      return [
        mail(await person(rec.user_id), `We’ve received your application`, [
          `Thank you for offering to help as a pastoral carer. ${churchAdmins.length ? `${esc(church)}’s church admin will confirm you serve there, then an admin` : 'An admin'} will contact you for a short check before approving you.`]),
        ...toAll(churchAdmins.length ? churchAdmins : await staff(ADMINS), ask)
      ]
    }
    if (rec.role === 'pastoral_carer' && type === 'UPDATE' && !old?.church_confirmed_at && rec.church_confirmed_at && rec.status === 'pending') {
      const church = await churchName(rec.church_id)
      return toAll(await staff(ADMINS), s => mail(s, `${church} confirmed a pastoral carer: ${rec.display_name}`, [
        `${esc(church)}’s church admin has confirmed <b>${esc(rec.display_name)}</b> serves at the church. Their application is ready for your approval.`], ['Review applications', '/work/applications']))
    }
    if (type === 'INSERT') {
      return [
        mail(await person(rec.user_id), `We’ve received your application`, [
          `Thank you for offering to help as a ${esc(role)}. An admin will contact you for a short check before approving you.`]),
        ...toAll(await staff(ADMINS), s => mail(s, `New ${role} application: ${rec.display_name}`, [
          `<b>${esc(rec.display_name)}</b> has applied to be a ${esc(role)}.`], ['Review applications', '/work/applications']))
      ]
    }
    if (old?.status === 'pending' && rec.status === 'approved') {
      return [mail(await person(rec.user_id), `You’re now a ${role} on ${NAME}`, [
        `Your application was approved. Your new tools appear under “Your work” next time you open ${NAME}.`], ['Open your work', '/work'])]
    }
    if (old?.status === 'pending' && rec.status === 'declined') {
      return [mail(await person(rec.user_id), `About your ${role} application`, [
        'We weren’t able to approve your application this time. Thank you for offering to help. If you have questions, send us a message.'], ['Contact us', '/contact'])]
    }
    return []
  },

  async jobs(type, rec, old) {
    const title = esc(rec.title)
    if (rec.status === 'pending' && (type === 'INSERT' || old?.status !== 'pending')) {
      return [
        mail(await person(rec.employer_id), `We’ve received your job: ${rec.title}`, [
          `Thank you for posting <b>${title}</b>. A moderator will check it with you before it goes live, usually within a few working days.`], ['See your posts', '/my-posts']),
        ...toAll(await staff(MODERATORS), s => mail(s, `New job to review: ${rec.title}`, [
          `<b>${title}</b> at ${esc(rec.company)} is waiting for review.`], ['Review jobs', '/work/review']))
      ]
    }
    if (type === 'UPDATE' && old?.status === 'pending' && rec.status === 'published') {
      return [mail(await person(rec.employer_id), `Your job is live: ${rec.title}`, [
        `<b>${title}</b> has been checked and is now live on ${NAME}. It stays up for 30 days.`], ['See your posts', '/my-posts'])]
    }
    if (type === 'UPDATE' && old?.status === 'pending' && rec.status === 'rejected') {
      const why = REJECT[rec.reject_reason] || REJECT.other
      return [mail(await person(rec.employer_id), `Your job needs changes: ${rec.title}`, [
        `We couldn’t publish <b>${title}</b> because ${esc(why)}.`,
        ...(rec.reject_note ? [`The moderator’s note: “${esc(rec.reject_note)}”`] : []),
        'You can fix it and post it again.'], ['See your posts', '/my-posts'])]
    }
    return []
  },

  async reports(type, rec) {
    if (type !== 'INSERT') return []
    const job = await jobTitle(rec.job_id)
    return toAll(await staff(MODERATORS), s => mail(s, `A job was reported: ${job?.title || 'job'}`, [
      `<b>${esc(job?.title || 'A job')}</b>${job ? ` at ${esc(job.company)}` : ''} was reported for: ${esc(rec.reason)}.`,
      'Please look at it within 24 hours.'], ['Open reports', '/work/reports']))
  },

  async support_requests(type, rec, old) {
    const service = SERVICES[rec.service] || 'career support'
    if (type === 'INSERT') {
      return [
        mail(await person(rec.member_id), `We’ve received your ${service} request`, [
          `A volunteer mentor will pick it up and email you to arrange a time. It’s free and confidential.`]),
        ...toAll(await staff(['volunteer']), s => mail(s, `New ${service} request`, [
          `A member has asked for a ${esc(service)} (preferred time: ${esc(rec.preferred_time)}).`], ['See open requests', '/work/mentoring']))
      ]
    }
    if (old?.status === 'open' && rec.status === 'taken') {
      return [mail(await person(rec.member_id), `A mentor has taken your ${service} request`, [
        'A volunteer mentor will email you soon to arrange a time. Volunteers never charge or promise a job.'])]
    }
    return []
  },

  async pastoral_requests(type, rec, old) {
    if (type === 'INSERT') {
      const church = rec.share_with === 'other_church' ? { not: rec.church_id } : { is: rec.church_id }
      return toAll(await staff(['pastoral_carer'], church, rec.member_id), s => mail(s, 'A pastoral care request is waiting', [
        'A member has asked for pastoral care. Open EphWorks to see the request and take it.'], ['Open pastoral requests', '/work/pastoral']))
    }
    if (old?.status === 'open' && rec.status === 'taken') {
      return [mail(await person(rec.member_id), 'A pastoral carer has taken your request', [
        'A carer will contact you by email. What you share stays between you and them, and you can delete your request at any time.'])]
    }
    return []
  },

  async contact_messages(type, rec) {
    if (type !== 'INSERT') return []
    const team = rec.topic === 'safety' ? [...ADMINS, 'moderator'] : ADMINS
    return toAll(await staff(team), s => mail(s, `New ${rec.topic === 'safety' ? 'safety ' : ''}message from ${rec.name}`, [
      `<b>${esc(rec.name)}</b> sent a message (topic: ${esc(rec.topic)}).`,
      rec.topic === 'safety' ? 'Safety messages get a reply within 24 hours.' : 'Please reply within a few working days.'], ['Open the inbox', '/work/inbox']))
  },

  async church_suggestions(type, rec) {
    if (type !== 'INSERT') return []
    return toAll(await staff(ADMINS), s => mail(s, `New church suggested: ${rec.name}`, [
      `A member suggested <b>${esc(rec.name)}</b> (${esc(rec.emirate)}) as a partner church.`], ['Review churches', '/work/churches']))
  }
}

Deno.serve(async req => {
  // Only the database webhooks know this secret (set it as a custom header on each webhook)
  if (!env('WEBHOOK_SECRET') || req.headers.get('x-webhook-secret') !== env('WEBHOOK_SECRET')) {
    return new Response('Forbidden', { status: 403 })
  }
  const { type, table, record, old_record } = await req.json()
  const handle = handlers[table]
  if (!handle || !record) return Response.json({ sent: 0, reason: 'nothing to send for this change' })
  if (!env('RESEND_API_KEY') || !env('EMAIL_FROM')) return Response.json({ sent: 0, reason: 'email is not set up yet' })
  const mails = (await handle(type, record, old_record ?? null)).filter(m => m.to)
  const results = await Promise.all(mails.map(send))
  return Response.json({ sent: results.filter(Boolean).length, failed: results.filter(r => !r).length })
})
