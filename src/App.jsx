import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BadgeCheck, Bookmark, BriefcaseBusiness, Check,
  CheckCircle2, ChevronDown, ChevronRight, CircleHelp, ClipboardCheck,
  FilePenLine, FileText, Flag, HandHeart, HeartHandshake, Home,
  LockKeyhole, MapPin, Menu, MoreHorizontal, Plus, Search, ShieldCheck,
  SlidersHorizontal, UsersRound, LayoutDashboard, LifeBuoy, KeyRound, X, RotateCcw, ExternalLink,
  Clock3, Mail, Building2, Eye, Send, Info, AlertTriangle, ShieldAlert,
  Calendar, CheckCheck, Scale, Lock, UserRound, Heart, Ban, UserPlus, Copy, BookOpen, Sparkles, BellRing
} from 'lucide-react'
import { NAV, SAMPLE_JOBS, SAMPLE_VOLUNTEER, CAREER_SUPPORT_MODULES, TRUST_PILLARS, SAMPLE_VOUCH_REQUESTS, SAMPLE_CHURCHES, SAMPLE_MEMBERS, SAMPLE_APPLICATIONS, SAMPLE_CHURCH_SUGGESTIONS, SAMPLE_SUPPORT_REQUESTS, SAMPLE_PASTORAL_REQUESTS, SAMPLE_CONTACT_MESSAGES, SITE_NAME } from './data'
import { INFO_PAGES, INFO_GROUPS, FOOTER } from './content'
import { supabase, api, toJob, captchaKey } from './supabase'
import { scanPost } from './scam'
import { verseOfDay } from './verses'

const icons = {
  briefcase: BriefcaseBusiness, bookmark: Bookmark, sparkles: LifeBuoy,
  heart: HeartHandshake, users: UsersRound, shield: ShieldCheck,
  plus: Plus, file: FileText, check: ClipboardCheck, flag: Flag, badge: BadgeCheck, home: Home, help: CircleHelp, grid: LayoutDashboard, hand: HandHeart, mail: Mail
}
// Demo-only persona switcher (no backend). With Supabase the menu comes from the signed-in account's role.
const PERSONAS = { member: 'Member', volunteer: 'Volunteer', moderator: 'Moderator', church_admin: 'Church admin', pastoral_carer: 'Pastoral carer', super_admin: 'Admin' }
const demoKey = 'ephworks-local-demo-v5'
const defaultDemo = {
  saved: [],
  tracked: [],
  interested: [],
  role: 'member', // demo persona, a key of PERSONAS
  drafts: [], // jobs rows, same shape as public.jobs, so toJob() renders them
  reports: [],
  supportRequests: SAMPLE_SUPPORT_REQUESTS, // career support requests (yours and, for the Volunteer view, other members')
  vouchQueue: SAMPLE_VOUCH_REQUESTS,
  members: SAMPLE_MEMBERS,
  applications: SAMPLE_APPLICATIONS,
  churchSuggestions: SAMPLE_CHURCH_SUGGESTIONS,
  pastoralRequests: SAMPLE_PASTORAL_REQUESTS,
  prefs: {}, // the demo persona's profile details and job preferences, same keys as public.profiles
  seenMatches: [], // matching job ids already shown as new
  contactMessages: SAMPLE_CONTACT_MESSAGES,
  rejections: [], // past rejections in the demo, newest first: { employer_id, company, reason, created_at }
  churches: SAMPLE_CHURCHES // partner churches; admins can add, rename and remove them in the demo
}

// [stored value, label]; values must match the reports.reason check in the migration
const REPORT_REASONS = [
  ['Request for payment / fee', 'Request for payment / fee (Illegal under UAE Labour Law)'],
  ['Suspicious or unverified employer contact', 'Suspicious or unverified employer contact'],
  ['Misleading job terms or salary', 'Misleading job terms or salary'],
  ['Potential discriminatory language', 'Potential discriminatory language'],
  ['Other trust & safety concern', 'Other trust & safety concern']
]
const VOUCH_STATUS = { pending: 'Awaiting church vouch', vouched: 'Vouched', declined: 'Declined' }
const DEMO_ME = 'demo-me' // the demo persona's own vouch request id
const NO_CHURCH = { id: '', name: '', emirate: '' } // a picked partner church (id) or a typed one to suggest (name + emirate)
const EMPTY_VOUCH = { church: NO_CHURCH, note: '' }
const ROLE_LABELS = { member: 'Member', volunteer: 'Volunteer mentor', moderator: 'Moderator', church_admin: 'Church admin', pastoral_carer: 'Pastoral carer', admin: 'Admin', super_admin: 'Super admin' }
const CHURCH_ROLES = ['church_admin', 'pastoral_carer'] // roles that serve one church
// Two-step sign-in for staff is built but switched off for now. To switch it on: set this to true, deploy,
// then move supabase/later/20261106000000_staff_two_step.sql into migrations/ and run it (see README).
const TWO_STEP_REQUIRED = false
// Roles that approve people or see personal details; mirrors my_role() in the 20261106 migration
const TWO_STEP_ROLES = ['moderator', 'church_admin', 'pastoral_carer', 'admin', 'super_admin']
const APPLY_ROLES = [
  ['volunteer', 'Volunteer mentor', 'Give free CV reviews, practice interviews or LinkedIn help to job seekers.'],
  ['church_admin', 'Church admin', 'Confirm which members of your church can post jobs. Only a yes/no is stored.']
]
const APP_STATUS = { pending: 'Waiting for review', approved: 'Approved', declined: 'Declined' }
const EMPTY_APPLY = { role: 'volunteer', church: NO_CHURCH, name: '', note: '', agreed: false }
const EMPTY_AUTH = { mode: 'signin', name: '', email: '', password: '', code: '' } // mode: signin | signup | reset
// Must match the pastoral_requests.kind check in the 20261102 migration
const CARE_KINDS = { prayer: 'Prayer', talk: 'Someone to talk to', other: 'Something else' }
const CARE_STATUS = { open: 'Waiting for a pastoral carer', taken: 'A pastoral carer will email you', closed: 'Closed' }
// Must match the pastoral_requests.share_with check in the 20261106 migration: who the member lets see their request
const CARE_SHARING = { own_church: "My church's care team", other_church: 'A carer from another church' }
const CARE_SHARING_HINTS = { own_church: 'A pastoral carer at the church you chose above.',
  other_church: 'A carer at a different partner church. Your own church is not told, and the carer does not see which church you are from.'
}
const EMPTY_CARE = { church: '', name: '', kind: 'prayer', note: '', consent: false, shareWith: 'own_church' }
// Must match the jobs.reject_reason check in the 20261110 migration
const REJECT_REASONS = { incomplete: 'Incomplete information', misleading: 'Misleading content', suspected_scam: 'Suspected scam', other: 'Another reason' }
// Must match the contact_messages.topic check in the 20261105 migration
const CONTACT_TOPICS = { question: 'General question', safety: 'Safety concern', partnership: 'Church or partner enquiry', account: 'Help with my account', other: 'Something else' }
const EMPTY_CONTACT = { name: '', email: '', topic: 'question', message: '', website: '' } // website: a trap field people never see, only bots fill in
// Must match the jobs.emirate / type / mode checks in the first migration
const EMIRATES = ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah']
const WORK_TYPES = ['Full-time', 'Part-time']
const WORK_SETTINGS = ['On-site', 'Hybrid', 'Remote']
const EMPTY_DRAFT = { title: '', company: '', emirate: 'Dubai', type: 'Full-time', mode: 'On-site', payFrom: '', payTo: '', email: '', portal: '', description: '' }
const DRAFT_KEY = 'ephworks-post-draft' // unfinished post, kept on this device between visits
// Post a job, one short step at a time. The church step only shows until the poster is vouched.
const POST_STEPS = [
  { key: 'church', label: 'Church' },
  { key: 'job', label: 'The job' },
  { key: 'pay', label: 'Pay' },
  { key: 'description', label: 'Description' },
  { key: 'apply', label: 'How to apply' },
  { key: 'preview', label: 'Preview' }
]
const aed = n => `AED ${Number(n).toLocaleString('en-US')}`

