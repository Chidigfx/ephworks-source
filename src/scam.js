// Instant feedback only; the server enforces the same list in fee_terms_in() (supabase/migrations)
export const BLOCKED_TERMS = [
  'fee', 'fees', 'deposit', 'visa charge', 'visa charges', 'visa fee', 'visa cost',
  'payment required', 'processing fee', 'upfront', 'bank transfer', 'registration fee',
  'security deposit', 'pay before', 'advance payment', 'send money', 'wire transfer',
  'western union', 'moneygram', 'pay to apply'
]

// Common scam signs that are not illegal on their own, so a moderator checks them with HR instead of the form refusing them
const FLAGS = [
  [/\b(whatsapp|telegram|signal)\b/, 'Moves candidates to WhatsApp, Telegram or Signal'],
  [/\bguaranteed?\b.{0,40}\b(jobs?|visas?|placements?|offers?)\b|\b(jobs?|visas?|placements?|offers?)\b.{0,15}\bguaranteed?\b/, 'Promises a guaranteed job, visa or offer'],
  [/\bno interview\b/, 'Offers the job with no interview'],
  [/\bpassports?\b.{0,30}\b(copy|copies|original|hand over|send|submit)\b|\b(send|submit|hand over)\b.{0,30}\bpassports?\b/, 'Asks for passport documents before an interview'],
  [/\b(urgent(ly)?|immediate(ly)?) (hiring|joining|start|requirement)\b/, 'Pressures candidates with urgency']
]
const FREE_MAIL = /@(gmail|yahoo|hotmail|outlook|live|icloud|aol|proton(mail)?)\./i

// Whole words, so "feedback" or "coffee" never trip the fee filter
export function scanPost(text, email = '') {
  const content = text.toLowerCase()
  const flags = FLAGS.filter(([pattern]) => pattern.test(content)).map(([, label]) => label)
  if (FREE_MAIL.test(email)) flags.push('Uses a personal email address, not a company domain')
  return { blocked: BLOCKED_TERMS.filter(term => new RegExp(`\\b${term}\\b`).test(content)), flags }
}
