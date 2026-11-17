// Emails a new member when a moderator or admin approves their account.
// Called by a Supabase Database Webhook on UPDATE of public.profiles (see README, "Approval emails").
// Stays switched off, and does nothing, until RESEND_API_KEY and EMAIL_FROM are set as function secrets.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase inside the function; they never reach the browser.

const env = (name: string) => Deno.env.get(name) ?? ''

// Same look as the sign-in emails in supabase/email-templates. Names come from members, so they are escaped.
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
const button = (href: string, label: string) =>
  `<p style="margin:0 0 20px"><a href="${esc(href)}" style="display:inline-block;padding:12px 22px;background:#086d96;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:8px">${esc(label)}</a></p>`
const layout = (site: string, title: string, body: string) => `<div style="margin:0;padding:24px 12px;background:#f3f9fc;font-family:'Open Sans',Arial,sans-serif;color:#111c2d">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #dbe7eb;border-radius:12px">
    <tr><td style="padding:28px 28px 8px"><img src="${esc(site)}/apple-touch-icon.png" width="48" height="48" alt="EphWorks" style="display:block;border:0"></td></tr>
    <tr><td style="padding:8px 28px 8px">
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#111c2d">${esc(title)}</h1>
      ${body}
    </td></tr>
    <tr><td style="padding:16px 28px 24px;border-top:1px solid #dbe7eb">
      <p style="margin:0;font-size:12px;line-height:1.6;color:#475569">EphWorks · www.ephworks.com · Free for everyone, always. We will never ask you for money.</p>
    </td></tr>
  </table>
</div>`
const para = (text: string, small = false) =>
  `<p style="margin:0 0 16px;font-size:${small ? 13 : 15}px;line-height:1.6;color:${small ? '#475569' : '#334155'}">${text}</p>`

Deno.serve(async req => {
  // Only the database webhook knows this secret (set it as a custom header on the webhook)
  if (!env('WEBHOOK_SECRET') || req.headers.get('x-webhook-secret') !== env('WEBHOOK_SECRET')) {
    return new Response('Forbidden', { status: 403 })
  }
  const { type, record, old_record } = await req.json()
  if (type !== 'UPDATE' || old_record?.status === 'approved' || record?.status !== 'approved') {
    return Response.json({ sent: false, reason: 'not a new approval' })
  }
  if (!env('RESEND_API_KEY') || !env('EMAIL_FROM')) {
    return Response.json({ sent: false, reason: 'email is not set up yet' })
  }

  const user = await fetch(`${env('SUPABASE_URL')}/auth/v1/admin/users/${record.id}`, {
    headers: { apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}` }
  }).then(r => r.ok ? r.json() : null)
  if (!user?.email) return Response.json({ sent: false, reason: 'no email for this account' }, { status: 404 })

  const name = user.user_metadata?.full_name || user.user_metadata?.name || 'there'
  const site = env('SITE_URL') || 'https://www.ephworks.com'
  const sent = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env('EMAIL_FROM'),
      to: user.email,
      subject: 'Your EphWorks account is approved',
      text: [
        `Hello ${name},`,
        '',
        'A moderator has approved your EphWorks account. You can now save jobs, mark your interest, post jobs and ask for career support or pastoral care.',
        '',
        `Your own referral code is ${record.referral_code}. Give it only to people you know: you will be shown as the person who invited them.`,
        '',
        `Sign in: ${site}`,
        '',
        'EphWorks is free for everyone, always. Nobody will ever ask you for money.'
      ].join('\n'),
      html: layout(site, 'Your EphWorks account is approved', [
        para(`Hello ${esc(name)},`),
        para('A moderator has approved your EphWorks account. You can now save jobs, mark your interest, apply to employers, post jobs, and ask for career support or pastoral care.'),
        button(site, 'Go to EphWorks'),
        para(`Your own referral code is <b style="color:#111c2d">${esc(record.referral_code)}</b>. Give it only to people you know: you will be shown as the person who invited them.`),
        para('Didn’t ask to join EphWorks? Reply to this email and we’ll remove the account.', true)
      ].join('\n      '))
    })
  })
  return Response.json({ sent: sent.ok }, { status: sent.ok ? 200 : 502 })
})