// Mirrors job_matches() in the 20261104 migration (the live site asks the server); used by the demo.
// Every preference set must fit, an empty one fits anything, and no preferences means no matches.
const hasPreferences = p => Boolean(p.emirates?.length || p.work_types?.length || p.work_settings?.length || p.keywords?.trim() || p.min_pay)
function matchesJob(p, job) {
  if (!hasPreferences(p)) return false
  const emirates = p.emirates || [], types = p.work_types || [], settings = p.work_settings || []
  // Whole words, plurals included: "admin" doesn't match "administrative", "driver" matches "drivers"
  const words = (p.keywords || '').split(',').map(w => w.trim()).filter(Boolean)
    .map(w => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(e?s)?\\b`, 'i'))
  const text = `${job.title} ${job.company} ${job.category} ${job.description}`
  const pay = Math.max(...(job.salary.match(/\d[\d,]*/g) || []).map(n => Number(n.replace(/,/g, ''))))
  return (!emirates.length || emirates.includes(job.emirate)) && (!types.length || types.includes(job.type))
    && (!settings.length || settings.includes(job.mode)) && (!words.length || words.some(w => w.test(text)))
    && (!p.min_pay || !Number.isFinite(pay) || pay >= Number(p.min_pay))
}
const salaryText = ({ payFrom, payTo }) => payFrom ? (payTo && Number(payTo) !== Number(payFrom) ? `${aed(payFrom)} – ${Number(payTo).toLocaleString('en-US')}` : aed(payFrom)) : ''

// Every page has its own address, so links can be shared and the back button works
const PATHS = {
  home: '/', dashboard: '/work', mentoring: '/work/mentoring', opportunities: '/jobs', interests: '/saved', post: '/post', drafts: '/my-posts', career: '/career-support',
  apply: '/get-involved', profile: '/profile', review: '/work/review', reports: '/work/reports', applications: '/work/applications',
  people: '/work/people', churchRequests: '/work/churches', vouch: '/work/vouches', joining: '/work/joining', carerQueue: '/work/pastoral', care: '/pastoral-care', unsubscribe: '/unsubscribe', inbox: '/work/inbox',
  ...Object.fromEntries(INFO_PAGES.map(p => [p.id, p.path]))
}
const pageFor = path => Object.keys(PATHS).find(id => PATHS[id] === (path.replace(/\/+$/, '') || '/')) || 'home'

function getSavedDraft() {
  try { return { ...EMPTY_DRAFT, ...JSON.parse(window.localStorage.getItem(DRAFT_KEY)) } } catch { return EMPTY_DRAFT }
}

function getSavedDemo() {
  try {
    const value = JSON.parse(window.localStorage.getItem(demoKey))
    if (!value || typeof value !== 'object') return defaultDemo
    return {
      ...defaultDemo,
      ...value,
      saved: Array.isArray(value.saved) ? value.saved : [],
      tracked: Array.isArray(value.tracked) ? value.tracked : [],
      interested: Array.isArray(value.interested) ? value.interested : [],
      drafts: Array.isArray(value.drafts) ? value.drafts : [],
      reports: Array.isArray(value.reports) ? value.reports : [],
      supportRequests: Array.isArray(value.supportRequests) ? value.supportRequests : SAMPLE_SUPPORT_REQUESTS,
      vouchQueue: Array.isArray(value.vouchQueue) ? value.vouchQueue : SAMPLE_VOUCH_REQUESTS,
      members: Array.isArray(value.members) ? value.members : SAMPLE_MEMBERS,
      applications: Array.isArray(value.applications) ? value.applications : SAMPLE_APPLICATIONS,
      churchSuggestions: Array.isArray(value.churchSuggestions) ? value.churchSuggestions : SAMPLE_CHURCH_SUGGESTIONS,
      pastoralRequests: Array.isArray(value.pastoralRequests) ? value.pastoralRequests : SAMPLE_PASTORAL_REQUESTS,
      prefs: value.prefs && typeof value.prefs === 'object' ? value.prefs : {},
      seenMatches: Array.isArray(value.seenMatches) ? value.seenMatches : [],
      contactMessages: Array.isArray(value.contactMessages) ? value.contactMessages : SAMPLE_CONTACT_MESSAGES,
      rejections: Array.isArray(value.rejections) ? value.rejections : [],
      churches: Array.isArray(value.churches) ? value.churches : [...SAMPLE_CHURCHES, ...(Array.isArray(value.addedChurches) ? value.addedChurches : [])]
    }
  } catch { return defaultDemo }
}

// Moves focus into a dialog, keeps Tab inside it, and restores focus on close
function useDialogFocus() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    const previous = document.activeElement
    const focusables = () => [...el.querySelectorAll('button:not(:disabled),a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')]
    ;(focusables()[0] || el).focus()
    const onKey = e => {
      if (e.key !== 'Tab') return
      const f = focusables()
      if (!f.length) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    el.addEventListener('keydown', onKey)
    return () => { el.removeEventListener('keydown', onKey); previous?.focus?.() }
  }, [])
  return ref
}

function Pill({ children, type = '' }) { return <span className={`pill ${type}`}>{children}</span> }
function Empty({ icon: Icon = Bookmark, title, description, action }) { return <div className="empty"><span className="empty-symbol"><Icon size={28}/></span><h3>{title}</h3><p>{description}</p>{action}</div> }
function PageHeading({ eyebrow, title, desc, action }) { return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{desc && <p>{desc}</p>}</div>{action}</div> }
function SectionTitle({ title, subtitle, action }) { return <div className="section-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div> }
function Warning({ children, tone = '' }) { return <div className={`notice ${tone}`}><Info size={17} className="notice-icon"/><span>{children}</span></div> }

export default function App() {
  const [demo, setDemo] = useState(getSavedDemo)
  const [page, setPage] = useState(() => pageFor(window.location.pathname))
  const replaceUrl = useRef(false) // automatic redirects replace the address instead of adding a back-button step
  const [selectedJob, setSelectedJob] = useState(null)
  const [showMobileMore, setShowMobileMore] = useState(false)
  const [search, setSearch] = useState('')
  const [emirate, setEmirate] = useState('All emirates')
  const [workType, setWorkType] = useState('Any work type')
  const [tab, setTab] = useState('all')
  const [banner, setBanner] = useState(null)
  const [showReset, setShowReset] = useState(false)
  const [footerOpen, setFooterOpen] = useState(null) // which footer column is expanded on phones
  const [removing, setRemoving] = useState(null) // post waiting for a remove confirmation
  const [showReport, setShowReport] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [selectedSupportService, setSelectedSupportService] = useState('cv-review')
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0][0])
  const [draftForm, setDraftForm] = useState(getSavedDraft)
  const [postStep, setPostStep] = useState(null) // key of the wizard step; null = first step that applies
  const [stepTried, setStepTried] = useState(false) // show a step's problems only after Next was pressed
  const [jobs, setJobs] = useState(supabase ? [] : SAMPLE_JOBS)
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(!supabase) // the saved sign-in has been read
  const [server, setServer] = useState({ myJobs: [], queue: [], reports: [], posterVouches: {}, myVouch: null, vouchRequests: [], members: [], applications: [], interested: [], interestCounts: {}, churchSuggestions: [], supportRequests: [], volunteerRequests: [], churchOverview: [], pendingMembers: [], joinedMembers: [], pastoral: [], carerRequests: [], matches: [], contactMessages: [], rejectionHistory: [] })
  const [serverChurches, setChurches] = useState([])
  const [vouchForm, setVouchForm] = useState(EMPTY_VOUCH)
  const [applyForm, setApplyForm] = useState(EMPTY_APPLY)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberFilter, setMemberFilter] = useState('all')
  const [showSignIn, setShowSignIn] = useState(false)
  const [verifying, setVerifying] = useState(null)
  const [rejecting, setRejecting] = useState(null) // { job, reason, note }
  const [finishing, setFinishing] = useState(null) // mentor marking a request done: { request, comment }
  const [profile, setProfile] = useState({})
  const [providers, setProviders] = useState({ google: false, email: false }) // sign-in methods switched on in Supabase
  const [authForm, setAuthForm] = useState(EMPTY_AUTH)
  const [newPassword, setNewPassword] = useState(null) // set after following a password-reset link
  const [codeInput, setCodeInput] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaRound, setCaptchaRound] = useState(0) // a token works once, so each attempt gets a fresh CAPTCHA
  const [twoStep, setTwoStep] = useState({ level: null, factorId: null }) // this session's sign-in level and confirmed authenticator
  const [showTwoStep, setShowTwoStep] = useState(false)
  const [careForm, setCareForm] = useState(EMPTY_CARE)
  const [careAvailable, setCareAvailable] = useState(null) // { own_church, other_church } for the chosen church, null until known
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT)
  const [matchOnly, setMatchOnly] = useState(false) // job feed shows only jobs matching your profile
  const [unsubscribed, setUnsubscribed] = useState(null) // result of an email unsubscribe link: null while working, then true or false
  const [supportForm, setSupportForm] = useState({ name: '', preferredTime: 'Weekday evening (after 6 pm)', note: '', consent: false })

  const uid = session?.user.id
  const churches = supabase ? serverChurches : demo.churches
  // What this account can do. Admins also moderate; suspended accounts get no staff tools (the server refuses them anyway).
  // Staff without the second sign-in step act as members until they enter their code (the server agrees)
  const needsTwoStep = Boolean(TWO_STEP_REQUIRED && supabase && uid && !profile.suspended && profile.status === 'approved' && TWO_STEP_ROLES.includes(profile.role) && twoStep.level !== 'aal2')
  const accountRole = supabase ? (uid && !profile.suspended && profile.status === 'approved' && !needsTwoStep && profile.role) || 'member' : PERSONAS[demo.role] ? demo.role : 'member'
  const canModerate = ['moderator', 'admin', 'super_admin'].includes(accountRole)
  const isChurchAdmin = accountRole === 'church_admin'
  const isAdmin = ['admin', 'super_admin'].includes(accountRole)
  const isVolunteer = accountRole === 'volunteer'
  const isCarer = accountRole === 'pastoral_carer'
  const staffQueues = isAdmin ? [...NAV.moderator.slice(0, 2), ...NAV.admin, ...NAV.moderator.slice(2)] : canModerate ? NAV.moderator : isChurchAdmin ? NAV.church : isVolunteer ? NAV.volunteer : isCarer ? NAV.pastoral : []
  const staffNav = staffQueues.length ? [NAV.dashboard, ...staffQueues] : []
  // What the staff area is called for this account, so admins, moderators and church admins each see their own space
  const workLabel = isAdmin ? 'Admin' : canModerate ? 'Moderation' : isChurchAdmin ? 'Church admin' : isCarer ? 'Pastoral care' : 'Volunteer'
  // Signed in but not let in yet ('pending' or 'declined'): browsing only, until a moderator or admin approves the account
  const joinStatus = supabase && uid && profile.status !== 'approved' ? profile.status : null
  // Employer contact details, and so applying, are for approved members only (20261112 migration)
  const canApply = !supabase || Boolean(session && !joinStatus && !profile.suspended)

  // Real-time scam detection for the employer post form
  const draftSalary = salaryText(draftForm)
  const draftScan = useMemo(() => scanPost(`${draftForm.title} ${draftSalary} ${draftForm.description}`, draftForm.email),
    [draftForm.title, draftSalary, draftForm.description, draftForm.email])

  // Without a backend, posts live in demo.drafts and join the sample jobs once a moderator publishes them
  const demoJobs = demo.drafts.map(toJob)
  const board = supabase ? jobs.filter(j => !server.members.some(m => m.suspended && m.id === j.employerId)) : [...demoJobs.filter(j => j.status === 'published' && j.daysLeft > 0), ...SAMPLE_JOBS]
  const myPosts = supabase ? server.myJobs : demoJobs
  // Your own interest; posters only see a count per post
  const interestedIds = supabase ? server.interested : demo.interested
  const interestCount = job => supabase ? server.interestCounts[job.id] || 0 : Number(demo.interested.includes(job.id))
  const queue = supabase ? server.queue : demoJobs.filter(j => j.status === 'pending')

  // Jobs matching your profile, and the ones that went live since you last looked
  const prefs = supabase ? profile : demo.prefs
  const hasPrefs = hasPreferences(prefs)
  const matchIds = supabase ? server.matches.map(m => m.job_id) : board.filter(j => matchesJob(prefs, j)).map(j => j.id)
  const newMatchIds = supabase ? server.matches.filter(m => m.is_new).map(m => m.job_id) : matchIds.filter(id => !demo.seenMatches.includes(id))

  // The signed-in member's (or demo persona's) church vouch; null until requested
  const myVouch = supabase
    ? server.myVouch && { status: server.myVouch.status, church: churches.find(c => c.id === server.myVouch.church_id)?.name }
    : demo.vouchQueue.find(m => m.id === DEMO_ME) || null
  const isEmployer = myVouch?.status === 'vouched' // vouched posters get an employer dashboard
  const posterVouched = job => (supabase ? server.posterVouches[job.employerId] : myVouch?.status) === 'vouched'
  // Earlier rejections of this poster or the same company name: { previous, last_reason, last_at } or nothing
  const rejectionsFor = job => {
    if (supabase) return server.rejectionHistory.find(h => h.job_id === job.id)
    const past = demo.rejections.filter(x => x.employer_id === job.employerId || x.company.trim().toLowerCase() === job.company.trim().toLowerCase())
    return past.length ? { previous: past.length, last_reason: past[0].reason, last_at: past[0].created_at } : null
  }
  const scanJob = job => scanPost(`${job.title} ${job.salary} ${job.description}`, job.directEmail)
  const adminChurch = churches.find(c => c.id === profile.church_id)?.name
  const vouchRows = supabase
    ? server.vouchRequests.map(v => ({ id: v.user_id, name: v.display_name, church: adminChurch, requestedDate: new Date(v.created_at).toLocaleDateString(), status: v.status, note: v.note }))
    : demo.vouchQueue

  // People management. The demo persona runs the site as super admin.
  const myRole = supabase ? profile.role : 'super_admin'
  const myId = supabase ? uid : DEMO_ME
  const members = supabase ? server.members : demo.members
  const applications = supabase ? server.applications : demo.applications
  const myApplications = applications.filter(a => a.user_id === myId)
  const pendingApplications = applications.filter(a => a.status === 'pending').length
  const churchSuggestions = supabase ? server.churchSuggestions : demo.churchSuggestions
  const mySuggestions = churchSuggestions.filter(c => c.suggested_by === myId && c.status === 'pending')
  const pendingChurchRequests = churchSuggestions.filter(c => c.status === 'pending').length
  const suggestionFor = id => churchSuggestions.find(c => c.id === id)

  // Career support: your own requests, and (for mentors) the open ones plus those you took
  const supportRequests = supabase ? server.supportRequests : demo.supportRequests
  const mySupport = supportRequests.filter(r => r.member_id === myId)
  const mentorQueue = supabase ? server.volunteerRequests : demo.supportRequests
    .filter(r => r.member_id !== DEMO_ME && (r.status === 'open' || r.volunteer_id === DEMO_ME))
    .map(r => ({ ...r, mine: r.volunteer_id === DEMO_ME, email: r.volunteer_id === DEMO_ME ? SAMPLE_MEMBERS.find(m => m.id === r.member_id)?.email : null }))
  const openMentorRequests = mentorQueue.filter(r => r.status === 'open').length

  // Joining: who is waiting (moderators and admins), and everyone who joined with who invited and who decided (admins)
  const demoMember = id => demo.members.find(m => m.id === id)
  const pendingMembers = supabase ? server.pendingMembers : demo.members.filter(m => m.status === 'pending')
    .map(m => ({ id: m.id, name: m.name, email: m.email, invited_by: demoMember(m.referred_by)?.name, invited_by_email: demoMember(m.referred_by)?.email, joined: m.joined }))
  const joinedMembers = supabase ? server.joinedMembers : demo.members.filter(m => m.role !== 'super_admin' || m.id === DEMO_ME)
    .map(m => ({ id: m.id, name: m.name, email: m.email, status: m.status, invited_by: demoMember(m.referred_by)?.name, decided_by: demoMember(m.decided_by)?.name, decided_by_role: demoMember(m.decided_by)?.role, joined: m.joined }))
  const myCode = supabase ? profile.referral_code : demoMember(DEMO_ME)?.referral_code

  // Pastoral care: your own requests, and (for carers) their church's open ones plus those they took
  const myCare = supabase ? server.pastoral : demo.pastoralRequests.filter(r => r.member_id === DEMO_ME)
  const carerChurch = supabase ? profile.church_id : SAMPLE_CHURCHES[0].id
  const carerQueue = supabase ? server.carerRequests : demo.pastoralRequests
    // Same rule as carer_can_see() in the 20261106 migration
    .filter(r => ((r.share_with || 'own_church') === 'own_church' ? r.church_id === carerChurch : r.church_id !== carerChurch) && r.member_id !== DEMO_ME && (r.status === 'open' || (r.status === 'taken' && r.carer_id === DEMO_ME)))
    .map(r => ({ ...r, mine: r.carer_id === DEMO_ME, email: r.carer_id === DEMO_ME ? demoMember(r.member_id)?.email : null }))
  const openCareRequests = carerQueue.filter(r => r.status === 'open').length

  // Contact form messages: admins see all, moderators the safety concerns (the server filters the same way)
  const contactMessages = supabase ? server.contactMessages : demo.contactMessages.filter(m => isAdmin || m.topic === 'safety')
  const openMessages = contactMessages.filter(m => m.status === 'open').length

  // Admin church list with how many depend on each church (the server counts on the live site)
  const churchOverview = supabase ? server.churchOverview : churches.map(c => ({
    ...c,
    admins: demo.members.filter(m => m.role === 'church_admin' && m.church_id === c.id).length,
    vouched: demo.vouchQueue.filter(v => v.church === c.name && v.status === 'vouched').length,
    pending: demo.vouchQueue.filter(v => v.church === c.name && v.status === 'pending').length
  }))
  const churchName = id => churches.find(c => c.id === id)?.name
  // Mirrors check_can_manage() in the migration, so controls only appear where the server would allow them
  const canManage = (member, nextRole) => member.id !== myId && member.role !== 'super_admin' && nextRole !== 'super_admin'
    && (myRole === 'super_admin' || (member.role !== 'admin' && nextRole !== 'admin'))
  const visibleMembers = members.filter(m =>
    (memberFilter === 'all' || (memberFilter === 'suspended' ? m.suspended : m.role === memberFilter)) &&
    `${m.name} ${m.email}`.toLowerCase().includes(memberSearch.trim().toLowerCase()))

  const visibleJobs = useMemo(() => board.filter(j =>
    (emirate === 'All emirates' || j.emirate === emirate) &&
    (workType === 'Any work type' || j.type === workType || j.mode === workType) &&
    (`${j.title} ${j.company} ${j.category}`.toLowerCase().includes(search.trim().toLowerCase())) &&
    (tab !== 'saved' || demo.saved.includes(j.id)) &&
    (!matchOnly || matchIds.includes(j.id))
  ), [board, emirate, workType, search, tab, demo.saved, matchOnly, matchIds.join()])

  const updateDemo = patch => setDemo(prev => ({ ...prev, ...patch }))
  const notify = message => setBanner(message)
  const fail = err => notify(err.message)

  useEffect(() => {
    if (!supabase) return
    api.providers().then(setProviders)
    // A cancelled or failed Google sign-in comes back with the reason in the URL
    const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search)
    if (params.get('error_description')) {
      notify(`Sign-in did not complete: ${params.get('error_description')}`)
      window.history.replaceState(null, '', window.location.pathname)
    }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true) })
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (event === 'PASSWORD_RECOVERY') setNewPassword('')
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // RLS decides what each list returns: moderators see the full queue, members only their own rows
  const refresh = () => supabase && Promise.all([
    api.liveJobs(),
    uid ? api.myJobs(uid) : [],
    uid && canModerate ? api.pendingJobs() : [],
    uid && canModerate ? api.reports() : [],
    uid && canModerate ? api.posterVouches() : [],
    uid ? api.myVouch(uid) : null,
    uid && isChurchAdmin ? api.vouchRequests() : [],
    uid && isAdmin ? api.members() : [],
    uid ? api.applications() : [],
    uid ? api.myInterest(uid) : [],
    uid ? api.interestCounts() : {},
    uid ? api.churchSuggestions() : [],
    uid ? api.supportRequests() : [],
    uid && isVolunteer ? api.volunteerRequests() : [],
    uid && isAdmin ? api.churchOverview() : [],
    uid && canModerate ? api.pendingMembers() : [],
    uid && isAdmin ? api.joinedMembers() : [],
    uid ? api.myPastoral() : [],
    uid && isCarer ? api.carerRequests() : [],
    uid ? api.myMatches() : [],
    uid && canModerate ? api.contactMessages() : [],
    uid && canModerate ? api.rejectionHistory() : []
  ]).then(([live, mine, queue, reports, posters, myVouch, vouchRequests, members, applications, interested, interestCounts, churchSuggestions, supportRequests, volunteerRequests, churchOverview, pendingMembers, joinedMembers, pastoral, carerRequests, matches, contactMessages, rejectionHistory]) => {
    setJobs(live.map(toJob))
    setServer({
      myJobs: mine.map(toJob), queue: queue.map(toJob), reports, myVouch,
      posterVouches: Object.fromEntries(posters.map(p => [p.user_id, p.status])),
      vouchRequests: vouchRequests.filter(v => v.user_id !== uid), // admins can't vouch for themselves
      members, applications, interested, interestCounts, churchSuggestions, supportRequests, volunteerRequests, churchOverview, pendingMembers, joinedMembers, pastoral, carerRequests, matches, contactMessages, rejectionHistory
    })
  }).catch(err => notify(`Could not load from the server: ${err.message}`))

  useEffect(() => { refresh() }, [uid, accountRole])

  useEffect(() => {
    if (!TWO_STEP_REQUIRED || !supabase || !session) return setTwoStep({ level: null, factorId: null })
    api.twoStepStatus().then(setTwoStep).catch(() => {})
  }, [session?.access_token])

  // Staff who already set up two-step sign-in are asked for their code once after signing in
  const askedForCode = useRef(null)
  useEffect(() => {
    if (!needsTwoStep || !twoStep.factorId || askedForCode.current === uid) return
    askedForCode.current = uid
    setShowTwoStep(true)
  }, [needsTwoStep, twoStep.factorId])

  useEffect(() => {
    if (!supabase || !uid) return setProfile({})
    api.profile(uid).then(setProfile).catch(fail)
    api.churches().then(setChurches).catch(fail)
  }, [uid])

  // Roles granted while someone is signed in (e.g. an approved application) show up when they return to the tab
  useEffect(() => {
    if (!supabase || !uid) return
    const recheck = () => document.visibilityState === 'visible' && api.profile(uid).then(setProfile).catch(() => {})
    document.addEventListener('visibilitychange', recheck)
    window.addEventListener('focus', recheck)
    return () => { document.removeEventListener('visibilitychange', recheck); window.removeEventListener('focus', recheck) }
  }, [uid])

  const pendingVouches = vouchRows.filter(m => m.status === 'pending').length
  const waitingFor = canModerate && queue.length ? 'review' : canModerate && pendingMembers.length ? 'joining' : isCarer && openCareRequests ? 'carerQueue' : isChurchAdmin && pendingVouches ? 'vouch' : isAdmin && pendingApplications ? 'applications' : isAdmin && pendingChurchRequests ? 'churchRequests' : isVolunteer && openMentorRequests ? 'mentoring' : null
  const landed = useRef(null)
  useEffect(() => {
    if (!supabase || !uid || !waitingFor || landed.current === uid) return
    landed.current = uid
    if (page === 'home') { replaceUrl.current = true; setPage(waitingFor) }
  }, [uid, waitingFor])

  useEffect(() => { document.querySelector('.work-tabs .active')?.scrollIntoView({ block: 'nearest', inline: 'center' }) }, [page])

 // Which sharing options have a carer right now, so a request never goes to nobody
  useEffect(() => {
    setCareAvailable(null)
    if (!careForm.church) return
    if (!supabase) {
      const carers = demo.members.filter(m => m.role === 'pastoral_carer' && !m.suspended)
      return setCareAvailable({
        own_church: carers.some(m => m.church_id === careForm.church),
        other_church: carers.some(m => m.church_id !== careForm.church)
      })
    }
    let stale = false
    api.carersAvailable(careForm.church).then(a => !stale && setCareAvailable(a)).catch(() => {})
    return () => { stale = true }
  }, [careForm.church, demo.members])

  // Unsubscribe link from a job-alert email: /unsubscribe?token=…
  useEffect(() => {
    if (page !== 'unsubscribe') return
    const token = new URLSearchParams(window.location.search).get('token')
    if (!supabase) return setUnsubscribed(true)
    if (!/^[0-9a-f-]{36}$/i.test(token || '')) return setUnsubscribed(false)
    api.unsubscribe(token).then(ok => { setUnsubscribed(ok); if (ok && uid) api.profile(uid).then(setProfile) }).catch(() => setUnsubscribed(false))
  }, [page])

  // Keep the address bar and tab title in step with the page; back and forward move between pages
  const infoPage = INFO_PAGES.find(p => p.id === page)
  useEffect(() => {
    const path = PATHS[page] || '/'
    if (window.location.pathname !== path) window.history[replaceUrl.current ? 'replaceState' : 'pushState'](null, '', path)
    replaceUrl.current = false
    const label = infoPage?.title || (page === 'dashboard' ? `${workLabel} dashboard` : page === 'drafts' && isEmployer ? 'Employer dashboard' : [...NAV.member, ...NAV.menu, ...NAV.moderator, ...NAV.church, ...NAV.admin, ...NAV.volunteer, ...NAV.pastoral].find(n => n.id === page)?.label)
    document.title = page === 'home' || !label ? `${SITE_NAME} · Find work through people who know you` : `${label} · ${SITE_NAME}`
  }, [page, workLabel, isEmployer])
  useEffect(() => {
    const onPop = () => setPage(pageFor(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Leave staff pages if the account loses access (e.g. after signing out)
  useEffect(() => {
    const allowed = { dashboard: staffNav.length > 0, mentoring: isVolunteer, review: canModerate, reports: canModerate, vouch: isChurchAdmin, people: isAdmin, applications: isAdmin, churchRequests: isAdmin, joining: canModerate, carerQueue: isCarer, inbox: canModerate }[page]
    // wait for the sign-in and the account's role before deciding, so links to staff pages survive a reload
    if (!authReady || (uid && (profile.role === undefined || (TWO_STEP_REQUIRED && twoStep.level === null)))) return
    if (allowed === false) { replaceUrl.current = true; setPage('home') }
  }, [accountRole, page, authReady, profile.role, twoStep.level])

  // True (and shows the next step) when a server action needs an approved account first
  const needsSignIn = () => {
    if (!supabase) return false
    if (!session) { setShowSignIn(true); return true }
    if (!joinStatus) return false
    notify(joinStatus === 'declined' ? 'Your request to join was not approved, so this is switched off.' : 'You can do this once a moderator approves your account. Until then you can browse jobs.')
    return true
  }

  const setAuthMode = mode => setAuthForm(f => ({ ...f, mode }))
  const submitAuth = e => {
    e.preventDefault()
    const { mode, name, password, code } = authForm
    const email = authForm.email.trim()
    const close = () => { setShowSignIn(false); setAuthForm(EMPTY_AUTH) }
    const newCaptcha = () => { setCaptchaToken(''); setCaptchaRound(n => n + 1) }
    const call = mode === 'reset'
      ? api.sendPasswordReset(email, captchaToken).then(() => { close(); notify(`If ${email} has an account, a link to choose a new password is on its way.`) })
      : mode === 'signin'
        ? api.signIn(email, password, captchaToken).then(close)
        : api.signUp({ name: name.trim(), email, password, code: code.trim(), captchaToken })
          .then(data => { close(); notify(data.session ? 'Account created. A moderator will check who invited you, then approve you. You can browse jobs meanwhile.' : `Check ${email} for a link to confirm your address. A moderator approves new accounts after that.`) })
    call.catch(fail).finally(newCaptcha)
  }
  const twoStepDone = () => {
    setShowTwoStep(false)
    api.twoStepStatus().then(setTwoStep)
    notify('Two-step sign-in confirmed. Your staff tools are on.')
  }
  const saveNewPassword = e => { e.preventDefault(); api.setPassword(newPassword).then(() => { setNewPassword(null); notify('Password updated. You are signed in.') }).catch(fail) }
  const submitCode = e => {
    e.preventDefault()
    api.useReferralCode(codeInput.trim())
      .then(() => { setCodeInput(''); api.profile(uid).then(setProfile); notify('Thanks. A moderator will check with the member who invited you, then approve your account.') })
      .catch(fail)
  }

  const signInWithGoogle = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    .then(({ error }) => error && fail(error))

  const signOut = () => supabase.auth.signOut().then(() => notify('Signed out.'))


  useEffect(() => { window.localStorage.setItem(demoKey, JSON.stringify(demo)) }, [demo])
  useEffect(() => { try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draftForm)) } catch {} }, [draftForm])
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') {
        setSelectedJob(null); setShowMobileMore(false);
        setShowReset(false); setShowReport(false); setShowSupportModal(false); setRemoving(null)
        setShowSignIn(false); setVerifying(null); setNewPassword(null); setShowTwoStep(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const modal = selectedJob || showMobileMore || showReset || removing || showReport || showSupportModal || showSignIn || verifying || newPassword !== null || showTwoStep
    document.body.classList.toggle('modal-open', Boolean(modal))
    return () => document.body.classList.remove('modal-open')
  }, [selectedJob, showMobileMore, showReset, removing, showReport, showSupportModal, showSignIn, verifying, newPassword, showTwoStep])

  const go = id => { setPage(id); setShowMobileMore(false); setBanner(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const setRole = next => {
    updateDemo({ role: next })
    setPage(next === 'member' ? 'home' : 'dashboard')
    setShowMobileMore(false)
    notify(`Switched to ${PERSONAS[next]} demo view`)
  }
  const handleVouch = (id, status, withdrawing = false) => {
    const done = () => notify(status === 'vouched' ? 'Member vouched. Only a yes/no is stored, never belief or denomination data.'
      : withdrawing ? 'Vouch withdrawn. Their live jobs are hidden until they are vouched for again.' : 'Vouch request declined.')
    if (supabase) return api.decideVouch(id, status).then(() => { refresh(); done() }).catch(fail)
    updateDemo({ vouchQueue: demo.vouchQueue.map(m => m.id === id ? { ...m, status } : m) })
    done()
  }

  // Job posters ask their partner church to confirm they are known to the community before anything they post can go live
  const requestVouch = e => {
    e.preventDefault()
    const church = churches.find(c => c.id === vouchForm.church.id)
    if (!church) return suggestChurch(vouchForm.church).then(added => added && setVouchForm(EMPTY_VOUCH))
    const note = vouchForm.note.trim()
    const done = () => { setVouchForm(EMPTY_VOUCH); notify(`Request sent to ${church.name}. Their admin only confirms you are known to the community.`) }
    if (supabase) {
      if (needsSignIn()) return
      return api.requestVouch(server.myVouch, { church_id: church.id, display_name: account.name, note: note || null })
        .then(() => { refresh(); done() })
        .catch(fail)
    }
    const request = { id: DEMO_ME, name: account.name, requestedDate: 'Just now', church: church.name, status: 'pending', note: `Job poster · ${note || 'No note added.'}` }
    updateDemo({ vouchQueue: [request, ...demo.vouchQueue.filter(m => m.id !== DEMO_ME)] })
    done()
  }

  // A church that isn't a partner yet: admins check it and add it, then the member can ask it to vouch.
  // Resolves to the suggestion row, or null when nothing was sent.
  const suggestChurch = ({ name, emirate }, quiet = false) => {
    const row = { name: name.trim(), emirate }
    if (row.name.length < 2 || !emirate) {
      notify('Pick your church from the list, or choose its emirate so we can add it.')
      return Promise.resolve(null)
    }
    if (supabase && needsSignIn()) return Promise.resolve(null)
    const done = added => {
      if (!quiet) notify(`Thanks. We'll check ${row.name} and add it, usually within a few days. Then you can ask them to vouch for you here.`)
      return added
    }
    if (supabase) return api.suggestChurch(row).then(added => { refresh(); return done(added) })
      .catch(err => { notify(/one_open_suggestion/.test(err.message) ? `You already suggested ${row.name}. We'll add it soon.` : err.message); return null })
    const added = { ...row, id: `sug-${Date.now()}`, suggested_by: DEMO_ME, status: 'pending', church_id: null, created_at: new Date().toISOString() }
    updateDemo({ churchSuggestions: [added, ...demo.churchSuggestions] })
    return Promise.resolve(done(added))
  }

  const decideChurchSuggestion = (suggestion, approve, finalName) => {
    const name = (finalName || suggestion.name).trim()
    const done = () => notify(approve ? `${name} is now a partner church. Members can choose it and apply to be its admin.` : 'Church request declined.')
    if (supabase) return api.decideChurchSuggestion(suggestion.id, approve, name)
      .then(() => { refresh(); api.churches().then(setChurches); done() }).catch(fail)
    const existing = churches.find(c => c.name.toLowerCase() === name.toLowerCase())
    const church = approve && (existing || { id: `church-${Date.now()}`, name, emirate: suggestion.emirate })
    updateDemo({
      churches: church && !existing ? [...demo.churches, church] : demo.churches,
      churchSuggestions: demo.churchSuggestions.map(c => c.id === suggestion.id ? { ...c, status: approve ? 'approved' : 'declined', church_id: church?.id || null } : c)
    })
    done()
  }

  const toggleSave = id => {
    const already = demo.saved.includes(id)
    updateDemo({ saved: already ? demo.saved.filter(x => x !== id) : [...demo.saved, id] })
    notify(already ? 'Removed from your saved sample opportunities.' : 'Saved on this device for reference.')
  }

  const toggleInterest = id => {
    const already = interestedIds.includes(id)
    const done = () => notify(already ? 'Removed from roles you’re interested in.' : 'Marked as interested. The employer only sees how many people are interested, never who. Apply straight to them from the role page.')
    if (supabase) {
      if (needsSignIn()) return
      return (already ? api.unmarkInterest(id, uid) : api.markInterest(id))
        .then(() => { setServer(prev => ({ ...prev, interested: already ? prev.interested.filter(x => x !== id) : [...prev.interested, id] })); done() })
        .catch(fail)
    }
    updateDemo({ interested: already ? demo.interested.filter(x => x !== id) : [...demo.interested, id] })
    done()
  }

  const toggleTrack = id => {
    const already = demo.tracked.includes(id)
    updateDemo({ tracked: already ? demo.tracked.filter(x => x !== id) : [...demo.tracked, id] })
    notify(already ? 'Application tracker removed.' : 'Marked as applied. Tracked in this browser.')
  }

  const reset = () => {
    setDemo({ ...defaultDemo }); setPage('home'); setSelectedJob(null); setSearch(''); setEmirate('All emirates'); setWorkType('Any work type'); setTab('all'); setShowReset(false); setShowMobileMore(false); notify('Demo reset. Your local sample activity was cleared.')
  }

  const submitDraft = e => {
    e.preventDefault()
    if (draftScan.blocked.length > 0) {
      return notify(`Auto-block triggered: Remove prohibited terms (${draftScan.blocked.join(', ')}) before saving.`)
    }
    const firstProblem = wizardSteps.find(st => stepProblem(st.key))
    if (firstProblem) { setPostStep(firstProblem.key); setStepTried(true); return }
    const { title, company, emirate, type, mode, email, portal, description } = draftForm
    const row = { title: title.trim(), company: company.trim(), emirate, type, mode, salary: draftSalary, description: description.trim(), direct_email: email.trim(), direct_portal: portal.trim() || null }
    const done = () => {
      setDraftForm(EMPTY_DRAFT)
      setPostStep(null)
      setStepTried(false)
      go('drafts')
      notify(myVouch?.status === 'vouched'
        ? 'Post submitted. A moderator will check it with the employer before it goes live.'
        : 'Post saved. It goes live once your church vouches for you and a moderator has checked it with the employer.')
    }
    if (supabase) {
      if (needsSignIn()) return
      return api.submitJob(row).then(() => { refresh(); done() }).catch(fail)
    }
    updateDemo({ drafts: [{ ...row, id: `draft-${Date.now()}`, status: 'pending', created_at: new Date().toISOString() }, ...demo.drafts] })
    done()
  }

  const submitReport = () => {
    if (!selectedJob) return
    if (supabase) {
      if (needsSignIn()) return
      return api.fileReport(selectedJob.id, reportReason)
        .then(() => { setShowReport(false); notify('Report sent to the Ephworks Safety Team. We follow up on all flags within 24 hours.') })
        .catch(err => notify(/duplicate/.test(err.message) ? 'You have already reported this role. The Safety Team has it.' : err.message))
    }
    updateDemo({
      reports: [
        ...demo.reports,
        {
          id: `report-${Date.now()}`,
          jobId: selectedJob.id,
          reason: reportReason,
          status: 'Open · Safety Team Assigned',
          created: new Date().toLocaleTimeString()
        }
      ]
    })
    setShowReport(false)
    notify('Report sent to the Ephworks Safety Team. We follow up on all flags within 24 hours.')
  }

  const openSession = id => { setSelectedSupportService(id); setSupportForm(f => ({ ...f, name: f.name || (account.guest ? '' : account.name), consent: false })); setShowSupportModal(true) }

  // A member asks for a session; a volunteer mentor takes it and emails them
  const bookSupportSession = e => {
    e.preventDefault()
    if (supabase && needsSignIn()) return
    const module = CAREER_SUPPORT_MODULES.find(m => m.id === selectedSupportService)
    const row = { service: selectedSupportService, display_name: (supportForm.name || account.name).trim(), preferred_time: supportForm.preferredTime, note: supportForm.note.trim() || null, may_email: true }
    const done = () => { setShowSupportModal(false); setSupportForm(f => ({ ...f, note: '', consent: false })); notify(`Request sent. A volunteer mentor will pick it up and email you about your ${module?.title}.`) }
    const already = `You already have an open ${module?.title} request.`
    if (supabase) return api.requestSupport(row).then(() => { refresh(); done() }).catch(err => notify(/one_open_support_request/.test(err.message) ? already : err.message))
    if (mySupport.some(r => r.service === row.service && ['open', 'taken'].includes(r.status))) return notify(already)
    updateDemo({ supportRequests: [{ ...row, id: `support-${Date.now()}`, member_id: DEMO_ME, status: 'open', volunteer_id: null, created_at: new Date().toISOString() }, ...demo.supportRequests] })
    done()
  }

  const updateSupport = (request, patch, message, call) => {
    if (supabase) return call().then(() => { refresh(); notify(message) }).catch(fail)
    updateDemo({ supportRequests: demo.supportRequests.map(r => r.id === request.id ? { ...r, ...patch } : r) })
    notify(message)
  }
  const cancelSupport = r => updateSupport(r, { status: 'cancelled' }, 'Request cancelled.', () => api.cancelSupport(r.id))
  const takeSupport = r => updateSupport(r, { status: 'taken', volunteer_id: DEMO_ME }, `You took ${r.display_name}'s request. Email them to arrange a time.`, () => api.takeSupport(r.id))
  const finishSupport = (r, isDone, comment = '') => updateSupport(r, isDone ? { status: 'done', outcome_note: comment.trim() || null } : { status: 'open', volunteer_id: null },
    isDone ? 'Marked as done. Thank you for volunteering.' : 'Handed back to the open list.', () => api.finishSupport(r.id, isDone, comment.trim() || null))
  const confirmFinish = e => {
    e.preventDefault()
    finishSupport(finishing.request, true, finishing.comment)
    setFinishing(null)
  }

  // Profile details and job preferences: only you see the preferences
  const saveProfile = form => {
    const row = { ...form, display_name: form.display_name.trim(), phone: form.phone.trim(), keywords: form.keywords.trim(), min_pay: form.min_pay ? Number(form.min_pay) : null }
    if (row.phone && !/^\+?[0-9 ()-]{7,20}$/.test(row.phone)) return notify('Check the phone number: digits, spaces, brackets and a leading + only.')
    const done = () => notify(hasPreferences(row) ? 'Profile saved. Jobs that match it are marked “New for you” as they go live.' : 'Profile saved.')
    if (supabase) {
      if (!session) return setShowSignIn(true)
      return api.updateProfile(row).then(() => { api.profile(uid).then(setProfile); refresh(); done() }).catch(fail)
    }
    updateDemo({ prefs: row })
    done()
  }
  // Showing your matches marks them as seen, so the count only ever means new jobs
  const showMatches = on => {
    setMatchOnly(on)
    if (!on || !newMatchIds.length) return
    if (supabase) return api.markMatchesSeen().then(() => setServer(prev => ({ ...prev, matches: prev.matches.map(m => ({ ...m, is_new: false })) }))).catch(fail)
    updateDemo({ seenMatches: [...new Set([...demo.seenMatches, ...matchIds])] })
  }

  // Contact form: opened from any "message us" button with the right topic, filled in for signed-in members
  const openContact = topic => { setContactForm(f => ({ ...f, topic: CONTACT_TOPICS[topic] ? topic : 'question' })); go('contact') }
  const sendContact = e => {
    e.preventDefault()
    const { name, email, topic, message, website } = contactForm
    const done = () => {
      setContactForm(f => ({ ...f, message: '' }))
      notify(topic === 'safety' ? 'Thanks. The safety team has your message and will reply by email within 24 hours.' : 'Thanks, your message is with the team. We will reply by email.')
    }
    if (website) return done() // only bots fill in the hidden field; tell them it worked and keep nothing
    const row = { name: name.trim(), email: email.trim(), topic, message: message.trim() }
    if (supabase) return api.sendContact(row).then(done).catch(fail)
    updateDemo({ contactMessages: [{ ...row, id: `msg-${Date.now()}`, status: 'open', created_at: new Date().toISOString() }, ...demo.contactMessages] })
    done()
  }
  const setHandled = (m, handled) => {
    const done = () => notify(handled ? 'Marked as handled.' : 'Moved back to open.')
    if (supabase) return api.setContactHandled(m.id, handled).then(() => { refresh(); done() }).catch(fail)
    updateDemo({ contactMessages: demo.contactMessages.map(x => x.id === m.id ? { ...x, status: handled ? 'handled' : 'open' } : x) })
    done()
  }
  const deleteMessage = m => {
    if (supabase) return api.deleteContact(m.id).then(() => { refresh(); notify('Message deleted.') }).catch(fail)
    updateDemo({ contactMessages: demo.contactMessages.filter(x => x.id !== m.id) })
    notify('Message deleted.')
  }

  // Joining: approving gives the newcomer their own referral code
  const decideMember = (m, approve) => {
    const done = () => notify(approve ? `${m.name} is approved and can now take part. They get their own referral code.` : `${m.name}'s request to join was declined.`)
    if (supabase) return api.decideMember(m.id, approve).then(() => { refresh(); done() }).catch(fail)
    updateDemo({ members: demo.members.map(x => x.id === m.id ? { ...x, status: approve ? 'approved' : 'declined', referral_code: approve ? `EPH-${Math.random().toString(16).slice(2, 8).toUpperCase()}` : null, decided_by: DEMO_ME, decided_at: new Date().toISOString() } : x) })
    done()
  }
  const copyCode = () => navigator.clipboard.writeText(myCode).then(() => notify('Referral code copied.')).catch(() => notify(`Your referral code is ${myCode}`))

  // Pastoral care: a member asks a carer at their church; it never touches jobs, vouches or interest
  const askForCare = e => {
    e.preventDefault()
    if (supabase && needsSignIn()) return
    const { church, name, kind, note, shareWith } = careForm
    const row = { church_id: church, display_name: (name || account.name).trim(), kind, note: note.trim() || null, may_contact: true, share_with: shareWith }
    const done = () => { setCareForm(EMPTY_CARE); notify(shareWith === 'other_church' ? 'Sent to pastoral carers at other partner churches. Your own church won’t be told.' : `Sent to a pastoral carer at ${churchName(church)}. Only they will see it.`) }
    const already = 'You already have a request open. Delete it first if you want to send a new one.'
    if (supabase) return api.requestPastoral(row).then(() => { refresh(); done() }).catch(err => notify(/one_open_pastoral_request/.test(err.message) ? already : err.message))
    if (myCare.some(r => r.status !== 'closed')) return notify(already)
    updateDemo({ pastoralRequests: [{ ...row, id: `care-${Date.now()}`, member_id: DEMO_ME, status: 'open', carer_id: null, created_at: new Date().toISOString() }, ...demo.pastoralRequests] })
    done()
  }
  const deleteCare = r => {
    const done = () => notify('Request deleted. It is erased, not just hidden.')
    if (supabase) return api.deletePastoral(r.id).then(() => { refresh(); done() }).catch(fail)
    updateDemo({ pastoralRequests: demo.pastoralRequests.filter(x => x.id !== r.id) })
    done()
  }
  const updateCare = (r, patch, message, call) => {
    if (supabase) return call().then(() => { refresh(); notify(message) }).catch(fail)
    updateDemo({ pastoralRequests: demo.pastoralRequests.map(x => x.id === r.id ? { ...x, ...patch } : x) })
    notify(message)
  }
  const takeCare = r => updateCare(r, { status: 'taken', carer_id: DEMO_ME }, `You took ${r.display_name}'s request. Email them, and keep what they share confidential.`, () => api.takePastoral(r.id))
  const finishCare = (r, closed) => updateCare(r, closed ? { status: 'closed' } : { status: 'open', carer_id: null },
    closed ? 'Request closed.' : 'Handed back to the open list.', () => api.finishPastoral(r.id, closed))

  // Church management (admins)
  const refreshChurches = () => { refresh(); api.churches().then(setChurches) }
  const addChurch = (name, emirate) => {
    const clean = name.trim()
    if (clean.length < 2) return notify('Type the church name.')
    if (churches.some(c => c.name.toLowerCase() === clean.toLowerCase())) return notify(`${clean} is already a partner church.`)
    if (supabase) return api.addChurch(clean, emirate || null).then(() => { refreshChurches(); notify(`${clean} added.`) }).catch(fail)
    updateDemo({ churches: [...demo.churches, { id: `church-${Date.now()}`, name: clean, emirate: emirate || null }] })
    notify(`${clean} added.`)
  }
  const saveChurch = (church, name, emirate) => {
    const clean = name.trim()
    if (clean.length < 2) return notify('Type the church name.')
    if (supabase) return api.updateChurch(church.id, clean, emirate || null).then(() => { refreshChurches(); notify('Church updated.') }).catch(fail)
    updateDemo({ churches: demo.churches.map(c => c.id === church.id ? { ...c, name: clean, emirate: emirate || null } : c) })
    notify('Church updated.')
  }
  const removeChurch = church => {
    if (supabase) return api.removeChurch(church.id).then(() => { refreshChurches(); notify(`${church.name} removed.`) }).catch(fail)
    updateDemo({ churches: demo.churches.filter(c => c.id !== church.id) })
    notify(`${church.name} removed.`)
  }

  const applyFor = appRole => { setApplyForm({ ...EMPTY_APPLY, role: appRole }); go('apply') }

  const submitApplication = e => {
    e.preventDefault()
    if (supabase && needsSignIn()) return
    const { role: appRole, church, name, note } = applyForm
    const listed = appRole === 'church_admin' && churches.find(c => c.id === church.id)
    const send = suggestion => {
      if (appRole === 'church_admin' && !listed && !suggestion) return
      const row = { role: appRole, church_id: listed ? listed.id : null, church_suggestion_id: suggestion?.id || null, display_name: name.trim() || account.name, note: note.trim() }
      const already = 'You already have an application for this role waiting for review.'
      const done = () => { setApplyForm(EMPTY_APPLY); notify(`Application sent. An admin will contact you for a short check before approving you as ${ROLE_LABELS[appRole]}${suggestion ? `, and add ${suggestion.name} as a partner church` : ''}.`) }
      if (supabase) return api.apply(row).then(() => { refresh(); done() }).catch(err => notify(/one_open_application/.test(err.message) ? already : err.message))
      if (myApplications.some(a => a.role === appRole && a.status === 'pending')) return notify(already)
      updateDemo({ applications: [{ ...row, id: `app-${Date.now()}`, user_id: DEMO_ME, status: 'pending', created_at: new Date().toISOString() }, ...demo.applications] })
      done()
    }
    if (appRole === 'church_admin' && !listed) return suggestChurch(church, true).then(send)
    send(null)
  }

  const decideApplication = (app, approve) => {
    const done = () => notify(approve ? `Approved. ${app.display_name} is now ${ROLE_LABELS[app.role]}; their new view appears next time they open Ephworks.` : 'Application declined.')
    if (supabase) return api.decideApplication(app.id, approve).then(() => { refresh(); done() }).catch(fail)
    const church = app.church_id || suggestionFor(app.church_suggestion_id)?.church_id || null
    updateDemo({
      applications: demo.applications.map(a => a.id === app.id ? { ...a, status: approve ? 'approved' : 'declined', church_id: church } : a),
      members: approve ? demo.members.map(m => m.id === app.user_id ? { ...m, role: app.role, church_id: church } : m) : demo.members
    })
    done()
  }

  const changeMember = (member, patch, message) => {
    if (supabase) {
      const call = 'suspended' in patch ? api.setSuspended(member.id, patch.suspended) : api.setMemberRole(member.id, patch.role, patch.church_id)
      return call.then(() => { refresh(); notify(message) }).catch(fail)
    }
    updateDemo({ members: demo.members.map(m => m.id === member.id ? { ...m, ...patch } : m) })
    notify(message)
  }
  const saveRole = (member, nextRole, church) => {
    if (CHURCH_ROLES.includes(nextRole) && !church) return notify('Choose the church this person serves.')
    changeMember(member, { role: nextRole, church_id: CHURCH_ROLES.includes(nextRole) ? church : null }, `${member.name}'s role is now ${ROLE_LABELS[nextRole]}.`)
  }
  const toggleSuspend = member => changeMember(member, { suspended: !member.suspended }, member.suspended
    ? `${member.name} is restored.`
    : `${member.name} is suspended. Their posts are hidden and they can't post, vouch, report or review.`)

  const updateDraft = (id, patch) => updateDemo({ drafts: demo.drafts.map(d => d.id === id ? { ...d, ...patch } : d) })

  // Publishing needs a vouched poster, no blocked terms, every warning checked with the employer, and a verification note.
  // The server re-checks the vouch, the terms and the note; in the demo this is the only gate.
  const canPublish = ({ job, note, flagsChecked }) => {
    const scan = scanJob(job)
    return posterVouched(job) && !scan.blocked.length && (flagsChecked || !scan.flags.length) && Boolean(note.trim())
  }

  const publishJob = e => {
    e.preventDefault()
    if (!canPublish(verifying)) return
    const { job, note } = verifying
    const done = () => { setVerifying(null); notify('Published. The 30-day expiry timer has started.') }
    if (supabase) return api.reviewJob(job.id, 'published', note.trim()).then(() => { refresh(); done() }).catch(fail)
    const now = Date.now()
    updateDraft(job.id, { status: 'published', verification_note: note.trim(), published_at: new Date(now).toISOString(), expires_at: new Date(now + 30 * 86400000).toISOString() })
    done()
  }

  const rejectJob = e => {
    e.preventDefault()
    const { job, reason } = rejecting
    const note = rejecting.note.trim() || null
    if (!reason) return
    const done = () => { setRejecting(null); notify(`Post rejected: ${REJECT_REASONS[reason].toLowerCase()}. The poster sees why.`) }
    if (supabase) return api.rejectJob(job.id, reason, note).then(() => { refresh(); done() }).catch(fail)
    updateDemo({
      drafts: demo.drafts.map(d => d.id === job.id ? { ...d, status: 'rejected', reject_reason: reason, reject_note: note } : d),
      rejections: [{ employer_id: job.employerId, company: job.company, reason, created_at: new Date().toISOString() }, ...demo.rejections]
    })
    done()
  }

  const markFilled = job => {
    const done = () => notify('Marked as hired. The job has left the board. Congratulations!')
    if (supabase) return api.markFilled(job.id).then(() => { refresh(); done() }).catch(fail)
    updateDraft(job.id, { status: 'filled', filled_at: new Date().toISOString() })
    done()
  }

  const removePost = id => {
    setRemoving(null)
    if (!supabase) {
      updateDemo({ drafts: demo.drafts.filter(x => x.id !== id) })
      return notify('Post draft removed.')
    }
    api.deleteJob(id).then(() => { refresh(); notify('Post removed.') }).catch(fail)
  }

  const markReport = id => {
    if (supabase) return api.resolveReport(id).then(() => { refresh(); notify('Report marked resolved by Safety Team.') }).catch(fail)
    updateDemo({
      reports: demo.reports.map(r => r.id === id ? { ...r, status: 'Resolved by Safety Team' } : r)
    })
    notify('Report marked resolved by Safety Team.')
  }

  // Who the header and menus show: the signed-in account, a guest, or the demo persona without a backend
  const meta = session?.user.user_metadata || {}
  const account = !supabase ? { name: demo.prefs.display_name || 'Jordan Morgan', detail: 'jordan@example.test' } // matches SAMPLE_MEMBERS; vouch status lives on the Profile page
    : session ? { name: profile.display_name || meta.full_name || meta.name || session.user.email.split('@')[0], detail: session.user.email, photo: meta.avatar_url || meta.picture }
    : { name: 'Guest', detail: 'Not signed in', guest: true }
  // The contact form starts with a signed-in member's name and email
  useEffect(() => {
    if (page === 'contact' && !account.guest) setContactForm(f => ({ ...f, name: f.name || account.name, email: f.email || account.detail }))
  }, [page, account.name])

  const reportRows = supabase
    ? server.reports.map(r => ({ id: r.id, title: r.jobs?.title, reason: r.reason, resolved: r.status === 'resolved', created: new Date(r.created_at).toLocaleString() }))
    : demo.reports.map(r => ({ ...r, title: SAMPLE_JOBS.find(x => x.id === r.jobId)?.title, resolved: r.status.includes('Resolved') }))

  // Phone bottom bar: Home, Jobs, Saved, then Post (members) or the first staff queue. On desktop the logo is Home.
  const userMainNav = [NAV.home, NAV.member[0], NAV.member[1], staffNav.length ? { ...NAV.dashboard, label: workLabel } : isEmployer ? { id: 'drafts', label: 'Employer', icon: 'grid' } : NAV.member[2]]
  const navCount = id => ({
    opportunities: newMatchIds.length,
    interests: demo.saved.length + demo.tracked.length + interestedIds.length,
    dashboard: 0,
    mentoring: isVolunteer ? openMentorRequests : 0,
    review: canModerate ? queue.length : 0,
    vouch: isChurchAdmin ? pendingVouches : 0,
    applications: isAdmin ? pendingApplications : 0,
    churchRequests: isAdmin ? pendingChurchRequests : 0,
    joining: canModerate ? pendingMembers.length : 0,
    inbox: canModerate ? openMessages : 0,
    carerQueue: isCarer ? openCareRequests : 0
  })[id] || 0
  const workCount = staffNav.reduce((sum, n) => sum + navCount(n.id), 0)
  // Account menu: whatever the phone bottom bar leaves out (top-bar duplicates are hidden on desktop by CSS)
  const menuItems = [...NAV.member, ...NAV.menu].filter(n => !userMainNav.some(m => m.id === n.id))

  // Post-a-job wizard
  const wizardSteps = POST_STEPS.filter(st => st.key !== 'church' || myVouch?.status !== 'vouched')
  const stepIndex = Math.max(0, wizardSteps.findIndex(st => st.key === postStep))
  const step = wizardSteps[stepIndex]
  const stepProblem = key => {
    const f = draftForm
    if (key === 'job') return f.title.trim().length < 3 ? 'Add a job title (at least 3 letters).' : f.company.trim().length < 2 ? 'Add the company name.' : ''
    if (key === 'pay') return !(Number(f.payFrom) > 0) ? 'Add the monthly pay in AED.' : f.payTo && Number(f.payTo) < Number(f.payFrom) ? 'The top of the range must be at least the starting pay.' : ''
    if (key === 'description') return f.description.trim().length < 20 ? 'Describe the job in at least 20 characters.' : draftScan.blocked.length ? `Remove fee wording: ${draftScan.blocked.join(', ')}.` : ''
    if (key === 'apply') return !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim()) ? 'Add an email where candidates can apply.' : f.portal && !/^https:\/\//.test(f.portal.trim()) ? 'The careers page must start with https://' : ''
    return ''
  }
  const goStep = i => { setPostStep(wizardSteps[i].key); setStepTried(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const nextStep = () => { if (stepProblem(step.key)) return setStepTried(true); goStep(stepIndex + 1) }
  const setDraft = patch => setDraftForm(prev => ({ ...prev, ...patch }))
  const previewJob = toJob({
    id: 'preview', status: 'pending', employer_id: uid, title: draftForm.title || 'Job title', company: draftForm.company || 'Company',
    emirate: draftForm.emirate, type: draftForm.type, mode: draftForm.mode, salary: draftSalary || 'AED —',
    description: draftForm.description, direct_email: draftForm.email, direct_portal: draftForm.portal || null, created_at: new Date().toISOString()
  })

  const savedLists = [
    { title: 'Interested', note: 'The employer only sees a count, never your name', jobs: board.filter(j => interestedIds.includes(j.id)) },
    { title: 'Applied', note: 'Kept on this device', jobs: board.filter(j => demo.tracked.includes(j.id)) },
    { title: 'Saved', note: 'Kept on this device', jobs: board.filter(j => demo.saved.includes(j.id)) }
  ]

  // The job feed: on Home under the hero, and on its own as the Jobs page
  const jobFeed = <>
      <div className="filters">
        <label className="search-box">
          <Search size={19}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search verified jobs, companies, or skills" aria-label="Search opportunities"/>
        </label>
        <label className="select-box">
          <span>Filter by emirate</span>
          <select value={emirate} onChange={e => setEmirate(e.target.value)}>
            {['All emirates', ...EMIRATES].map(x => <option key={x}>{x}</option>)}
          </select>
        </label>
        <label className="select-box">
          <span>Employment type</span>
          <select value={workType} onChange={e => setWorkType(e.target.value)}>
            {['Any work type', ...WORK_TYPES, ...WORK_SETTINGS].map(x => <option key={x}>{x}</option>)}
          </select>
        </label>
      </div>

      <div className="listing-header">
        <span className="result-count">{visibleJobs.length} verified {visibleJobs.length === 1 ? 'role' : 'roles'}{matchOnly && ' matching your profile'}</span>
        {hasPrefs
          ? <button type="button" className={`match-toggle ${matchOnly ? 'on' : ''}`} aria-pressed={matchOnly} onClick={() => showMatches(!matchOnly)}>
              <Sparkles size={15} aria-hidden="true"/> {matchOnly ? 'Show all jobs' : `Matches for you · ${matchIds.length}`}
              {!matchOnly && newMatchIds.length > 0 && <span className="count">{newMatchIds.length} new</span>}
            </button>
          : <button type="button" className="match-toggle" onClick={() => go('profile')}><BellRing size={15} aria-hidden="true"/> Get job alerts</button>}
      </div>

      <div className="job-list">
        {visibleJobs.length ? visibleJobs.map(job => (
          <JobCard
            key={job.id}
            job={job}
            saved={demo.saved.includes(job.id)}
            tracked={demo.tracked.includes(job.id)}
            onSave={() => toggleSave(job.id)}
            onOpen={() => setSelectedJob(job)}
            interested={interestedIds.includes(job.id)}
            onInterest={() => toggleInterest(job.id)}
            onLearn={() => go('jobReview')}
            isNew={newMatchIds.includes(job.id)}
          />
        )) : matchOnly
          ? <Empty icon={BellRing} title="No matching jobs right now" description="New jobs that fit your profile show up here as they go live." action={<button type="button" className="secondary-button" onClick={() => go('profile')}>Edit what you’re looking for</button>}/>
          : board.length
          ? <Empty title="No verified roles match" description="Try a different keyword or change your filters." icon={Search}/>
          : <Empty title="No jobs live yet" description="New jobs appear here once a moderator has checked them with the employer. Check back soon." icon={BriefcaseBusiness}/>}
      </div>

      <div className="disclaimer-foot">
        <ShieldCheck size={18}/> You apply straight to the employer. We never store CVs, charge fees or place candidates.
      </div>
  </>

  return <div className="app-shell">
    <div className="body-area">
      <header className="topbar">
        <button type="button" className="topbar-brand" aria-label="Ephworks home" onClick={() => go('home')}><Brand compact/></button>
        <nav className="top-links" aria-label="Main">
          {NAV.member.map(n => (
            <button key={n.id} type="button" className={page === n.id ? 'active' : ''} aria-current={page === n.id ? 'page' : undefined} onClick={() => go(n.id)}>
              {n.label}
              {navCount(n.id) > 0 && <span className="count">{navCount(n.id)}</span>}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          {!supabase && (
            <label className="demo-select">
              <span>Demo view</span>
              <select value={accountRole} onChange={e => setRole(e.target.value)}>
                {Object.entries(PERSONAS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
          )}
          {isEmployer && (
            <button type="button" className={`work-button employer-button ${page === 'drafts' ? 'active' : ''}`} onClick={() => go('drafts')}>
              <BriefcaseBusiness size={17}/> Employer
            </button>
          )}
          {staffNav.length > 0 && (
            <button type="button" className={`work-button ${staffNav.some(n => n.id === page) ? 'active' : ''}`} onClick={() => go('dashboard')}>
              <ShieldCheck size={17}/> {workLabel}
              {workCount > 0 && <span className="count">{workCount}</span>}
            </button>
          )}
          {supabase && !session && <>
            <button type="button" className={`about-link ${infoPage?.group === 'about' ? 'active' : ''}`} onClick={() => go('about')}>About</button>
            <button type="button" className="primary-button" onClick={() => setShowSignIn(true)}>Sign in</button>
          </>}
          <button type="button" className="account-button" aria-label="Open menu" aria-haspopup="dialog" aria-expanded={showMobileMore} onClick={() => setShowMobileMore(true)}>
            <Avatar account={account}/><ChevronDown size={16} aria-hidden="true"/>
          </button>
        </div>
        <button className="mobile-account" aria-label="Open menu" aria-haspopup="dialog" aria-expanded={showMobileMore} onClick={() => setShowMobileMore(true)}>
          <Avatar account={account}/>
        </button>
      </header>

      <main className="main-content">
        <div className="pilot-strip">
          <span className="pilot-text"><b>Pilot.</b> You apply straight to the employer. We never store your CV.</span>
          <span className="pilot-actions">
            <button type="button" onClick={() => go('privacy')}>Privacy</button>
            {!supabase && <button type="button" onClick={() => setShowReset(true)}>Reset demo</button>}
            {supabase && (session
              ? <button type="button" onClick={signOut}>Sign out</button>
              : <button type="button" onClick={() => setShowSignIn(true)}>Sign in</button>)}
          </span>
        </div>

        {supabase && profile.suspended && (
          <Warning tone="strong">Your account is suspended. You can browse the noticeboard, but you can't post, vouch, report or review. Contact the Ephworks team if you think this is a mistake.</Warning>
        )}
        {needsTwoStep && twoStep.level !== null && (
          <div className="notice strong two-step-notice">
            <LockKeyhole size={17} className="notice-icon" aria-hidden="true"/>
            <span>{twoStep.factorId
              ? <><strong>Enter your sign-in code to use your staff tools.</strong> Until then you see {SITE_NAME} as a member.</>
              : <><strong>Your role needs two-step sign-in.</strong> You approve people and see personal details, so set up an authenticator app to switch on your staff tools.</>}</span>
            <button type="button" className="primary-button" onClick={() => setShowTwoStep(true)}>{twoStep.factorId ? 'Enter code' : 'Set up'}</button>
          </div>
        )}
        {joinStatus === 'declined' && <Warning tone="strong">Your request to join was not approved. You can still browse jobs. If you think this is a mistake, <button type="button" className="link-button" onClick={() => openContact('account')}>send us a message</button>.</Warning>}
        {joinStatus === 'pending' && (profile.referred_by
          ? <Warning>Welcome. A moderator will check with the member who invited you, then approve your account. Until then you can browse jobs.</Warning>
          : (
            <form className="notice join-code" onSubmit={submitCode}>
              <KeyRound size={17} className="notice-icon" aria-hidden="true"/>
              <span><strong>Enter your referral code to join.</strong> Ask the member who invited you for their code. Until a moderator approves you, you can browse jobs.</span>
              <input aria-label="Referral code" placeholder="EPH-XXXXXX" maxLength={10} required value={codeInput} onChange={e => setCodeInput(e.target.value)}/>
              <button className="primary-button" type="submit">Send code</button>
            </form>
          ))}

        {staffNav.length > 1 && staffNav.some(n => n.id === page) && (
          <nav className="tab-list work-tabs" aria-label="Your work">
            {staffNav.map(n => (
              <button key={n.id} type="button" className={page === n.id ? 'active' : ''} aria-current={page === n.id ? 'page' : undefined} onClick={() => go(n.id)}>
                {n.label}{navCount(n.id) > 0 && <span className="tab-count">{navCount(n.id)}</span>}
              </button>
            ))}
          </nav>
        )}

        {banner && (
          <div className="toast-banner" role="status">
            <CheckCircle2 size={18}/>
            <span>{banner}</span>
            <button aria-label="Dismiss notification" onClick={() => setBanner(null)}><X size={16}/></button>
          </div>
        )}

        {page === 'home' && <>
          <section className="hero-stage">
            <img className="stage-bg" src="/images/community.webp" fetchpriority="high" alt="" width="1200" height="896"/>
            <div className="hero-inner">
              <div className="hero-copy">
                <div className="hero-chips">
                  <p className="glass-chip"><span className="status-dot"/> A private job board for UAE church communities</p>
                  <p className="free-chip"><HeartHandshake size={16} aria-hidden="true"/> Free for everyone, always</p>
                </div>
                <h1>Find work through people who <em>know you.</em></h1>
                <p className="hero-lede">Every job here has been checked with the employer. Every member is vouched for by their church. Nobody will ask you for money.</p>
                <form className="hero-search" role="search" onSubmit={e => { e.preventDefault(); document.getElementById('opp-list')?.scrollIntoView({ behavior: 'smooth' }) }}>
                  <label className="hs-field">
                    <Search size={18}/>
                    <span className="sr-only">Job title, company or skill</span>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Job title, company or skill"/>
                  </label>
                  <label className="hs-field hs-select">
                    <MapPin size={18}/>
                    <span className="sr-only">Emirate</span>
                    <select value={emirate} onChange={e => setEmirate(e.target.value)}>
                      {['All emirates', ...EMIRATES].map(x => <option key={x}>{x}</option>)}
                    </select>
                  </label>
                  <button className="hero-button" type="submit"><Search size={17}/> Search jobs</button>
                </form>
                <button className="glass-link" onClick={() => go('career')}>Get free help with your CV <ArrowRight size={16}/></button>
              </div>
              <div className="hero-float">
                <div className="glass-card float-card">
                  <span className="float-icon"><ShieldCheck size={22}/></span>
                  <div>
                    <strong>{board.length} jobs open</strong>
                    <small>Every one checked with the employer</small>
                  </div>
                </div>
                <ul className="glass-card float-list" aria-label="What we check">
                  <li><BadgeCheck size={18}/> Members vouched for by their church</li>
                  <li><LockKeyhole size={18}/> Fee requests blocked automatically</li>
                  <li><Clock3 size={18}/> Posts expire after 30 days</li>
                </ul>
              </div>
            </div>
          </section>

          <ul className="stat-row" aria-label="At a glance">
            <li className="stat featured"><b>{board.length}</b><span>Jobs open right now</span></li>
            <li className="stat"><b>100%</b><span>Checked with the employer</span></li>
            <li className="stat"><b>AED 0</b><span>Free for everyone, always</span></li>
            <li className="stat"><b>30 days</b><span>Longest a post can stay up</span></li>
          </ul>
          <VerseCard/>

          <section id="opp-list" className="opportunity-section">
            <SectionTitle title="Verified UAE opportunities" subtitle="Apply directly to employers · every post expires after 30 days"/>
            {jobFeed}
          </section>
          <section className="why-stage">
            <img className="stage-bg" src="/images/workday.webp" loading="lazy" decoding="async" alt="" width="896" height="1200"/>
            <div className="why-inner">
              <div className="why-head">
                <p className="glass-chip">Three checks, every time</p>
                <h2>Why not just use a Facebook group?</h2>
                <p className="why-intro">Because anyone can post in a Facebook group, and some of them are not who they say they are. Here, three things have to be true first.</p>
              </div>
              <ol className="why-cards">
                {TRUST_PILLARS.map(p => (
                  <li key={p.num} className="glass-card why-card">
                    <span className="why-num">{p.num}</span>
                    <h3>{p.title}</h3>
                    <p>{p.desc}</p>
                    <small>{p.legalNote}</small>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="support-stage">
            <div className="support-copy">
              <p className="eyebrow">Free volunteer support</p>
              <h2>Someone to sit down with you and fix the CV.</h2>
              <p>Volunteers from HR and hiring teams give a free CV review, a practice interview, or a LinkedIn tidy-up. It is the part a Facebook group will never do for you.</p>
              <button className="primary-button" onClick={() => go('career')}>Get career support <ArrowRight size={16}/></button>
            </div>
            <figure className="support-photo">
              <img src="/images/mentor.webp" loading="lazy" decoding="async" alt="A volunteer mentor marking up a printed CV with a young job seeker" width="1200" height="896"/>
              <figcaption className="glass-card float-badge"><FileText size={18}/> CV review · Mock interview · LinkedIn</figcaption>
            </figure>
          </section>
        </>}

        {page === 'opportunities' && <>
          <section className="opportunity-section">
            <PageHeading eyebrow="Checked with every employer" title="Jobs"/>
            {jobFeed}
          </section>
        </>}

        {page === 'career' && <>
          <PageHeading
            eyebrow="Career support"
            title="Get ready for the job, not just the search"
            desc="Free help from volunteer HR professionals and hiring managers."
            action={
              <button className="primary-button" onClick={() => openSession('cv-review')}>
                <Calendar size={16}/> Request a session
              </button>
            }
          />
          <div className="service-grid">
            {CAREER_SUPPORT_MODULES.map(mod => (
              <article className="service-card" key={mod.id}>
                <div className="service-intro">
                  <p className="service-format">{mod.badge}</p>
                  <h3>{mod.title}</h3>
                  <p className="service-summary">{mod.summary}</p>
                </div>
                <div className="service-covered">
                  <p className="service-label">What's covered</p>
                  <ul>
                    {mod.highlights.map(h => <li key={h}><Check size={16}/>{h}</li>)}
                  </ul>
                </div>
                <footer className="service-foot">
                  <span className="service-time"><Clock3 size={15}/> {mod.turnaround}</span>
                  <button
                    className="secondary-button"
                    aria-label={`Book ${mod.title}`}
                    onClick={() => openSession(mod.id)}
                  >
                    Request this session <ArrowRight size={16}/>
                  </button>
                </footer>
              </article>
            ))}
          </div>

          {mySupport.length > 0 && (
            <div className="plain-card stack-gap">
              <h3>Your session requests</h3>
              {mySupport.map(r => (
                <div className="mini-row" key={r.id}>
                  <HandHeart size={19}/>
                  <div>
                    <strong>{CAREER_SUPPORT_MODULES.find(m => m.id === r.service)?.title}</strong>
                    <small>{{ open: 'Waiting for a volunteer mentor', taken: 'A volunteer mentor has picked this up and will email you', done: 'Completed', cancelled: 'Cancelled' }[r.status]} · {r.preferred_time}</small>
                  </div>
                  {['open', 'taken'].includes(r.status)
                    ? <button type="button" className="outline-small" onClick={() => cancelSupport(r)}>Cancel</button>
                    : <Pill type="subtle">{r.status === 'done' ? 'Done' : 'Cancelled'}</Pill>}
                </div>
              ))}
            </div>
          )}

          <div className="plain-card">
            <div className="cta-row">
              <div className="feature-icon"><HandHeart size={24}/></div>
              <div className="cta-row-body">
                <h3>Are you an HR professional or hiring manager?</h3>
                <p>
                  Give 1–2 hours a month to review CVs, conduct mock interviews, or advise community job seekers. Help someone take their next confident step.
                </p>
              </div>
              <button className="secondary-button" onClick={() => applyFor('volunteer')}>
                Volunteer with us <ArrowRight size={14}/>
              </button>
            </div>
          </div>
          <div className="spacer-24"/>
          <Warning>
            Volunteer support is 100% free and confidential. Ephworks volunteers provide coaching and feedback, but never charge fees or guarantee placement.
          </Warning>
        </>}

        {page === 'interests' && <>
          <PageHeading eyebrow="Your jobs" title="Saved" desc="Jobs you're interested in, saved or marked as applied."/>
          {savedLists.some(l => l.jobs.length) ? savedLists.filter(l => l.jobs.length).map(l => (
            <section key={l.title} className="saved-section">
              <SectionTitle title={l.title} subtitle={l.note}/>
              <div className="job-list">
                {l.jobs.map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    saved={demo.saved.includes(job.id)}
                    tracked={demo.tracked.includes(job.id)}
                    onSave={() => toggleSave(job.id)}
                    onOpen={() => setSelectedJob(job)}
                    interested={interestedIds.includes(job.id)}
                    onInterest={() => toggleInterest(job.id)}
                    onLearn={() => go('jobReview')}
                  />
                ))}
              </div>
            </section>
          )) : (
            <Empty icon={Heart} title="Nothing saved yet" description="Tap I'm interested or the bookmark on any job and it shows up here."
              action={<button type="button" className="primary-button" onClick={() => go('opportunities')}>Browse jobs <ArrowRight size={16}/></button>}/>
          )}
        </>}

        {page === 'post' && <div className="page-narrow">
          <PageHeading
            eyebrow="For employers"
            title="Post a job"
            desc="Every post is checked with the employer before it goes live. Posting is free, always."
          />
          {supabase && profile.suspended ? <Empty icon={Ban} title="Paused on your account" description="This is switched off while your account is suspended."/> : <>
          <div className="wizard">
            <div className="wizard-progress" aria-hidden="true"><span style={{ width: `${(stepIndex + 1) / wizardSteps.length * 100}%` }}/></div>
            <ol className="wizard-steps">
              {wizardSteps.map((st, i) => (
                <li key={st.key} className={i === stepIndex ? 'current' : i < stepIndex ? 'done' : ''} aria-current={i === stepIndex ? 'step' : undefined}>
                  <button type="button" disabled={i > stepIndex} onClick={() => goStep(i)}>
                    <b>{i < stepIndex ? <Check size={13}/> : i + 1}</b>{st.label}
                  </button>
                </li>
              ))}
            </ol>
            <p className="wizard-count">Step {stepIndex + 1} of {wizardSteps.length} · {step.label}</p>

            {step.key === 'church' && <>
              <section className="plain-card vouch-panel" aria-labelledby="vouch-title">
                <div className="cta-row">
                  <div className="feature-icon"><UsersRound size={22}/></div>
                  <div className="cta-row-body">
                    <h3 id="vouch-title">Church membership verification</h3>
                    <p>
                      {!myVouch ? 'Before anything you post can go live, your partner church confirms you are known to the community. Only a yes/no is stored, never belief or denomination data.'
                        : myVouch.status === 'pending' ? `Waiting for ${myVouch.church} to confirm you. You can still write posts; they stay unpublished until then. Picked the wrong church? Send the request again below.`
                        : myVouch.status === 'vouched' ? `${myVouch.church} has vouched for you. Your posts now go straight to a moderator, who checks them with the employer.`
                        : `${myVouch.church} could not confirm you. Check you chose the right church, add a note, and ask again.`}
                    </p>
                  </div>
                  <span className={`status-chip ${myVouch ? myVouch?.status === 'vouched' ? 'ok' : myVouch?.status === 'declined' ? 'bad' : 'pending' : 'pending'}`}>{myVouch ? VOUCH_STATUS[myVouch.status] : 'Not requested'}</span>
                </div>
                {myVouch?.status !== 'vouched' && (
                  <form className="booking-form vouch-form" onSubmit={requestVouch}>
                    <ChurchPicker label="Your church" churches={churches} value={vouchForm.church} onChange={church => setVouchForm({ ...vouchForm, church })}/>
                    <label>
                      Note for your church admin (optional)
                      <input maxLength={300} placeholder="e.g. How the admin knows you and the company you hire for" value={vouchForm.note} onChange={e => setVouchForm({ ...vouchForm, note: e.target.value })}/>
                    </label>
                    {mySuggestions.map(c => <p key={c.id} className="audit-line waiting"><Clock3 size={14}/> We're checking {c.name} ({c.emirate}). You can ask them to vouch once it's added.</p>)}
                    <button className="primary-button" type="submit"><Send size={16}/> {vouchForm.church.id || !vouchForm.church.name.trim() ? (myVouch ? 'Send request again' : 'Request church vouch') : 'Suggest this church'}</button>
                  </form>
                )}
              </section>
              <p className="wizard-hint">You can keep writing while you wait. Your post stays unpublished until your church vouches for you.</p>
            </>}

            {step.key !== 'church' && (
              <form className="form-panel post-form" onSubmit={e => { e.preventDefault(); step.key === 'preview' ? submitDraft(e) : nextStep() }} noValidate>
                {step.key === 'job' && <>
                  <h2 className="wizard-title">What's the job?</h2>
                  <label>
                    Job title
                    <input maxLength={95} placeholder="e.g. Office Coordinator" value={draftForm.title} onChange={e => setDraft({ title: e.target.value })}/>
                  </label>
                  <label>
                    Company name
                    <input maxLength={95} placeholder="e.g. Cedar Lane Services" value={draftForm.company} onChange={e => setDraft({ company: e.target.value })}/>
                  </label>
                  <div className="form-two form-three">
                    <label>
                      Emirate
                      <select value={draftForm.emirate} onChange={e => setDraft({ emirate: e.target.value })}>
                        {EMIRATES.map(x => <option key={x}>{x}</option>)}
                      </select>
                    </label>
                    <label>
                      Work type
                      <select value={draftForm.type} onChange={e => setDraft({ type: e.target.value })}>
                        {WORK_TYPES.map(x => <option key={x}>{x}</option>)}
                      </select>
                    </label>
                    <label>
                      Work setting
                      <select value={draftForm.mode} onChange={e => setDraft({ mode: e.target.value })}>
                        {WORK_SETTINGS.map(x => <option key={x}>{x}</option>)}
                      </select>
                    </label>
                  </div>
                </>}

                {step.key === 'pay' && <>
                  <h2 className="wizard-title">What does it pay?</h2>
                  <div className="form-two">
                    <label>
                      Monthly pay from (AED)
                      <input type="number" inputMode="numeric" min={1} max={999999} placeholder="5000" value={draftForm.payFrom} onChange={e => setDraft({ payFrom: e.target.value })}/>
                    </label>
                    <label>
                      Up to (AED, optional)
                      <input type="number" inputMode="numeric" min={1} max={999999} placeholder="7000" value={draftForm.payTo} onChange={e => setDraft({ payTo: e.target.value })}/>
                    </label>
                  </div>
                  {draftSalary && <p className="wizard-hint">Shown as <strong>{draftSalary} per month</strong>.</p>}
                  <p className="law-notice"><ShieldCheck size={15}/> Candidates are never charged anything: no fees, deposits or visa costs. It's the law in the UAE.</p>
                </>}

                {step.key === 'description' && <>
                  <h2 className="wizard-title">Describe the job</h2>
                  <label>
                    What the job involves
                    <textarea rows={7} maxLength={1600} placeholder="Day-to-day tasks, who they'd work with, hours, and what you're looking for." value={draftForm.description} onChange={e => setDraft({ description: e.target.value })}/>
                  </label>
                  <small className="wizard-hint">{draftForm.description.length} / 1600</small>
                  {draftScan.blocked.length > 0 && (
                    <div className="auto-block-box">
                      <ShieldAlert size={22}/>
                      <div><strong>Remove fee wording: {draftScan.blocked.join(', ')}</strong>Charging candidates any fee, deposit or visa cost is illegal in the UAE, so posts that mention it are blocked.</div>
                    </div>
                  )}
                  {draftScan.flags.length > 0 && <Warning tone="strong">A moderator will check these with the employer before publishing: {draftScan.flags.join('; ')}.</Warning>}
                </>}

                {step.key === 'apply' && <>
                  <h2 className="wizard-title">How do people apply?</h2>
                  <p className="wizard-hint">Candidates apply to you directly. Ephworks never sees or stores their CVs.</p>
                  <label>
                    Application email
                    <input type="email" maxLength={254} placeholder="careers@company.ae" value={draftForm.email} onChange={e => setDraft({ email: e.target.value })}/>
                  </label>
                  <label>
                    Careers page (optional)
                    <input type="url" maxLength={500} placeholder="https://company.ae/careers" value={draftForm.portal} onChange={e => setDraft({ portal: e.target.value })}/>
                  </label>
                </>}

                {step.key === 'preview' && <>
                  <h2 className="wizard-title">Check your post</h2>
                  <p className="wizard-hint">This is how job seekers will see it.</p>
                  <div className="wizard-preview">
                    <JobCard job={previewJob} saved={false} tracked={false} interested={false} onSave={() => {}} onOpen={() => {}} onInterest={() => {}}/>
                  </div>
                  <dl className="wizard-summary">
                    {[
                      ['The job', `${draftForm.title} · ${draftForm.company} · ${draftForm.emirate} · ${draftForm.type} · ${draftForm.mode}`, 'job'],
                      ['Pay', `${draftSalary} per month`, 'pay'],
                      ['Description', draftForm.description, 'description'],
                      ['Apply via', [draftForm.email, draftForm.portal].filter(Boolean).join(' · '), 'apply']
                    ].map(([label, value, key]) => (
                      <div key={key}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                        <button type="button" className="link-button" onClick={() => goStep(wizardSteps.findIndex(st => st.key === key))}>Edit</button>
                      </div>
                    ))}
                  </dl>
                  {draftScan.flags.length > 0 && <Warning tone="strong">A moderator will check these with the employer before publishing: {draftScan.flags.join('; ')}.</Warning>}
                  <PostTracker vouch={myVouch?.status} status="draft"/>
                  <p className="wizard-hint">By submitting, you agree to our <button type="button" className="link-button" onClick={() => go('standards')}>community standards</button>.</p>
                </>}

                {stepTried && stepProblem(step.key) && <p className="wizard-error" role="alert">{stepProblem(step.key)}</p>}

                <div className="wizard-nav">
                  {stepIndex > 0 && <button type="button" className="secondary-button" onClick={() => goStep(stepIndex - 1)}><ArrowLeft size={16}/> Back</button>}
                  <button type="submit" className="primary-button" disabled={step.key === 'preview' && draftScan.blocked.length > 0}>
                    {step.key === 'preview' ? <><Send size={16}/> Submit for checking</> : <>Next <ArrowRight size={16}/></>}
                  </button>
                </div>
                <small className="wizard-saved">Your draft is saved on this device as you go.</small>
              </form>
            )}

            {step.key === 'church' && (
              <div className="wizard-nav">
                <button type="button" className="primary-button" onClick={() => goStep(1)}>Continue to the job <ArrowRight size={16}/></button>
              </div>
            )}
          </div>
          </>}
        </div>}

        {page === 'drafts' && <>
          <PageHeading
            eyebrow={isEmployer ? `Employer · vouched by ${myVouch.church}` : 'For employers'}
            title={isEmployer ? 'Employer dashboard' : 'My posts'}
            desc={isEmployer ? 'Your posts, who is interested and what needs doing.' : 'Each post goes live once your church has vouched for you and a moderator has checked it with the employer.'}
            action={<button className="primary-button" onClick={() => go('post')}><Plus size={17}/> Post a job</button>}
          />
          {isEmployer && <VerseCard/>}
          {isEmployer && (
            <div className="info-cards dash-tiles" style={{ '--cols': 4 }}>
              {[
                [CheckCircle2, 'Live posts', myPosts.filter(p => p.status === 'published' && p.daysLeft > 0).length, 'On the board now'],
                [Clock3, 'Waiting for a check', myPosts.filter(p => p.status === 'pending').length, 'A moderator contacts you'],
                [Heart, 'People interested', myPosts.reduce((sum, p) => sum + interestCount(p), 0), 'Counts only, never names'],
                [AlertTriangle, 'Ending this week', myPosts.filter(p => p.status === 'published' && p.daysLeft > 0 && p.daysLeft <= 7).length, 'Post again if still open']
              ].map(([Icon, label, n, sub]) => (
                <div key={label} className={`plain-card dash-tile static ${n > 0 && label === 'Ending this week' ? 'waiting' : ''}`}>
                  <span className="feature-icon"><Icon size={22} aria-hidden="true"/></span>
                  <b>{n}</b>
                  <strong>{label}</strong>
                  <small>{sub}</small>
                </div>
              ))}
            </div>
          )}
          {isEmployer && myPosts.length > 0 && <SectionTitle title="Your posts"/>}
          {supabase && !session ? (
            <Empty icon={KeyRound} title="Sign in to see your posts" description="Use the Sign in link at the top of the page. Your posts and their verification status appear here."/>
          ) : myPosts.length ? (
            <div className="job-list">
              {myPosts.map(d => (
                <div className="draft-card" key={d.id}>
                  <div>
                    <h3>{d.title}</h3>
                    <p>{d.company} · {d.emirate} · {d.type} · {d.mode}</p>
                    <small>{d.salary} / month</small>
                    <div className="draft-desc">{d.description}</div>
                    {d.status === 'published' && (
                      <div className="audit-line">
                        <Heart size={14}/>
                        {interestCount(d)} {interestCount(d) === 1 ? 'person' : 'people'} interested · names are never shared
                      </div>
                    )}
                    {d.status === 'rejected' && d.rejectReason && (
                      <div className="audit-line"><AlertTriangle size={14}/> Not approved: {REJECT_REASONS[d.rejectReason]}{d.rejectNote ? `. ${d.rejectNote}` : ''}</div>
                    )}
                    {d.status === 'filled' && (
                      <div className="audit-line"><CheckCircle2 size={14}/> Filled{d.filledAt ? ` on ${new Date(d.filledAt).toLocaleDateString()}` : ''} · off the board. To hire again, post it again.</div>
                    )}
                    <PostTracker vouch={myVouch?.status} status={d.status} daysLeft={d.daysLeft}/>
                  </div>
                  <div className="draft-actions">
                    {d.status === 'published' && d.daysLeft > 0 && (
                      <button className="primary-button" onClick={() => markFilled(d)}><CheckCircle2 size={16}/> Mark as hired</button>
                    )}
                    <button className="secondary-button" onClick={() => setRemoving(d)}>
                      Remove post
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : <Empty icon={FileText} title="No posts yet" description="Post a job in a few short steps. It's free, always." action={<button type="button" className="primary-button" onClick={() => go('post')}><Plus size={16}/> Post a job</button>}/>}
        </>}

        {page === 'dashboard' && <>
          <PageHeading eyebrow={workLabel} title={`${ROLE_LABELS[accountRole]} dashboard`} desc="Everything waiting for you, in one place."/>
          <VerseCard/>
          <div className="info-cards dash-tiles" style={{ '--cols': 3 }}>
            {[
              canModerate && ['review', ClipboardCheck, 'Posts to review', queue.length, 'Check each one with the employer'],
              canModerate && ['joining', UserPlus, 'Waiting to join', pendingMembers.length, 'Check who invited them'],
              isAdmin && ['applications', BadgeCheck, 'Role applications', pendingApplications, 'Volunteers and church admins'],
              isAdmin && ['churchRequests', HeartHandshake, 'Church requests', pendingChurchRequests, 'Churches members want added'],
              canModerate && ['inbox', Mail, 'New messages', openMessages, isAdmin ? 'From the contact form' : 'Safety concerns sent to the team'],
              canModerate && ['reports', Flag, 'Open safety reports', reportRows.filter(r => !r.resolved).length, 'Follow up within 24 hours'],
              isAdmin && ['people', UsersRound, 'Members', members.length, `${members.filter(m => m.suspended).length} suspended · ${members.filter(m => !['member', 'volunteer'].includes(m.role)).length} staff`],
              isChurchAdmin && ['vouch', UsersRound, 'Vouch requests', pendingVouches, adminChurch || 'Your church'],
              isVolunteer && ['mentoring', HandHeart, 'Open session requests', openMentorRequests, 'Members waiting for a mentor'],
              isVolunteer && ['mentoring', CheckCircle2, 'Sessions you took', mentorQueue.filter(r => r.mine && r.status === 'taken').length, 'Email them to arrange a time'],
              isCarer && ['carerQueue', HandHeart, 'Open requests', openCareRequests, churchName(carerChurch) || 'Your church'],
              isCarer && ['carerQueue', CheckCircle2, 'Requests you took', carerQueue.filter(r => r.mine).length, 'Keep what you hear confidential']
            ].filter(Boolean).map(([id, Icon, label, n, sub]) => (
              <button key={label} type="button" className={`plain-card dash-tile ${n > 0 && id !== 'people' ? 'waiting' : ''}`} onClick={() => go(id)}>
                <span className="feature-icon"><Icon size={22} aria-hidden="true"/></span>
                <b>{n}</b>
                <strong>{label}</strong>
                <small>{sub}</small>
                <span className="dash-open">Open <ArrowRight size={15}/></span>
              </button>
            ))}
          </div>
        </>}

        {page === 'mentoring' && <>
          <PageHeading eyebrow="Volunteer" title="Session requests" desc="Members asking for a CV review, practice interview or LinkedIn help. Take one, then email them to arrange a time."/>
          {mentorQueue.length ? (
            <div className="review-list">
              {[...mentorQueue].sort((a, b) => b.mine - a.mine).map(r => (
                <QueueCard
                  key={r.id}
                  avatar={<div className="company-icon sage">{r.display_name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')}</div>}
                  title={`${CAREER_SUPPORT_MODULES.find(m => m.id === r.service)?.title} · ${r.display_name}`}
                  status={r.mine ? 'Yours' : 'Open'}
                  tone={r.mine ? 'ok' : 'pending'}
                  sub={[r.preferred_time, new Date(r.created_at).toLocaleDateString()].join(' · ')}
                  note={r.note}
                  footNote={r.mine ? <><Mail size={15}/> {r.email}</> : <><LockKeyhole size={15}/> Email shown once you take it</>}
                >
                  {r.mine ? <>
                    <button type="button" className="reject-small" onClick={() => finishSupport(r, false)}>Hand back</button>
                    <a className="outline-small" href={`mailto:${r.email}?subject=${encodeURIComponent(`Your ${SITE_NAME} career support request`)}`}><Mail size={15}/> Email</a>
                    <button type="button" className="approve-small" onClick={() => setFinishing({ request: r, comment: '' })}><Check size={15}/> Done</button>
                  </> : <button type="button" className="approve-small" onClick={() => takeSupport(r)}><HandHeart size={15}/> I'll take this</button>}
                </QueueCard>
              ))}
            </div>
          ) : <Empty icon={HandHeart} title="No requests right now" description="When a member asks for career support, it shows up here for you to take."/>}
        </>}

        {page === 'joining' && <>
          <PageHeading eyebrow={workLabel} title="New members" desc="People asking to join. Approve someone only once the member who invited them confirms they know them."/>
          {pendingMembers.length ? (
            <div className="review-list">
              {pendingMembers.map(m => (
                <QueueCard
                  key={m.id}
                  avatar={<div className="company-icon blue">{m.name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')}</div>}
                  title={m.name}
                  status={m.invited_by ? 'Waiting' : 'No code yet'}
                  tone="pending"
                  sub={[m.email, m.phone, `Asked ${new Date(m.joined).toLocaleDateString()}`].filter(Boolean).join(' · ')}
                  note={m.invited_by && `Invited by ${m.invited_by}${m.invited_by_email ? ` (${m.invited_by_email})` : ''}`}
                  footNote={!m.invited_by && <><LockKeyhole size={15}/> They need a member’s referral code before you can approve them</>}
                >
                  <button type="button" className="reject-small" onClick={() => decideMember(m, false)}><X size={15}/> Decline</button>
                  <button type="button" className="approve-small" disabled={!m.invited_by} onClick={() => decideMember(m, true)}><Check size={15}/> Approve</button>
                </QueueCard>
              ))}
            </div>
          ) : <Empty icon={UserPlus} title="Nobody waiting" description="When someone signs up with a referral code, they appear here for you to approve."/>}
          {isAdmin && <>
            <div className="spacer-24"/>
            <SectionTitle title="Everyone who joined" subtitle="Who invited each member, and which moderator or admin let them in"/>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th scope="col">Member</th><th scope="col">Invited by</th><th scope="col">Approved or declined by</th><th scope="col">Status</th><th scope="col">Joined</th></tr></thead>
                <tbody>
                  {joinedMembers.map(m => (
                    <tr key={m.id}>
                      <td><strong>{m.name}</strong><small>{m.email}</small></td>
                      <td>{m.invited_by || <span className="muted">{m.status === 'approved' ? 'Before referral codes' : 'No code given'}</span>}</td>
                      <td>{m.decided_by ? <>{m.decided_by}<small>{ROLE_LABELS[m.decided_by_role]}</small></> : <span className="muted">—</span>}</td>
                      <td><span className={`status-chip ${m.status === 'approved' ? 'ok' : m.status === 'declined' ? 'bad' : 'pending'}`}>{APP_STATUS[m.status]}</span></td>
                      <td>{new Date(m.joined).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>}
        </>}

        {page === 'carerQueue' && <>
          <PageHeading eyebrow="Pastoral care" title="Pastoral requests" desc={`Members of ${churchName(carerChurch) || 'your church'}, and members of other churches who asked for a carer outside their own, asking for prayer or someone to talk to. Keep what you hear confidential, and never connect it to jobs or vouching.`}/>
          {carerQueue.length ? (
            <div className="review-list">
              {[...carerQueue].sort((a, b) => b.mine - a.mine).map(r => (
                <QueueCard
                  key={r.id}
                  avatar={<div className="company-icon rose">{r.display_name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')}</div>}
                  title={`${CARE_KINDS[r.kind]} · ${r.display_name}`}
                  status={r.mine ? 'Yours' : 'Open'}
                  tone={r.mine ? 'ok' : 'pending'}
                  sub={`${r.share_with === 'other_church' ? 'From another church' : 'From your church'} · ${new Date(r.created_at).toLocaleDateString()}`}
                  note={r.note}
                  footNote={r.mine ? <><Mail size={15}/> {r.email}</> : <><LockKeyhole size={15}/> Email shown once you take it</>}
                >
                  {r.mine ? <>
                    <button type="button" className="reject-small" onClick={() => finishCare(r, false)}>Hand back</button>
                    <a className="outline-small" href={`mailto:${r.email}`}><Mail size={15}/> Email</a>
                    <button type="button" className="approve-small" onClick={() => finishCare(r, true)}><Check size={15}/> Close</button>
                  </> : <button type="button" className="approve-small" onClick={() => takeCare(r)}><HandHeart size={15}/> I'll take this</button>}
                </QueueCard>
              ))}
            </div>
          ) : <Empty icon={HandHeart} title="No requests right now" description="New requests for pastoral care show up here."/>}
        </>}
        {page === 'unsubscribe' && <div className="page-narrow">
          <PageHeading
            eyebrow="Job alert emails"
            title={unsubscribed === null ? 'Unsubscribing…' : unsubscribed ? 'You’re unsubscribed' : 'This link didn’t work'}
            desc={unsubscribed === null ? '' : unsubscribed
              ? 'You won’t get job alert emails any more. Matching jobs still show in the app, and you can switch the emails back on in your profile.'
              : 'It may have been copied only in part. You can switch job alert emails off on your profile instead.'}
          />
          {unsubscribed !== null && (
            <div className="info-cta">
              <button type="button" className="primary-button" onClick={() => go('profile')}>Go to your profile <ArrowRight size={16}/></button>
              <button type="button" className="secondary-button" onClick={() => go('opportunities')}>Browse jobs</button>
            </div>
          )}
        </div>}

        {page === 'care' && <div className="page-narrow">
          <PageHeading eyebrow="Pastoral care" title="Someone to pray with you" desc="Ask for prayer or someone to talk to. You choose who sees your request: a pastoral carer at your own church, or one at another partner church."/>
          <VerseCard/>
          <ul className="care-promises">
            <li><LockKeyhole size={18} aria-hidden="true"/><span><strong>Confidential.</strong> Only the pastoral carers you choose can see your request. Employers, moderators and admins never do.</span></li>
            <li><ShieldCheck size={18} aria-hidden="true"/><span><strong>Separate from jobs.</strong> Asking, or not asking, never affects the jobs you see, your church vouch or your posts.</span></li>
            <li><X size={18} aria-hidden="true"/><span><strong>Yours to delete.</strong> Delete a request at any time and it is erased, not hidden.</span></li>
          </ul>
          {supabase && profile.suspended ? <Empty icon={Ban} title="Paused on your account" description="This is switched off while your account is suspended."/> : (
            <form className="form-panel booking-form" onSubmit={askForCare}>
              <label>
                Your church
                <select required value={careForm.church} onChange={e => setCareForm({ ...careForm, church: e.target.value, consent: false })}>
                  <option value="">Choose your church</option>
                  {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label>
                Your name
                <input maxLength={80} placeholder={account.guest ? 'Full name' : account.name} value={careForm.name} onChange={e => setCareForm({ ...careForm, name: e.target.value })}/>
              </label>
              <label>
                What would help?
                <select value={careForm.kind} onChange={e => setCareForm({ ...careForm, kind: e.target.value })}>
                  {Object.entries(CARE_KINDS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </label>
              <label>
                Anything you’d like them to know (optional)
                <textarea rows={3} maxLength={500} placeholder="Share only what you’re comfortable with." value={careForm.note} onChange={e => setCareForm({ ...careForm, note: e.target.value })}/>
              </label>
              <fieldset className="apply-roles care-sharing">
                <legend>Who should see your request?</legend>
                {Object.entries(CARE_SHARING).map(([key, label]) => {
                  const noCarer = careAvailable?.[key] === false
                  return (
                    <label key={key} className={`apply-role ${careForm.shareWith === key ? 'selected' : ''} ${noCarer ? 'unavailable' : ''}`}>
                      <input type="radio" name="care-share" value={key} disabled={noCarer} checked={careForm.shareWith === key} onChange={() => setCareForm({ ...careForm, shareWith: key, consent: false })}/>
                      <strong>{label}</strong>
                      <span>{CARE_SHARING_HINTS[key]}</span>
                      {noCarer && <small className="care-none">No carer available here yet</small>}
                    </label>
                  )
                })}
                <p className="care-sharing-note">You can’t change this after sending. You can delete the request and send a new one at any time.</p>
              </fieldset>
               <label className="check-label">
                <input type="checkbox" checked={careForm.consent} onChange={e => setCareForm({ ...careForm, consent: e.target.checked })}/>
                <span>A pastoral carer {careForm.shareWith === 'other_church' ? 'from another partner church' : 'from my church'} may email me at my sign-in address. Only they will see it.</span>
              </label>
              <button className="primary-button" type="submit" disabled={!careForm.consent || !careForm.church || careAvailable?.[careForm.shareWith] === false}><Send size={16}/> Send request</button>
            </form>
          )}
          {myCare.length > 0 && (
            <div className="plain-card stack-gap care-mine">
              <h3>Your requests</h3>
              {myCare.map(r => (
                <div className="mini-row" key={r.id}>
                  <HandHeart size={19}/>
                  <div>
                    <strong>{CARE_KINDS[r.kind]} · {churchName(r.church_id)}</strong>
                    <small>{CARE_STATUS[r.status]} · Shared with {CARE_SHARING[r.share_with || 'own_church']} · {new Date(r.created_at).toLocaleDateString()}</small>
                  </div>
                  <button type="button" className="outline-small" onClick={() => deleteCare(r)}>Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>}

        {page === 'review' && <>
          <PageHeading
            eyebrow="Moderation"
            title="Review posts"
            desc="Check each post with the employer before it goes live. Posts asking candidates for money are blocked before they reach you."
          />
          <div className="rp">
            <div className="rp-head"><ShieldCheck size={16}/> Before a post goes live</div>
            <ol className="rp-steps rp-four">
              <li><b>1</b><span>Poster vouched by their church</span></li>
              <li><b>2</b><span>Fee and scam checks passed</span></li>
              <li><b>3</b><span>Checked with the employer</span></li>
              <li><b>4</b><span>Live for 30 days</span></li>
            </ol>
          </div>

          {supabase && !session ? <Empty icon={KeyRound} title="Sign in to moderate" description="Sign in with a moderator account to see posts waiting for review."/>
          : queue.length ? (
            <div className="review-list">
              {queue.map(j => (
                <ReviewCard
                  key={j.id}
                  job={j}
                  vouched={posterVouched(j)}
                  scan={scanJob(j)}
                  onView={() => setSelectedJob(j)}
                  history={rejectionsFor(j)}
                  onReject={() => setRejecting({ job: j, reason: '', note: '' })}
                  onConfirm={() => setVerifying({ job: j, note: '', flagsChecked: false })}
                />
              ))}
            </div>
          ) : <Empty icon={ClipboardCheck} title="Queue is clear" description={supabase
            ? 'New posts appear here until a moderator has checked them with the employer.'
            : 'Post a sample job as a Member; it waits here after the church vouch.'}/>}
        </>}

        {page === 'reports' && <>
          <PageHeading
            eyebrow="Moderation"
            title="Safety reports"
            desc="Jobs members have reported. Follow up within 24 hours, then mark each one resolved."
          />
          {reportRows.length ? (
            <div className="job-list">
              {reportRows.map(r => {
                const resolved = r.resolved
                return (
                  <QueueCard
                    key={r.id}
                    avatar={<div className="feature-icon danger"><Flag size={20}/></div>}
                    title={r.title || 'Reported role'}
                    status={resolved ? 'Resolved' : 'Open'}
                    tone={resolved ? 'ok' : 'pending'}
                    sub={`Reason: ${r.reason}`}
                    footNote={<><Clock3 size={15}/> Submitted {r.created || 'just now'} · follow-up within 24h</>}
                  >
                    <button className="approve-small" disabled={resolved} onClick={() => markReport(r.id)}>
                      <Check size={15}/> {resolved ? 'Resolved' : 'Mark resolved'}
                    </button>
                  </QueueCard>
                )
              })}
            </div>
          ) : <Empty icon={Flag} title="No open safety reports" description="When a member reports a job, it appears here."/>}
        </>}

        {page === 'inbox' && <>
          <PageHeading
            eyebrow={workLabel}
            title="Inbox"
            desc={isAdmin ? 'Messages from the contact form. Reply by email, then mark each one handled.' : 'Safety concerns sent through the contact form. Reply by email within 24 hours, then mark each one handled.'}
          />
          {contactMessages.length ? (
            <div className="review-list">
              {[...contactMessages].sort((a, b) => (b.status === 'open') - (a.status === 'open')).map(m => (
                <ContactCard key={m.id} message={m} onHandled={setHandled} onDelete={deleteMessage}/>
              ))}
            </div>
          ) : <Empty icon={Mail} title="No messages" description="Messages sent through the Contact us page appear here."/>}
        </>}

        {infoPage && (
          <InfoPage
            page={infoPage}
            onGo={go}
            onAction={action => action.startsWith('contact:') ? openContact(action.slice(8)) : action.startsWith('apply:') ? applyFor(action.slice(6)) : go(action)}
            roles={SAMPLE_VOLUNTEER}
            contactForm={
              <form className="form-panel booking-form contact-form" onSubmit={sendContact}>
                <div className="form-two">
                  <label>
                    Your name
                    <input required minLength={2} maxLength={80} autoComplete="name" value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })}/>
                  </label>
                  <label>
                    Your email
                    <input type="email" required maxLength={254} autoComplete="email" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })}/>
                    <small>We reply to this address.</small>
                  </label>
                </div>
                <label>
                  What is it about?
                  <select value={contactForm.topic} onChange={e => setContactForm({ ...contactForm, topic: e.target.value })}>
                    {Object.entries(CONTACT_TOPICS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </label>
                {contactForm.topic === 'safety' && <Warning tone="strong">If you are in danger or have lost money, call the police on 999 first. To report a job, you can also open it and tap Report.</Warning>}
                <label>
                  Your message
                  <textarea required minLength={10} maxLength={2000} rows={6} value={contactForm.message} onChange={e => setContactForm({ ...contactForm, message: e.target.value })}/>
                  <small>{contactForm.message.length} / 2000</small>
                </label>
                <label className="trap-field" aria-hidden="true">
                  Leave this empty
                  <input tabIndex={-1} autoComplete="off" value={contactForm.website} onChange={e => setContactForm({ ...contactForm, website: e.target.value })}/>
                </label>
                <button className="primary-button" type="submit"><Send size={16}/> Send message</button>
                <p className="sign-in-note">We only use these details to reply to you. <button type="button" className="link-button" onClick={() => go('privacy')}>Privacy</button></p>
              </form>
            }
          />
        )}

        {page === 'apply' && <div className="page-narrow">
          <PageHeading
            eyebrow="Join the team"
            title={`Apply to help run ${SITE_NAME}`}
            desc="Every role is free and unpaid. An admin checks each application, usually with a short call. Moderators and pastoral carers are appointed by the team."
          />
          {supabase && profile.suspended ? <Empty icon={Ban} title="Paused on your account" description="This is switched off while your account is suspended."/> : (
          <form className="form-panel booking-form apply-form" onSubmit={submitApplication}>
            <fieldset className="apply-roles">
              <legend>Which role would you like?</legend>
              {APPLY_ROLES.map(([key, label, desc]) => (
                <label key={key} className={`apply-role ${applyForm.role === key ? 'selected' : ''}`}>
                  <input type="radio" name="apply-role" value={key} checked={applyForm.role === key} onChange={() => setApplyForm({ ...applyForm, role: key })}/>
                  <strong>{label}</strong>
                  <span>{desc}</span>
                </label>
              ))}
            </fieldset>
            {applyForm.role === 'church_admin' && (
              <ChurchPicker label="Your church" churches={churches} value={applyForm.church} onChange={church => setApplyForm({ ...applyForm, church })}/>
            )}
            <label>
              Your name
              <input maxLength={80} placeholder={account.guest ? 'Full name' : account.name} value={applyForm.name} onChange={e => setApplyForm({ ...applyForm, name: e.target.value })}/>
            </label>
            <label>
              About you
              <textarea required rows={4} minLength={10} maxLength={600} placeholder="Your job or experience, and how people in the community know you." value={applyForm.note} onChange={e => setApplyForm({ ...applyForm, note: e.target.value })}/>
            </label>
            <label className="check-label">
              <input type="checkbox" required checked={applyForm.agreed} onChange={e => setApplyForm({ ...applyForm, agreed: e.target.checked })}/>
              <span>I agree to a short check before I'm approved, and I will never ask job seekers for money.</span>
            </label>
            <button className="primary-button" type="submit"><Send size={16}/> Send application</button>
          </form>
          )}
          {myApplications.length > 0 && <>
            <div className="spacer-24"/>
            <SectionTitle title="Your applications"/>
            <div className="review-list">
              {myApplications.map(a => (
                <QueueCard
                  key={a.id}
                  avatar={<div className="feature-icon"><BadgeCheck size={20}/></div>}
                  title={ROLE_LABELS[a.role]}
                  status={APP_STATUS[a.status]}
                  tone={a.status === 'approved' ? 'ok' : a.status === 'declined' ? 'bad' : 'pending'}
                  sub={[churchName(a.church_id) || suggestionFor(a.church_suggestion_id)?.name, `Sent ${new Date(a.created_at).toLocaleDateString()}`].filter(Boolean).join(' · ')}
                  note={a.note}
                />
              ))}
            </div>
          </>}
        </div>}

        {page === 'people' && <>
          <PageHeading
            eyebrow="Admin"
            title="People"
            desc={`Everyone with an ${SITE_NAME} account. Change roles, or suspend an account that breaks the rules. Only the super admin can appoint admins.`}
          />
          <ul className="people-stats">
            {[
              ['Accounts', members.length],
              ['Moderators', members.filter(m => m.role === 'moderator').length],
              ['Church admins', members.filter(m => m.role === 'church_admin').length],
              ['Volunteers', members.filter(m => m.role === 'volunteer').length],
              ['Suspended', members.filter(m => m.suspended).length]
            ].map(([label, n]) => <li key={label}><b>{n}</b><span>{label}</span></li>)}
          </ul>
          <div className="filters">
            <label className="search-box">
              <Search size={19}/>
              <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Search by name or email" aria-label="Search people"/>
            </label>
            <label className="select-box">
              <span>Show</span>
              <select value={memberFilter} onChange={e => setMemberFilter(e.target.value)}>
                <option value="all">Everyone</option>
                {Object.entries(ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                <option value="suspended">Suspended</option>
              </select>
            </label>
          </div>
          {supabase && !session ? <Empty icon={KeyRound} title="Sign in as an admin" description="Sign in with an admin account to manage people."/>
          : visibleMembers.length ? (
            <div className="review-list">
              {visibleMembers.map(m => (
                <MemberCard key={m.id} member={m} you={m.id === myId} churches={churches} canManage={canManage} onSave={saveRole} onSuspend={toggleSuspend}/>
              ))}
            </div>
          ) : <Empty icon={UsersRound} title="No one matches" description="Try a different name, email or role."/>}
        </>}

        {page === 'churchRequests' && <>
          <PageHeading
            eyebrow="Admin"
            title="Churches"
            desc="Partner churches members can choose, and churches members have asked to add."
          />
          <SectionTitle title="Partner churches" subtitle={`${churchOverview.length} ${churchOverview.length === 1 ? 'church' : 'churches'}`}/>
          <AddChurchForm onAdd={addChurch}/>
          <div className="review-list church-list">
            {churchOverview.map(c => <ChurchAdminCard key={c.id} church={c} onSave={saveChurch} onRemove={removeChurch}/>)}
          </div>
          <div className="spacer-24"/>
          <SectionTitle title="Requests from members" subtitle="Check each one is real, fix the spelling if needed, then add it."/>
          {supabase && !session ? <Empty icon={KeyRound} title="Sign in as an admin" description="Sign in with an admin account to review church requests."/>
          : churchSuggestions.length ? (
            <div className="review-list">
              {[...churchSuggestions].sort((a, b) => (b.status === 'pending') - (a.status === 'pending')).map(c => (
                <ChurchRequestCard key={c.id} suggestion={c} churches={churches} suggester={members.find(m => m.id === c.suggested_by)} onDecide={decideChurchSuggestion}/>
              ))}
            </div>
          ) : <Empty icon={HeartHandshake} title="No church requests" description="When a member types a church that isn't listed, it appears here for you to check and add."/>}
        </>}

        {page === 'applications' && <>
          <PageHeading
            eyebrow="Admin"
            title="Role applications"
            desc="People offering to help. Check each one, ideally with a short call, before approving: approval gives them the role straight away."
          />
          {supabase && !session ? <Empty icon={KeyRound} title="Sign in as an admin" description="Sign in with an admin account to review applications."/>
          : applications.length ? (
            <div className="review-list">
              {[...applications].sort((a, b) => (b.status === 'pending') - (a.status === 'pending')).map(a => {
                const applicant = members.find(m => m.id === a.user_id)
                const pending = a.status === 'pending'
                const newChurch = !a.church_id && suggestionFor(a.church_suggestion_id)
                const blocked = !applicant ? 'Account no longer exists'
                  : applicant.id === myId ? 'You can’t decide your own application'
                  : newChurch && newChurch.status !== 'approved' ? `Add ${newChurch.name} under Your work → Churches first`
                  : applicant.suspended ? 'Restore this account before deciding'
                  : !canManage(applicant, a.role) ? 'Only the super admin can decide this one' : null
                return (
                  <QueueCard
                    key={a.id}
                    avatar={<div className="company-icon blue">{a.display_name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')}</div>}
                    title={a.display_name}
                    status={APP_STATUS[a.status]}
                    tone={a.status === 'approved' ? 'ok' : a.status === 'declined' ? 'bad' : 'pending'}
                    sub={[`Wants to be ${ROLE_LABELS[a.role]}`, churchName(a.church_id || newChurch?.church_id) || (newChurch && `${newChurch.name} (new church)`), applicant?.email, new Date(a.created_at).toLocaleDateString()].filter(Boolean).join(' · ')}
                    note={a.note}
                    footNote={pending && blocked && <><LockKeyhole size={15}/> {blocked}</>}
                  >
                    {pending && !blocked && <>
                      <button className="reject-small" onClick={() => decideApplication(a, false)}><X size={15}/> Decline</button>
                      <button className="approve-small" onClick={() => decideApplication(a, true)}><Check size={15}/> Approve</button>
                    </>}
                  </QueueCard>
                )
              })}
            </div>
          ) : <Empty icon={BadgeCheck} title="No applications yet" description="When someone applies to volunteer or to be their church's admin, it appears here."/>}
        </>}

        {page === 'vouch' && <>
          <PageHeading
            eyebrow="Church admin"
            title="Vouch requests"
            desc="Members of your church asking you to confirm they are known to the community. Only vouch for people you know."
          />
          <div className="rp">
            <div className="rp-head"><ShieldCheck size={16}/> Your church: {supabase ? adminChurch : SAMPLE_CHURCHES[0].name}</div>
            <ol className="rp-steps rp-two">
              <li><b><ShieldCheck size={13}/></b><span>Only a yes or no is stored</span></li>
              <li><b><ShieldCheck size={13}/></b><span>Never faith or denomination</span></li>
            </ol>
          </div>

          {vouchRows.length ? (
            <div className="review-list">
              {vouchRows.map(m => {
                const vouched = m.status === 'vouched', declined = m.status === 'declined'
                return (
                  <QueueCard
                    key={m.id}
                    avatar={<div className="company-icon sage">{m.name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')}</div>}
                    title={m.name}
                    status={VOUCH_STATUS[m.status]}
                    tone={vouched ? 'ok' : declined ? 'bad' : 'pending'}
                    sub={`${m.church} · Requested ${m.requestedDate}`}
                    note={m.note}
                    footNote={<><LockKeyhole size={15}/> Stores a yes/no vouch only</>}
                  >
                    <button className="reject-small" disabled={declined} onClick={() => handleVouch(m.id, 'declined', vouched)}><X size={15}/> {vouched ? 'Withdraw vouch' : 'Decline'}</button>
                    <button className="approve-small" disabled={vouched} onClick={() => handleVouch(m.id, 'vouched')}>
                      <Check size={15}/> {vouched ? 'Vouched' : 'Vouch for member'}
                    </button>
                  </QueueCard>
                )
              })}
            </div>
          ) : <Empty icon={UsersRound} title="No vouch requests" description="When members of your church ask to be vouched for, they appear here."/>}
        </>}

        {page === 'profile' && <div className="page-narrow">
          <PageHeading eyebrow="Your account" title="Profile"/>
          {supabase && !session ? (
            <Empty icon={KeyRound} title="Sign in to see your profile" description="Your church vouch, posts and saved jobs show here once you sign in."
              action={<button type="button" className="primary-button" onClick={() => setShowSignIn(true)}>Sign in</button>}/>
          ) : (
            <div className="profile-card">
              <div className="profile-top">
                <Avatar account={account} className="big"/>
                <div>
                  <h2>{account.name}</h2>
                  <p>{account.detail}</p>
                </div>
                <span className={`status-chip ${supabase && profile.suspended ? 'bad' : joinStatus ? 'pending' : accountRole === 'member' ? 'neutral' : 'ok'}`}>
                  {supabase && profile.suspended ? 'Suspended' : joinStatus ? (joinStatus === 'declined' ? 'Not approved' : 'Waiting to join') : ROLE_LABELS[accountRole]}
                </span>
              </div>

              <div className="profile-vouch">
                <div>
                  <span>Church vouch</span>
                  {myVouch?.status === 'vouched'
                    ? <strong className="good-text"><Check size={15}/> Vouched by {myVouch.church}</strong>
                    : <strong>{myVouch ? `${VOUCH_STATUS[myVouch.status]} · ${myVouch.church}` : 'Not requested yet'}</strong>}
                  {myVouch?.status !== 'vouched' && <small>Needed before your job posts can go live.</small>}
                </div>
                {myVouch?.status !== 'vouched' && (
                  <button type="button" className="secondary-button" onClick={() => go('post')}>
                    {!myVouch ? 'Request vouch' : myVouch.status === 'declined' ? 'Ask again' : 'Change request'} <ArrowRight size={15}/>
                  </button>
                )}
              </div>

              {myCode && (
                <div className="profile-vouch">
                  <div>
                    <span>Your referral code</span>
                    <strong className="referral-code">{myCode}</strong>
                    <small>Give it only to people you know. You’ll be shown as the person who invited them.</small>
                  </div>
                  <button type="button" className="secondary-button" onClick={copyCode}><Copy size={15}/> Copy</button>
                </div>
              )}

              <div className="sheet-items profile-activity">
                {[
                  ['interests', Bookmark, 'Saved jobs', demo.saved.length + demo.tracked.length + interestedIds.length],
                  ['drafts', FileText, 'My posts', myPosts.length, myPosts.filter(p => p.status === 'published').length],
                  myApplications.length > 0 && ['apply', BadgeCheck, 'Role applications', myApplications.length, null, myApplications.filter(a => a.status === 'pending').length]
                ].filter(Boolean).map(([id, Icon, label, total, live, waiting]) => (
                  <button key={id} type="button" onClick={() => go(id)}>
                    <span className="sheet-icon"><Icon size={19} aria-hidden="true"/></span>
                    {label}
                    <small>{total}{live ? ` · ${live} live` : ''}{waiting ? ` · ${waiting} waiting` : ''}</small>
                    <ChevronRight size={16} aria-hidden="true"/>
                  </button>
                ))}
              </div>

              <p className="profile-privacy">
                <LockKeyhole size={16} aria-hidden="true"/>
                <span>We keep your name, email, who invited you and a yes/no church vouch. Never your CV or your beliefs. <button type="button" onClick={() => go('privacySafety')}>Privacy & data</button></span>
              </p>

              {supabase
                ? <button type="button" className="secondary-button" onClick={signOut}><KeyRound size={16}/> Sign out</button>
                : <button type="button" className="secondary-button" onClick={() => setShowReset(true)}><RotateCcw size={16}/> Reset demo</button>}
            </div>
          )}
          {(!supabase || session) && <ProfileForm prefs={prefs} onSave={saveProfile}/>}
        </div>}

        <div className="footer-gap" aria-hidden="true"/>
        <footer className="footer site-footer">
          <div className="footer-cols">
            {FOOTER.map(col => (
              <div key={col.title} className={`footer-col ${footerOpen === col.title ? 'open' : ''}`}>
                <button type="button" className="footer-head" aria-expanded={footerOpen === col.title} onClick={() => setFooterOpen(footerOpen === col.title ? null : col.title)}>
                  {col.title}<ChevronDown size={16} aria-hidden="true"/>
                </button>
                <ul>
                  {col.ids.map(id => <li key={id}><button type="button" onClick={() => go(id)}>{INFO_PAGES.find(p => p.id === id).tab}</button></li>)}
                </ul>
              </div>
            ))}
          </div>
          <p className="footer-bottom">© 2026 {SITE_NAME} · Free for everyone, always</p>
        </footer>
      </main>
    </div>

    {/* Mobile Navigation */}
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {userMainNav.map(n => {
        const Icon = icons[n.icon] || BriefcaseBusiness
        return (
          <button key={n.id} aria-label={n.label} title={n.label} aria-current={page === n.id ? 'page' : undefined} className={page === n.id || (n.id === 'dashboard' && staffNav.some(x => x.id === page)) ? 'active' : ''} onClick={() => go(n.id)}>
            <span className="nav-pill"><Icon size={24} aria-hidden="true"/>{n.id === 'dashboard' && workCount > 0 && <span className="nav-badge">{workCount}</span>}</span>
          </button>
        )
      })}
      <button aria-label="Menu" title="Menu" className={showMobileMore || menuItems.some(n => n.id === page) ? 'active' : ''} onClick={() => setShowMobileMore(true)} aria-haspopup="dialog" aria-expanded={showMobileMore}>
        <span className="nav-pill"><Menu size={24} aria-hidden="true"/></span>
      </button>
    </nav>

    {/* Account menu: dropdown on desktop, bottom sheet on phones */}
    {showMobileMore && (
      <div className="overlay mobile-more-overlay" onMouseDown={e => e.target === e.currentTarget && setShowMobileMore(false)}>
        <FocusDialog className="more-sheet" label="Menu">
          <div className="sheet-handle" aria-hidden="true"/>
          <div className="sheet-account">
            <Avatar account={account}/>
            <div>
              <strong>{account.name}</strong>
              <small>{account.detail}</small>
              {(!supabase || session) && <span className={`status-chip ${accountRole === 'member' ? 'neutral' : 'ok'}`}>{supabase && profile.suspended ? 'Suspended' : ROLE_LABELS[accountRole]}</span>}
            </div>
            <button className="icon-button" onClick={() => setShowMobileMore(false)} aria-label="Close menu"><X size={20}/></button>
          </div>

          <div className="sheet-items">
            {menuItems.map(n => {
              const Icon = icons[n.icon] || BriefcaseBusiness
              return (
                <button key={n.id} className={`${page === n.id ? 'active' : ''} ${NAV.member.includes(n) ? 'in-top-bar' : ''}`} aria-current={page === n.id ? 'page' : undefined} onClick={() => go(n.id)}>
                  <span className="sheet-icon"><Icon size={19} aria-hidden="true"/></span>{n.label}
                  <ChevronRight size={16} aria-hidden="true"/>
                </button>
              )
            })}
          </div>

          {!supabase && (
            <div className="sheet-demo">
              <p className="sheet-label">Demo view</p>
              <div className="sheet-roles" role="group" aria-label="Preview as role">
                {Object.entries(PERSONAS).map(([key, label]) => (
                  <button key={key} type="button" className={accountRole === key ? 'selected' : ''} aria-pressed={accountRole === key} onClick={() => setRole(key)}>{label}</button>
                ))}
              </div>
            </div>
          )}

          <div className="sheet-links">
            <button onClick={() => go('about')}><Info size={18} aria-hidden="true"/> About {SITE_NAME}</button>
            {!supabase && <button onClick={() => { setShowMobileMore(false); setShowReset(true) }}><RotateCcw size={18} aria-hidden="true"/> Reset demo</button>}
            {supabase && <button onClick={() => { setShowMobileMore(false); session ? signOut() : setShowSignIn(true) }}>
              <KeyRound size={18} aria-hidden="true"/> {session ? `Sign out (${session.user.email})` : 'Sign in'}
            </button>}
          </div>
        </FocusDialog>
      </div>
    )}

    {/* Job Detail Drawer (Noticeboard Direct Apply Flow) */}
    {selectedJob && (
      <div className="overlay job-overlay" onMouseDown={e => e.target === e.currentTarget && setSelectedJob(null)}>
        <FocusDialog as="section" className="job-drawer" label={`${selectedJob.title} verified opportunity`}>
          <div className="drawer-header">
            <button className="back-button" onClick={() => setSelectedJob(null)}><ArrowLeft size={17}/> Back to noticeboard</button>
            <button className="icon-button" aria-label="Close opportunity" onClick={() => setSelectedJob(null)}><X size={21}/></button>
          </div>

          <div className="drawer-body">
            <div className="badge-row">
              <span className="tag-badge verified"><ShieldCheck size={13}/> Checked with the employer</span>
              <span className="tag-badge expiry"><Clock3 size={13}/> {selectedJob.daysLeft} {selectedJob.daysLeft === 1 ? 'day' : 'days'} left</span>
              <span className="tag-badge secure"><Scale size={13}/> No fees for candidates</span>
            </div>

            <div className="drawer-title">
              <div className={`company-icon large ${selectedJob.hue}`} aria-hidden="true">{selectedJob.initials}</div>
              <div>
                <h2>{selectedJob.title}</h2>
                <p className="drawer-company">{selectedJob.company} · {selectedJob.emirate}, UAE</p>
              </div>
            </div>

            <div className="detail-grid">
              <div><span>Monthly salary</span><strong>{selectedJob.salary}</strong></div>
              <div><span>Employment type</span><strong>{selectedJob.type} · {selectedJob.mode}</strong></div>
              <div><span>Working hours</span><strong>{selectedJob.hours}</strong></div>
              <div><span>Verification status</span><strong>Checked with the employer</strong></div>
            </div>

            {/* Verification Proof Box */}
            <div className="authorization">
              <h4><ShieldCheck size={17}/> Moderator Employer Verification Record</h4>
              <p>{selectedJob.verificationNote}</p>
            </div>

            <h3>About the role</h3>
            <p>{selectedJob.description}</p>

            {selectedJob.responsibilities.length > 0 && <>
              <h3>What you'll do</h3>
              <ul>{selectedJob.responsibilities.map(v => <li key={v}>{v}</li>)}</ul>
            </>}

            {selectedJob.requirements.length > 0 && <>
              <h3>Skills & Experience</h3>
              <div className="tags">{selectedJob.requirements.map(x => <Pill key={x} type="subtle">{x}</Pill>)}</div>
            </>}

            <div className="authorization">
              <h4><ShieldCheck size={17}/> Work-authorisation & Sponsorship</h4>
              <p>{selectedJob.sponsorship}</p>
            </div>

            {/* Direct Apply to Employer Panel (MOHRE Safe Noticeboard) */}
            {canApply ? (
              <div className="apply-panel">
                <h4><Mail size={18}/> Apply Direct to Employer</h4>
                <p>
                  In compliance with UAE MOHRE regulations, Ephworks is a community noticeboard. We do not store your CV or shortlist candidates. You connect and apply straight to the hiring company:
                </p>
                {selectedJob.directEmail ? (
                  <div className="apply-actions">
                    <a href={`mailto:${selectedJob.directEmail}?subject=Application: ${selectedJob.title}`} className="apply-button-primary">
                      <Mail size={16}/> Email CV to {selectedJob.directEmail}
                    </a>
                    {selectedJob.directPortal && (
                      <a href={selectedJob.directPortal} target="_blank" rel="noopener noreferrer" className="apply-portal-link">
                        <ExternalLink size={16}/> Official Career Portal
                      </a>
                    )}
                  </div>
                ) : <Warning>The employer’s contact details couldn’t load. Close this and try again.</Warning>}
                <div className="track-row">
                  <button
                    type="button"
                    className={`${interestedIds.includes(selectedJob.id) ? 'secondary-button' : 'primary-button'} full`}
                    aria-pressed={interestedIds.includes(selectedJob.id)}
                    onClick={() => toggleInterest(selectedJob.id)}
                  >
                    <Heart size={16} fill={interestedIds.includes(selectedJob.id) ? 'currentColor' : 'none'}/> {interestedIds.includes(selectedJob.id) ? 'You’re interested' : 'I’m interested'}
                  </button>
                  <button
                    type="button"
                    className="secondary-button full"
                    onClick={() => toggleTrack(selectedJob.id)}
                  >
                    <CheckCheck size={16}/> {demo.tracked.includes(selectedJob.id) ? 'Application marked as sent' : 'Mark as applied (Track in my list)'}
                  </button>
                </div>
                <div className="law-notice">
                  <LockKeyhole size={14}/> Ephworks never charges fees or retains candidate CVs.
                </div>
              </div>
            ) : (
              // Visitors and accounts still waiting: one clear next step, no contact details (20261112 migration)
              <div className="apply-panel apply-locked">
                <span className="apply-locked-icon" aria-hidden="true"><LockKeyhole size={22}/></span>
                {!session ? <>
                  <h4>Sign in to apply</h4>
                  <p>Applying is for Ephworks members. Once you’re signed in, you’ll see how to contact this employer directly.</p>
                  <button type="button" className="primary-button full" onClick={() => setShowSignIn(true)}>Sign in or join</button>
                  <small>New here? Ask a member who knows you for their referral code.</small>
                </> : joinStatus === 'declined' ? <>
                  <h4>Applying is switched off</h4>
                  <p>Your request to join was not approved. If you think this is a mistake, <button type="button" className="link-button" onClick={() => { setSelectedJob(null); openContact('account') }}>send us a message</button>.</p>
                </> : <>
                  <h4>Almost there</h4>
                  <p>You can apply once a moderator approves your account. Until then you can keep browsing jobs.</p>
                </>}
              </div>
            )}

            <div className="drawer-footer-actions">
              <button type="button" aria-pressed={demo.saved.includes(selectedJob.id)} aria-label={demo.saved.includes(selectedJob.id) ? 'Saved. Remove from saved roles' : 'Save role'} onClick={() => toggleSave(selectedJob.id)}>
                <Bookmark size={18} fill={demo.saved.includes(selectedJob.id) ? 'currentColor' : 'none'}/>
                {demo.saved.includes(selectedJob.id) ? 'Saved' : 'Save'}
              </button>
              <button type="button" aria-label="How to spot a job scam" onClick={() => { setSelectedJob(null); go('jobScams') }}>
                <ShieldAlert size={18}/> Scam tips
              </button>
              <button type="button" className="danger-link" aria-label="Report this job to the safety team" onClick={() => setShowReport(true)}>
                <Flag size={18}/> Report
              </button>
            </div>
          </div>
        </FocusDialog>
      </div>
    )}

    {/* Book Volunteer Career Support Modal */}
    {showSupportModal && (
      <Modal onClose={() => setShowSupportModal(false)} title="Request free career support">
        <p>Get 1-on-1 assistance from volunteer HR professionals and hiring managers in our trusted community.</p>
        <form onSubmit={bookSupportSession} className="booking-form">
          <label>
            Support service needed
            <select
              value={selectedSupportService}
              onChange={e => { setSelectedSupportService(e.target.value); setSupportForm({ ...supportForm, service: e.target.value }) }}
            >
              {CAREER_SUPPORT_MODULES.map(m => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </label>
          <label>
            Your name
            <input value={supportForm.name} onChange={e => setSupportForm({ ...supportForm, name: e.target.value })} required/>
          </label>
          <label>
            Preferred session time
            <select value={supportForm.preferredTime} onChange={e => setSupportForm({ ...supportForm, preferredTime: e.target.value })}>
              <option>Weekday evening (after 6 pm)</option>
              <option>Saturday morning</option>
              <option>Sunday afternoon</option>
              <option>Flexible / Online async review</option>
            </select>
          </label>
          <label>
            What specific help do you need most? (optional)
            <textarea
              rows={3}
              placeholder="e.g. Preparing for customer service interviews, formatting my UAE CV, or changing industries."
              value={supportForm.note}
              onChange={e => setSupportForm({ ...supportForm, note: e.target.value })}
            />
          </label>
          <label className="check-label">
            <input type="checkbox" checked={supportForm.consent} onChange={e => setSupportForm({ ...supportForm, consent: e.target.checked })}/>
            <span>A volunteer mentor may email me at my sign-in address to arrange this. Only the mentor who takes my request sees it.</span>
          </label>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setShowSupportModal(false)}>Cancel</button>
            <button type="submit" className="primary-button" disabled={!supportForm.consent}>
              <Send size={16}/> Send request
            </button>
          </div>
        </form>
      </Modal>
    )}

    {/* About / Architecture & Roadmap Modal */}

    {/* Reset Demo Modal */}
    {showReset && (
      <Modal onClose={() => setShowReset(false)} title="Reset local demo?">
        <p>This clears your local bookmarks, tracked applications, fictional drafts, and support session requests.</p>
        <div className="modal-actions">
          <button className="secondary-button" onClick={() => setShowReset(false)}>Cancel</button>
          <button className="danger-button" onClick={reset}><RotateCcw size={16}/> Reset demo</button>
        </div>
      </Modal>
    )}

    {removing && (
      <Modal onClose={() => setRemoving(null)} title="Remove this post?">
        <p>
          “{removing.title}” {removing.status === 'published' ? 'comes off the noticeboard straight away' : 'leaves the moderation queue'}
          {interestCount(removing) > 0 && `, and its count of ${interestCount(removing)} interested ${interestCount(removing) === 1 ? 'person' : 'people'} is deleted`}. This can’t be undone.
        </p>
        <div className="modal-actions">
          <button className="secondary-button" onClick={() => setRemoving(null)}>Keep post</button>
          <button className="danger-button" onClick={() => removePost(removing.id)}><X size={16}/> Remove post</button>
        </div>
      </Modal>
    )}

    {/* Report to Safety Team Modal */}
    {showReport && (
      <Modal onClose={() => setShowReport(false)} title="Report to Ephworks Safety Team">
        <p>Our safety team follows up on every flag directly with the reporter and employer within 24 hours.</p>
        <label className="form-label">
          Reason for report
          <select value={reportReason} onChange={e => setReportReason(e.target.value)}>
            {REPORT_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <div className="modal-actions">
          <button className="secondary-button" onClick={() => setShowReport(false)}>Cancel</button>
          <button className="primary-button" onClick={submitReport}><Flag size={16}/> Submit to Safety Team</button>
        </div>
      </Modal>
    )}

    {showSignIn && (
      <Modal onClose={() => setShowSignIn(false)} title={authForm.mode === 'signup' ? `Join ${SITE_NAME}` : authForm.mode === 'reset' ? 'Choose a new password' : `Sign in to ${SITE_NAME}`}>
        {providers.email && authForm.mode !== 'reset' && (
          <div className="tab-list auth-tabs" role="tablist" aria-label="Sign in or join">
            <button type="button" role="tab" aria-selected={authForm.mode === 'signin'} className={authForm.mode === 'signin' ? 'active' : ''} onClick={() => setAuthMode('signin')}>Sign in</button>
            <button type="button" role="tab" aria-selected={authForm.mode === 'signup'} className={authForm.mode === 'signup' ? 'active' : ''} onClick={() => setAuthMode('signup')}>Create account</button>
          </div>
        )}
        {authForm.mode === 'signup' && <p>{SITE_NAME} is for people invited by a member. You need their referral code, and a moderator approves every new account.</p>}
        {authForm.mode === 'reset' && <p>We’ll email you a link to choose a new password.</p>}
        {providers.email && (
          <form className="booking-form auth-form" onSubmit={submitAuth}>
            {authForm.mode === 'signup' && (
              <label>
                Full name
                <input required minLength={2} maxLength={80} autoComplete="name" value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })}/>
              </label>
            )}
            <label>
              Email
              <input type="email" required maxLength={254} autoComplete="email" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })}/>
            </label>
            {authForm.mode !== 'reset' && (
              <label>
                Password
                <input type="password" required minLength={authForm.mode === 'signup' ? 8 : undefined} autoComplete={authForm.mode === 'signup' ? 'new-password' : 'current-password'} value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })}/>
                {authForm.mode === 'signup' && <small>At least 8 characters.</small>}
              </label>
            )}
            {authForm.mode === 'signup' && (
              <label>
                Referral code
                <input required maxLength={10} placeholder="EPH-XXXXXX" autoComplete="off" value={authForm.code} onChange={e => setAuthForm({ ...authForm, code: e.target.value })}/>
                <small>From the member who invited you.</small>
              </label>
            )}
            {captchaKey && <Captcha key={`${authForm.mode}-${captchaRound}`} onToken={setCaptchaToken}/>}
            <button className="primary-button full" type="submit" disabled={Boolean(captchaKey) && !captchaToken}>{authForm.mode === 'signup' ? 'Create account' : authForm.mode === 'reset' ? 'Send link' : 'Sign in'}</button>
            {authForm.mode === 'signin' && <button type="button" className="link-button" onClick={() => setAuthMode('reset')}>Forgot your password?</button>}
            {authForm.mode === 'reset' && <button type="button" className="link-button" onClick={() => setAuthMode('signin')}>Back to sign in</button>}
          </form>
        )}
        {providers.google && authForm.mode !== 'reset' && <>
          {providers.email && <p className="auth-or"><span>or</span></p>}
          <button type="button" className="secondary-button full google-button" onClick={signInWithGoogle}><GoogleMark/> Continue with Google</button>
          {authForm.mode === 'signup' && <p className="sign-in-note">With Google, you enter your referral code after signing in.</p>}
        </>}
        {!providers.google && !providers.email && <Warning>Sign-in is being set up. Please try again soon.</Warning>}
        <p className="sign-in-note">We keep your name and email{providers.google ? ', and your Google profile photo if you use Google' : ''}. <button type="button" className="link-button" onClick={() => { setShowSignIn(false); go('privacy') }}>Privacy</button></p>
      </Modal>
    )}

    {showTwoStep && <TwoStepDialog factorId={twoStep.factorId} onDone={twoStepDone} onClose={() => setShowTwoStep(false)} onError={fail}/>}

    {newPassword !== null && (
      <Modal onClose={() => setNewPassword(null)} title="Choose a new password">
        <form className="booking-form" onSubmit={saveNewPassword}>
          <label>
            New password
            <input type="password" required minLength={8} autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)}/>
            <small>At least 8 characters.</small>
          </label>
          <div className="modal-actions">
            <button type="submit" className="primary-button">Save password</button>
          </div>
        </form>
      </Modal>
    )}

    {verifying && (
      <Modal onClose={() => setVerifying(null)} title={`Publish: ${verifying.job.title}`}>
        <form className="booking-form" onSubmit={publishJob}>
          <PublishChecks vouched={posterVouched(verifying.job)} scan={scanJob(verifying.job)}/>
          {scanJob(verifying.job).flags.length > 0 && (
            <label className="check-label">
              <input type="checkbox" checked={verifying.flagsChecked} onChange={e => setVerifying({ ...verifying, flagsChecked: e.target.checked })}/>
              <span>I checked each warning above with {verifying.job.company} and the job is genuine.</span>
            </label>
          )}
          <p>How did you confirm this job with {verifying.job.company}? Job seekers see this note on the listing.</p>
          <label>
            Verification record
            <textarea rows={3} required maxLength={400} placeholder="e.g. Called their HR manager on 26 Oct: role, salary and no candidate fees confirmed." value={verifying.note} onChange={e => setVerifying({ ...verifying, note: e.target.value })}/>
          </label>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setVerifying(null)}>Cancel</button>
            <button type="submit" className="primary-button" disabled={!canPublish(verifying)}><ShieldCheck size={16}/> Publish for 30 days</button>
          </div>
        </form>
      </Modal>
    )}

    {rejecting && (
      <Modal onClose={() => setRejecting(null)} title={`Reject: ${rejecting.job.title}`}>
        <form className="booking-form" onSubmit={rejectJob}>
          <p>The poster sees the reason and your note. The rejection is also kept, so moderators are warned if this poster or company posts again.</p>
          <label>
            Reason
            <select required value={rejecting.reason} onChange={e => setRejecting({ ...rejecting, reason: e.target.value })}>
              <option value="">Choose a reason</option>
              {Object.entries(REJECT_REASONS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          <label>
            Note for the poster (optional)
            <textarea rows={3} maxLength={400} placeholder="e.g. No contact name or company address. Add them and post again." value={rejecting.note} onChange={e => setRejecting({ ...rejecting, note: e.target.value })}/>
          </label>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setRejecting(null)}>Cancel</button>
            <button type="submit" className="primary-button" disabled={!rejecting.reason}><X size={16}/> Reject post</button>
          </div>
        </form>
      </Modal>
    )}

    {finishing && (
      <Modal onClose={() => setFinishing(null)} title={`Done: ${finishing.request.display_name}`}>
        <form className="booking-form" onSubmit={confirmFinish}>
          <p>Add a short summary of the help you gave (optional). Only admins see it, for our reports. Don't include anything private.</p>
          <label>
            Summary
            <textarea rows={3} maxLength={500} placeholder="e.g. Reviewed CV over email; suggested a shorter summary and clearer job titles." value={finishing.comment} onChange={e => setFinishing({ ...finishing, comment: e.target.value })}/>
          </label>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setFinishing(null)}>Cancel</button>
            <button type="submit" className="primary-button"><Check size={16}/> Mark as done</button>
          </div>
        </form>
      </Modal>
    )}
  </div>
}

function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'compact' : ''}`}>
      <img src="/logo.svg" alt=""/>
      <div>
        <strong>{SITE_NAME}</strong>
        {!compact && <span>VERIFIED PEOPLE · VERIFIED JOBS · REAL SUPPORT</span>}
      </div>
    </div>
  )
}

// Cloudflare Turnstile, loaded only when a CAPTCHA is shown. Supabase checks the token it gives.
let turnstileScript
const loadTurnstile = () => window.turnstile ? Promise.resolve(window.turnstile) : (turnstileScript ||= new Promise((resolve, reject) => {
  const s = document.createElement('script')
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
  s.async = true
  s.onload = () => resolve(window.turnstile)
  s.onerror = reject
  document.head.appendChild(s)
}))

function Captcha({ onToken }) {
  const ref = useRef(null)
  useEffect(() => {
    let widget, gone = false
    loadTurnstile().then(t => {
      if (!gone && ref.current) widget = t.render(ref.current, { sitekey: captchaKey, callback: onToken, 'expired-callback': () => onToken(''), 'error-callback': () => onToken('') })
    }).catch(() => onToken(''))
    return () => { gone = true; if (widget !== undefined) window.turnstile?.remove(widget) }
  }, [])
  return <div ref={ref} className="captcha"/>
}

// Staff two-step sign-in: set up an authenticator app once, then type its 6-digit code after each sign-in
function TwoStepDialog({ factorId, onDone, onClose, onError }) {
  const [setup, setSetup] = useState(null) // { id, qr, secret } while setting up
  const [code, setCode] = useState('')
  useEffect(() => { if (!factorId) api.enrollTwoStep().then(setSetup).catch(onError) }, [factorId])
  const id = factorId || setup?.id
  const submit = e => { e.preventDefault(); api.verifyTwoStep(id, code).then(onDone).catch(err => { setCode(''); onError(err) }) }
  return (
    <Modal onClose={onClose} title={factorId ? 'Enter your sign-in code' : 'Set up two-step sign-in'}>
      {factorId
        ? <p>Open your authenticator app and type the 6-digit code it shows for {SITE_NAME}.</p>
        : <>
          <p>Install an authenticator app such as Google Authenticator or Microsoft Authenticator, then scan this code with it.</p>
          {setup
            ? <div className="two-step-qr"><img src={setup.qr} alt={`QR code that adds ${SITE_NAME} to your authenticator app`} width="180" height="180"/><small>Can’t scan it? Type this key into the app instead: <code>{setup.secret}</code></small></div>
            : <p className="wizard-hint">Preparing your code…</p>}
        </>}
      <form className="booking-form" onSubmit={submit}>
        <label>
          6-digit code
          <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}/>
        </label>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>Later</button>
          <button type="submit" className="primary-button" disabled={!id || code.length !== 6}><ShieldCheck size={16}/> {factorId ? 'Confirm' : 'Turn on'}</button>
        </div>
      </form>
      {!factorId && <p className="sign-in-note">Lost your phone later? Ask the {SITE_NAME} super admin to reset it, then set it up again.</p>}
    </Modal>
  )
}

// Verse of the day: the same for everyone, changes at midnight (verses.js)
function VerseCard() {
  const [reference, text] = verseOfDay()
  return (
    <figure className="verse-card">
      <BookOpen size={20} aria-hidden="true"/>
      <div>
        <blockquote>{text}</blockquote>
        <figcaption>{reference} <span>· Verse of the day (KJV)</span></figcaption>
      </div>
    </figure>
  )
}

function JobCard({ job, saved, tracked, interested, onSave, onOpen, onInterest, onLearn, isNew }) {
  const life = Math.max(4, Math.min(100, Math.round((job.daysLeft / 30) * 100)))
  return (
    <article className="jc">
      <div className="jc-top">
        {onLearn
          ? <button type="button" className="jc-check" title="How we review jobs" onClick={onLearn}><BadgeCheck size={15}/> Checked with employer</button>
          : <span className="jc-check"><BadgeCheck size={15}/> Checked with employer</span>}
        {isNew && <span className="jc-new"><Sparkles size={13}/> New for you</span>}
        {tracked && <span className="jc-applied"><CheckCheck size={13}/> Applied</span>}
        <button
          className={`jc-save ${saved ? 'is-saved' : ''}`}
          aria-label={`${saved ? 'Remove' : 'Save'} ${job.title}`}
          aria-pressed={saved}
          title={saved ? 'Saved' : 'Save'}
          onClick={onSave}
        >
          <Bookmark size={18} fill={saved ? 'currentColor' : 'none'}/>
        </button>
      </div>

      <div className="jc-body">
        <div className="jc-mono" aria-hidden="true">{job.initials}</div>
        <div className="jc-id">
          <h3>{job.title}</h3>
          <p>{job.company} <span>·</span> {job.emirate}</p>
        </div>
        <p className="jc-pay"><b>{job.salary}</b><span>per month</span></p>
      </div>

      <div className="jc-foot">
        <ul className="jc-facts">
          <li>{job.type}</li>
          <li>{job.mode}</li>
          <li className="jc-life" title={`${job.daysLeft} of 30 days left`}>
            <i style={{ '--life': `${life}%` }} aria-hidden="true"/>
            {job.daysLeft} days left
          </li>
        </ul>
        <div className="jc-actions">
          <button className={`jc-interest ${interested ? 'is-on' : ''}`} aria-pressed={interested} aria-label={`I'm interested in ${job.title}`} onClick={onInterest}>
            <Heart size={16} fill={interested ? 'currentColor' : 'none'}/> {interested ? 'Interested' : 'I’m interested'}
          </button>
          <button className="jc-open" onClick={onOpen} aria-label={`View and apply: ${job.title}`}>
            View role <ArrowRight size={16}/>
          </button>
        </div>
      </div>
    </article>
  )
}


function ReviewCard({ job, vouched, scan, history, onView, onReject, onConfirm }) {
  const ready = vouched && !scan.blocked.length
  return (
    <article className={`rc ${scan.blocked.length ? 'bad' : vouched ? '' : 'pending'}`}>
      <div className="rc-top">
        <span className="rc-status"><span className="rc-dot" aria-hidden="true"/> {scan.blocked.length ? 'Blocked by scam check' : vouched ? 'Ready to check with the employer' : 'Waiting for church vouch'}</span>
        <span className="rc-life">Submitted {job.postedAgo}</span>
      </div>

      <div className="rc-body">
        <div className="rc-mono" aria-hidden="true">{job.initials}</div>
        <div className="rc-id">
          <h3>{job.title}</h3>
          <p>{job.company} <span>·</span> {job.emirate} <span>·</span> {job.salary}</p>
        </div>
      </div>

      <PublishChecks vouched={vouched} scan={scan}/>
      {history && (
        <ul className="pub-checks">
          <li className="bad"><AlertTriangle size={15}/> Rejected before: {history.previous} time{history.previous == 1 ? '' : 's'}, most recently for {(REJECT_REASONS[history.last_reason] || 'another reason').toLowerCase()} on {new Date(history.last_at).toLocaleDateString()}. Check this one carefully.</li>
        </ul>
      )}

      <div className="rc-foot">
        <div className="rc-actions">
          <button className="rc-btn" onClick={onView}>View details</button>
          <button className="rc-btn rc-flag" onClick={onReject}><X size={15}/> Reject</button>
          <button className="rc-btn rc-confirm" disabled={!ready} title={ready ? undefined : 'Needs a church vouch and a clean scam check first'} onClick={onConfirm}><Check size={15}/> Check & publish</button>
        </div>
      </div>
    </article>
  )
}

// What has to be true before a post can go live; shown on the queue card and in the publish dialog
function PublishChecks({ vouched, scan }) {
  return (
    <ul className="pub-checks">
      <li className={vouched ? 'ok' : 'wait'}>{vouched ? <BadgeCheck size={15}/> : <Clock3 size={15}/>} {vouched ? 'Poster vouched by their church' : 'Poster not vouched by a church yet'}</li>
      <li className={scan.blocked.length ? 'bad' : 'ok'}>{scan.blocked.length ? <ShieldAlert size={15}/> : <ShieldCheck size={15}/>} {scan.blocked.length ? `Blocked terms: ${scan.blocked.join(', ')}` : 'Fee and payment-scam check passed'}</li>
      {scan.flags.map(f => <li key={f} className="wait"><AlertTriangle size={15}/> Check with the employer: {f}</li>)}
    </ul>
  )
}

function QueueCard({ avatar, title, status, tone, sub, note, footNote, children }) {
  return (
    <article className="queue-card">
      {avatar}
      <div className="queue-main">
        <div className="queue-head">
          <h3>{title}</h3>
          <span className={`status-chip ${tone}`}>{status}</span>
        </div>
        <p className="queue-sub">{sub}</p>
        {note && <p className="queue-note">{note}</p>}
      </div>
      <footer className="queue-foot">
        <span className="queue-foot-note">{footNote}</span>
        <div className="queue-actions">{children}</div>
      </footer>
    </article>
  )
}

// Icon names used in content.js
const INFO_ICONS = {
  heart: Heart, users: UsersRound, badge: BadgeCheck, support: LifeBuoy, lock: Lock, scale: Scale, search: Search,
  briefcase: BriefcaseBusiness, church: HeartHandshake, hand: HandHeart, building: Building2, ban: Ban, alert: AlertTriangle,
  clock: Clock3, flag: Flag, shield: ShieldCheck, mail: Mail, file: FileText, eye: Eye
}

// About, Safety & Trust, Help and Legal pages, drawn from content.js. Pages in a group share a tab row.
function InfoPage({ page, onGo, onAction, roles, contactForm }) {
  const siblings = INFO_PAGES.filter(p => p.group === page.group)
  const icon = name => { const Icon = INFO_ICONS[name] || Info; return <span className="feature-icon"><Icon size={22} aria-hidden="true"/></span> }
  const list = (items, tone) => <ul className={`info-list ${tone || ''}`}>{items.map(x => <li key={x}>{tone === 'warn' ? <AlertTriangle size={16} aria-hidden="true"/> : <Check size={16} aria-hidden="true"/>}{x}</li>)}</ul>
  const steps = items => <ol className="info-steps">{items.map(([t, d], n) => <li key={t}><b>{n + 1}</b><div><strong>{t}</strong><p>{d}</p></div></li>)}</ol>
  const block = (b, i) =>
    b.p ? <p key={i} className="info-text">{b.p}</p>
    : b.h ? <h2 key={i} className="info-h">{b.h}</h2>
    : b.note ? <Warning key={i} tone={b.tone || ''}>{b.note}</Warning>
    : b.list ? <div key={i}>{list(b.list, b.tone)}</div>
    : b.steps ? <div key={i}>{steps(b.steps)}</div>
    : b.cards ? (
      <div key={i} className="info-cards" style={{ '--cols': Math.min(b.cards.length, 3) }}>
        {b.cards.map(([t, d, ic, action]) => (
          <div key={t} className="plain-card info-card">
            {ic && icon(ic)}
            <h3>{t}</h3>
            <p>{d}</p>
            {action && <button type="button" className="secondary-button" onClick={() => onAction(action[1])}>{action[0]} <ArrowRight size={15}/></button>}
          </div>
        ))}
      </div>
    )
    : b.roles ? (
      <div key={i} className="info-cards" style={{ '--cols': Math.min(roles.length, 3) }}>
        {roles.map(v => (
          <div key={v.title} className="plain-card info-card">
            {icon('hand')}
            <h3>{v.title}</h3>
            <p>{v.summary}</p>
            <small><MapPin size={14}/> {v.location} · <Clock3 size={14}/> {v.commitment}</small>
          </div>
        ))}
      </div>
    )
    : b.contactForm ? <div key={i}>{contactForm}</div>
    : b.stats ? <ul key={i} className="info-stats">{b.stats.map(([v, l]) => <li key={l}><b>{v}</b><span>{l}</span></li>)}</ul>
    : b.split ? (
      <div key={i} className="info-split">
        <div className="info-split-text">
          {b.split.paragraphs.map(t => <p key={t}>{t}</p>)}
          {b.split.aside && <p className="info-aside"><Info size={16} aria-hidden="true"/>{b.split.aside}</p>}
        </div>
        <img src={b.split.image} alt={b.split.alt} loading="lazy" decoding="async"/>
      </div>
    )
    : b.columns ? (
      <div key={i} className="info-columns">
        {b.columns.map(c => (
          <section key={c.title} className={`plain-card info-column ${c.tone || ''}`}>
            <header>{icon(c.icon)}<h2>{c.title}</h2></header>
            {c.steps ? steps(c.steps) : list(c.list, c.tone)}
          </section>
        ))}
      </div>
    )
    : b.faq ? <div key={i} className="info-faq">{b.faq.map(([q, a]) => <details key={q}><summary>{q}<ChevronDown size={18} aria-hidden="true"/></summary><p>{a}</p></details>)}</div>
    : b.cta ? <div key={i} className="info-cta">{b.cta.map(([label, action], n) => <button key={label} type="button" className={n === 0 ? 'primary-button' : 'secondary-button'} onClick={() => onAction(action)}>{label}{n === 0 && <ArrowRight size={16}/>}</button>)}</div>
    : null
  return (
    <div className="info-page">
      {page.hero ? (
        <section className={`info-hero ${page.hero === 'plain' ? 'plain' : ''}`}>
          {page.hero !== 'plain' && <img className="stage-bg" src={page.hero} alt="" decoding="async"/>}
          <p className="glass-chip">{page.group === 'safety' && <ShieldCheck size={15} aria-hidden="true"/>}{INFO_GROUPS[page.group]}</p>
          <h1>{page.title}</h1>
          {page.lede && <p className="info-hero-lede">{page.lede}</p>}
        </section>
      ) : <PageHeading eyebrow={INFO_GROUPS[page.group]} title={page.title} desc={page.lede}/>}
      {siblings.length > 1 && (
        <nav className="tab-list work-tabs info-tabs" aria-label={INFO_GROUPS[page.group]}>
          {siblings.map(p => <button key={p.id} type="button" className={p.id === page.id ? 'active' : ''} aria-current={p.id === page.id ? 'page' : undefined} onClick={() => onGo(p.id)}>{p.tab}</button>)}
        </nav>
      )}
      {page.doc
        ? <article className="plain-card info-doc">{page.blocks.map(block)}</article>
        : <div className="info-body">{page.blocks.map(block)}</div>}
    </div>
  )
}

// Where a post is on its way to going live: church vouch, then the employer check, then 30 days on the board
function PostTracker({ vouch, status, daysLeft }) {
  const live = status === 'published' && daysLeft > 0
  const steps = [
    { label: 'Church vouch', state: vouch === 'vouched' ? 'done' : vouch === 'declined' ? 'bad' : 'current', note: vouch === 'vouched' ? 'Confirmed' : vouch === 'declined' ? 'Declined, ask again' : vouch === 'pending' ? 'Waiting for your church' : 'Not requested yet' },
    { label: 'Employer check', state: status === 'published' || status === 'filled' ? 'done' : status === 'rejected' ? 'bad' : vouch === 'vouched' && status === 'pending' ? 'current' : '', note: status === 'published' || status === 'filled' ? 'Checked with the employer' : status === 'rejected' ? 'Not approved' : status === 'draft' ? 'After you submit' : 'A moderator calls the employer' },
    { label: 'Live', state: live || status === 'filled' ? 'done' : status === 'published' ? 'bad' : '', note: status === 'filled' ? 'Filled: someone was hired' : live ? `${daysLeft} days left` : status === 'published' ? 'Ended after 30 days' : 'For 30 days' }
  ]
  return (
    <ol className="post-tracker" aria-label="Post progress">
      {steps.map((st, i) => (
        <li key={st.label} className={st.state}>
          <b>{st.state === 'done' ? <Check size={13}/> : st.state === 'bad' ? <X size={13}/> : i + 1}</b>
          <span><strong>{st.label}</strong><small>{st.note}</small></span>
        </li>
      ))}
    </ol>
  )
}

// Type to find a partner church. Anything not listed can be suggested with its emirate; admins add it after a check.
function ChurchPicker({ label, churches, value, onChange }) {
  const chosen = churches.find(c => c.id === value.id)
  const query = value.name.trim().toLowerCase()
  const matches = query ? churches.filter(c => c.name.toLowerCase().includes(query)).slice(0, 6) : []
  if (chosen) return (
    <div className="church-picker">
      <span className="church-label">{label}</span>
      <div className="church-chosen">
        <CheckCircle2 size={18} aria-hidden="true"/><strong>{chosen.name}</strong>
        <button type="button" onClick={() => onChange(NO_CHURCH)}>Change</button>
      </div>
    </div>
  )
  return (
    <div className="church-picker">
      <label>
        {label}
        <input autoComplete="off" maxLength={95} placeholder="Start typing your church's name" value={value.name} onChange={e => onChange({ ...value, id: '', name: e.target.value })}/>
      </label>
      {matches.length > 0 && (
        <div className="church-matches" aria-label="Partner churches">
          {matches.map(c => <button key={c.id} type="button" onClick={() => onChange({ ...NO_CHURCH, id: c.id, name: c.name })}>{c.name}{c.emirate && <small>{c.emirate}</small>}</button>)}
        </div>
      )}
      {query.length >= 2 && (
        <div className="church-new">
          <p>{matches.length ? 'Not one of these?' : 'Not a partner church yet.'} We'll add <strong>{value.name.trim()}</strong> after a quick check.</p>
          <label>
            Emirate
            <select value={value.emirate} onChange={e => onChange({ ...value, emirate: e.target.value })}>
              <option value="">Choose emirate</option>
              {EMIRATES.map(x => <option key={x}>{x}</option>)}
            </select>
          </label>
        </div>
      )}
    </div>
  )
}

// Admin: add a partner church by name and emirate
function AddChurchForm({ onAdd }) {
  const [name, setName] = useState('')
  const [emirate, setEmirate] = useState('')
  return (
    <form className="plain-card add-church" onSubmit={e => { e.preventDefault(); onAdd(name, emirate); setName(''); setEmirate('') }}>
      <input aria-label="Church name" maxLength={95} placeholder="Church name" value={name} onChange={e => setName(e.target.value)}/>
      <select aria-label="Emirate" value={emirate} onChange={e => setEmirate(e.target.value)}>
        <option value="">Emirate</option>
        {EMIRATES.map(x => <option key={x}>{x}</option>)}
      </select>
      <button type="submit" className="primary-button"><Plus size={16}/> Add church</button>
    </form>
  )
}

// Admin: one partner church. Rename any time; remove only while nobody depends on it (the server checks too).
function ChurchAdminCard({ church, onSave, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [name, setName] = useState(church.name)
  const [emirate, setEmirate] = useState(church.emirate || '')
  const inUse = Number(church.admins) + Number(church.vouched) + Number(church.pending) > 0
  return (
    <QueueCard
      avatar={<div className="feature-icon"><HeartHandshake size={20}/></div>}
      title={church.name}
      status={Number(church.admins) ? `${church.admins} church admin${Number(church.admins) === 1 ? '' : 's'}` : 'No church admin yet'}
      tone={Number(church.admins) ? 'ok' : 'pending'}
      sub={[church.emirate, `${church.vouched} vouched`, Number(church.pending) ? `${church.pending} waiting` : null].filter(Boolean).join(' · ')}
      footNote={inUse && !editing && <><LockKeyhole size={15}/> In use, so it can be renamed but not removed</>}
    >
      {editing ? <>
        <input className="member-select church-name-edit" aria-label="Church name" maxLength={95} value={name} onChange={e => setName(e.target.value)}/>
        <select className="member-select" aria-label="Emirate" value={emirate} onChange={e => setEmirate(e.target.value)}>
          <option value="">Emirate</option>
          {EMIRATES.map(x => <option key={x}>{x}</option>)}
        </select>
        <button type="button" className="outline-small" onClick={() => setEditing(false)}>Cancel</button>
        <button type="button" className="approve-small" onClick={() => { onSave(church, name, emirate); setEditing(false) }}><Check size={15}/> Save</button>
      </> : <>
        <button type="button" className="outline-small" onClick={() => { setName(church.name); setEmirate(church.emirate || ''); setEditing(true) }}>Edit</button>
        {!inUse && (confirming
          ? <button type="button" className="reject-small" onClick={() => onRemove(church)}><X size={15}/> Confirm remove</button>
          : <button type="button" className="reject-small" onClick={() => setConfirming(true)}>Remove</button>)}
      </>}
    </QueueCard>
  )
}

// One church suggestion: add it as typed (or corrected), match it to a similar existing church, or decline
function ChurchRequestCard({ suggestion, churches, suggester, onDecide }) {
  const [name, setName] = useState(suggestion.name)
  const pending = suggestion.status === 'pending'
  // distinctive words only: generic church words and place names would match half the list
  const common = ['church', 'fellowship', 'community', 'sample', ...EMIRATES.join(' ').toLowerCase().split(' ')]
  const words = suggestion.name.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !common.includes(w))
  const similar = churches.filter(c => words.some(w => c.name.toLowerCase().includes(w))).slice(0, 3)
  const added = churches.find(c => c.id === suggestion.church_id)
  return (
    <QueueCard
      avatar={<div className="feature-icon"><HeartHandshake size={20}/></div>}
      title={suggestion.name}
      status={pending ? 'Waiting for review' : suggestion.status === 'approved' ? 'Added' : 'Declined'}
      tone={pending ? 'pending' : suggestion.status === 'approved' ? 'ok' : 'bad'}
      sub={[suggestion.emirate, suggester && `Suggested by ${suggester.email}`, new Date(suggestion.created_at).toLocaleDateString(), added && `Added as ${added.name}`].filter(Boolean).join(' · ')}
      note={pending && similar.length > 0 && <>Similar partner churches: {similar.map(c => <button key={c.id} type="button" className="link-button" onClick={() => onDecide(suggestion, true, c.name)}>Same as {c.name}</button>)}</>}
    >
      {pending && <>
        <input className="member-select church-name-edit" aria-label="Church name to add" maxLength={95} value={name} onChange={e => setName(e.target.value)}/>
        <button type="button" className="reject-small" onClick={() => onDecide(suggestion, false)}><X size={15}/> Decline</button>
        <button type="button" className="approve-small" disabled={name.trim().length < 2} onClick={() => onDecide(suggestion, true, name)}><Check size={15}/> Add church</button>
      </>}
    </QueueCard>
  )
}

// Your details and what work you want. Preferences stay private and only drive "Matches for you".
function ProfileForm({ prefs, onSave }) {
  const toForm = p => ({ display_name: p.display_name || '', phone: p.phone || '', emirates: p.emirates || [], work_types: p.work_types || [],
    work_settings: p.work_settings || [], keywords: p.keywords || '', min_pay: p.min_pay || '', alerts_email: Boolean(p.alerts_email) })
  const saved = JSON.stringify(toForm(prefs))
  const [form, setForm] = useState(() => JSON.parse(saved))
  useEffect(() => setForm(JSON.parse(saved)), [saved]) // only when the saved profile really changed, so typing isn't reset
  const toggle = (key, value) => setForm(f => ({ ...f, [key]: f[key].includes(value) ? f[key].filter(x => x !== value) : [...f[key], value] }))
  const chips = (key, values, legend) => (
    <fieldset className="pref-chips">
      <legend>{legend}</legend>
      {values.map(v => (
        <label key={v} className={form[key].includes(v) ? 'on' : ''}>
          <input type="checkbox" checked={form[key].includes(v)} onChange={() => toggle(key, v)}/>{v}
        </label>
      ))}
    </fieldset>
  )
  return (
    <form className="form-panel booking-form profile-form" onSubmit={e => { e.preventDefault(); onSave(form) }}>
      <h2>Your details</h2>
      <div className="form-two">
        <label>
          Name
          <input maxLength={80} autoComplete="name" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })}/>
          <small>Shown to mentors, carers and staff instead of your sign-in name.</small>
        </label>
        <label>
          Phone (optional)
          <input type="tel" maxLength={20} placeholder="+971 50 123 4567" autoComplete="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/>
          <small>Only moderators and admins see it, to check your account.</small>
        </label>
      </div>
      <h2>Job alerts</h2>
      <p className="form-intro">Tell us what you’re looking for. Matching jobs are marked “New for you” as they go live. Only you see this, and employers never see who a job matched.</p>
      {chips('emirates', EMIRATES, 'Emirates')}
      {chips('work_types', WORK_TYPES, 'Work type')}
      {chips('work_settings', WORK_SETTINGS, 'Work setting')}
      <div className="form-two">
        <label>
          Keywords
          <input maxLength={200} placeholder="e.g. accountant, driver, receptionist" value={form.keywords} onChange={e => setForm({ ...form, keywords: e.target.value })}/>
          <small>Separate with commas. A job matches if it mentions any of them.</small>
        </label>
        <label>
          Minimum monthly pay (AED, optional)
          <input type="number" inputMode="numeric" min={1} max={999999} placeholder="5000" value={form.min_pay} onChange={e => setForm({ ...form, min_pay: e.target.value })}/>
        </label>
      </div>
      <label className="check-label">
        <input type="checkbox" checked={form.alerts_email} onChange={e => setForm({ ...form, alerts_email: e.target.checked })}/>
        <span>Also email me once a day when new jobs match.</span>
      </label>
      <button className="primary-button" type="submit"><Check size={16}/> Save profile</button>
    </form>
  )
}

// One contact-form message in the staff inbox: reply by email, mark handled, or delete after a second click
function ContactCard({ message: m, onHandled, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const open = m.status === 'open'
  return (
    <QueueCard
      avatar={<div className={`feature-icon ${m.topic === 'safety' ? 'danger' : ''}`}><Mail size={20}/></div>}
      title={`${CONTACT_TOPICS[m.topic]} · ${m.name}`}
      status={open ? 'Open' : 'Handled'}
      tone={open ? 'pending' : 'ok'}
      sub={[m.email, new Date(m.created_at).toLocaleString()].join(' · ')}
      note={m.message}
    >
      <a className="outline-small" href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: your message to ${SITE_NAME}`)}`}><Mail size={15}/> Reply</a>
      <button type="button" className="approve-small" onClick={() => onHandled(m, open)}>{open ? <><Check size={15}/> Mark handled</> : <><RotateCcw size={15}/> Reopen</>}</button>
      {confirming
        ? <button type="button" className="reject-small" onClick={() => onDelete(m)}><X size={15}/> Confirm delete</button>
        : <button type="button" className="reject-small" onClick={() => setConfirming(true)}>Delete</button>}
    </QueueCard>
  )
}

// One account on the People page; role changes wait for Save, suspension is one click and reversible
function MemberCard({ member, you, churches, canManage, onSave, onSuspend }) {
  const [nextRole, setNextRole] = useState(member.role)
  const [church, setChurch] = useState(member.church_id || '')
  useEffect(() => { setNextRole(member.role); setChurch(member.church_id || '') }, [member.role, member.church_id])
  const manageable = canManage(member, member.role)
  const options = Object.keys(ROLE_LABELS).filter(r => r === member.role || canManage(member, r))
  const changed = nextRole !== member.role || (CHURCH_ROLES.includes(nextRole) && church !== (member.church_id || ''))
  const locked = you ? 'You can’t change your own account'
    : member.role === 'super_admin' ? 'The super admin is changed in the SQL editor'
    : 'Only the super admin can change admins'
  return (
    <QueueCard
      avatar={<div className={`company-icon ${member.suspended ? 'rose' : 'sage'}`}>{member.name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')}</div>}
      title={you ? `${member.name} (you)` : member.name}
      status={member.suspended ? 'Suspended' : ROLE_LABELS[member.role]}
      tone={member.suspended ? 'bad' : member.role === 'member' ? 'neutral' : 'ok'}
      sub={[member.email, member.phone, churches.find(c => c.id === member.church_id)?.name, `Joined ${new Date(member.joined).toLocaleDateString()}`, `${member.posts} ${Number(member.posts) === 1 ? 'post' : 'posts'}`].filter(Boolean).join(' · ')}
      footNote={!manageable && <><LockKeyhole size={15}/> {locked}</>}
    >
      {manageable && <>
        <select className="member-select" aria-label={`Role for ${member.name}`} value={nextRole} onChange={e => setNextRole(e.target.value)}>
          {options.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        {CHURCH_ROLES.includes(nextRole) && (
          <select className="member-select" aria-label={`Church for ${member.name}`} value={church} onChange={e => setChurch(e.target.value)}>
            <option value="">Choose church</option>
            {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <button className="approve-small" disabled={!changed} onClick={() => onSave(member, nextRole, church)}><Check size={15}/> Save</button>
        <button className="reject-small" onClick={() => onSuspend(member)}>
          {member.suspended ? <><RotateCcw size={15}/> Restore</> : <><Ban size={15}/> Suspend</>}
        </button>
      </>}
    </QueueCard>
  )
}

function Feature({ icon: Icon, title, desc, list }) {
  return (
    <article className="feature-card">
      <div className="feature-icon"><Icon size={23}/></div>
      <h3>{title}</h3>
      <p>{desc}</p>
      <ul>{list.map(item => <li key={item}><Check size={16}/>{item}</li>)}</ul>
    </article>
  )
}

// Google's standard multicolour "G", as its sign-in branding guidelines ask for
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

function Avatar({ account, className = '' }) {
  const [broken, setBroken] = useState(false)
  const initials = account.name.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
  return (
    <span className={`avatar ${className}`} aria-hidden="true">
      {account.photo && !broken
        ? <img src={account.photo} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)}/>
        : account.guest ? <UserRound size={18}/> : initials}
    </span>
  )
}

function FocusDialog({ as: Tag = 'div', className, label, children }) {
  const ref = useDialogFocus()
  return <Tag className={className} role="dialog" aria-modal="true" aria-label={label} ref={ref} tabIndex={-1}>{children}</Tag>
}

function Modal({ onClose, title, children }) {
  const ref = useDialogFocus()
  return (
    <div className="overlay centered-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="dialog" role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1}>
        <div className="dialog-top">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={21}/></button>
        </div>
        <div className="dialog-content">{children}</div>
      </section>
    </div>
  )
}
