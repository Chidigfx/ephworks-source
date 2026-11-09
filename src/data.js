// One place for the name and contact address, so they are easy to change once confirmed
export const SITE_NAME = 'Ephworks'

// Every company, person, job, and remuneration figure below is fictional demo data.
export const SAMPLE_JOBS = [
  {
    id: 'mkt-01',
    title: 'Marketing & Communications Executive',
    company: 'Olive & Field Studio',
    emirate: 'Dubai',
    type: 'Full-time',
    mode: 'On-site',
    salary: 'AED 7,000 – 9,000',
    category: 'Marketing',
    initials: 'OF',
    hue: 'sage',
    hours: 'Monday–Friday · 9 am–6 pm',
    daysLeft: 26,
    postedAgo: '4 days ago',
    verifiedWithEmployer: true,
    verificationNote: 'Moderator verified role & salary directly with Olive & Field Studio HR. Zero candidate fees confirmed.',
    directEmail: 'careers@oliveandfield.ae',
    directPortal: 'https://oliveandfield.ae/jobs/mkt-exec',
    sponsorship: 'Employer proposes sponsorship, subject to eligibility and required approvals. Required work authorisation must be in place before starting.',
    description: 'Help a small creative studio tell thoughtful stories. You’ll support campaign planning, write clear content, and work with a collaborative design team.',
    responsibilities: [
      'Plan and maintain the monthly content calendar.',
      'Write and coordinate content across digital channels.',
      'Track campaign results and share practical improvements.'
    ],
    requirements: ['Content planning', 'Communication', '2+ years experience']
  },
  {
    id: 'adm-02',
    title: 'Administrative Coordinator',
    company: 'Cedar Lane Services',
    emirate: 'Sharjah',
    type: 'Full-time',
    mode: 'On-site',
    salary: 'AED 4,500 – 6,000',
    category: 'Administration',
    initials: 'CL',
    hue: 'sand',
    hours: 'Monday–Friday · 9 am–6 pm',
    daysLeft: 19,
    postedAgo: '11 days ago',
    verifiedWithEmployer: true,
    verificationNote: 'Verified directly with Cedar Lane Operations team. Trade license and zero-fee compliance checked.',
    directEmail: 'hiring@cedarlane.ae',
    directPortal: 'https://cedarlane.ae/careers/admin-coord',
    sponsorship: 'Work authorisation depends on applicable permissions and approvals.',
    description: 'Support a friendly operations team by organising schedules, records and day-to-day communication.',
    responsibilities: [
      'Coordinate appointments and follow-ups.',
      'Keep records accurate and easy to find.',
      'Support visitors and internal teams.'
    ],
    requirements: ['Organisation', 'Email communication', 'Office software']
  },
  {
    id: 'des-03',
    title: 'Junior Graphic Designer',
    company: 'Northlight Creative',
    emirate: 'Dubai',
    type: 'Full-time',
    mode: 'Hybrid',
    salary: 'AED 5,000 – 7,000',
    category: 'Design',
    initials: 'NC',
    hue: 'blue',
    hours: 'Monday–Friday · Flexible core hours',
    daysLeft: 22,
    postedAgo: '8 days ago',
    verifiedWithEmployer: true,
    verificationNote: 'Verified with Northlight Creative Studio Director. Confirmed direct hire, no agent commissions.',
    directEmail: 'jobs@northlightcreative.ae',
    directPortal: 'https://northlightcreative.ae/join-us',
    sponsorship: 'Appropriate work authorisation is required before any employment begins.',
    description: 'Create thoughtful digital and print graphics while learning from an experienced small design team.',
    responsibilities: [
      'Prepare layouts for social and digital channels.',
      'Adapt brand assets across different sizes.',
      'Collaborate on design reviews.'
    ],
    requirements: ['Design fundamentals', 'Figma or Adobe tools', 'Portfolio samples']
  },
  {
    id: 'exp-04',
    title: 'Customer Experience Associate',
    company: 'Harbour House Retail',
    emirate: 'Abu Dhabi',
    type: 'Full-time',
    mode: 'On-site',
    salary: 'AED 4,000 – 5,500',
    category: 'Customer Service',
    initials: 'HH',
    hue: 'rose',
    hours: 'Shift rota · Details at interview',
    daysLeft: 14,
    postedAgo: '16 days ago',
    verifiedWithEmployer: true,
    verificationNote: 'Verified directly with Harbour House HR. Verified retail premises and legal contract terms.',
    directEmail: 'retail-careers@harbourhouse.ae',
    directPortal: 'https://harbourhouse.ae/careers',
    sponsorship: 'Subject to employment authorisation and applicable approvals.',
    description: 'Help customers feel welcome, answer everyday questions and support a calm, organised retail experience.',
    responsibilities: [
      'Welcome and assist customers.',
      'Maintain accurate daily handovers.',
      'Resolve routine customer queries.'
    ],
    requirements: ['Empathy', 'Customer support', 'Clear communication']
  },
  {
    id: 'acc-05',
    title: 'Accounts Support Assistant',
    company: 'Cedar Lane Services',
    emirate: 'Sharjah',
    type: 'Part-time',
    mode: 'On-site',
    salary: 'AED 3,000 – 4,000',
    category: 'Finance',
    initials: 'CL',
    hue: 'sand',
    hours: 'Part-time · To be agreed',
    daysLeft: 28,
    postedAgo: '2 days ago',
    verifiedWithEmployer: true,
    verificationNote: 'Verified with Cedar Lane Finance Manager. Confirmed direct part-time opportunity.',
    directEmail: 'finance-team@cedarlane.ae',
    directPortal: 'https://cedarlane.ae/careers/accounts-assist',
    sponsorship: 'Any part-time work permit or other required approval must be obtained before work begins.',
    description: 'Assist a small finance team with receipts, invoices and simple reconciliations.',
    responsibilities: [
      'Organise invoices and expense records.',
      'Help prepare basic spreadsheets.',
      'Flag discrepancies for review.'
    ],
    requirements: ['Attention to detail', 'Spreadsheets', 'Basic bookkeeping']
  }
]

