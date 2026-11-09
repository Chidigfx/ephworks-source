// Daily email digest of new jobs matching each member's profile, for members who ticked "Also email me".
// Run once a day by a Supabase Cron job (see README, "Job alert emails").
// Stays switched off, and does nothing, until RESEND_API_KEY and EMAIL_FROM are set as function secrets.

const env = (name: string) => Deno.env.get(name) ?? ''
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
    return new Response(ok ? 'You are unsubscribed from Ephworks job alerts.' : 'This link did not work.', { status: ok ? 200 : 404 })
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

  const site = env('SITE_URL') || 'https://ephworks-source.vercel.app'
  let sent = 0
  let failed = 0
  for (const { email, name, jobs, token, as_of } of due as { email: string, name: string, token: string, as_of: string, jobs: { title: string, company: string, emirate: string, salary: string }[] }[]) {
    const oneClick = `${env('SUPABASE_URL')}/functions/v1/job-alerts?unsubscribe=${token}`
    const lines = jobs.map(j => `- ${j.title} at ${j.company}, ${j.emirate} (${j.salary} a month)`)
    const ok = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env('EMAIL_FROM'),
        to: email,
        headers: { 'List-Unsubscribe': `<${oneClick}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
        subject: `${jobs.length} new ${jobs.length === 1 ? 'job matches' : 'jobs match'} your Ephworks profile`,
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
        ].join('\n')
      })
    }).then(r => r.ok, () => false)
    if (!ok) { failed++; continue }
    const stamped = await rpc('alert_sent', { token, as_of }).then(r => r.ok, () => false)
    if (stamped) sent++
    else failed++ // sent but not stamped: the member may get these jobs again tomorrow, never lose them
  }
  return Response.json({ sent, failed, due: due.length })
})
