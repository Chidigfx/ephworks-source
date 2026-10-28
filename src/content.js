// About, Safety & Trust, Help and Legal pages. Content only; App.jsx renders the blocks.
// Blocks: p, h (subheading), note (callout; tone 'strong' = warning), list (tone 'warn' = warning icons),
// steps [[title, text]], cards [[title, text, icon, [buttonLabel, action]?]], stats [[value, label]],
// split { paragraphs, image, alt, aside } (text beside a photo), columns [{ title, icon, steps | list, tone }],
// faq [[question, answer]], roles (volunteer roles), cta [[label, action]].
// Actions: a page id, 'apply:<role>', or 'mail'. Icons are names from ICONS in App.jsx.
// Page options: hero (photo for the page banner, or 'plain' for a photo-free banner), doc (render as a document card).
import { SITE_NAME, CONTACT_EMAIL } from './data'

const UPDATED = '28 October 2026'

export const INFO_PAGES = [
  // ---------- About ----------
  {
    id: 'about', path: '/about', group: 'about', tab: 'Our story', hero: '/images/community.webp',
    title: 'Our story',
    lede: `A free job noticeboard for church communities in the UAE, so people find work through people who know them.`,
    blocks: [
      { split: {
        image: '/images/mentor.webp', alt: 'A volunteer mentor going through a CV with a job seeker',
        paragraphs: [
          `${SITE_NAME} began in October 2026 at #HACK2026. Too many people looking for work in the UAE meet fake recruiters in open social media groups, and some are asked to pay for a job that does not exist.`,
          'So we built something smaller and safer: everyone posting a job is known to their church, every job is checked with the employer, and nobody is ever charged.'
        ],
        // TODO(founders): replace this with the real story: who started it, why, and the community it grew from
        aside: 'Our founders are writing the full story of how this started and the community it grew from.'
      } },
      { stats: [['AED 0', 'Free for everyone, always'], ['3 checks', 'Before any job goes live'], ['30 days', 'Longest a post stays up']] },
      { cta: [['Browse jobs', 'opportunities'], ['How it works', 'howItWorks']] }
    ]
  },
  {
    id: 'mission', path: '/about/mission', group: 'about', tab: 'Mission & values', hero: '/images/workday.webp',
    title: 'Mission & values',
    lede: 'Good work, found through people you can trust.',
    blocks: [
      { cards: [
        ['Free for everyone, always', 'Job seekers never pay to browse, apply or get support. Employers never pay to post.', 'heart'],
        ['Verified people', 'Everyone who posts a job is vouched for by their church community.', 'users'],
        ['Verified jobs', 'A moderator checks every job with the employer before it goes live.', 'badge'],
        ['Real support', 'Volunteers from HR and hiring teams help with CVs and practice interviews.', 'support'],
        ['Privacy first', 'We keep as little about you as we can. We never store CVs or beliefs.', 'lock'],
        ['Fair to everyone', 'Church vouching confirms who someone is, never their faith. Jobs here may not require any religion.', 'scale']
      ] }
    ]
  },
  {
    id: 'howItWorks', path: '/about/how-it-works', group: 'about', tab: `How ${SITE_NAME} works`, hero: '/images/community.webp',
    title: `How ${SITE_NAME} works`,
    lede: 'Three checks happen before any job reaches you.',
    blocks: [
      { columns: [
        { title: 'If you are looking for work', icon: 'search', steps: [
          ['Find a job', 'Search by role, emirate and work type. Every listing has been checked with the employer.'],
          ["Tap I'm interested or save it", 'The employer only sees how many people are interested, never who.'],
          ['Apply to the employer directly', `By the email or careers page on the listing. ${SITE_NAME} never sees your CV.`]
        ] },
        { title: 'If you are hiring', icon: 'briefcase', steps: [
          ['Your church vouches for you', 'Your church admin confirms you are known to the community. Only a yes or no is stored.'],
          ['Post the job', 'A few short steps. Posts asking candidates for money are blocked automatically.'],
          ['A moderator checks it with you', 'They confirm the role, pay and contact details with your company.'],
          ['Live for 30 days', 'Posts end after 30 days so the board never fills with old jobs.']
        ] }
      ] },
      { note: 'Church vouching confirms identity and good character, not faith. Anyone can browse and apply for jobs.' },
      { cta: [['Post a job', 'post'], ['How we review jobs', 'jobReview']] }
    ]
  },
  {
    id: 'community', path: '/about/community', group: 'about', tab: 'Our community', hero: '/images/mentor.webp',
    title: 'Our community',
    lede: 'Partner churches, volunteers and members looking out for each other.',
    blocks: [
      { cards: [
        ['Partner churches', 'Each church has an admin who vouches for members who want to post jobs.', 'church'],
        ['Volunteer mentors', 'HR professionals and hiring managers who give free CV reviews and practice interviews.', 'hand'],
        ['Members', 'People looking for work, and people who know of good jobs to share.', 'users']
      ] },
      { h: 'Ways to volunteer' },
      { roles: true },
      { cta: [['Apply to volunteer', 'apply:volunteer'], ['Get career support', 'career']] }
    ]
  },
  {
    id: 'partner', path: '/about/partner', group: 'about', tab: 'Partner with us', hero: '/images/workday.webp',
    title: 'Partner with us',
    lede: 'Help more people find honest work.',
    blocks: [
      { cards: [
        ['Churches', 'Become a partner church. Your church office applies as church admin and vouches for members who post jobs.', 'church', ['Apply as a church admin', 'apply:church_admin']],
        ['Employers', 'Post jobs for free. Every post is checked with you before it goes live.', 'building', ['Post a job', 'post']],
        ['Organisations & sponsors', 'Support the work, run a training session or offer volunteers.', 'hand', ['Email us', 'mail']]
      ] }
    ]
  },

  // ---------- Safety & Trust ----------
  {
    id: 'jobReview', path: '/safety/job-review', group: 'safety', tab: 'How we review jobs', hero: 'plain',
    title: 'How we review jobs',
    lede: 'Every job passes these checks before anyone sees it.',
    blocks: [
      { cards: [
        ['Fee wording is blocked', 'Posts that ask candidates for a fee, deposit, visa cost or transfer cannot be submitted.', 'ban'],
        ['Warning signs are flagged', 'WhatsApp-only contact, guaranteed visas, no interview or passport requests are marked for the moderator.', 'alert'],
        ['The poster is vouched for', 'Their church has confirmed they are known to the community.', 'users'],
        ['Checked with the employer', 'A moderator confirms the role, pay and contact details with the company, and records how.', 'badge'],
        ['Live for 30 days', 'Then it ends. Employers can post again if the role is still open.', 'clock'],
        ['Reports are followed up', 'If someone reports a job, the safety team follows up within 24 hours.', 'flag']
      ] }
    ]
  },
  {
    id: 'jobScams', path: '/safety/job-scams', group: 'safety', tab: 'Recognising job scams', hero: 'plain',
    title: 'Recognising job scams',
    lede: 'A real employer will never ask you for money.',
    blocks: [
      { note: 'In the UAE it is illegal to charge a job seeker recruitment fees (Federal Decree-Law No. 33 of 2021). If anyone asks you to pay, stop.', tone: 'strong' },
      { columns: [
        { title: 'Warning signs', icon: 'alert', tone: 'warn', list: [
          'Asking for any fee, deposit, visa cost or "processing" payment',
          'Only talking on WhatsApp, Telegram or Signal',
          'Promising a guaranteed job or visa',
          'Offering the job with no interview',
          'Asking for your passport or ID before you have met',
          'Pushing you to decide today',
          'Using a personal email instead of a company one'
        ] },
        { title: 'What to do', icon: 'shield', list: [
          'Never pay, and never send passport copies to someone you have not met',
          'Check the company yourself: its website and its own phone number',
          `Report the job on ${SITE_NAME}`,
          'Contact the police if you have lost money'
        ] }
      ] },
      { cta: [['Report a job or concern', 'report']] }
    ]
  },
  {
    id: 'report', path: '/safety/report', group: 'safety', tab: 'Report a concern', hero: 'plain',
    title: 'Report a job or concern',
    lede: 'Tell us and we will follow up within 24 hours.',
    blocks: [
      { cards: [
        ['About a job', 'Open the job and tap Report. Choose what is wrong. It goes straight to the safety team.', 'flag', ['Browse jobs', 'opportunities']],
        ['Anything else', 'Email us what happened, with any names, links or screenshots.', 'mail', ['Email the safety team', 'mail']],
        ['What happens next', 'We follow up within 24 hours. We may remove the post or suspend the account.', 'clock']
      ] },
      { note: 'If you are in danger or have lost money, contact the police first: call 999.', tone: 'strong' }
    ]
  },
  {
    id: 'privacySafety', path: '/safety/privacy', group: 'safety', tab: 'Privacy & data', hero: 'plain',
    title: 'Privacy & data protection',
    lede: 'We keep as little about you as we can.',
    blocks: [
      { cards: [
        ['What we keep', 'Your name, email and photo from sign-in, a yes or no church vouch, your posts, saved interest and any role applications.', 'file'],
        ['What we never keep', 'Your CV, your beliefs or denomination, or payment details.', 'ban'],
        ['Who sees what', 'Employers see a count of interested people, never names. Church admins see requests sent to their church. Admins see names and emails to keep the community safe.', 'eye']
      ] },
      { note: 'We follow the UAE Personal Data Protection Law (Federal Decree-Law No. 45 of 2021).' },
      { cta: [['Read the privacy policy', 'privacy']] }
    ]
  },
  {
    id: 'standards', path: '/safety/standards', group: 'safety', tab: 'Community standards', hero: 'plain',
    title: 'Community standards',
    lede: `What everyone on ${SITE_NAME} agrees to.`,
    blocks: [
      { columns: [
        { title: 'If you post a job', icon: 'briefcase', list: [
          'Never ask candidates for money: no fees, deposits or visa costs',
          'Post real jobs at real companies, with honest pay',
          'Let people apply to you directly',
          'Do not require any religion, nationality, gender or age unless the law allows it',
          'Keep posts up to date; they end after 30 days'
        ] },
        { title: 'Everyone', icon: 'users', list: [
          'Be respectful. No harassment or pressure.',
          'Do not copy or collect other members\' details',
          'Report anything that feels wrong'
        ] }
      ] },
      { note: 'Posts that break these standards are removed, and accounts can be suspended.', tone: 'strong' }
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
      { cards: [
        ['Email us', `Write to ${CONTACT_EMAIL} about anything.`, 'mail', ['Email us', 'mail']],
        ['Report a job', 'Open the job and tap Report. That reaches the safety team fastest.', 'flag', ['How reporting works', 'report']],
        ['Partner with us', 'Churches, employers and organisations who want to help.', 'hand', ['Ways to partner', 'partner']]
      ] }
    ]
  },

  // ---------- Legal (pilot drafts) ----------
  {
    id: 'privacy', path: '/privacy', group: 'legal', tab: 'Privacy', doc: true,
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
    id: 'terms', path: '/terms', group: 'legal', tab: 'Terms', doc: true,
    title: 'Terms of use',
    lede: `Last updated ${UPDATED}.`,
    blocks: [
      { note: 'These are the pilot terms. They are being reviewed before public launch.', tone: 'strong' },
      { h: `What ${SITE_NAME} is` },
      { p: 'A free noticeboard. We check jobs before they go live, but we are not a recruitment agency: we do not collect CVs, shortlist candidates or place anyone in a job. You apply to employers directly.' },
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
