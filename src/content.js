// About, Safety & Trust, Help and Legal pages. Content only; App.jsx renders the blocks.
// Block types: p, h (subheading), list, steps [[title, text]], cards [[title, text]], faq [[question, answer]],
// note (callout, tone 'strong' for warnings; a list with tone 'warn' shows warning icons), roles (volunteer roles), cta [[label, action]].
// Actions: a page id, 'apply:<role>', or 'mail'.
import { SITE_NAME, CONTACT_EMAIL } from './data'

const UPDATED = '28 October 2026'

export const INFO_PAGES = [
  // ---------- About ----------
  {
    id: 'about', path: '/about', group: 'about', tab: 'Our story',
    title: `Our story`,
    lede: `${SITE_NAME} is a free job noticeboard for church communities in the UAE, built so people can find work through people who know them.`,
    blocks: [
      // TODO(founders): replace this note with the real story: who started it, why, and which community it grew from
      { note: 'Our founders are writing this part. It will tell how the idea started and the community it grew from.' },
      { p: `${SITE_NAME} began in October 2026 at #HACK2026. Too many people looking for work in the UAE meet fake recruiters in open social media groups, and some are asked to pay for a job that does not exist.` },
      { p: `So we built something smaller and safer: every person posting a job is known to their church, every job is checked with the employer, and nobody is ever charged.` },
      { cta: [['Browse jobs', 'opportunities'], ['How it works', 'howItWorks']] }
    ]
  },
  {
    id: 'mission', path: '/about/mission', group: 'about', tab: 'Mission & values',
    title: 'Mission & values',
    lede: 'Good work, found through people you can trust.',
    blocks: [
      { cards: [
        ['Free for everyone, always', 'Job seekers never pay to browse, apply or get support. Employers never pay to post.'],
        ['Verified people', 'Everyone who posts a job is vouched for by their church community.'],
        ['Verified jobs', 'A moderator checks every job with the employer before it goes live.'],
        ['Real support', 'Volunteers from HR and hiring teams help with CVs and practice interviews.'],
        ['Privacy first', 'We keep as little about you as we can. We never store CVs or beliefs.'],
        ['Fair to everyone', 'Church vouching confirms who someone is, never their faith. Jobs here may not require any religion.']
      ] }
    ]
  },
  {
    id: 'howItWorks', path: '/about/how-it-works', group: 'about', tab: `How ${SITE_NAME} works`,
    title: `How ${SITE_NAME} works`,
    lede: 'Three checks happen before any job reaches you.',
    blocks: [
      { h: 'If you are looking for work' },
      { steps: [
        ['Find a job', 'Search by role, emirate and work type. Every listing has been checked with the employer.'],
        ["Tap I'm interested or save it", 'The employer only sees how many people are interested, never who.'],
        ['Apply to the employer directly', `You apply by the email or careers page on the listing. ${SITE_NAME} never sees your CV.`]
      ] },
      { h: 'If you are hiring' },
      { steps: [
        ['Your church vouches for you', 'Your church admin confirms you are known to the community. Only a yes or no is stored.'],
        ['Post the job', 'A few short steps. Posts asking candidates for money are blocked automatically.'],
        ['A moderator checks it with you', 'They confirm the role, pay and contact details with your company before it goes live.'],
        ['Live for 30 days', 'Posts end after 30 days so the board never fills with old jobs.']
      ] },
      { note: 'Church vouching confirms identity and good character, not faith. Anyone can browse and apply for jobs.' },
      { cta: [['Post a job', 'post'], ['How we review jobs', 'jobReview']] }
    ]
  },
  {
    id: 'community', path: '/about/community', group: 'about', tab: 'Our community',
    title: 'Our community',
    lede: 'Partner churches, volunteers and members looking out for each other.',
    blocks: [
      { cards: [
        ['Partner churches', 'Each church has an admin who vouches for members who want to post jobs.'],
        ['Volunteer mentors', 'HR professionals and hiring managers who give free CV reviews and practice interviews.'],
        ['Members', 'People looking for work, and people who know of good jobs to share.']
      ] },
      { h: 'Ways to volunteer' },
      { roles: true },
      { cta: [['Apply to volunteer', 'apply:volunteer'], ['Get career support', 'career']] }
    ]
  },
  {
    id: 'partner', path: '/about/partner', group: 'about', tab: 'Partner with us',
    title: 'Partner with us',
    lede: 'Help more people find honest work.',
    blocks: [
      { cards: [
        ['Churches', 'Become a partner church. Your church office applies as church admin and vouches for members who post jobs.'],
        ['Employers', 'Post jobs for free. Every post is checked with you before it goes live.'],
        ['Organisations & sponsors', 'Support the work, run a training session or offer volunteers. Email us to talk.']
      ] },
      { cta: [['Apply as a church admin', 'apply:church_admin'], ['Post a job', 'post'], ['Email us', 'mail']] }
    ]
  },

  // ---------- Safety & Trust ----------
  {
    id: 'jobReview', path: '/safety/job-review', group: 'safety', tab: 'How we review jobs',
    title: 'How we review jobs',
    lede: 'Every job passes these checks before anyone sees it.',
    blocks: [
      { steps: [
        ['Fee wording is blocked', 'Posts that ask candidates for a fee, deposit, visa cost or transfer cannot be submitted.'],
        ['Warning signs are flagged', 'WhatsApp-only contact, guaranteed visas, no interview or passport requests are marked for the moderator.'],
        ['The poster is vouched for', 'Their church has confirmed they are known to the community.'],
        ['A moderator checks with the employer', 'They confirm the role, pay and contact details with the company, and record how.'],
        ['It goes live for 30 days', 'Then it ends. Employers can post again if the role is still open.'],
        ['Reports are followed up', 'If someone reports a job, the safety team follows up within 24 hours.']
      ] }
    ]
  },
  {
    id: 'jobScams', path: '/safety/job-scams', group: 'safety', tab: 'Recognising job scams',
    title: 'Recognising job scams',
    lede: 'A real employer will never ask you for money.',
    blocks: [
      { note: 'In the UAE it is illegal to charge a job seeker recruitment fees (Federal Decree-Law No. 33 of 2021). If anyone asks you to pay, stop.', tone: 'strong' },
      { h: 'Warning signs' },
      { tone: 'warn', list: [
        'Asking for any fee, deposit, visa cost or "processing" payment',
        'Only talking on WhatsApp, Telegram or Signal',
        'Promising a guaranteed job or visa',
        'Offering the job with no interview',
        'Asking for your passport or ID before you have met',
        'Pushing you to decide today',
        'Using a personal email instead of a company one'
      ] },
      { h: 'What to do' },
      { list: [
        'Never pay, and never send passport copies to someone you have not met',
        'Check the company yourself: its website and its own phone number',
        `Report the job on ${SITE_NAME}, and contact the police if you have lost money`
      ] },
      { cta: [['Report a job or concern', 'report']] }
    ]
  },
  {
    id: 'report', path: '/safety/report', group: 'safety', tab: 'Report a concern',
    title: 'Report a job or concern',
    lede: 'Tell us and we will follow up within 24 hours.',
    blocks: [
      { steps: [
        ['About a job', 'Open the job and tap Report. Choose what is wrong. It goes straight to the safety team.'],
        ['About a person or anything else', 'Email us with what happened, and any names, links or screenshots.'],
        ['What happens next', 'We follow up within 24 hours. We may remove the post or suspend the account.']
      ] },
      { note: 'If you are in danger or have lost money, contact the police first: call 999.', tone: 'strong' },
      { cta: [['Browse jobs', 'opportunities'], ['Email the safety team', 'mail']] }
    ]
  },
  {
    id: 'privacySafety', path: '/safety/privacy', group: 'safety', tab: 'Privacy & data',
    title: 'Privacy & data protection',
    lede: 'We keep as little about you as we can.',
    blocks: [
      { cards: [
        ['What we keep', 'Your name, email and photo from sign-in, a yes or no church vouch, your posts, saved interest and any role applications.'],
        ['What we never keep', 'Your CV, your beliefs or denomination, or payment details.'],
        ['Who sees what', 'Employers see a count of interested people, never names. Church admins see requests sent to their church. Admins see members\' names and emails to keep the community safe.']
      ] },
      { p: 'We follow the UAE Personal Data Protection Law (Federal Decree-Law No. 45 of 2021).' },
      { cta: [['Read the privacy policy', 'privacy']] }
    ]
  },
  {
    id: 'standards', path: '/safety/standards', group: 'safety', tab: 'Community standards',
    title: 'Community standards',
    lede: `What everyone on ${SITE_NAME} agrees to.`,
    blocks: [
      { h: 'If you post a job' },
      { list: [
        'Never ask candidates for money: no fees, deposits or visa costs',
        'Post real jobs at real companies, with honest pay',
        'Let people apply to you directly',
        'Do not require any religion, nationality, gender or age unless the law allows it',
        'Keep posts up to date; they end after 30 days'
      ] },
      { h: 'Everyone' },
      { list: [
        'Be respectful. No harassment or pressure.',
        'Do not copy or collect other members\' details',
        'Report anything that feels wrong'
      ] },
      { p: 'Posts that break these standards are removed, and accounts can be suspended.' }
    ]
  },

  // ---------- Help ----------
  {
    id: 'faq', path: '/faq', group: 'help', tab: 'FAQs',
    title: 'Frequently asked questions',
    blocks: [
      { faq: [
        [`Is ${SITE_NAME} free?`, 'Yes, for everyone, always. Job seekers never pay and employers never pay to post.'],
        ['Do I need to belong to a church to find work?', 'No. Anyone can browse and apply. Only people who post jobs are vouched for by their church.'],
        [`Does ${SITE_NAME} store my CV?`, 'No. You apply to the employer directly by their email or careers page.'],
        ['How are jobs checked?', 'Fee wording is blocked, the poster is vouched for by their church, and a moderator confirms the job with the employer.'],
        ['Someone asked me to pay for a job. What do I do?', 'Do not pay. It is illegal to charge job seekers. Report the job and tell us what happened.'],
        ['How do I post a job?', 'Tap Post a job. Your church vouches for you, then a moderator checks the post with you before it goes live.'],
        ["My church isn't listed. What now?", 'Type its name and choose Suggest this church. We check it and add it.'],
        ['How long do jobs stay up?', '30 days. Then they end, so the board stays fresh.'],
        ['How do I delete my account?', `Email us at ${CONTACT_EMAIL} and we will delete it.`]
      ] },
      { cta: [['Contact us', 'contact']] }
    ]
  },
  {
    id: 'contact', path: '/contact', group: 'help', tab: 'Contact us',
    title: 'Contact us',
    lede: 'Questions, partnerships or concerns. We read every message.',
    blocks: [
      { cta: [['Email us', 'mail']] },
      { p: `Or write to ${CONTACT_EMAIL}.` },
      { note: 'To report a job, open it and tap Report. That reaches the safety team fastest.' }
    ]
  },

  // ---------- Legal (pilot drafts) ----------
  {
    id: 'privacy', path: '/privacy', group: 'legal', tab: 'Privacy',
    title: 'Privacy policy',
    lede: `Last updated ${UPDATED}.`,
    blocks: [
      { note: 'This is the pilot version of our privacy policy. It is being reviewed before public launch.', tone: 'strong' },
      { h: 'What we collect' },
      { list: [
        'From sign-in: your name, email address and profile photo',
        'A yes or no church vouch, and which partner church gave it',
        'Jobs you post, jobs you mark as interested, reports you file and role applications you send'
      ] },
      { h: 'What we do not collect' },
      { p: 'Your CV, your religious beliefs or denomination, or any payment details.' },
      { h: 'How we use it' },
      { p: 'Only to run the noticeboard: to show jobs, check posters and jobs, keep the community safe and contact you about your account.' },
      { h: 'Who can see it' },
      { p: 'Employers see a count of interested people, never names. Church admins see vouch requests sent to their church. Moderators see posts waiting for checks. Admins see members\' names and emails. We never sell or share your data with advertisers.' },
      { h: 'Where it is kept' },
      { p: 'Accounts and posts are stored with our database provider, Supabase. Saved and applied jobs stay on your own device. Fonts are loaded from Google Fonts, which receives your IP address. We use no advertising or tracking cookies.' },
      { h: 'How long we keep it' },
      { p: 'Jobs end after 30 days. Your account is kept until you ask us to delete it.' },
      { h: 'Your rights' },
      { p: `You can ask to see, correct or delete your data at any time: ${CONTACT_EMAIL}. We follow the UAE Personal Data Protection Law (Federal Decree-Law No. 45 of 2021).` }
    ]
  },
  {
    id: 'terms', path: '/terms', group: 'legal', tab: 'Terms',
    title: 'Terms of use',
    lede: `Last updated ${UPDATED}.`,
    blocks: [
      { note: 'These are the pilot terms. They are being reviewed before public launch.', tone: 'strong' },
      { h: `What ${SITE_NAME} is` },
      { p: `A free noticeboard. We check jobs before they go live, but we are not a recruitment agency: we do not collect CVs, shortlist candidates or place anyone in a job. You apply to employers directly.` },
      { h: 'Using the service' },
      { list: [
        `${SITE_NAME} is free for everyone`,
        'Follow the community standards',
        'Keep your sign-in to yourself and tell us if your account is misused'
      ] },
      { h: 'Posting jobs' },
      { p: 'You must be allowed to hire for the role, describe it honestly and never charge candidates. We can refuse or remove any post.' },
      { h: 'No guarantees' },
      { p: 'We check jobs carefully, but we cannot promise any job, interview or outcome. Always check an employer yourself before sharing personal documents.' },
      { h: 'Suspension' },
      { p: 'We can suspend accounts that break these terms or put others at risk.' },
      { h: 'Law' },
      { p: 'These terms are governed by the laws of the United Arab Emirates.' },
      { h: 'Changes' },
      { p: 'If we change these terms, we will update the date at the top.' }
    ]
  }
]

export const INFO_GROUPS = { about: 'About', safety: 'Safety & Trust', help: 'Help', legal: 'Legal' }

// Footer columns, in order
export const FOOTER = [
  { title: `About ${SITE_NAME}`, ids: ['about', 'mission', 'howItWorks', 'community', 'partner'] },
  { title: 'Safety & Trust', ids: ['jobReview', 'jobScams', 'report', 'privacySafety', 'standards'] },
  { title: 'Help', ids: ['faq', 'contact'] },
  { title: 'Legal', ids: ['privacy', 'terms'] }
]
