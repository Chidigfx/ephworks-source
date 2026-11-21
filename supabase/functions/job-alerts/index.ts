// Daily email digest of new jobs matching each member's profile, for members who ticked "Also email me".
// Run once a day by a Supabase Cron job (see README, "Job alert emails").
// Stays switched off, and does nothing, until RESEND_API_KEY and EMAIL_FROM are set as function secrets.

const env = (name: string) => Deno.env.get(name) ?? ''

// Same look as the sign-in emails in supabase/email-templates. Names and job details come from members, so they are escaped.
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
const button = (href: string, label: string) =>
  `<p style="margin:0 0 20px"><a href="${esc(href)}" style="display:inline-block;padding:12px 22px;background:#086d96;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:8px">${esc(label)}</a></p>`
const layout = (site: string, title: string, body: string, footer = '') => `<div style="margin:0;padding:24px 12px;background:#f3f9fc;font-family:'Open Sans',Arial,sans-serif;color:#111c2d">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #dbe7eb;border-radius:12px">
    <tr><td style="padding:28px 28px 8px"><img src="${esc(site)}/apple-touch-icon.png" width="48" height="48" alt="EphWorks" style="display:block;border:0"></td></tr>
    <tr><td style="padding:8px 28px 8px">
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#111c2d">${esc(title)}</h1>
      ${body}
    </td></tr>
    <tr><td style="padding:16px 28px 24px;border-top:1px solid #dbe7eb">
      <p style="margin:0;font-size:12px;line-height:1.6;color:#475569">EphWorks · www.ephworks.com · Free for everyone, always. We will never ask you for money.${footer}</p>
    </td></tr>
  </table>
</div>`
const para = (text: string, small = false) =>
  `<p style="margin:0 0 16px;font-size:${small ? 13 : 15}px;line-height:1.6;color:${small ? '#475569' : '#334155'}">${text}</p>`
const jobRow = (j: { title: string, company: string, emirate: string, salary: string }) =>
  `<tr><td style="padding:12px 14px;border:1px solid #dbe7eb;border-radius:8px;background:#f3f9fc">
    <p style="margin:0;font-size:15px;font-weight:600;color:#111c2d">${esc(j.title)}</p>
    <p style="margin:2px 0 0;font-size:13px;color:#475569">${esc(j.company)} · ${esc(j.emirate)} · ${esc(j.salary)}${/\d/.test(j.salary) ? ' a month' : ''}</p>
  </td></tr><tr><td style="height:8px"></td></tr>`
const rpc = (name: string, body: unknown) => fetch(`${env('SUPABASE_URL')}/rest/v1/rpc/${name}`, {
  method: 'POST',
  headers: { apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
})

Deno.serve(async req => {
  // One-click unsubscribe (RFC 8058): mail apps POST to the List-Unsubscribe address; no secret needed, the token is the key
  const unsubscribe = new URL(req.url).searchParams.get('unsubscribe')
  if (unsubscribe) {
    if (!/^[0-9a-f-]{36}$/i.test(unsubscribe)) return new Response('Invalid link', { status: 400 })
    const ok = await rpc('unsubscribe_alerts', { token: unsubscribe }).then(r => r.ok ? r.json() : false)
    return new Response(ok ? 'You are unsubscribed from EphWorks job alerts.' : 'This link did not work.', { status: ok ? 200 : 404 })
  }

  if (!env('WEBHOOK_SECRET') || req.headers.get('x-webhook-secret') !== env('WEBHOOK_SECRET')) {
    return new Response('Forbidden', { status: 403 })
  }
  if (!env('RESEND_API_KEY') || !env('EMAIL_FROM')) {
    return Response.json({ sent: 0, reason: 'email is not set up yet' })
  }

  // alert_digest() only reads; each member is stamped with alert_sent() once their email has gone out,
  // so a failed send is retried on the next run instead of being lost
  const due = await rpc('alert_digest', {}).then(r => r.ok ? r.json() : Promise.reject(new Error(`digest query failed: ${r.status}`)))

  const site = env('SITE_URL') || 'https://www.ephworks.com'
  let sent = 0
  let failed = 0
  for (const { email, name, jobs, token, as_of } of due as { email: string, name: string, token: string, as_of: string, jobs: { title: string, company: string, emirate: string, salary: string }[] }[]) {
    const oneClick = `${env('SUPABASE_URL')}/functions/v1/job-alerts?unsubscribe=${token}`
    const lines = jobs.map(j => `- ${j.title} at ${j.company}, ${j.emirate} (${j.salary}${/\d/.test(j.salary) ? ' a month' : ''})`)
    const ok = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env('EMAIL_FROM'),
        to: email,
        headers: { 'List-Unsubscribe': `<${oneClick}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
        subject: `${jobs.length} new ${jobs.length === 1 ? 'job matches' : 'jobs match'} your EphWorks profile`,
        text: [
          `Hello ${name},`,
          '',
          `${jobs.length === 1 ? 'This job' : 'These jobs'} went live since your last update and ${jobs.length === 1 ? 'matches' : 'match'} what you are looking for:`,
          '',
          ...lines,
          '',
          `See them and apply straight to the employer: ${site}/jobs`,
          '',
          'Every job was checked with the employer. Nobody will ever ask you for money.',
          `Stop these emails with one click: ${site}/unsubscribe?token=${token}`
        ].join('\n'),
        html: layout(site, `${jobs.length} new ${jobs.length === 1 ? 'job matches' : 'jobs match'} your profile`, [
          para(`Hello ${esc(name)},`),
          para(`${jobs.length === 1 ? 'This job' : 'These jobs'} went live since your last update and ${jobs.length === 1 ? 'matches' : 'match'} what you are looking for. Every one was checked with the employer.`),
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px">${jobs.map(jobRow).join('')}</table>`,
          button(`${site}/jobs`, 'See the jobs and apply'),
          para('You apply straight to the employer. Nobody will ever ask you for money; if anyone does, report the job.', true)
        ].join('\n      '), ` <a href="${esc(`${site}/unsubscribe?token=${token}`)}" style="color:#475569">Stop these emails</a>.`)
      })
    }).then(r => r.ok, () => false)
    if (!ok) { failed++; continue }
    const stamped = await rpc('alert_sent', { token, as_of }).then(r => r.ok, () => false)
    if (stamped) sent++
    else failed++ // sent but not stamped: the member may get these jobs again tomorrow, never lose them
  }
  return Response.json({ sent, failed, due: due.length })
})
