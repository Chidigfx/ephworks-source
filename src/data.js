// Every company, person, job, and remuneration figure below is fictional demo data.
export const SAMPLE_JOBS = [
  {
    id: 'mkt-01', title: 'Marketing & Communications Executive', company: 'Olive & Field Studio',
    emirate: 'Dubai', type: 'Full-time', mode: 'On-site', salary: 'AED 7,000 – 9,000',
    category: 'Marketing', initials: 'OF', hue: 'sage',
    hours: 'Monday–Friday · 9 am–6 pm', sponsorship: 'Employer proposes sponsorship, subject to eligibility and required approvals. Required work authorisation must be in place before starting.',
    description: 'Help a small creative studio tell thoughtful stories. You’ll support campaign planning, write clear content, and work with a collaborative design team.',
    responsibilities: ['Plan and maintain the monthly content calendar.', 'Write and coordinate content across digital channels.', 'Track campaign results and share practical improvements.'],
    requirements: ['Content planning', 'Communication', '2+ years experience']
  },
  {
    id: 'adm-02', title: 'Administrative Coordinator', company: 'Cedar Lane Services',
    emirate: 'Sharjah', type: 'Full-time', mode: 'On-site', salary: 'AED 4,500 – 6,000',
    category: 'Administration', initials: 'CL', hue: 'sand',
    hours: 'Monday–Friday · 9 am–6 pm', sponsorship: 'Work authorisation depends on applicable permissions and approvals.',
    description: 'Support a friendly operations team by organising schedules, records and day-to-day communication.',
    responsibilities: ['Coordinate appointments and follow-ups.', 'Keep records accurate and easy to find.', 'Support visitors and internal teams.'],
    requirements: ['Organisation', 'Email communication', 'Office software']
  },
  {
    id: 'des-03', title: 'Junior Graphic Designer', company: 'Northlight Creative',
    emirate: 'Dubai', type: 'Full-time', mode: 'Hybrid', salary: 'AED 5,000 – 7,000',
    category: 'Design', initials: 'NC', hue: 'blue',
    hours: 'Monday–Friday · Flexible core hours', sponsorship: 'Appropriate work authorisation is required before any employment begins.',
    description: 'Create thoughtful digital and print graphics while learning from an experienced small design team.',
    responsibilities: ['Prepare layouts for social and digital channels.', 'Adapt brand assets across different sizes.', 'Collaborate on design reviews.'],
    requirements: ['Design fundamentals', 'Figma or Adobe tools', 'Portfolio samples']
  },
  {
    id: 'exp-04', title: 'Customer Experience Associate', company: 'Harbour House Retail',
    emirate: 'Abu Dhabi', type: 'Full-time', mode: 'On-site', salary: 'AED 4,000 – 5,500',
    category: 'Customer Service', initials: 'HH', hue: 'rose',
    hours: 'Shift rota · Details at interview', sponsorship: 'Subject to employment authorisation and applicable approvals.',
    description: 'Help customers feel welcome, answer everyday questions and support a calm, organised retail experience.',
    responsibilities: ['Welcome and assist customers.', 'Maintain accurate daily handovers.', 'Resolve routine customer queries.'],
    requirements: ['Empathy', 'Customer support', 'Clear communication']
  },
  {
    id: 'acc-05', title: 'Accounts Support Assistant', company: 'Cedar Lane Services',
    emirate: 'Sharjah', type: 'Part-time', mode: 'On-site', salary: 'AED 3,000 – 4,000',
    category: 'Finance', initials: 'CL', hue: 'sand',
    hours: 'Part-time · To be agreed', sponsorship: 'Any part-time work permit or other required approval must be obtained before work begins.',
    description: 'Assist a small finance team with receipts, invoices and simple reconciliations.',
    responsibilities: ['Organise invoices and expense records.', 'Help prepare basic spreadsheets.', 'Flag discrepancies for review.'],
    requirements: ['Attention to detail', 'Spreadsheets', 'Basic bookkeeping']
  }
]

export const SAMPLE_VOLUNTEER = [
  { title: 'CV Review Companion', group: 'Community career circle', location: 'Dubai / Online', commitment: '2 hours / month', summary: 'Help community members improve how they present their experience.' },
  { title: 'Conversation Practice Host', group: 'Language exchange team', location: 'Online', commitment: '1 hour / week', summary: 'Support practical confidence in everyday workplace English.' },
  { title: 'Event Welcome Volunteer', group: 'Community hospitality group', location: 'Dubai', commitment: 'One Saturday', summary: 'Welcome guests and help coordinate a friendly community meetup.' }
]

export const NAV = {
  seeker: [
    { id: 'opportunities', label: 'Opportunities', icon: 'briefcase' },
    { id: 'interests', label: 'My interests', icon: 'bookmark' },
    { id: 'career', label: 'Career support', icon: 'sparkles' },
    { id: 'volunteering', label: 'Volunteering', icon: 'heart' },
    { id: 'churches', label: 'For churches', icon: 'users' },
    { id: 'profile', label: 'Profile & privacy', icon: 'shield' }
  ],
  employer: [
    { id: 'opportunities', label: 'Community board', icon: 'briefcase' },
    { id: 'post', label: 'Create sample post', icon: 'plus' },
    { id: 'drafts', label: 'My sample posts', icon: 'file' },
    { id: 'guidelines', label: 'Posting guidelines', icon: 'shield' },
    { id: 'profile', label: 'Profile & privacy', icon: 'users' }
  ],
  moderator: [
    { id: 'review', label: 'Review queue', icon: 'check' },
    { id: 'reports', label: 'Reports', icon: 'flag' },
    { id: 'opportunities', label: 'Community board', icon: 'briefcase' },
    { id: 'guidelines', label: 'Community standards', icon: 'shield' },
    { id: 'profile', label: 'Profile & privacy', icon: 'users' }
  ]
}