export const CAREER_SUPPORT_MODULES = [
  {
    id: 'cv-review',
    title: 'CV review',
    icon: 'file-check',
    badge: 'One-to-one feedback',
    summary: 'Receive structured, line-by-line feedback from volunteer UAE HR professionals to tailor your CV to local hiring standards.',
    highlights: [
      'Tailored feedback for UAE ATS systems',
      'Clarity on achievements vs daily tasks',
      'Formatting and layout refinement'
    ],
    turnaround: 'Feedback in 2–3 days',
    volunteersCount: '12 active HR volunteers'
  },
  {
    id: 'mock-interview',
    title: 'Mock interview practice',
    icon: 'sparkles',
    badge: 'Live 30-minute session',
    summary: 'Practice answering behavioral, competency, and situational questions in a safe, encouraging environment before facing real employers.',
    highlights: [
      'STAR technique (Situation, Task, Action, Result)',
      'Practical UAE workplace cultural pointers',
      'Constructive verbal and confidence tips'
    ],
    turnaround: 'Evening and weekend slots',
    volunteersCount: '8 volunteer managers'
  },
  {
    id: 'linkedin-help',
    title: 'LinkedIn profile review',
    icon: 'users',
    badge: 'Profile walkthrough',
    summary: 'Optimize your LinkedIn headline, summary, and experience section so legitimate hiring managers and recruiters can discover you.',
    highlights: [
      'Keyword optimization for your industry',
      'Compelling professional summary statement',
      'Professional photo and banner best practices'
    ],
    turnaround: 'Self-paced or one-to-one',
    volunteersCount: '6 digital mentors'
  }
]

