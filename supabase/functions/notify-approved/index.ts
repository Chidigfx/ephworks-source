// Emails a new member when a moderator or admin approves their account.
// Called by a Supabase Database Webhook on UPDATE of public.profiles (see README, "Approval emails").
// Stays switched off, and does nothing, until RESEND_API_KEY and EMAIL_FROM are set as function secrets.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase inside the function; they never reach the browser.

const env = (name: string) => Deno.env.get(name) ?? ''

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
  const site = env('SITE_URL') || 'https://ephworks-source.vercel.app'
  const sent = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env('EMAIL_FROM'),
      to: user.email,
      subject: 'Your Ephworks account is approved',
      text: [
        `Hello ${name},`,
        '',
        'A moderator has approved your Ephworks account. You can now save jobs, mark your interest, post jobs and ask for career support or pastoral care.',
        '',
        `Your own referral code is ${record.referral_code}. Give it only to people you know: you will be shown as the person who invited them.`,
        '',
        `Sign in: ${site}`,
        '',
        'Ephworks is free for everyone, always. Nobody will ever ask you for money.'
      ].join('\n')
    })
  })
  return Response.json({ sent: sent.ok }, { status: sent.ok ? 200 : 502 })
})
