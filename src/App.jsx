import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BadgeCheck, Bookmark, BriefcaseBusiness, Check,
  CheckCircle2, ChevronDown, ChevronRight, CircleHelp, ClipboardCheck,
  FilePenLine, FileText, Flag, HandHeart, HeartHandshake, Home,
  LockKeyhole, MapPin, Menu, MoreHorizontal, Plus, Search, ShieldCheck,
  SlidersHorizontal, UsersRound, LifeBuoy, KeyRound, X, RotateCcw, ExternalLink,
  Clock3, Mail, Building2, Eye, Send, Info, AlertTriangle, ShieldAlert,
  Calendar, CheckCheck, Scale, Lock, UserRound, Heart, Ban
} from 'lucide-react'
import { NAV, SAMPLE_JOBS, SAMPLE_VOLUNTEER, CAREER_SUPPORT_MODULES, TRUST_PILLARS, SAMPLE_VOUCH_REQUESTS, SAMPLE_CHURCHES, SAMPLE_MEMBERS, SAMPLE_APPLICATIONS } from './data'
import { supabase, api, toJob } from './supabase'
import { scanPost } from './scam'

const icons = {
  briefcase: BriefcaseBusiness, bookmark: Bookmark, sparkles: LifeBuoy,
  heart: HeartHandshake, users: UsersRound, shield: ShieldCheck,
  plus: Plus, file: FileText, check: ClipboardCheck, flag: Flag, badge: BadgeCheck
}
const NAMES = { seeker: 'Job seeker', employer: 'Employer', moderator: 'Moderator', church: 'Church Partner Admin', admin: 'Admin' }
const demoKey = 'ephworks-local-demo-v4'
const defaultDemo = {
  saved: [],
  tracked: [],
  interested: [],
  role: 'seeker',
  drafts: [], // jobs rows, same shape as public.jobs, so toJob() renders them
  reports: [],
  supportSessions: [],
  vouchQueue: SAMPLE_VOUCH_REQUESTS,
  members: SAMPLE_MEMBERS,
  applications: SAMPLE_APPLICATIONS
}