export const SAMPLE_VOLUNTEER = [
  { title: 'CV Review Companion', group: 'Community career circle', location: 'Dubai / Online', commitment: '2 hours / month', summary: 'Help community members improve how they present their experience.' },
  { title: 'Conversation Practice Host', group: 'Language exchange team', location: 'Online', commitment: '1 hour / week', summary: 'Support practical confidence in everyday workplace English.' },
  { title: 'Event Welcome Volunteer', group: 'Community hospitality group', location: 'Dubai', commitment: 'One Saturday', summary: 'Welcome guests and help coordinate a friendly community meetup.' }
]

export const TRUST_PILLARS = [
  {
    num: '1',
    title: 'Verified People',
    kicker: 'TRUSTED CIRCLE',
    desc: 'Every member is vouched by their local church community, keeping out random fake agents, scammers, and scrapers.',
    legalNote: 'Used strictly for peer trust and safety, not religious exclusion. Complies with UAE Anti-Discrimination & Data Protection laws.'
  },
  {
    num: '2',
    title: 'Verified Jobs',
    kicker: 'MODERATED NOTICEBOARD',
    desc: 'Moderators check directly with the company before any role goes live. Automatic keyword blocking stops fees, deposits, and visa charges instantly.',
    legalNote: 'Posts expire automatically after 30 days to guarantee freshness and prevent dead zombie listings.'
  },
  {
    num: '3',
    title: 'Real Support',
    kicker: 'JOB-READY CONFIDENCE',
    desc: 'Volunteer CV review, mock interviews, and LinkedIn assistance from experienced professionals so people are truly prepared for the workplace.',
    legalNote: 'Not just passive links: hands-on community care that social media groups cannot offer.'
  }
]

// Fictional partner churches for the demo; the live list comes from public.churches
export const SAMPLE_CHURCHES = [
  { id: 'church-stluke', name: "St. Luke's Dubai (sample)" },
  { id: 'church-grace', name: 'Grace Fellowship Abu Dhabi (sample)' },
  { id: 'church-hope', name: 'Hope Community Sharjah (sample)' }
]

// status: pending | vouched | declined (same values as public.vouches)
export const SAMPLE_VOUCH_REQUESTS = [
  {
    id: 'vouch-01',
    name: 'Sarah Chen',
    requestedDate: 'Yesterday',
    church: "St. Luke's Dubai (sample)",
    status: 'pending',
    note: 'Job poster · Office manager at a sample design studio, wants to share a vacancy.'
  },
  {
    id: 'vouch-02',
    name: 'David Okafor',
    requestedDate: '2 days ago',
    church: "St. Luke's Dubai (sample)",
    status: 'pending',
    note: 'Job seeker · Attends community fellowship. Exploring operations / admin roles.'
  },
  {
    id: 'vouch-03',
    name: 'Priya Nair',
    requestedDate: '3 days ago',
    church: "St. Luke's Dubai (sample)",
    status: 'vouched',
    note: 'Job poster · Identity and community standing confirmed.'
  }
]

// Navigation. Staff sections appear only for accounts holding that role, behind "Your work" (App.jsx)
export const NAV = {
  home: { id: 'home', label: 'Home', icon: 'home' },
  // Always visible: top bar on desktop, bottom bar on phones
  member: [
    { id: 'opportunities', label: 'Jobs', icon: 'briefcase' },
    { id: 'interests', label: 'Saved', icon: 'bookmark' },
    { id: 'post', label: 'Post a job', icon: 'plus' }
  ],
  // Account menu (opens from the avatar)
  menu: [
    { id: 'drafts', label: 'My posts', icon: 'file' },
    { id: 'career', label: 'Career support', icon: 'sparkles' },
    { id: 'care', label: 'Pastoral care', icon: 'hand' },
    { id: 'apply', label: 'Get involved', icon: 'heart' },
    { id: 'profile', label: 'Profile & privacy', icon: 'shield' },
    { id: 'faq', label: 'Help & FAQs', icon: 'help' }
  ],
  // First tab for every staff role: the overview of everything waiting
  dashboard: { id: 'dashboard', label: 'Overview', icon: 'grid' },
  moderator: [
    { id: 'review', label: 'Review', icon: 'check' },
    { id: 'joining', label: 'New members', icon: 'users' },
    { id: 'reports', label: 'Reports', icon: 'flag' },
    { id: 'inbox', label: 'Inbox', icon: 'mail' }
  ],
  church: [
    { id: 'vouch', label: 'Vouches', icon: 'users' }
  ],
  volunteer: [
    { id: 'mentoring', label: 'Session requests', icon: 'hand' }
  ],
  pastoral: [
    { id: 'carerQueue', label: 'Pastoral requests', icon: 'hand' }
  ],
  admin: [
    { id: 'applications', label: 'Applications', icon: 'badge' },
    { id: 'people', label: 'People', icon: 'users' },
    { id: 'churchRequests', label: 'Churches', icon: 'heart' }
  ]
}

