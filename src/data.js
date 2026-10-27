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

export const NAV = {
  seeker: [
    { id: 'opportunities', label: 'Verified noticeboard', icon: 'briefcase' },
    { id: 'career', label: 'Real support', icon: 'sparkles' },
    { id: 'interests', label: 'My tracked roles', icon: 'bookmark' },
    { id: 'volunteering', label: 'Volunteering', icon: 'heart' },
    { id: 'apply', label: 'Apply to help', icon: 'badge' },
    { id: 'churches', label: 'Church vouching & trust', icon: 'users' },
    { id: 'profile', label: 'Profile & privacy', icon: 'shield' }
  ],
  employer: [
    { id: 'opportunities', label: 'Noticeboard', icon: 'briefcase' },
    { id: 'post', label: 'Post opportunity', icon: 'plus' },
    { id: 'drafts', label: 'My posts', icon: 'file' },
    { id: 'guidelines', label: 'Posting & legal standards', icon: 'shield' },
    { id: 'apply', label: 'Apply to help', icon: 'badge' },
    { id: 'profile', label: 'Profile & privacy', icon: 'users' }
  ],
  moderator: [
    { id: 'review', label: 'Verification queue', icon: 'check' },
    { id: 'reports', label: 'Safety team reports', icon: 'flag' },
    { id: 'opportunities', label: 'Noticeboard preview', icon: 'briefcase' },
    { id: 'guidelines', label: 'Trust & safety standards', icon: 'shield' },
    { id: 'profile', label: 'Profile & privacy', icon: 'users' }
  ],
  admin: [
    { id: 'people', label: 'People', icon: 'users' },
    { id: 'applications', label: 'Role applications', icon: 'badge' },
    { id: 'review', label: 'Verification queue', icon: 'check' },
    { id: 'reports', label: 'Safety team reports', icon: 'flag' },
    { id: 'opportunities', label: 'Noticeboard preview', icon: 'briefcase' }
  ],
  church: [
    { id: 'vouch', label: 'Member vouch queue', icon: 'users' },
    { id: 'invite', label: 'Congregation invite pass', icon: 'sparkles' },
    { id: 'privacyAudit', label: 'UAE privacy & legal audit', icon: 'shield' },
    { id: 'opportunities', label: 'Noticeboard preview', icon: 'briefcase' }
  ]
}

// Fictional accounts for the Admin demo view; same shape as admin_members() rows
export const SAMPLE_MEMBERS = [
  { id: 'demo-me', name: 'Jordan Morgan', email: 'jordan@example.test', role: 'super_admin', church_id: null, suspended: false, joined: '2026-09-01', posts: 0 },
  { id: 'member-amara', name: 'Amara Nwosu', email: 'amara@example.test', role: 'admin', church_id: null, suspended: false, joined: '2026-09-04', posts: 0 },
  { id: 'member-sam', name: 'Sam Haddad', email: 'sam@example.test', role: 'moderator', church_id: null, suspended: false, joined: '2026-09-12', posts: 0 },
  { id: 'member-ruth', name: 'Ruth Mensah', email: 'ruth@example.test', role: 'church_admin', church_id: 'church-stluke', suspended: false, joined: '2026-09-15', posts: 0 },
  { id: 'member-priya', name: 'Priya Nair', email: 'priya@example.test', role: 'member', church_id: null, suspended: false, joined: '2026-10-02', posts: 2 },
  { id: 'member-david', name: 'David Okafor', email: 'david@example.test', role: 'member', church_id: null, suspended: false, joined: '2026-10-20', posts: 0 },
  { id: 'member-lena', name: 'Lena Fischer', email: 'lena@example.test', role: 'volunteer', church_id: null, suspended: false, joined: '2026-10-21', posts: 0 },
  { id: 'member-quickjobs', name: 'Quick Jobs Agency', email: 'quickjobs@example.test', role: 'member', church_id: null, suspended: true, joined: '2026-10-24', posts: 3 }
]

// Same shape as role_applications rows
export const SAMPLE_APPLICATIONS = [
  { id: 'app-01', user_id: 'member-david', role: 'volunteer', church_id: null, display_name: 'David Okafor', note: 'Operations lead, happy to run mock interviews twice a month.', status: 'pending', created_at: '2026-10-25T09:00:00Z' },
  { id: 'app-02', user_id: 'member-priya', role: 'church_admin', church_id: 'church-grace', display_name: 'Priya Nair', note: 'Church office coordinator at Grace Fellowship; I know most members by name.', status: 'pending', created_at: '2026-10-26T14:30:00Z' }
]