// [stored value, label]; values must match the reports.reason check in the migration
const REPORT_REASONS = [
  ['Request for payment / fee', 'Request for payment / fee (Illegal under UAE Labour Law)'],
  ['Suspicious or unverified employer contact', 'Suspicious or unverified employer contact'],
  ['Misleading job terms or salary', 'Misleading job terms or salary'],
  ['Potential discriminatory language', 'Potential discriminatory language'],
  ['Other trust & safety concern', 'Other trust & safety concern']
]
const JOB_STATUS = { pending: 'Pending moderator company verification', published: 'Live · verified with HR', rejected: 'Not approved by moderator' }
const VOUCH_STATUS = { pending: 'Awaiting church vouch', vouched: 'Vouched', declined: 'Declined' }
const DEMO_ME = 'demo-me' // the demo persona's own vouch request id
const EMPTY_VOUCH = { church: '', note: '' }
const ROLE_LABELS = { member: 'Member', volunteer: 'Volunteer mentor', moderator: 'Moderator', church_admin: 'Church admin', admin: 'Admin', super_admin: 'Super admin' }
const APPLY_ROLES = [
  ['volunteer', 'Volunteer mentor', 'Give free CV reviews, practice interviews or LinkedIn help to job seekers.'],
  ['church_admin', 'Church admin', 'Confirm which members of your church can post jobs. Only a yes/no is stored.']
]
const APP_STATUS = { pending: 'Waiting for review', approved: 'Approved', declined: 'Declined' }
const EMPTY_APPLY = { role: 'volunteer', church: '', name: '', note: '', agreed: false }
const EMPTY_DRAFT = { title: '', company: '', emirate: 'Dubai', type: 'Full-time', pay: '', email: '', portal: '', description: '' }

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
      supportSessions: Array.isArray(value.supportSessions) ? value.supportSessions : [],
      vouchQueue: Array.isArray(value.vouchQueue) ? value.vouchQueue : SAMPLE_VOUCH_REQUESTS,
      members: Array.isArray(value.members) ? value.members : SAMPLE_MEMBERS,
      applications: Array.isArray(value.applications) ? value.applications : SAMPLE_APPLICATIONS
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
function Empty({ icon: Icon = Bookmark, title, description }) { return <div className="empty"><span className="empty-symbol"><Icon size={28}/></span><h3>{title}</h3><p>{description}</p></div> }
function PageHeading({ eyebrow, title, desc, action }) { return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{desc && <p>{desc}</p>}</div>{action}</div> }
function SectionTitle({ title, subtitle, action }) { return <div className="section-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div> }
function Warning({ children, tone = '' }) { return <div className={`notice ${tone}`}><Info size={17} className="notice-icon"/><span>{children}</span></div> }

export default function App() {
  const [demo, setDemo] = useState(getSavedDemo)
  const [page, setPage] = useState('opportunities')
  const [selectedJob, setSelectedJob] = useState(null)
  const [showMobileMore, setShowMobileMore] = useState(false)
  const [search, setSearch] = useState('')
  const [emirate, setEmirate] = useState('All emirates')
  const [workType, setWorkType] = useState('Any work type')
  const [tab, setTab] = useState('all')
  const [banner, setBanner] = useState(null)
  const [showAbout, setShowAbout] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [removing, setRemoving] = useState(null) // post waiting for a remove confirmation
  const [showReport, setShowReport] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [selectedSupportService, setSelectedSupportService] = useState('cv-review')
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0][0])
  const [draftForm, setDraftForm] = useState(EMPTY_DRAFT)
  const [jobs, setJobs] = useState(supabase ? [] : SAMPLE_JOBS)
  const [session, setSession] = useState(null)
  const [server, setServer] = useState({ myJobs: [], queue: [], reports: [], posterVouches: {}, myVouch: null, vouchRequests: [], members: [], applications: [], interested: [], interestCounts: {} })
  const [churches, setChurches] = useState(supabase ? [] : SAMPLE_CHURCHES)
  const [vouchForm, setVouchForm] = useState(EMPTY_VOUCH)
  const [applyForm, setApplyForm] = useState(EMPTY_APPLY)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberFilter, setMemberFilter] = useState('all')
  const [showSignIn, setShowSignIn] = useState(false)
  const [signInEmail, setSignInEmail] = useState('')
  const [verifying, setVerifying] = useState(null)
  const [profile, setProfile] = useState({})
  const [sendingLink, setSendingLink] = useState(false)
  const linkInFlight = useRef(false)
  const [googleEnabled, setGoogleEnabled] = useState(false)
  const [supportForm, setSupportForm] = useState({ name: 'Jordan Morgan', service: 'cv-review', preferredTime: 'Weekday evening', note: '' })

  // With a backend, the Moderator, Church and Admin views are only offered to accounts whose profile says so.
  // Admins also moderate; suspended accounts get no extra views (the server refuses them anyway).
  const serverRoles = { moderator: ['moderator', 'admin', 'super_admin'], church: ['church_admin'], admin: ['admin', 'super_admin'] }
  const roleOptions = Object.entries(NAMES).filter(([key]) => !supabase || !serverRoles[key] || (!profile.suspended && serverRoles[key].includes(profile.role)))
  const role = roleOptions.some(([key]) => key === demo.role) ? demo.role : 'seeker'
  const nav = NAV[role]
  const currentNav = nav.find(n => n.id === page)
  const uid = session?.user.id

  // Real-time scam detection for the employer post form
  const draftScan = useMemo(() => scanPost(`${draftForm.title} ${draftForm.pay} ${draftForm.description}`, draftForm.email),
    [draftForm.title, draftForm.pay, draftForm.description, draftForm.email])

  // Without a backend, posts live in demo.drafts and join the sample jobs once a moderator publishes them
  const demoJobs = demo.drafts.map(toJob)
  const board = supabase ? jobs.filter(j => !server.members.some(m => m.suspended && m.id === j.employerId)) : [...demoJobs.filter(j => j.status === 'published' && j.daysLeft > 0), ...SAMPLE_JOBS]
  const myPosts = supabase ? server.myJobs : demoJobs
  // Your own interest; posters only see a count per post
  const interestedIds = supabase ? server.interested : demo.interested
  const interestCount = job => supabase ? server.interestCounts[job.id] || 0 : Number(demo.interested.includes(job.id))
  const queue = supabase ? server.queue : demoJobs.filter(j => j.status === 'pending')

  // The signed-in member's (or demo persona's) church vouch; null until requested
  const myVouch = supabase
    ? server.myVouch && { status: server.myVouch.status, church: churches.find(c => c.id === server.myVouch.church_id)?.name }
    : demo.vouchQueue.find(m => m.id === DEMO_ME) || null
  const posterVouched = job => (supabase ? server.posterVouches[job.employerId] : myVouch?.status) === 'vouched'
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
  const churchName = id => churches.find(c => c.id === id)?.name
  // Mirrors check_can_manage() in the migration, so controls only appear where the server would allow them
  const canManage = (member, nextRole) => member.id !== myId && member.role !== 'super_admin' && nextRole !== 'super_admin'
    && (myRole === 'super_admin' || (member.role !== 'admin' && nextRole !== 'admin'))
  const visibleMembers = members.filter(m =>
    (memberFilter === 'all' || (memberFilter === 'suspended' ? m.suspended : m.role === memberFilter)) &&
    `${m.name} ${m.email}`.toLowerCase().includes(memberSearch.trim().toLowerCase()))

  const visibleJobs = useMemo(() => board.filter(j =>
    (emirate === 'All emirates' || j.emirate === emirate) &&
    (workType === 'Any work type' || j.type === workType) &&
    (`${j.title} ${j.company} ${j.category}`.toLowerCase().includes(search.trim().toLowerCase())) &&
    (tab !== 'saved' || demo.saved.includes(j.id))
  ), [board, emirate, workType, search, tab, demo.saved])

  const updateDemo = patch => setDemo(prev => ({ ...prev, ...patch }))
  const notify = message => setBanner(message)
  const fail = err => notify(err.message)

  useEffect(() => {
    if (!supabase) return
    api.googleEnabled().then(setGoogleEnabled)
    // A cancelled or failed Google sign-in comes back with the reason in the URL
    const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search)
    if (params.get('error_description')) {
      notify(`Sign-in did not complete: ${params.get('error_description')}`)
      window.history.replaceState(null, '', window.location.pathname)
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  const moderates = role === 'moderator' || role === 'admin'
  // RLS decides what each list returns: moderators see the full queue, members only their own rows
  const refresh = () => supabase && Promise.all([
    api.liveJobs(),
    uid ? api.myJobs(uid) : [],
    uid && moderates ? api.pendingJobs() : [],
    uid && moderates ? api.reports() : [],
    uid && moderates ? api.posterVouches() : [],
    uid ? api.myVouch(uid) : null,
    uid && role === 'church' ? api.vouchRequests() : [],
    uid && serverRoles.admin.includes(profile.role) ? api.members() : [],
    uid ? api.applications() : [],
    uid ? api.myInterest(uid) : [],
    uid ? api.interestCounts() : {}
  ]).then(([live, mine, queue, reports, posters, myVouch, vouchRequests, members, applications, interested, interestCounts]) => {
    setJobs(live.map(toJob))
    setServer({
      myJobs: mine.map(toJob), queue: queue.map(toJob), reports, myVouch,
      posterVouches: Object.fromEntries(posters.map(p => [p.user_id, p.status])),
      vouchRequests: vouchRequests.filter(v => v.user_id !== uid), // admins can't vouch for themselves
      members, applications, interested, interestCounts
    })
  }).catch(err => notify(`Could not load from the server: ${err.message}`))

  useEffect(() => { refresh() }, [uid, role, profile.role])

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

  // Leave role-only pages if the view stops being available (e.g. after signing out)
  useEffect(() => {
    const owner = { review: 'moderator', reports: 'moderator', vouch: 'church', invite: 'church', people: 'admin', applications: 'admin' }[page]
    if (owner && owner !== role && !(owner === 'moderator' && role === 'admin')) setPage('opportunities')
  }, [role, page])

  // True (and opens sign-in) when a server action needs an account first
  const needsSignIn = () => {
    if (!supabase || session) return false
    setShowSignIn(true)
    return true
  }

  const signInWithGoogle = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    .then(({ error }) => error && fail(error))

  const signOut = () => supabase.auth.signOut().then(() => notify('Signed out.'))

  // Every send counts against the project's email quota, so block repeat clicks while one is in flight
  const sendSignInLink = e => {
    e.preventDefault()
    if (linkInFlight.current) return // a ref, because rapid clicks land before state re-renders
    linkInFlight.current = true
    setSendingLink(true)
    supabase.auth.signInWithOtp({ email: signInEmail.trim(), options: { emailRedirectTo: window.location.origin } })
      .then(({ error }) => {
        linkInFlight.current = false
        setSendingLink(false)
        if (error?.status === 429 || /rate limit/i.test(error?.message)) return notify('Too many sign-in emails were requested recently. Please wait a few minutes, then use the newest link in your inbox.')
        if (error) return fail(error)
        setShowSignIn(false)
        notify(`Sign-in link sent to ${signInEmail.trim()}. Open it on this device to continue.`)
      })
  }

  useEffect(() => { window.localStorage.setItem(demoKey, JSON.stringify(demo)) }, [demo])
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') {
        setSelectedJob(null); setShowMobileMore(false); setShowAbout(false);
        setShowReset(false); setShowReport(false); setShowSupportModal(false); setRemoving(null)
        setShowSignIn(false); setVerifying(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const modal = selectedJob || showMobileMore || showAbout || showReset || removing || showReport || showSupportModal || showSignIn || verifying
    document.body.classList.toggle('modal-open', Boolean(modal))
    return () => document.body.classList.remove('modal-open')
  }, [selectedJob, showMobileMore, showAbout, showReset, removing, showReport, showSupportModal, showSignIn, verifying])

  const go = id => { setPage(id); setShowMobileMore(false); setBanner(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const setRole = next => {
    updateDemo({ role: next })
    setPage({ moderator: 'review', church: 'vouch', admin: 'people' }[next] || 'opportunities')
    setShowMobileMore(false)
    notify(`Switched to ${NAMES[next]} demo view`)
  }
  const handleVouch = (id, status) => {
    const done = () => notify(status === 'vouched' ? 'Member vouched. Only a yes/no is stored, never belief or denomination data.' : 'Vouch request declined.')
    if (supabase) return api.decideVouch(id, status).then(() => { refresh(); done() }).catch(fail)
    updateDemo({ vouchQueue: demo.vouchQueue.map(m => m.id === id ? { ...m, status } : m) })
    done()
  }

  // Job posters ask their partner church to confirm they are known to the community before anything they post can go live
  const requestVouch = e => {
    e.preventDefault()
    const church = churches.find(c => c.id === vouchForm.church)
    if (!church) return notify('Choose your partner church first.')
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
    setDemo({ ...defaultDemo }); setPage('opportunities'); setSelectedJob(null); setSearch(''); setEmirate('All emirates'); setWorkType('Any work type'); setTab('all'); setShowReset(false); setShowMobileMore(false); notify('Demo reset. Your local sample activity was cleared.')
  }

  const submitDraft = e => {
    e.preventDefault()
    if (draftScan.blocked.length > 0) {
      return notify(`Auto-block triggered: Remove prohibited terms (${draftScan.blocked.join(', ')}) before saving.`)
    }
    const { title, company, emirate, type, pay, email, portal, description } = draftForm
    if ([title, company, pay, email, description].some(v => !v.trim())) return notify('Complete all required fields before saving the post.')
    const row = { title: title.trim(), company: company.trim(), emirate, type, salary: pay.trim(), description: description.trim(), direct_email: email.trim(), direct_portal: portal.trim() || null }
    const done = () => {
      setDraftForm(EMPTY_DRAFT)
      go('drafts')
      notify(myVouch?.status === 'vouched'
        ? 'Post submitted. A moderator will verify it with the employer’s HR before it goes live.'
        : 'Post saved. It stays unpublished until your church vouches for you and a moderator verifies it with HR.')
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

  const bookSupportSession = e => {
    e.preventDefault()
    const module = CAREER_SUPPORT_MODULES.find(m => m.id === selectedSupportService)
    const newSession = {
      id: `session-${Date.now()}`,
      service: module?.title || selectedSupportService,
      preferredTime: supportForm.preferredTime,
      note: supportForm.note,
      status: 'Matched with Volunteer HR Mentor'
    }
    updateDemo({ supportSessions: [newSession, ...demo.supportSessions] })
    setShowSupportModal(false)
    notify(`Volunteer session requested for ${module?.title}! A mentor will contact you for your session.`)
  }

  const applyFor = appRole => { setApplyForm({ ...EMPTY_APPLY, role: appRole }); go('apply') }

  const submitApplication = e => {
    e.preventDefault()
    if (supabase && needsSignIn()) return
    const { role: appRole, church, name, note } = applyForm
    if (appRole === 'church_admin' && !church) return notify('Choose the church you would vouch for.')
    const row = { role: appRole, church_id: appRole === 'church_admin' ? church : null, display_name: name.trim() || account.name, note: note.trim() }
    const already = 'You already have an application for this role waiting for review.'
    const done = () => { setApplyForm(EMPTY_APPLY); notify(`Application sent. An admin will contact you for a short check before approving you as ${ROLE_LABELS[appRole]}.`) }
    if (supabase) return api.apply(row).then(() => { refresh(); done() }).catch(err => notify(/one_open_application/.test(err.message) ? already : err.message))
    if (myApplications.some(a => a.role === appRole && a.status === 'pending')) return notify(already)
    updateDemo({ applications: [{ ...row, id: `app-${Date.now()}`, user_id: DEMO_ME, status: 'pending', created_at: new Date().toISOString() }, ...demo.applications] })
    done()
  }

  const decideApplication = (app, approve) => {
    const done = () => notify(approve ? `Approved. ${app.display_name} is now ${ROLE_LABELS[app.role]}; their new view appears next time they open Ephworks.` : 'Application declined.')
    if (supabase) return api.decideApplication(app.id, approve).then(() => { refresh(); done() }).catch(fail)
    updateDemo({
      applications: demo.applications.map(a => a.id === app.id ? { ...a, status: approve ? 'approved' : 'declined' } : a),
      members: approve ? demo.members.map(m => m.id === app.user_id ? { ...m, role: app.role, church_id: app.church_id } : m) : demo.members
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
    if (nextRole === 'church_admin' && !church) return notify('Choose the church this admin vouches for.')
    changeMember(member, { role: nextRole, church_id: nextRole === 'church_admin' ? church : null }, `${member.name}'s role is now ${ROLE_LABELS[nextRole]}.`)
  }
  const toggleSuspend = member => changeMember(member, { suspended: !member.suspended }, member.suspended
    ? `${member.name} is restored.`
    : `${member.name} is suspended. Their posts are hidden and they can't post, vouch, report or review.`)

  const updateDraft = (id, patch) => updateDemo({ drafts: demo.drafts.map(d => d.id === id ? { ...d, ...patch } : d) })

  // Publishing needs a vouched poster, no blocked terms, every scam flag checked with HR, and a verification note.
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

  const rejectJob = id => {
    const done = () => notify('Post rejected and removed from the queue.')
    if (supabase) return api.reviewJob(id, 'rejected', null).then(() => { refresh(); done() }).catch(fail)
    updateDraft(id, { status: 'rejected' })
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
  const account = !supabase ? { name: 'Jordan Morgan', detail: myVouch?.status === 'vouched' ? `Vouched member · ${myVouch.church}` : `Church vouch: ${VOUCH_STATUS[myVouch?.status]?.toLowerCase() || 'not requested'}` }
    : session ? { name: meta.full_name || meta.name || session.user.email.split('@')[0], detail: session.user.email, photo: meta.avatar_url || meta.picture }
    : { name: 'Guest', detail: 'Not signed in', guest: true }

  const reportRows = supabase
    ? server.reports.map(r => ({ id: r.id, title: r.jobs?.title, reason: r.reason, resolved: r.status === 'resolved', created: new Date(r.created_at).toLocaleString() }))
    : demo.reports.map(r => ({ ...r, title: SAMPLE_JOBS.find(x => x.id === r.jobId)?.title, resolved: r.status.includes('Resolved') }))

  const userMainNav = nav.slice(0, 3)

  return <div className="app-shell">
    <aside className="sidebar" aria-label="Main navigation">
      <Brand />
      <div className="side-label">Your workspace</div>
      <nav className="sidebar-nav">
        {nav.map(n => {
          const Icon = icons[n.icon] || BriefcaseBusiness
          return (
            <button key={n.id} type="button" className={`side-link ${page === n.id ? 'active' : ''}`} aria-current={page === n.id ? 'page' : undefined} onClick={() => go(n.id)}>
              <Icon size={18}/>
              <span>{n.label}</span>
              {n.id === 'interests' && (demo.saved.length + demo.tracked.length + interestedIds.length) > 0 && (
                <span className="count">{demo.saved.length + demo.tracked.length + interestedIds.length}</span>
              )}
              {n.id === 'applications' && pendingApplications > 0 && <span className="count">{pendingApplications}</span>}
            </button>
          )
        })}
      </nav>
      <div className="sidebar-profile">
        <Avatar account={account}/>
        <span>
          <strong>{account.name}</strong>
          <small>{account.detail}</small>
        </span>
      </div>
    </aside>

    <div className="body-area">
      <header className="topbar">
        <div className="mobile-brand"><Brand compact /></div>
        <div className="breadcrumb"><span>Workspace</span><ChevronRight size={15}/><strong>{currentNav?.label || 'Verified noticeboard'}</strong></div>
        <div className="header-actions">
          <div className="role-selector" role="group" aria-label="Preview as role">
            <span className="role-kicker">Demo view</span>
            {roleOptions.map(([key, label]) => (
              <button key={key} type="button" onClick={() => setRole(key)} className={role === key ? 'selected' : ''} aria-pressed={role === key}>
                {label}
              </button>
            ))}
          </div>
          <button className="icon-button help-button" aria-label="About this prototype" title="About this prototype" onClick={() => setShowAbout(true)}><CircleHelp size={19}/></button>
          <Avatar account={account} className="header-avatar"/>
        </div>
        <button className="mobile-account" aria-label="Open menu" aria-haspopup="dialog" aria-expanded={showMobileMore} onClick={() => setShowMobileMore(true)}>
          <Avatar account={account}/>
        </button>
      </header>

      <main className="main-content">
        <div className="pilot-strip">
          <span className="pilot-text"><b>Pilot.</b> You apply straight to the employer. We never store your CV.</span>
          <span className="pilot-actions">
            <button type="button" onClick={() => setShowAbout(true)}>Legal notes</button>
            <button type="button" onClick={() => setShowReset(true)}>Reset demo</button>
            {supabase && (session
              ? <button type="button" onClick={signOut}>Sign out</button>
              : <button type="button" onClick={() => setShowSignIn(true)}>Sign in</button>)}
          </span>
        </div>

        {supabase && profile.suspended && (
          <Warning tone="strong">Your account is suspended. You can browse the noticeboard, but you can't post, vouch, report or review. Contact the Ephworks team if you think this is a mistake.</Warning>
        )}

        {banner && (
          <div className="toast-banner" role="status">
            <CheckCircle2 size={18}/>
            <span>{banner}</span>
            <button aria-label="Dismiss notification" onClick={() => setBanner(null)}><X size={16}/></button>
          </div>
        )}

        {page === 'opportunities' && <>
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
                      {['All emirates', 'Dubai', 'Abu Dhabi', 'Sharjah'].map(x => <option key={x}>{x}</option>)}
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
              <button className="primary-button" onClick={() => go('career')}>Book a volunteer <ArrowRight size={16}/></button>
            </div>
            <figure className="support-photo">
              <img src="/images/mentor.webp" loading="lazy" decoding="async" alt="A volunteer mentor marking up a printed CV with a young job seeker" width="1200" height="896"/>
              <figcaption className="glass-card float-badge"><FileText size={18}/> CV review · Mock interview · LinkedIn</figcaption>
            </figure>
          </section>

          <section id="opp-list" className="opportunity-section">
            <SectionTitle title="Verified UAE opportunities" subtitle="Direct applications to employers • 30-day freshness guarantee" />
            <div className="filters">
              <label className="search-box">
                <Search size={19}/>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search verified jobs, companies, or skills" aria-label="Search opportunities"/>
              </label>
              <label className="select-box">
                <span>Filter by emirate</span>
                <select value={emirate} onChange={e => setEmirate(e.target.value)}>
                  {['All emirates','Dubai','Abu Dhabi','Sharjah'].map(x => <option key={x}>{x}</option>)}
                </select>
              </label>
              <label className="select-box">
                <span>Employment type</span>
                <select value={workType} onChange={e => setWorkType(e.target.value)}>
                  {['Any work type', 'Full-time', 'Part-time'].map(x => <option key={x}>{x}</option>)}
                </select>
              </label>
            </div>

            <div className="listing-header">
              <div className="tab-list" role="group" aria-label="Show roles">
                <button type="button" aria-pressed={tab === 'all'} className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>
                  All verified roles
                </button>
                <button type="button" aria-pressed={tab === 'saved'} className={tab === 'saved' ? 'active' : ''} onClick={() => setTab('saved')}>
                  Saved <span className="tab-count">{demo.saved.length}</span>
                </button>
              </div>
              <span className="result-count">{visibleJobs.length} verified {visibleJobs.length === 1 ? 'role' : 'roles'}</span>
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
                />
              )) : <Empty title="No verified roles match" description="Try a different keyword or change your filters." icon={Search}/>}
            </div>

            <div className="disclaimer-foot">
              <ShieldCheck size={18}/> Ephworks Phase 1 Noticeboard: In compliance with UAE MOHRE guidelines, applications are submitted directly to the verified employer. We never store candidate CVs, charge worker fees, or offer paid placements.
            </div>
          </section>
        </>}

        {page === 'career' && <>
          <PageHeading
            eyebrow="Pillar 3 · Real support"
            title="Get ready for the job, not just the search."
            desc="Unlike generic job boards, Ephworks provides real, free support from volunteer HR professionals, hiring managers, and career mentors."
            action={
              <button className="primary-button" onClick={() => { setSelectedSupportService('cv-review'); setShowSupportModal(true) }}>
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
                    onClick={() => { setSelectedSupportService(mod.id); setShowSupportModal(true) }}
                  >
                    Book this session <ArrowRight size={16}/>
                  </button>
                </footer>
              </article>
            ))}
          </div>

          {demo.supportSessions.length > 0 && (
            <div className="plain-card stack-gap">
              <h3>My Requested Volunteer Sessions</h3>
              {demo.supportSessions.map(s => (
                <div className="mini-row" key={s.id}>
                  <CheckCircle2 size={19}/>
                  <div>
                    <strong>{s.service}</strong>
                    <small>Preferred: {s.preferredTime} · Status: {s.status}</small>
                  </div>
                  <Pill type="mint">Active Request</Pill>
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
          <PageHeading
            eyebrow="Your tracked activity"
            title="My tracked roles & applications"
            desc="Roles you're interested in, saved, or applied to directly with employers. Saved and applied roles stay in this browser. Interest is kept with your account when you're signed in, and employers only ever see a count."
          />
          <SectionTitle title="Roles you're interested in" subtitle={`${interestedIds.length} ${interestedIds.length === 1 ? 'role' : 'roles'} marked with I'm interested`}/>
          {interestedIds.length ? (
            <div className="job-list">
              {board.filter(j => interestedIds.includes(j.id)).map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  saved={demo.saved.includes(job.id)}
                  tracked={demo.tracked.includes(job.id)}
                  onSave={() => toggleSave(job.id)}
                  onOpen={() => setSelectedJob(job)}
                  interested
                  onInterest={() => toggleInterest(job.id)}
                />
              ))}
            </div>
          ) : <Empty title="No roles marked yet" description="Tap I'm interested on any role on the noticeboard to keep it here." icon={Heart}/>}

          <div className="spacer-24"/>
          <SectionTitle title="Roles marked as applied" subtitle={`${demo.tracked.length} roles you applied to directly`}/>
          {demo.tracked.length ? (
            <div className="job-list">
              {board.filter(j => demo.tracked.includes(j.id)).map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  saved={demo.saved.includes(job.id)}
                  tracked={true}
                  onSave={() => toggleSave(job.id)}
                  onOpen={() => setSelectedJob(job)}
                  interested={interestedIds.includes(job.id)}
                  onInterest={() => toggleInterest(job.id)}
                />
              ))}
            </div>
          ) : <Empty title="No applications tracked yet" description="When you apply directly to a role, click 'Mark as applied' in the role view to track it here." icon={ClipboardCheck}/>}

          <div className="spacer-24"/>
          <SectionTitle title="Saved opportunities" subtitle={`${demo.saved.length} roles bookmarked`}/>
          {demo.saved.length ? (
            <div className="job-list">
              {board.filter(j => demo.saved.includes(j.id)).map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  saved
                  tracked={demo.tracked.includes(job.id)}
                  onSave={() => toggleSave(job.id)}
                  onOpen={() => setSelectedJob(job)}
                  interested={interestedIds.includes(job.id)}
                  onInterest={() => toggleInterest(job.id)}
                />
              ))}
            </div>
          ) : <Empty title="Nothing saved yet" description="Save a verified role from the noticeboard to keep it here." icon={Bookmark}/>}
        </>}

        {page === 'volunteering' && <>
          <PageHeading
            eyebrow="Community giving"
            title="Small acts. Real community."
            desc="Give your time to support job seekers, welcome newcomers, or assist with mock interviews."
            action={<button className="primary-button" onClick={() => applyFor('volunteer')}><HandHeart size={16}/> Apply to volunteer</button>}
          />
          <div className="feature-grid">
            {SAMPLE_VOLUNTEER.map(v => (
              <div className="feature-card" key={v.title}>
                <div className="feature-icon"><HandHeart size={22}/></div>
                <h3>{v.title}</h3>
                <p>{v.summary}</p>
                <div className="volunteer-meta"><MapPin size={15}/>{v.location}</div>
                <div className="volunteer-meta"><Clock3 size={15}/>{v.commitment}</div>
                <Pill type="subtle">Community volunteer role</Pill>
              </div>
            ))}
          </div>
          <Warning>
            Volunteer participation is community-run and non-profit. All volunteers complete orientation and safety checks.
          </Warning>
        </>}

        {page === 'churches' && <>
          <PageHeading
            eyebrow="Pillar 1 · Verified people"
            title="Church vouching, peer trust & UAE legal compliance"
            desc="How our decentralized vouching circle creates trust without discrimination or sensitive data exposure."
            action={
              <button className="primary-button" onClick={() => setRole('church')}>
                <UsersRound size={16}/> Preview Church Admin Portal
              </button>
            }
          />
          <div className="feature-grid">
            <Feature
              icon={UsersRound}
              title="Verified People, Not Fake Agents"
              desc="Every member is vouched by a recognized partner church, keeping predatory recruitment agents, ghost posters, and scammers out of our community circle."
              list={[
                'Peer trust replaces impersonal social media chaos',
                'Zero scraper access: directory is fully private',
                'Scammers and fee-charging middlemen are blocked'
              ]}
            />
            <Feature
              icon={Scale}
              title="UAE Anti-Discrimination Law"
              desc="Church vouching is used strictly to verify individual identity and honest character — NOT as a faith-based criterion for who can browse or work."
              list={[
                'No religious requirements in any job post',
                'Open, non-discriminatory community noticeboard',
                'In full accordance with Federal Decree-Law No. 2 of 2015'
              ]}
            />
            <Feature
              icon={Lock}
              title="Data Minimization under UAE Data Law"
              desc="Church affiliation is sensitive personal data under UAE Data Protection Law (Federal Decree-Law No. 45/2021). We collect minimal data."
              list={[
                'Only a binary vouch verification confirmation is stored',
                'No denominational or religious tracking recorded',
                'Zero member profiling or external data sharing'
              ]}
            />
          </div>

          <div className="plain-card">
            <h3>How Church Vouching Works in Practice</h3>
            <p className="card-lede">
              When a new member registers, their local congregation administrator simply confirms: <em>"Yes, Jordan Morgan is known to our community."</em>
              This simple human touchpoint completely eliminates the fake profiles, automated bots, and scam brokers that plague Facebook job groups.
            </p>
            <div className="card-actions">
              <button className="secondary-button" onClick={() => setRole('church')}>
                <UsersRound size={15}/> Switch to Church Partner Workspace <ArrowRight size={14}/>
              </button>
            </div>
          </div>
          <div className="spacer-24"/>
          <Warning tone="strong">
            Phase 1 Pilot notice: Ephworks is a community noticeboard. No recruitment matching or CV forwarding is performed. All real-world deployment requires ongoing UAE counsel review.
          </Warning>
        </>}

        {page === 'post' && <>
          <PageHeading
            eyebrow="Pillar 2 · Verified jobs"
            title="Post a verified opportunity"
            desc="Draft an opportunity for your company. All posts are checked directly with HR and audited by our anti-scam engine."
          />
          {supabase && profile.suspended ? <Empty icon={Ban} title="Paused on your account" description="This is switched off while your account is suspended."/> : <>
          <section className="plain-card vouch-panel" aria-labelledby="vouch-title">
            <div className="cta-row">
              <div className="feature-icon"><UsersRound size={22}/></div>
              <div className="cta-row-body">
                <h3 id="vouch-title">Church membership verification</h3>
                <p>
                  {!myVouch ? 'Before anything you post can go live, your partner church confirms you are known to the community. Only a yes/no is stored, never belief or denomination data.'
                    : myVouch.status === 'pending' ? `Waiting for ${myVouch.church} to confirm you. You can still write posts; they stay unpublished until then. Picked the wrong church? Send the request again below.`
                    : myVouch.status === 'vouched' ? `${myVouch.church} has vouched for you. Your posts go straight to moderator HR verification.`
                    : `${myVouch.church} could not confirm you. Check you chose the right church, add a note, and ask again.`}
                </p>
              </div>
              <span className={`status-chip ${myVouch ? myVouch?.status === 'vouched' ? 'ok' : myVouch?.status === 'declined' ? 'bad' : 'pending' : 'pending'}`}>{myVouch ? VOUCH_STATUS[myVouch.status] : 'Not requested'}</span>
            </div>
            {myVouch?.status !== 'vouched' && (
              <form className="booking-form vouch-form" onSubmit={requestVouch}>
                <label>
                  Your partner church
                  <select required value={vouchForm.church} onChange={e => setVouchForm({ ...vouchForm, church: e.target.value })}>
                    <option value="">Choose a church</option>
                    {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <label>
                  Note for your church admin (optional)
                  <input maxLength={300} placeholder="e.g. How the admin knows you and the company you hire for" value={vouchForm.note} onChange={e => setVouchForm({ ...vouchForm, note: e.target.value })}/>
                </label>
                <button className="primary-button" type="submit"><Send size={16}/> {myVouch ? 'Send request again' : 'Request church vouch'}</button>
              </form>
            )}
          </section>
          <div className="form-panel">
            {/* Live Auto-Block Scam Engine Banner */}
            {draftScan.blocked.length > 0 ? (
              <div className="auto-block-box">
                <ShieldAlert size={26}/>
                <div>
                  <strong>Auto-block active: prohibited fee or scam terms detected</strong>
                  Your post contains prohibited keywords: <u>{draftScan.blocked.join(', ')}</u>.
                  <ul>
                    <li>Under UAE Labour Law, employers and recruiters are strictly prohibited from charging candidates any fees, deposits, or visa costs.</li>
                    <li>Ephworks auto-blocks all posts requesting payment, deposits, or visa charges.</li>
                    <li>Please remove all mention of candidate fees to enable submission.</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="auto-block-clean">
                <CheckCircle2 size={16}/> Auto-block scam scan: 0 fee or payment triggers detected. Post complies with UAE Labour Law anti-fee rules.
              </div>
            )}
            {draftScan.flags.length > 0 && (
              <Warning tone="strong">
                A moderator will check these with HR before publishing: {draftScan.flags.join('; ')}.
              </Warning>
            )}

            <form className="post-form" onSubmit={submitDraft}>
              <label>
                Job title
                <input maxLength={95} placeholder="e.g. Office Coordinator" value={draftForm.title} onChange={e => setDraftForm({ ...draftForm, title: e.target.value })} required/>
              </label>
              <label>
                Company name
                <input maxLength={95} placeholder="e.g. Cedar Lane Services" value={draftForm.company} onChange={e => setDraftForm({ ...draftForm, company: e.target.value })} required/>
              </label>
              <div className="form-two">
                <label>
                  Emirate
                  <select value={draftForm.emirate} onChange={e => setDraftForm({ ...draftForm, emirate: e.target.value })}>
                    <option>Dubai</option>
                    <option>Abu Dhabi</option>
                    <option>Sharjah</option>
                  </select>
                </label>
                <label>
                  Work type
                  <select value={draftForm.type} onChange={e => setDraftForm({ ...draftForm, type: e.target.value })}>
                    <option>Full-time</option>
                    <option>Part-time</option>
                  </select>
                </label>
              </div>
              <label>
                Monthly compensation
                <input maxLength={95} placeholder="e.g. AED 5,000 – 7,000 (Candidate must never be charged fees)" value={draftForm.pay} onChange={e => setDraftForm({ ...draftForm, pay: e.target.value })} required/>
              </label>
              <div className="form-two">
                <label>
                  Direct application email
                  <input type="email" maxLength={254} placeholder="careers@company.ae" value={draftForm.email} onChange={e => setDraftForm({ ...draftForm, email: e.target.value })} required/>
                </label>
                <label>
                  Careers page (optional)
                  <input type="url" pattern="https://.*" maxLength={500} placeholder="https://company.ae/careers" value={draftForm.portal} onChange={e => setDraftForm({ ...draftForm, portal: e.target.value })}/>
                </label>
              </div>
              <label>
                Role description & direct application instructions
                <textarea
                  rows={5}
                  minLength={20}
                  maxLength={1600}
                  placeholder="Describe the opportunity. Provide direct employer email or website portal. Note: Auto-block stops any mention of fees, visa charges, or deposits."
                  value={draftForm.description}
                  onChange={e => setDraftForm({ ...draftForm, description: e.target.value })}
                  required
                />
              </label>

              <div className="law-notice">
                <Clock3 size={15}/> <strong>30-Day Freshness Guarantee:</strong> Approved posts expire automatically after 30 days so seekers never see dead or obsolete vacancies.
              </div>

              <button className="primary-button" type="submit" disabled={draftScan.blocked.length > 0}>
                <FilePenLine size={17}/> Save post for moderator HR verification
              </button>
            </form>
          </div>
          </>}
        </>}

        {page === 'drafts' && <>
          <PageHeading
            eyebrow="Employer workspace"
            title="My posted opportunities"
            desc="Track the moderation and verification status of your company listings."
            action={<button className="primary-button" onClick={() => go('post')}><Plus size={17}/> New post</button>}
          />
          {supabase && !session ? (
            <Empty icon={KeyRound} title="Sign in to see your posts" description="Use the Sign in link at the top of the page. Your posts and their verification status appear here."/>
          ) : myPosts.length ? (
            <div className="job-list">
              {myPosts.map(d => (
                <div className="draft-card" key={d.id}>
                  <div>
                    <Pill type="subtle">{JOB_STATUS[d.status] || d.status}</Pill>
                    <span className="tag-badge expiry">{d.status === 'published' ? `Expires in ${d.daysLeft} days` : 'Expires 30 days after approval'}</span>
                    <h3>{d.title}</h3>
                    <p>{d.company} · {d.emirate} · {d.type}</p>
                    <small>{d.salary} / month</small>
                    <div className="draft-desc">{d.description}</div>
                    <div className="audit-line">
                      <CheckCircle2 size={14}/>
                      Passed fee and payment-scam check
                    </div>
                    {d.status === 'published' && (
                      <div className="audit-line">
                        <Heart size={14}/>
                        {interestCount(d)} {interestCount(d) === 1 ? 'person' : 'people'} interested · names are never shared
                      </div>
                    )}
                    {d.status === 'pending' && (
                      <div className="audit-line waiting">
                        <Clock3 size={14}/>
                        {myVouch?.status === 'vouched' ? 'Waiting for moderator HR verification' : 'Waiting for your church vouch, then moderator HR verification'}
                      </div>
                    )}
                  </div>
                  <button className="secondary-button" onClick={() => setRemoving(d)}>
                    Remove post
                  </button>
                </div>
              ))}
            </div>
          ) : <Empty icon={FileText} title="No posts yet" description="Post an opportunity to see how employer verification and the 30-day lifecycle works."/>}
        </>}

        {page === 'review' && <>
          <PageHeading
            eyebrow="Moderator workspace"
            title="Job verification queue"
            desc="Moderators check every role directly with the hiring company before it goes live. Zero scam or fee posts permitted."
          />
          <div className="rp">
            <div className="rp-head"><ShieldCheck size={16}/> Moderator verification protocol</div>
            <ol className="rp-steps rp-four">
              <li><b>1</b><span>Poster vouched by their church</span></li>
              <li><b>2</b><span>Fee and scam checks passed</span></li>
              <li><b>3</b><span>Direct HR contact confirmed</span></li>
              <li><b>4</b><span>30-day expiry timer started</span></li>
            </ol>
          </div>

          {supabase && !session ? <Empty icon={KeyRound} title="Sign in to moderate" description="Sign in with a moderator account to see posts waiting for HR verification."/>
          : queue.length ? (
            <div className="review-list">
              {queue.map(j => (
                <ReviewCard
                  key={j.id}
                  job={j}
                  vouched={posterVouched(j)}
                  scan={scanJob(j)}
                  onView={() => setSelectedJob(j)}
                  onReject={() => rejectJob(j.id)}
                  onConfirm={() => setVerifying({ job: j, note: '', flagsChecked: false })}
                />
              ))}
            </div>
          ) : <Empty icon={ClipboardCheck} title="Queue is clear" description={supabase
            ? "New employer posts appear here until a moderator verifies them with HR. Only moderator accounts see other employers' posts."
            : 'Switch to the Employer view and post a sample job; it waits here for church vouching and HR verification.'}/>}
        </>}

        {page === 'reports' && <>
          <PageHeading
            eyebrow="Safety team"
            title="Reports & Follow-up queue"
            desc="Unlike unmoderated social media, our safety team actively follows up with reporters and employers on every flag."
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
          ) : <Empty icon={Flag} title="No open safety reports" description="When a member flags a job with fees or misleading information, the safety team queue displays it here."/>}
        </>}

        {page === 'apply' && <>
          <PageHeading
            eyebrow="Join the team"
            title="Apply to help run Ephworks"
            desc="Every role is free and unpaid. An admin checks each application, usually with a short call, before giving anyone extra access. Moderators are invited by the Ephworks team."
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
              <label>
                Your church
                <select required value={applyForm.church} onChange={e => setApplyForm({ ...applyForm, church: e.target.value })}>
                  <option value="">Choose a church</option>
                  {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
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
                  sub={[churchName(a.church_id), `Sent ${new Date(a.created_at).toLocaleDateString()}`].filter(Boolean).join(' · ')}
                  note={a.note}
                />
              ))}
            </div>
          </>}
        </>}

        {page === 'people' && <>
          <PageHeading
            eyebrow="Admin"
            title="People"
            desc="Everyone with an Ephworks account. Change roles, or suspend an account that breaks the rules. Only the super admin can appoint admins."
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
                const blocked = !applicant ? 'Account no longer exists'
                  : applicant.id === myId ? 'You can’t decide your own application'
                  : applicant.suspended ? 'Restore this account before deciding'
                  : !canManage(applicant, a.role) ? 'Only the super admin can decide this one' : null
                return (
                  <QueueCard
                    key={a.id}
                    avatar={<div className="company-icon blue">{a.display_name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')}</div>}
                    title={a.display_name}
                    status={APP_STATUS[a.status]}
                    tone={a.status === 'approved' ? 'ok' : a.status === 'declined' ? 'bad' : 'pending'}
                    sub={[`Wants to be ${ROLE_LABELS[a.role]}`, churchName(a.church_id), applicant?.email, new Date(a.created_at).toLocaleDateString()].filter(Boolean).join(' · ')}
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

        {page === 'guidelines' && <>
          <PageHeading
            eyebrow="Legal & safety standards"
            title="Ephworks Community & Legal Standards"
            desc="Our policies ensure full adherence to UAE MOHRE recruitment laws, Anti-Discrimination statutes, and Data Protection standards."
          />
          <div className="feature-grid">
            <Feature
              icon={CheckCircle2}
              title="Noticeboard vs Recruitment Agency"
              desc="Even if free, forwarding CVs, shortlisting, or matching can be classified as recruitment under UAE MOHRE regulations. Ephworks is strictly a direct noticeboard in Phase 1."
              list={[
                'Job seekers apply direct to the employer',
                'No candidate CVs stored or screened on platform',
                'Matching deferred until MOHRE licensed partnership'
              ]}
            />
            <Feature
              icon={ShieldAlert}
              title="Zero-Fee & Anti-Scam Rules"
              desc="Charging job seekers any fee, visa cost, deposit, or application charge is illegal under UAE Labour Law. Automatic keyword filters enforce this."
              list={[
                'Instant auto-blocking of fee-related terms',
                'Moderators verify legitimate employer payroll',
                'Immediate blacklisting of fee-charging agents'
              ]}
            />
            <Feature
              icon={Clock3}
              title="30-Day Freshness Guarantee"
              desc="Dead postings and zombie ads waste job seekers' emotional energy. All opportunities auto-purge after 30 days."
              list={[
                '30-day maximum listing lifespan',
                'Employers must re-verify if position reopens',
                'Noticeboard stays 100% active and relevant'
              ]}
            />
          </div>
        </>}

        {page === 'vouch' && <>
          <PageHeading
            eyebrow="Pillar 1 · Verified people"
            title="Congregation Member Vouch Queue"
            desc="Review and vouch for members from your local church community. Keeps out fake recruiter agents and scammers while ensuring data privacy."
            action={
              <button className="primary-button" onClick={() => go('invite')}>
                <KeyRound size={16}/> Get church invite pass
              </button>
            }
          />
          <div className="rp">
            <div className="rp-head"><ShieldCheck size={16}/> Active church admin: {supabase ? adminChurch : SAMPLE_CHURCHES[0].name}</div>
            <ol className="rp-steps rp-two">
              <li><b><ShieldCheck size={13}/></b><span>Zero denomination data stored</span></li>
              <li><b><ShieldCheck size={13}/></b><span>UAE Data Law compliant</span></li>
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
                    <button className="reject-small" disabled={declined} onClick={() => handleVouch(m.id, 'declined')}><X size={15}/> Decline</button>
                    <button className="approve-small" disabled={vouched} onClick={() => handleVouch(m.id, 'vouched')}>
                      <Check size={15}/> {vouched ? 'Vouched' : 'Vouch for member'}
                    </button>
                  </QueueCard>
                )
              })}
            </div>
          ) : <Empty icon={UsersRound} title="No vouch requests" description="When members of your church ask to be vouched for, they appear here."/>}
        </>}

        {page === 'invite' && <>
          <PageHeading
            eyebrow="Church partner workspace"
            title="Congregation Invite Passcode"
            desc="Provide a secure pass to church members. Keeps the trusted circle private and immune to web scrapers."
          />
          <div className="plain-card narrow-card">
            <div className="cta-row">
              <div className="feature-icon"><KeyRound size={22}/></div>
              <div>
                <h3>St. Luke's Dubai Community Access Pass</h3>
                <p>
                  Share this pass during Sunday announcements, bulletin, or community WhatsApp circle.
                </p>
              </div>
            </div>

            <div className="passcode-container">
              <span className="passcode-label">Official congregation passcode</span>
              <div className="passcode-code">EPH-STLUKE-2026-TRUST</div>
              <div className="passcode-actions">
                <button
                  className="primary-button"
                  onClick={() => notify('Congregation invite pass copied! Share this privately with church members.')}
                >
                  <ClipboardCheck size={16}/> Copy invite link & code
                </button>
              </div>
            </div>

            <div className="info-pair">
              <div className="info-tile">
                <strong>
                  <ShieldCheck size={16}/> Anti-Scraping Protection
                </strong>
                <p>
                  Facebook groups allow automated bots to scrape member phone numbers. Ephworks invite passes keep the directory completely private.
                </p>
              </div>
              <div className="info-tile">
                <strong>
                  <LockKeyhole size={16}/> 14-Day Cycle Rotation
                </strong>
                <p>
                  Passcodes refresh periodically to ensure only active, verified community members maintain access.
                </p>
              </div>
            </div>
          </div>
        </>}

        {page === 'privacyAudit' && <>
          <PageHeading
            eyebrow="Governance & compliance"
            title="UAE Legal & Privacy Architecture"
            desc="How Ephworks complies with UAE Anti-Discrimination Law, Personal Data Protection Law, and MOHRE regulations."
          />
          <div className="plain-card stack-gap">
            <h3>Data Footprint & Safety Comparison</h3>
            <p className="card-lede">
              Audit proving Ephworks collects minimum sensitive data compared to unmoderated groups or generic boards.
            </p>
            <div className="table-responsive">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Data Category</th>
                    <th>Facebook Job Group</th>
                    <th>Generic Recruitment Site</th>
                    <th>Ephworks Trusted Circle</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Religious Beliefs / Denomination</strong></td>
                    <td>Scraped in comments & threads</td>
                    <td>Often collected in demographic surveys</td>
                    <td className="good-cell">Never stored (binary vouch token only)</td>
                  </tr>
                  <tr>
                    <td><strong>Candidate CV Storage</strong></td>
                    <td>Shared openly on public walls</td>
                    <td>Stored & monetized on central DB</td>
                    <td className="good-cell">Never stored (direct employer application)</td>
                  </tr>
                  <tr>
                    <td><strong>Anti-Scam Protection</strong></td>
                    <td>None (Bogus agents post fee scams)</td>
                    <td>Post-incident reporting only</td>
                    <td className="good-cell">Real-time auto-block (fees and deposits blocked)</td>
                  </tr>
                  <tr>
                    <td><strong>Member Scraping</strong></td>
                    <td>Publicly scrapable by headhunters</td>
                    <td>Subject to data brokers</td>
                    <td className="good-cell">Zero scraping (closed community circle)</td>
                  </tr>
                  <tr>
                    <td><strong>Listing Freshness</strong></td>
                    <td>Dead posts linger for years</td>
                    <td>Outdated ghost jobs</td>
                    <td className="good-cell">30-day auto-purge (guaranteed fresh)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="feature-grid">
            <Feature
              icon={Scale}
              title="Federal Decree-Law No. 2 of 2015"
              desc="Ephworks strictly abides by UAE Anti-Discrimination Law. Church vouching verifies peer identity, never religious qualification."
              list={[
                'No religious condition in job listings',
                'Universal noticeboard browsing for all',
                'Fair, objective community safeguards'
              ]}
            />
            <Feature
              icon={Lock}
              title="Federal Decree-Law No. 45/2021"
              desc="Personal Data Protection Law compliance through minimal data retention and cryptographic privacy."
              list={[
                'Church membership is treated as sensitive',
                'Only minimal binary validation stored',
                'Zero commercialization or sale of user data'
              ]}
            />
            <Feature
              icon={ShieldCheck}
              title="Federal Decree-Law No. 33/2021"
              desc="UAE Labour Relations Law: Prohibition of charging worker fees or recruitment agency commissions."
              list={[
                'Strict auto-blocking of candidate fee requests',
                'Moderator check with employer payroll',
                'Phase 1 noticeboard model ensures MOHRE safety'
              ]}
            />
          </div>
        </>}

        {page === 'profile' && <>
          <PageHeading eyebrow="Demo profile" title="Your trusted identity & privacy" desc="Explore how Ephworks protects member identity and minimizes sensitive data."/>
          <div className="profile-card">
            <div className="profile-top">
              <Avatar account={account} className="big"/>
              <div>
                <h2>{account.name}</h2>
                <p>{account.detail}</p>
              </div>
            </div>
            <div className="profile-grid">
              <div>
                <span>Community Vouch Status</span>
                {myVouch?.status === 'vouched'
                  ? <strong className="good-text"><Check size={15}/> Vouched by {myVouch.church}</strong>
                  : <strong>{VOUCH_STATUS[myVouch?.status] || 'Not requested yet'}</strong>}
              </div>
              <div>
                <span>Data Minimization</span>
                <strong>Zero sensitive denomination data stored</strong>
              </div>
              <div>
                <span>Member Scraping Protection</span>
                <strong>Protected walled circle (Anti-scraping)</strong>
              </div>
              <div>
                <span>CV Storage</span>
                <strong>None stored (Direct employer application)</strong>
              </div>
            </div>
            <button className="secondary-button" onClick={() => setShowReset(true)}>
              <RotateCcw size={17}/> Reset local demo state
            </button>
          </div>
        </>}

        <footer className="footer">
          <span>Ephworks · Free for everyone, always · Verified People. Verified Jobs. Real Support.</span>
          <button onClick={() => setShowAbout(true)}>Product architecture & legal context <ArrowRight size={14}/></button>
        </footer>
      </main>
    </div>

    {/* Mobile Navigation */}
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {userMainNav.map(n => {
        const Icon = icons[n.icon] || BriefcaseBusiness
        return (
          <button key={n.id} aria-label={n.label} title={n.label} aria-current={page === n.id ? 'page' : undefined} className={page === n.id ? 'active' : ''} onClick={() => go(n.id)}>
            <span className="nav-pill"><Icon size={24} aria-hidden="true"/></span>
          </button>
        )
      })}
      <button aria-label="More" title="More" className={showMobileMore || (!userMainNav.some(n => n.id === page)) ? 'active' : ''} onClick={() => setShowMobileMore(true)} aria-haspopup="dialog" aria-expanded={showMobileMore}>
        <span className="nav-pill"><Menu size={24} aria-hidden="true"/></span>
      </button>
    </nav>

    {/* Mobile More Sheet */}
    {showMobileMore && (
      <div className="overlay mobile-more-overlay" onMouseDown={e => e.target === e.currentTarget && setShowMobileMore(false)}>
        <FocusDialog className="more-sheet" label="Menu">
          <div className="sheet-handle" aria-hidden="true"/>
          <div className="sheet-account">
            <Avatar account={account}/>
            <div>
              <strong>{account.name}</strong>
              <small>{account.detail}</small>
            </div>
            <button className="icon-button" onClick={() => setShowMobileMore(false)} aria-label="Close menu"><X size={20}/></button>
          </div>

          {nav.length > userMainNav.length && <>
            <p className="sheet-label">More pages</p>
            <div className="sheet-items">
              {nav.slice(userMainNav.length).map(n => {
                const Icon = icons[n.icon] || BriefcaseBusiness
                return (
                  <button key={n.id} className={page === n.id ? 'active' : ''} aria-current={page === n.id ? 'page' : undefined} onClick={() => go(n.id)}>
                    <span className="sheet-icon"><Icon size={19} aria-hidden="true"/></span>{n.label}<ChevronRight size={16} aria-hidden="true"/>
                  </button>
                )
              })}
            </div>
          </>}

          <p className="sheet-label">Demo view</p>
          <div className="sheet-roles" role="group" aria-label="Preview as role">
            {roleOptions.map(([key, label]) => (
              <button key={key} type="button" className={role === key ? 'selected' : ''} aria-pressed={role === key} onClick={() => setRole(key)}>{label}</button>
            ))}
          </div>

          <div className="sheet-links">
            <button onClick={() => { setShowMobileMore(false); setShowAbout(true) }}><CircleHelp size={18} aria-hidden="true"/> About Ephworks & legal notes</button>
            <button onClick={() => { setShowMobileMore(false); setShowReset(true) }}><RotateCcw size={18} aria-hidden="true"/> Reset demo</button>
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
              <span className="tag-badge verified"><ShieldCheck size={13}/> Verified with Company HR</span>
              <span className="tag-badge expiry"><Clock3 size={13}/> Expires in {selectedJob.daysLeft} days (30d purge)</span>
              <span className="tag-badge secure"><Scale size={13}/> Zero candidate fees guaranteed</span>
            </div>

            <div className={`company-icon large ${selectedJob.hue}`}>{selectedJob.initials}</div>
            <h2>{selectedJob.title}</h2>
            <p className="drawer-company">{selectedJob.company} · {selectedJob.emirate}, UAE · Verified Employer</p>

            <div className="detail-grid">
              <div><span>Monthly salary</span><strong>{selectedJob.salary}</strong></div>
              <div><span>Employment type</span><strong>{selectedJob.type} · {selectedJob.mode}</strong></div>
              <div><span>Working hours</span><strong>{selectedJob.hours}</strong></div>
              <div><span>Verification status</span><strong>Confirmed with HR</strong></div>
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
            <div className="apply-panel">
              <h4><Mail size={18}/> Apply Direct to Employer</h4>
              <p>
                In compliance with UAE MOHRE regulations, Ephworks is a community noticeboard. We do not store your CV or shortlist candidates. You connect and apply straight to the hiring company:
              </p>
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

            <div className="drawer-footer-actions">
              <button onClick={() => toggleSave(selectedJob.id)}>
                <Bookmark size={16} fill={demo.saved.includes(selectedJob.id) ? 'currentColor' : 'none'}/>
                {demo.saved.includes(selectedJob.id) ? 'Saved' : 'Save role'}
              </button>
              <button className="danger-link" onClick={() => setShowReport(true)}>
                <Flag size={16}/> Report to Safety Team
              </button>
            </div>
          </div>
        </FocusDialog>
      </div>
    )}

    {/* Book Volunteer Career Support Modal */}
    {showSupportModal && (
      <Modal onClose={() => setShowSupportModal(false)} title="Book Free Volunteer Support">
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
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setShowSupportModal(false)}>Cancel</button>
            <button type="submit" className="primary-button">
              <Calendar size={16}/> Confirm volunteer booking
            </button>
          </div>
        </form>
      </Modal>
    )}

    {/* About / Architecture & Roadmap Modal */}
    {showAbout && (
      <Modal onClose={() => setShowAbout(false)} title="About Ephworks & Team Direction">
        <div className="about-mark"><img src="/logo.svg" alt="Ephworks logo"/><span>Ephworks</span></div>
        <p><strong>The Trusted Circle vs. Social Media Job Groups:</strong></p>
        <p>
          Unlike unmoderated Facebook groups where fake recruiting agents prey on vulnerable job seekers, Ephworks is built around 3 core pillars:
        </p>
        <ol className="about-list">
          <li><strong>Verified People:</strong> Every member is vouched by their local church community, keeping fake agents and scrapers out. Church vouching verifies identity, not religion (strictly compliant with UAE Anti-Discrimination & Data Protection laws).</li>
          <li><strong>Verified Jobs:</strong> Moderators verify directly with employer HR before going live. Instant auto-block removes posts asking for fees, deposits, or visa charges. 30-day auto-purge keeps listings fresh.</li>
          <li><strong>Real Support:</strong> Volunteer CV review, mock interviews, and LinkedIn assistance ensure people are actually job-ready.</li>
        </ol>

        <div className="authorization warn">
          <h4><Scale size={16}/> Legal Strategy: Phase 1 Noticeboard vs. Phase 2 Matching</h4>
          <p>
            Even if an app is free, connecting job seekers to employers (storing CVs, shortlisting, recruitment matching) can be classified as recruitment activity under UAE MOHRE regulations.
            Therefore, <strong>Phase 1 is strictly a verified direct noticeboard</strong> (candidates apply direct to employer, no CVs stored).
            Phase 2 CV sharing and matching will be added once formal legal counsel review is completed or in partnership with a MOHRE-licensed agency.
          </p>
        </div>

        <button className="primary-button full" onClick={() => setShowAbout(false)}>
          Understood
        </button>
      </Modal>
    )}

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
      <Modal onClose={() => setShowSignIn(false)} title="Sign in to Ephworks">
        {googleEnabled && <>
          <button type="button" className="secondary-button full google-button" onClick={signInWithGoogle}>
            <GoogleMark/> Continue with Google
          </button>
          <p className="sign-in-divider"><span>or</span></p>
        </>}
        <form className="booking-form" onSubmit={sendSignInLink}>
          <p>We'll email you a one-time sign-in link. No password needed.</p>
          <label>
            Email address
            <input type="email" autoComplete="email" required value={signInEmail} onChange={e => setSignInEmail(e.target.value)}/>
          </label>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setShowSignIn(false)}>Cancel</button>
            <button type="submit" className="primary-button" disabled={sendingLink}><Mail size={16}/> {sendingLink ? 'Sending…' : 'Email me a link'}</button>
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
              <span>I checked each flag above with {verifying.job.company}'s HR and the role is genuine.</span>
            </label>
          )}
          <p>Record how you confirmed this role with {verifying.job.company}'s HR. Seekers see this note on the listing.</p>
          <label>
            Verification record
            <textarea rows={3} required maxLength={400} placeholder="e.g. Confirmed role, salary and zero candidate fees with HR manager by phone on 26 Oct." value={verifying.note} onChange={e => setVerifying({ ...verifying, note: e.target.value })}/>
          </label>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setVerifying(null)}>Cancel</button>
            <button type="submit" className="primary-button" disabled={!canPublish(verifying)}><ShieldCheck size={16}/> Publish for 30 days</button>
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
        <strong>Ephworks</strong>
        {!compact && <span>VERIFIED PEOPLE · VERIFIED JOBS · REAL SUPPORT</span>}
      </div>
    </div>
  )
}