// Fictional accounts for the Admin demo view; same shape as admin_members() rows
export const SAMPLE_MEMBERS = [
  { id: 'demo-me', name: 'Jordan Morgan', email: 'jordan@example.test', role: 'super_admin', church_id: null, suspended: false, joined: '2026-09-01', posts: 0, status: 'approved', referral_code: 'EPH-7K2Q9D', referred_by: null, decided_by: null, decided_at: '2026-09-01' },
  { id: 'member-amara', name: 'Amara Nwosu', email: 'amara@example.test', role: 'admin', church_id: null, suspended: false, joined: '2026-09-04', posts: 0, status: 'approved', referral_code: 'EPH-A41C07', referred_by: 'demo-me', decided_by: 'demo-me', decided_at: '2026-09-04' },
  { id: 'member-sam', name: 'Sam Haddad', email: 'sam@example.test', role: 'moderator', church_id: null, suspended: false, joined: '2026-09-12', posts: 0, status: 'approved', referral_code: 'EPH-5A3E12', referred_by: 'member-amara', decided_by: 'demo-me', decided_at: '2026-09-12' },
  { id: 'member-ruth', name: 'Ruth Mensah', email: 'ruth@example.test', role: 'church_admin', church_id: 'church-stluke', suspended: false, joined: '2026-09-15', posts: 0, status: 'approved', referral_code: 'EPH-R7F0B2', referred_by: 'member-amara', decided_by: 'member-sam', decided_at: '2026-09-16' },
  { id: 'member-esther', name: 'Esther Adeyemi', email: 'esther@example.test', role: 'pastoral_carer', church_id: 'church-stluke', suspended: false, joined: '2026-09-18', posts: 0, status: 'approved', referral_code: 'EPH-E2D96A', referred_by: 'member-ruth', decided_by: 'member-sam', decided_at: '2026-09-18' },
  { id: 'member-priya', name: 'Priya Nair', email: 'priya@example.test', role: 'member', church_id: null, suspended: false, joined: '2026-10-02', posts: 2, status: 'approved', referral_code: 'EPH-P90B3C', referred_by: 'member-ruth', decided_by: 'member-sam', decided_at: '2026-10-03' },
  { id: 'member-david', name: 'David Okafor', email: 'david@example.test', role: 'member', church_id: null, suspended: false, joined: '2026-10-20', posts: 0, status: 'approved', referral_code: 'EPH-D0C4E1', referred_by: 'member-priya', decided_by: 'member-amara', decided_at: '2026-10-20' },
  { id: 'member-lena', name: 'Lena Fischer', email: 'lena@example.test', role: 'volunteer', church_id: null, suspended: false, joined: '2026-10-21', posts: 0, status: 'approved', referral_code: 'EPH-L3A8F5', referred_by: 'member-david', decided_by: 'member-sam', decided_at: '2026-10-22' },
  { id: 'member-quickjobs', name: 'Quick Jobs Agency', email: 'quickjobs@example.test', role: 'member', church_id: null, suspended: true, joined: '2026-10-24', posts: 3, status: 'approved', referral_code: 'EPH-Q6B1D8', referred_by: 'member-lena', decided_by: 'member-sam', decided_at: '2026-10-24' },
  { id: 'member-grace', name: 'Grace Bello', email: 'grace@example.test', role: 'member', church_id: null, suspended: false, joined: '2026-11-01', posts: 0, status: 'pending', referral_code: null, referred_by: 'member-priya', decided_by: null, decided_at: null },
  { id: 'member-tunde', name: 'Tunde Afolabi', email: 'tunde@example.test', role: 'member', church_id: null, suspended: false, joined: '2026-11-02', posts: 0, status: 'pending', referral_code: null, referred_by: null, decided_by: null, decided_at: null }
]

