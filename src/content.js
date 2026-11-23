// About, Safety & Trust, Help and Legal pages. Content only; App.jsx renders the blocks.
// Blocks: p, h (subheading), note (callout; tone 'strong' = warning), list (tone 'warn' = warning icons),
// steps [[title, text]], cards [[title, text, icon, [buttonLabel, action]?]], stats [[value, label]],
// split { paragraphs, image, alt, aside } (text beside a photo), columns [{ title, icon, steps | list, tone }],
// faq [[question, answer]], roles (volunteer roles), cta [[label, action]].
// Actions: a page id, 'apply:<role>', 'contact:<topic>', or an https:// link (opens in a new tab). Icons are names from ICONS in App.jsx.
// Page options: hero (photo for the page banner, or 'plain' for a photo-free banner), doc (render as a document card).
import { SITE_NAME } from './data'

const UPDATED = '2 November 2026'

export const INFO_PAGES = [
  // ---------- About ----------
  {
    id: 'about', path: '/about', group: 'about', tab: 'Our Story', hero: '/images/community.webp',
    title: 'Our Story',
    lede: 'A free job noticeboard connecting church communities with trusted opportunities.',
    blocks: [
      { split: {
        image: '/images/mentor.webp', alt: 'A volunteer mentor going through a CV with a job seeker',
        paragraphs: [
          `${SITE_NAME} began in Dubai, UAE, in October 2026.`,
          'Our founding members kept hearing the same story. People searching for work online were meeting fake recruiters, and some were asked to pay for jobs that did not exist. For many job seekers, it is hard to tell which opportunities are genuine, and the cost of getting it wrong is high.',
          `We decided to act. ${SITE_NAME} is a free job noticeboard for church communities, built on trust at every step. A church admin vouches for each person who posts a job. A moderator then checks the opportunity with the employer before it goes live. Job seekers apply straight to the employer, we never store their CV, and no one is ever asked to pay, whether they are applying or posting. Job seekers can also request CV and LinkedIn reviews, mock interviews and pastoral care.`,
          'We believe church communities are well placed to make job searching safer. People who know one another can vouch for one another, and that care is what makes a noticeboard worth trusting. Our hope is to make the search for work safer and more personal, and, over time, to help reduce if not eradicate the harm that fake recruiters cause.'
        ]
      } },
      { stats: [['AED 0', 'Free for everyone, always'], ['3 checks', 'Before any job goes live'], ['30 days', 'Longest a post stays up']] },
      { cta: [['Browse jobs', 'opportunities'], ['How it works', 'howItWorks']] }
    ]
  },
  {
    id: 'mission', path: '/about/mission', group: 'about', tab: 'Vision & Mission', hero: '/images/workday.webp',
    title: 'Our Vision, Mission and values',
    lede: 'Meaningful work, found through people you can trust.',
    blocks: [
      { cards: [
        ['Our Vision', 'A future where everyone can access meaningful work through trusted connections and genuine opportunities.', 'eye'],
        ['Our Mission', 'To connect job seekers with genuine employment opportunities and help employers find well-matched candidates through trusted church and community networks. Starting in the UAE, we promote a safe, fair and inclusive employment experience guided by Christian values.', 'flag'],
        ['Our Purpose', 'To turn trusted relationships into meaningful work opportunities, helping job seekers grow and support their families while helping employers find capable, well-matched people.', 'hand']
      ] },
      { h: 'Our Values' },
      { cards: [
        ['Free for everyone, always', 'Job seekers never pay to browse, apply or get support. Employers never pay to post.', 'heart'],
        ['Verified people', 'Everyone who posts a job is vouched for by their church community.', 'users'],
        ['Verified jobs', 'A moderator checks every job with the employer before it goes live.', 'badge'],
        ['Real support', 'HR and hiring professionals volunteer to help with CV reviews and mock interviews.', 'support'],
        ['Privacy first', 'We keep as little about you as we can. We never store CVs or beliefs.', 'lock'],
        ['Fair to everyone', 'Church vouching confirms who someone is, never their faith. Jobs here may not require any religion.', 'scale']
      ] }
    ]
  },
  {
    id: 'howItWorks', path: '/about/how-it-works', group: 'about', tab: 'How It Works', hero: '/images/community.webp',
    title: 'How It Works',
    lede: 'A simple process for job seekers and employers.',
    blocks: [
      { columns: [
        { title: 'If you are looking for work', icon: 'search', steps: [
          ['Find a job', 'Search by role, emirate and work type. Every listing has been checked with the employer.'],
          ['Tap “I’m Interested” or save the job', 'When you tap “I’m Interested”, the employer sees the number of interested users, not who clicked.'],
          ['Apply directly to the employer', `Use the email address or careers page in the job post. ${SITE_NAME} does not receive your CV through the application.`]
        ] },
        { title: 'If you are hiring', icon: 'briefcase', steps: [
          ['Your church admin vouches for you', 'The admin confirms whether they know you. Only your church admin sees the details you share, and the vouch itself is just a Yes or No.'],
          ['Post the job in a few short steps', 'Posts asking job seekers to pay are automatically blocked.'],
          ['A moderator reviews your post', 'They confirm the role, pay and contact details with you before it goes live.']
        ] }
      ] },
      { note: 'Each post stays live for 30 days, then expires.' },
      { note: 'Church vouching confirms the person posting a job is known to their church. It is not a test of faith: anyone can browse jobs, and approved members can apply.' },
      { cta: [['Post a job', 'post'], ['How we review jobs', 'jobReview']] }
    ]
  },
  {
    id: 'community', path: '/about/community', group: 'about', tab: 'Our Community', hero: '/images/mentor.webp',
    title: 'Our Community',
    lede: 'Partner churches, volunteers and members working together to help people find genuine job opportunities.',
    blocks: [
      { cards: [
        ['Partner Churches', 'Each partner church has an admin who can vouch for people posting jobs.', 'church'],
        ['Volunteer Mentors', 'HR professionals and hiring managers who provide free CV reviews and mock interviews.', 'hand'],
        ['Members', 'Job seekers and community members who share job leads.', 'users']
      ] },
      { h: 'Ways to volunteer' },
      { roles: true },
      { cta: [['Get career support', 'career']] }
    ]
  },
  {
    id: 'partner', path: '/about/partner', group: 'about', tab: 'Partner With Us', hero: '/images/workday.webp',
    title: 'Partner With Us',
    lede: 'Help more people find genuine job opportunities.',
    blocks: [
      { cards: [
        ['Churches', 'A church representative can apply to become a church admin and vouch for members who post jobs.', 'church', ['Apply as a church admin', 'apply:church_admin']],
        ['Employers', 'Post jobs for free. A moderator checks each job with you before it goes live.', 'building', ['Post a job', 'post']],
        ['Organisations & Sponsors', 'Support our work, host a training session or connect us with volunteers.', 'hand', ['Send us a message', 'contact:partnership']]
      ] }
    ]
  },

  // ---------- Safety & Trust ----------
  {
    id: 'jobReview', path: '/safety/job-review', group: 'safety', tab: `How ${SITE_NAME} Checks`, hero: 'plain',
    title: `How ${SITE_NAME} checks and monitors job posts`,
    lede: 'Every job is reviewed before it goes live.',
    blocks: [
      { cards: [
        ['Payment Requests Blocked', 'Posts requesting fees, deposits, or money transfers cannot be submitted.', 'ban'],
        ['Warning Signs Reviewed', 'Moderators check flagged posts, including WhatsApp-only contact, passport requests, or pressure language.', 'alert'],
        ['Poster Vouched For', 'Their church admin confirms they are known to the community.', 'users'],
        ['Employer Details Confirmed', 'Moderators verify the role, pay, and contact details directly with the employer.', 'badge'],
        ['Posts Expire After 30 Days', 'Employers can repost roles that remain open after expiry.', 'clock'],
        ['Reports Followed Up', 'The safety team follows up on reported jobs within 72 hours.', 'flag']
      ] }
    ]
  },
  {
    id: 'jobScams', path: '/safety/job-scams', group: 'safety', tab: 'Recognising Job Scams', hero: 'plain',
    title: 'How to Recognise Job Scams',
    lede: 'Real employers don’t charge job seekers.',
    blocks: [
      { note: 'UAE private-sector employers cannot charge workers recruitment or employment costs. If asked to pay for a job, stop and verify. Federal Decree-Law No. 33 of 2021, Article 6(4).', tone: 'strong' },
      { columns: [
        { title: 'Warning Signs', icon: 'alert', tone: 'warn', list: [
          'Requests fees, deposits, visa charges or “processing” payments.',
          'Insists on WhatsApp, Telegram or Signal as the only contact.',
          'Guarantees a job or visa before a proper interview.',
          'Offers employment without interviewing or checking your suitability.',
          'Requests passport or ID copies before you verify the employer.',
          'Pressures you to decide immediately or pay without time.',
          'Uses a personal email instead of an official company address.'
        ] },
        { title: 'What To Do', icon: 'shield', list: [
          'Never pay recruitment fees or send documents to unverified contacts.',
          'Verify the company using its official website and listed number.',
          `Report suspicious job posts or messages through ${SITE_NAME}.`,
          'Contact local police if you have already lost money.'
        ] }
      ] },
      { cta: [['Report a Job or Concern', 'report']] }
    ]
  },
  {
    id: 'report', path: '/safety/report', group: 'safety', tab: 'Report A Concern', hero: 'plain',
    title: 'Report a Job or Safety Concern',
    lede: 'Our safety team will follow up within 72 hours.',
    blocks: [
      { cards: [
        ['About A Job', `Open the job, tap Report, and choose a reason. Your report goes directly to the ${SITE_NAME} safety team.`, 'flag', ['Browse jobs', 'opportunities']],
        ['Anything Else', 'Message the safety team with details of what happened. Include relevant names or links if available.', 'mail', ['Message the safety team', 'contact:safety']],
        ['What Happens Next', 'We review your report and follow up within 24 hours. We may remove the post or suspend the account.', 'clock']
      ] },
      { note: 'In immediate danger? Lost money? Report it to the police promptly. Call UAE Police on 999.', tone: 'strong' }
    ]
  },
  {
    id: 'privacySafety', path: '/safety/privacy', group: 'safety', tab: 'Privacy & Data', hero: 'plain',
    title: 'Privacy & Data Protection',
    lede: `We collect only the information needed to provide ${SITE_NAME}.`,
    blocks: [
      { cards: [
        ['What We Keep', 'We store account and vouch details, contact information you provide, job preferences, posts, role applications and pastoral-care requests. Saved jobs remain on your device.', 'file'],
        ['What We Never Keep', `We never store CVs, religious beliefs or denomination, or payment details. CVs are shared directly with employers or mentors, outside the ${SITE_NAME} website.`, 'ban'],
        ['Who Sees What', 'Employers see interest counts, never names. Church admins see their church’s vouch requests. Moderators and admins can access account details; pastoral carers see only requests shared with them.', 'eye']
      ] },
      { note: `${SITE_NAME} is committed to protecting your personal data in line with applicable UAE data protection requirements.` },
      { cta: [['Read the privacy policy', 'privacy']] }
    ]
  },
  {
    id: 'standards', path: '/safety/standards', group: 'safety', tab: 'Community Standards', hero: 'plain',
    title: 'Community Standards',
    lede: `Standards for everyone using ${SITE_NAME}.`,
    blocks: [
      { columns: [
        { title: 'If You Post A Job', icon: 'briefcase', list: [
          'Never charge applicants recruitment fees or employment costs.',
          'Post genuine vacancies with clear, accurate pay details.',
          'Give applicants clear instructions for applying directly to you.',
          'Use fair, job-related criteria when assessing every applicant. Never require a religion, nationality, gender or age unless the law allows it.',
          'Keep job details current; listings expire after 30 days.'
        ] },
        { title: 'Everyone', icon: 'users', list: [
          'Treat others respectfully; harassment, discrimination and pressure are unacceptable.',
          'Respect members’ privacy; never misuse their personal details.',
          `Report suspicious jobs, messages or behaviour to ${SITE_NAME}.`
        ] }
      ] },
      { note: 'Posts that break these standards may be removed, and accounts may be suspended.', tone: 'strong' }
    ]
  },

  // ---------- Help ----------
  {
    id: 'faq', path: '/faq', group: 'help', tab: 'FAQs',
    title: 'Frequently Asked Questions',
    blocks: [
      { faq: [
        [`Is ${SITE_NAME} free?`, 'Yes. Job seekers can browse, apply and get support for free. Employers post jobs without charge.'],
        ['Do I need to belong to a church to find work?', 'Anyone can browse jobs. To apply, you need an approved account and a referral code from a member who knows you. Job posters must be vouched for by their church.'],
        [`How do I join ${SITE_NAME}?`, 'Ask a member who knows you for a referral code. Create an account using your email and password, or Google, then confirm your email. A moderator or admin checks with the member before reviewing your account. You can browse while you wait; once approved, you can apply. If you need help, contact us and choose “Help with my account.”'],
        ['What is pastoral care?', 'You can request prayer or someone to talk to. Choose your church’s care team or a carer from another church. Only the team or carer you choose can see your request. It is not linked to jobs, and you can delete it at any time.'],
        [`Does ${SITE_NAME} store my CV?`, `No. ${SITE_NAME} never stores your CV. Apply directly using the employer’s email or careers page.`],
        ['How are jobs checked?', 'Posts requesting fees, deposits or money transfers are blocked. A church admin vouches for the poster. A moderator verifies job details with the employer before publication.'],
        ['Someone asked me to pay for a job. What should I do?', 'Do not pay recruitment fees. Employers are responsible for recruitment costs under UAE law. Report the job and tell us what happened.'],
        ['How do I post a job?', 'As an approved member, select Post a job and submit the details. Your church admin vouches for you. A moderator checks the post before it goes live.'],
        ['My church isn’t listed. What should I do?', 'Suggest the church by entering its name and emirate. An admin reviews the request before adding it.'],
        ['Where can I learn about my rights at work in the UAE?', 'Visit MOHRE for guidance on labour law, contracts and complaints. Use the button below to open its official website.'],
        ['How long do jobs stay live?', 'Job posts stay live for 30 days, then expire. Employers may repost roles that remain open.'],
        ['How do I delete my account?', 'Contact us and select “Help with my account.” We’ll delete your account and confirm when it’s done.']
      ] },
      { cta: [['Contact Us', 'contact'], ['UAE Labour Rights (MOHRE)', 'https://www.mohre.gov.ae']] }
    ]
  },
  {
    id: 'contact', path: '/contact', group: 'help', tab: 'Contact Us',
    title: 'Contact Us',
    lede: 'For questions, partnership ideas or concerns, send us a message. We’ll read your message and reply by email.',
    blocks: [
      { contactForm: true },
      { cards: [
        ['Report A Job', 'Open a job and tap Report to send it directly to our safety team.', 'flag', ['How reporting works', 'report']],
        ['Partner With Us', `Churches, employers and organisations can support ${SITE_NAME} through several practical partnership options.`, 'hand', ['Ways to partner', 'partner']]
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
        'When you sign in, we collect your name and email, plus your Google profile photo if available. Passwords are stored as secure hashes, not plain text.',
        'We record your referral code, who invited you, and which moderator or admin approved your account.',
        'Profile details include your display name, phone number, preferred emirates, work types, keywords and minimum salary.',
        'We record your vouch decision and partner church, plus the phone and ministry or church-reference details you provide. The relevant church admin can see these details.',
        'We collect details of jobs you post, jobs you mark “I’m interested” in, reports you submit and role applications you make.',
        'For pastoral-care requests, we collect your selected church or carer, your name, the support requested and any notes you provide.',
        'When you contact us, we collect the name, email address and message you provide.'
      ] },
      { h: 'What we do not collect' },
      { p: 'We do not ask you to state your religious beliefs or denomination. Your church affiliation or pastoral-care request may still reveal sensitive information.' },
      { h: 'How we use it' },
      { list: [
        'We use your information to run the job board, display jobs, verify posters and protect the community.',
        `We use account details to contact you about your ${SITE_NAME} account.`,
        'Pastoral-care details connect you with the care team or carer you choose.',
        'Pastoral-care requests are not linked to jobs or used for job matching.',
        'Job preferences help show suitable roles and send alerts if you opt in.'
      ] },
      { h: 'Who can see it' },
      { list: [
        'Employers see interest counts, never the names of interested members.',
        'Church admins see vouch requests sent to their church.',
        'Moderators see posts under review and the referral details you provide.',
        'Moderators and admins can view phone numbers you provide.',
        'Admins see members’ names, email addresses, inviters and approvers.',
        'Your pastoral-care request is visible to the care team or carer you choose.',
        'Admins, moderators, church admins and employers cannot view those requests.',
        'Admins read contact-form messages; moderators can also read safety concerns.',
        'We do not sell your data or share it with advertisers.'
      ] },
      { h: 'Where your data is stored' },
      { p: 'Accounts and job posts are stored by Supabase, our database provider. Saved and applied jobs stay on your device. Google Fonts receives your IP address when fonts load. Google may receive technical information when its sign-in service loads. We do not use advertising or tracking cookies.' },
      { h: 'How long we keep it' },
      { list: [
        'Job listings expire after 30 days.',
        'Pastoral-care requests can be deleted at any time.',
        'You can request account deletion through Contact us.'
      ] },
      { h: 'Your rights' },
      { p: 'You can request access to or correction of your personal data through Contact Us. You can also request deletion, subject to applicable legal requirements.' }
    ]
  },
  {
    id: 'terms', path: '/terms', group: 'legal', tab: 'Terms', doc: true,
    title: 'Terms of use',
    lede: `Last updated ${UPDATED}.`,
    blocks: [
      { note: 'These are the pilot terms. They are being reviewed before public launch.', tone: 'strong' },
      { h: `What ${SITE_NAME} is` },
      { p: `${SITE_NAME} is a free job noticeboard. We review listings before publication, but we are not a recruitment agency. We do not collect CVs, shortlist candidates or place people in jobs. Applicants contact employers directly.` },
      { h: 'Using the service' },
      { list: [
        `${SITE_NAME} is free to browse and post jobs.`,
        'Follow the community standards while using the platform.',
        'Keep your password private and report suspected account misuse.'
      ] },
      { h: 'Posting jobs' },
      { p: `Post only vacancies you are authorised to advertise. Describe each role accurately and never charge applicants. ${SITE_NAME} may reject or remove posts that breach these terms.` },
      { h: 'No guarantees' },
      { p: 'We review listings but cannot guarantee interviews, job offers or hiring outcomes. Verify employers before sharing sensitive documents.' },
      { h: 'Suspension' },
      { p: 'We may suspend accounts that breach these terms or put others at risk.' },
      { h: 'Governing law' },
      { p: 'These terms are governed by the laws of the United Arab Emirates.' },
      { h: 'Changes' },
      { p: 'We may update these terms from time to time. We’ll publish each new version with its updated date. We’ll notify users about significant changes before they take effect.' }
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