function JobCard({ job, saved, tracked, interested, onSave, onOpen, onInterest }) {
  const life = Math.max(4, Math.min(100, Math.round((job.daysLeft / 30) * 100)))
  return (
    <article className="jc">
      <div className="jc-top">
        <span className="jc-check"><BadgeCheck size={15}/> Checked with employer</span>
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


function ReviewCard({ job, vouched, scan, onView, onReject, onConfirm }) {
  const ready = vouched && !scan.blocked.length
  return (
    <article className={`rc ${scan.blocked.length ? 'bad' : vouched ? '' : 'pending'}`}>
      <div className="rc-top">
        <span className="rc-status"><span className="rc-dot" aria-hidden="true"/> {scan.blocked.length ? 'Blocked by scam check' : vouched ? 'Ready for HR verification' : 'Waiting for church vouch'}</span>
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

      <div className="rc-foot">
        <div className="rc-actions">
          <button className="rc-btn" onClick={onView}>View details</button>
          <button className="rc-btn rc-flag" onClick={onReject}><X size={15}/> Reject</button>
          <button className="rc-btn rc-confirm" disabled={!ready} title={ready ? undefined : 'Needs a church vouch and a clean scam check first'} onClick={onConfirm}><Check size={15}/> Confirm HR</button>
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
      {scan.flags.map(f => <li key={f} className="wait"><AlertTriangle size={15}/> Check with HR: {f}</li>)}
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

// One account on the People page; role changes wait for Save, suspension is one click and reversible
function MemberCard({ member, you, churches, canManage, onSave, onSuspend }) {
  const [nextRole, setNextRole] = useState(member.role)
  const [church, setChurch] = useState(member.church_id || '')
  useEffect(() => { setNextRole(member.role); setChurch(member.church_id || '') }, [member.role, member.church_id])
  const manageable = canManage(member, member.role)
  const options = Object.keys(ROLE_LABELS).filter(r => r === member.role || canManage(member, r))
  const changed = nextRole !== member.role || (nextRole === 'church_admin' && church !== (member.church_id || ''))
  const locked = you ? 'You can’t change your own account'
    : member.role === 'super_admin' ? 'The super admin is changed in the SQL editor'
    : 'Only the super admin can change admins'
  return (
    <QueueCard
      avatar={<div className={`company-icon ${member.suspended ? 'rose' : 'sage'}`}>{member.name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')}</div>}
      title={you ? `${member.name} (you)` : member.name}
      status={member.suspended ? 'Suspended' : ROLE_LABELS[member.role]}
      tone={member.suspended ? 'bad' : member.role === 'member' ? 'neutral' : 'ok'}
      sub={[member.email, churches.find(c => c.id === member.church_id)?.name, `Joined ${new Date(member.joined).toLocaleDateString()}`, `${member.posts} ${Number(member.posts) === 1 ? 'post' : 'posts'}`].filter(Boolean).join(' · ')}
      footNote={!manageable && <><LockKeyhole size={15}/> {locked}</>}
    >
      {manageable && <>
        <select className="member-select" aria-label={`Role for ${member.name}`} value={nextRole} onChange={e => setNextRole(e.target.value)}>
          {options.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        {nextRole === 'church_admin' && (
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