// Same shape as role_applications rows
export const SAMPLE_APPLICATIONS = [
  { id: 'app-01', user_id: 'member-david', role: 'volunteer', church_id: null, display_name: 'David Okafor', note: 'Operations lead, happy to run mock interviews twice a month.', status: 'pending', created_at: '2026-10-25T09:00:00Z' },
  { id: 'app-02', user_id: 'member-priya', role: 'church_admin', church_id: 'church-grace', display_name: 'Priya Nair', note: 'Church office coordinator at Grace Fellowship; I know most members by name.', status: 'pending', created_at: '2026-10-26T14:30:00Z' }
]

// Same shape as church_suggestions rows
export const SAMPLE_CHURCH_SUGGESTIONS = [
  { id: 'sug-01', suggested_by: 'member-david', name: 'Bethel Fellowship Fujairah', emirate: 'Fujairah', status: 'pending', church_id: null, created_at: '2026-10-26T10:00:00Z' }
]

// Same shape as support_requests rows; other members' requests for the Volunteer demo view
export const SAMPLE_SUPPORT_REQUESTS = [
  { id: 'support-01', member_id: 'member-priya', service: 'cv-review', display_name: 'Priya Nair', preferred_time: 'Weekday evening (after 6 pm)', note: 'Moving from retail into office administration.', may_email: true, status: 'open', volunteer_id: null, created_at: '2026-10-26T18:00:00Z' },
  { id: 'support-02', member_id: 'member-david', service: 'mock-interview', display_name: 'David Okafor', preferred_time: 'Saturday morning', note: 'Interview for an operations role next week.', may_email: true, status: 'open', volunteer_id: null, created_at: '2026-10-27T09:30:00Z' }
]

// Same shape as pastoral_requests rows; requests to the sample church's pastoral carer
export const SAMPLE_PASTORAL_REQUESTS = [
  { id: 'care-01', member_id: 'member-david', church_id: 'church-stluke', display_name: 'David Okafor', kind: 'prayer', note: 'Six months without work. I could do with prayer and some encouragement.', may_contact: true, share_with: 'own_church', status: 'open', carer_id: null, created_at: '2026-10-30T19:00:00Z' },
  { id: 'care-02', member_id: 'member-priya', church_id: 'church-grace', display_name: 'Priya N.', kind: 'talk', note: 'I would rather not tell my own pastor yet. Could someone from another church talk with me?', may_contact: true, share_with: 'other_church', status: 'open', carer_id: null, created_at: '2026-11-04T18:30:00Z' }
]

// Same shape as contact_messages rows; what the contact form has received, for the Admin and Moderator demo views
export const SAMPLE_CONTACT_MESSAGES = [
  { id: 'msg-01', name: 'Mariam Haddad', email: 'mariam@example.test', topic: 'partnership', message: 'Our church in Ajman would like to join as a partner church. Who should our pastor speak to?', status: 'open', created_at: '2026-11-02T08:15:00Z' },
  { id: 'msg-02', name: 'Kofi Mensah', email: 'kofi@example.test', topic: 'safety', message: 'Someone messaged me on WhatsApp about one of your jobs and asked for AED 500 for a medical check. Is this real?', status: 'open', created_at: '2026-11-02T19:40:00Z' }
]
