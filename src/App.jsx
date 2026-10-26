import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BadgeCheck, Bookmark, BriefcaseBusiness, Check,
  CheckCircle2, ChevronDown, ChevronRight, CircleHelp, ClipboardCheck,
  FilePenLine, FileText, Flag, HandHeart, HeartHandshake, Home,
  LockKeyhole, MapPin, Menu, MoreHorizontal, Plus, Search, ShieldCheck,
  SlidersHorizontal, UsersRound, LifeBuoy, KeyRound, X, RotateCcw, ExternalLink,
  Clock3, Mail, Building2, Eye, Send, Info, AlertTriangle, ShieldAlert,
  Calendar, CheckCheck, Scale, Lock
} from 'lucide-react'
import { NAV, SAMPLE_JOBS, SAMPLE_VOLUNTEER, CAREER_SUPPORT_MODULES, TRUST_PILLARS, SAMPLE_VOUCH_REQUESTS } from './data'

const icons = {
  briefcase: BriefcaseBusiness, bookmark: Bookmark, sparkles: LifeBuoy,
  heart: HeartHandshake, users: UsersRound, shield: ShieldCheck,
  plus: Plus, file: FileText, check: ClipboardCheck, flag: Flag
}
const NAMES = { seeker: 'Job seeker', employer: 'Employer', moderator: 'Moderator', church: 'Church Partner Admin' }
const demoKey = 'ephworks-local-demo-v3'
const defaultDemo = {
  saved: [],
  tracked: [],
  role: 'seeker',
  drafts: [],
  reviews: {},
  reports: [],
  supportSessions: [],
  vouchQueue: SAMPLE_VOUCH_REQUESTS
}

const FORBIDDEN_SCAM_KEYWORDS = [
  'fee', 'fees', 'deposit', 'visa charge', 'visa charges', 'visa fee', 'visa cost',
  'payment required', 'processing fee', 'upfront', 'bank transfer', 'registration fee',
  'security deposit', 'pay before'
]

function getSavedDemo() {
  try {
    const value = JSON.parse(window.localStorage.getItem(demoKey))
    if (!value || typeof value !== 'object') return defaultDemo
    return {
      ...defaultDemo,
      ...value,
      saved: Array.isArray(value.saved) ? value.saved : [],
      tracked: Array.isArray(value.tracked) ? value.tracked : [],
      drafts: Array.isArray(value.drafts) ? value.drafts : [],
      reports: Array.isArray(value.reports) ? value.reports : [],
      supportSessions: Array.isArray(value.supportSessions) ? value.supportSessions : [],
      vouchQueue: Array.isArray(value.vouchQueue) ? value.vouchQueue : SAMPLE_VOUCH_REQUESTS,
      reviews: value.reviews && typeof value.reviews === 'object' ? value.reviews : {}
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
  const [showReport, setShowReport] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [selectedSupportService, setSelectedSupportService] = useState('cv-review')
  const [reportReason, setReportReason] = useState('Request for payment / fee')
  const [draftForm, setDraftForm] = useState({ title: '', company: '', emirate: 'Dubai', type: 'Full-time', pay: '', description: '' })
  const [supportForm, setSupportForm] = useState({ name: 'Jordan Morgan', service: 'cv-review', preferredTime: 'Weekday evening', note: '' })

  const role = NAMES[demo.role] ? demo.role : 'seeker'
  const nav = NAV[role]
  const currentNav = nav.find(n => n.id === page)
  const demoJobs = SAMPLE_JOBS

  // Real-time scam detection for employer draft form
  const scamTriggers = useMemo(() => {
    const combined = `${draftForm.title} ${draftForm.pay} ${draftForm.description}`.toLowerCase()
    return FORBIDDEN_SCAM_KEYWORDS.filter(kw => combined.includes(kw))
  }, [draftForm.title, draftForm.pay, draftForm.description])

  const visibleJobs = useMemo(() => demoJobs.filter(j =>
    (emirate === 'All emirates' || j.emirate === emirate) &&
    (workType === 'Any work type' || j.type === workType) &&
    (`${j.title} ${j.company} ${j.category}`.toLowerCase().includes(search.trim().toLowerCase())) &&
    (tab !== 'saved' || demo.saved.includes(j.id))
  ), [emirate, workType, search, tab, demo.saved])

  const updateDemo = patch => setDemo(prev => ({ ...prev, ...patch }))
  const notify = message => setBanner(message)

  useEffect(() => { window.localStorage.setItem(demoKey, JSON.stringify(demo)) }, [demo])
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') {
        setSelectedJob(null); setShowMobileMore(false); setShowAbout(false);
        setShowReset(false); setShowReport(false); setShowSupportModal(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const modal = selectedJob || showMobileMore || showAbout || showReset || showReport || showSupportModal
    document.body.classList.toggle('modal-open', Boolean(modal))
    return () => document.body.classList.remove('modal-open')
  }, [selectedJob, showMobileMore, showAbout, showReset, showReport, showSupportModal])

  const go = id => { setPage(id); setShowMobileMore(false); setBanner(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const setRole = next => {
    updateDemo({ role: next })
    setPage(next === 'moderator' ? 'review' : next === 'church' ? 'vouch' : 'opportunities')
    setShowMobileMore(false)
    notify(`Switched to ${NAMES[next]} demo view`)
  }
  const handleVouch = (id, status) => {
    updateDemo({
      vouchQueue: demo.vouchQueue.map(m => m.id === id ? { ...m, status } : m)
    })
    notify(status.includes('Vouched') ? 'Congregant vouched! Vouch badge granted with zero sensitive data stored.' : 'Vouch request declined.')
  }

  const toggleSave = id => {
    const already = demo.saved.includes(id)
    updateDemo({ saved: already ? demo.saved.filter(x => x !== id) : [...demo.saved, id] })
    notify(already ? 'Removed from your saved sample opportunities.' : 'Saved on this device for reference.')
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
    if (scamTriggers.length > 0) {
      return notify(`Auto-block triggered: Remove prohibited terms (${scamTriggers.join(', ')}) before saving.`)
    }
    const fields = [draftForm.title, draftForm.company, draftForm.pay, draftForm.description]
    if (fields.some(v => !v.trim())) return notify('Complete all fields before saving the sample draft.')
    const item = {
      ...draftForm,
      id: `draft-${Date.now()}`,
      created: new Date().toLocaleDateString(),
      status: 'Pending moderator company verification',
      expiresIn: '30 days upon approval',
      scamAudit: 'Passed auto-block keyword check (0 fee triggers)'
    }
    updateDemo({ drafts: [item, ...demo.drafts] })
    setDraftForm({ title: '', company: '', emirate: 'Dubai', type: 'Full-time', pay: '', description: '' })
    go('drafts')
    notify('Sample post saved. Awaiting moderator verification with employer HR before publication.')
  }

  const submitReport = () => {
    if (!selectedJob) return
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

  const reviewDraft = (id, status) => {
    updateDemo({ reviews: { ...demo.reviews, [id]: status } })
    notify(`Moderation status changed to ${status}.`)
  }

  const markReport = id => {
    updateDemo({
      reports: demo.reports.map(r => r.id === id ? { ...r, status: 'Resolved by Safety Team' } : r)
    })
    notify('Report marked resolved by Safety Team.')
  }

  const userMainNav = nav.slice(0, 3)

  return <div className="app-shell">
    <aside className="sidebar" aria-label="Main navigation">
      <Brand />
      <div className="sidebar-tag"><span className="status-dot"/> UAE · Trusted Community Circle</div>
      <div className="side-label">Your workspace</div>
      <nav className="sidebar-nav">
        {nav.map(n => {
          const Icon = icons[n.icon] || BriefcaseBusiness
          return (
            <button key={n.id} type="button" className={`side-link ${page === n.id ? 'active' : ''}`} aria-current={page === n.id ? 'page' : undefined} onClick={() => go(n.id)}>
              <Icon size={18}/>
              <span>{n.label}</span>
              {n.id === 'interests' && (demo.saved.length + demo.tracked.length) > 0 && (
                <span className="count">{demo.saved.length + demo.tracked.length}</span>
              )}
            </button>
          )
        })}
      </nav>
      <div className="sidebar-profile">
        <span className="avatar">JM</span>
        <span>
          <strong>Jordan Morgan</strong>
          <small>Vouched Member · St. Luke's Dubai</small>
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
            {Object.entries(NAMES).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setRole(key)} className={role === key ? 'selected' : ''} aria-pressed={role === key}>
                {label}
              </button>
            ))}
          </div>
          <button className="icon-button help-button" aria-label="About this prototype" title="About this prototype" onClick={() => setShowAbout(true)}><CircleHelp size={19}/></button>
          <span className="avatar header-avatar">JM</span>
        </div>
      </header>

      <main className="main-content">
        <div className="pilot-strip">
          <span className="pilot-text"><b>Pilot.</b> You apply straight to the employer. We never store your CV.</span>
          <span className="pilot-actions">
            <button type="button" onClick={() => setShowAbout(true)}>Legal notes</button>
            <button type="button" onClick={() => setShowReset(true)}>Reset demo</button>
          </span>
        </div>

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
                <p className="glass-chip"><span className="status-dot"/> A private job board for UAE church communities</p>
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
                    <strong>{SAMPLE_JOBS.length} jobs open</strong>
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
            <li className="stat featured"><b>{SAMPLE_JOBS.length}</b><span>Jobs open right now</span></li>
            <li className="stat"><b>100%</b><span>Checked with the employer</span></li>
            <li className="stat"><b>AED 0</b><span>Fees to apply, ever</span></li>
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
              <button className="secondary-button" onClick={() => notify('Thank you! Volunteer onboarding will reach out to schedule an orientation.')}>
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
            desc="Keep notes of roles you've applied to directly with employers. All tracking is private and stored in your browser only."
          />
          <SectionTitle title="Roles marked as applied" subtitle={`${demo.tracked.length} roles you applied to directly`}/>
          {demo.tracked.length ? (
            <div className="job-list">
              {SAMPLE_JOBS.filter(j => demo.tracked.includes(j.id)).map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  saved={demo.saved.includes(job.id)}
                  tracked={true}
                  onSave={() => toggleSave(job.id)}
                  onOpen={() => setSelectedJob(job)}
                />
              ))}
            </div>
          ) : <Empty title="No applications tracked yet" description="When you apply directly to a role, click 'Mark as applied' in the role view to track it here." icon={ClipboardCheck}/>}

          <div className="spacer-24"/>
          <SectionTitle title="Saved opportunities" subtitle={`${demo.saved.length} roles bookmarked`}/>
          {demo.saved.length ? (
            <div className="job-list">
              {SAMPLE_JOBS.filter(j => demo.saved.includes(j.id)).map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  saved
                  tracked={demo.tracked.includes(job.id)}
                  onSave={() => toggleSave(job.id)}
                  onOpen={() => setSelectedJob(job)}
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
          <div className="form-panel">
            {/* Live Auto-Block Scam Engine Banner */}
            {scamTriggers.length > 0 ? (
              <div className="auto-block-box">
                <ShieldAlert size={26}/>
                <div>
                  <strong>Auto-block active: prohibited fee or scam terms detected</strong>
                  Your post contains prohibited keywords: <u>{scamTriggers.join(', ')}</u>.
                  <ul>
                    <li>Under UAE Labour Law, employers and recruiters are strictly prohibited from charging candidates any fees, deposits, or visa costs.</li>
                    <li>Ephworks auto-blocks all posts requesting payment, deposits, or visa charges.</li>
                    <li>Please remove all mention of candidate fees to enable submission.</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="auto-block-clean">
                <CheckCircle2 size={16}/> Auto-block scam scan: 0 fee or deposit triggers detected. Post complies with UAE Labour Law anti-fee rules.
              </div>
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
              <label>
                Role description & direct application instructions
                <textarea
                  rows={5}
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

              <button className="primary-button" type="submit" disabled={scamTriggers.length > 0}>
                <FilePenLine size={17}/> Save post for moderator HR verification
              </button>
            </form>
          </div>
        </>}

        {page === 'drafts' && <>
          <PageHeading
            eyebrow="Employer workspace"
            title="My posted opportunities"
            desc="Track the moderation and verification status of your company listings."
            action={<button className="primary-button" onClick={() => go('post')}><Plus size={17}/> New post</button>}
          />
          {demo.drafts.length ? (
            <div className="job-list">
              {demo.drafts.map(d => (
                <div className="draft-card" key={d.id}>
                  <div>
                    <Pill type="subtle">{d.status}</Pill>
                    <span className="tag-badge expiry">Expires in 30 days</span>
                    <h3>{d.title}</h3>
                    <p>{d.company} · {d.emirate} · {d.type}</p>
                    <small>{d.pay} / month</small>
                    <div className="draft-desc">{d.description}</div>
                    <div className="audit-line">
                      <CheckCircle2 size={14}/>
                      {d.scamAudit}
                    </div>
                  </div>
                  <button className="secondary-button" onClick={() => { updateDemo({ drafts: demo.drafts.filter(x => x.id !== d.id) }); notify('Post draft removed.') }}>
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
            <ol className="rp-steps">
              <li><b>1</b><span>Direct HR contact confirmed</span></li>
              <li><b>2</b><span>Zero-fee audit passed</span></li>
              <li><b>3</b><span>30-day expiry timer started</span></li>
            </ol>
          </div>

          <div className="review-list">
            {SAMPLE_JOBS.slice(0, 3).map(j => {
              const status = demo.reviews[j.id] || 'Live on noticeboard'
              return (
                <ReviewCard
                  key={j.id}
                  job={j}
                  status={status}
                  tone={status.startsWith('Flagged') ? 'bad' : 'ok'}
                  onView={() => setSelectedJob(j)}
                  onFlag={() => reviewDraft(j.id, 'Flagged for review')}
                  onConfirm={() => reviewDraft(j.id, 'Confirmed with HR')}
                />
              )
            })}
          </div>
        </>}

        {page === 'reports' && <>
          <PageHeading
            eyebrow="Safety team"
            title="Reports & Follow-up queue"
            desc="Unlike unmoderated social media, our safety team actively follows up with reporters and employers on every flag."
          />
          {demo.reports.length ? (
            <div className="job-list">
              {demo.reports.map(r => {
                const j = SAMPLE_JOBS.find(x => x.id === r.jobId)
                const resolved = r.status.includes('Resolved')
                return (
                  <QueueCard
                    key={r.id}
                    avatar={<div className="feature-icon danger"><Flag size={20}/></div>}
                    title={j?.title || 'Reported role'}
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
            <div className="rp-head"><ShieldCheck size={16}/> Active church admin: St. Luke's Dubai</div>
            <ol className="rp-steps rp-two">
              <li><b><ShieldCheck size={13}/></b><span>Zero denomination data stored</span></li>
              <li><b><ShieldCheck size={13}/></b><span>UAE Data Law compliant</span></li>
            </ol>
          </div>

          <div className="review-list">
            {demo.vouchQueue.map(m => {
              const vouched = m.status.includes('Vouched'), declined = m.status.includes('Declined')
              return (
                <QueueCard
                  key={m.id}
                  avatar={<div className="company-icon sage">{m.initials}</div>}
                  title={m.name}
                  status={vouched ? 'Vouched' : declined ? 'Declined' : 'Awaiting vouch'}
                  tone={vouched ? 'ok' : declined ? 'bad' : 'pending'}
                  sub={`${m.email} · ${m.church} · Requested ${m.requestedDate}`}
                  note={m.note}
                  footNote={<><LockKeyhole size={15}/> Stores a yes/no vouch only</>}
                >
                  <button className="reject-small" disabled={declined} onClick={() => handleVouch(m.id, 'Declined / Not Known')}><X size={15}/> Decline</button>
                  <button className="approve-small" disabled={vouched} onClick={() => handleVouch(m.id, 'Vouched member')}>
                    <Check size={15}/> {vouched ? 'Vouched' : 'Vouch for member'}
                  </button>
                </QueueCard>
              )
            })}
          </div>
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
              <span className="avatar big">JM</span>
              <div>
                <h2>Jordan Morgan</h2>
                <p>Vouched Community Member · St. Luke's Dubai</p>
              </div>
            </div>
            <div className="profile-grid">
              <div>
                <span>Community Vouch Status</span>
                <strong className="good-text"><Check size={15}/> Vouched by church partner</strong>
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
          <span>Ephworks · Verified People. Verified Jobs. Real Support.</span>
          <button onClick={() => setShowAbout(true)}>Product architecture & legal context <ArrowRight size={14}/></button>
        </footer>
      </main>
    </div>

    {/* Mobile Navigation */}
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {userMainNav.map(n => {
        const Icon = icons[n.icon] || BriefcaseBusiness
        return (
          <button key={n.id} aria-current={page === n.id ? 'page' : undefined} className={page === n.id ? 'active' : ''} onClick={() => go(n.id)}>
            <Icon size={21}/>
            <span>{n.label}</span>
          </button>
        )
      })}
      <button className={showMobileMore || (!userMainNav.some(n => n.id === page)) ? 'active' : ''} onClick={() => setShowMobileMore(true)} aria-haspopup="dialog" aria-expanded={showMobileMore}>
        <MoreHorizontal size={22}/>
        <span>More</span>
      </button>
    </nav>

    {/* Mobile More Sheet */}
    {showMobileMore && (
      <div className="overlay mobile-more-overlay" onMouseDown={e => e.target === e.currentTarget && setShowMobileMore(false)}>
        <FocusDialog className="more-sheet" label="More navigation">
          <div className="sheet-head">
            <strong>More from Ephworks</strong>
            <button className="icon-button" onClick={() => setShowMobileMore(false)} aria-label="Close menu"><X size={20}/></button>
          </div>
          <div className="sheet-items">
            {nav.map(n => {
              const Icon = icons[n.icon] || BriefcaseBusiness
              return (
                <button key={n.id} className={page === n.id ? 'active' : ''} onClick={() => go(n.id)}>
                  <Icon size={19}/>{n.label}<ChevronRight size={15}/>
                </button>
              )
            })}
          </div>
          <button className="sheet-about" onClick={() => { setShowMobileMore(false); setShowAbout(true) }}>
            About the 3 Pillars & Safety Engine <ArrowRight size={16}/>
          </button>
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

            <h3>What you'll do</h3>
            <ul>{selectedJob.responsibilities.map(v => <li key={v}>{v}</li>)}</ul>

            <h3>Skills & Experience</h3>
            <div className="tags">{selectedJob.requirements.map(x => <Pill key={x} type="subtle">{x}</Pill>)}</div>

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
                <a href={selectedJob.directPortal} target="_blank" rel="noopener noreferrer" className="apply-portal-link">
                  <ExternalLink size={16}/> Official Career Portal
                </a>
              </div>
              <div className="track-row">
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

    {/* Report to Safety Team Modal */}
    {showReport && (
      <Modal onClose={() => setShowReport(false)} title="Report to Ephworks Safety Team">
        <p>Our safety team follows up on every flag directly with the reporter and employer within 24 hours.</p>
        <label className="form-label">
          Reason for report
          <select value={reportReason} onChange={e => setReportReason(e.target.value)}>
            <option>Request for payment / fee (Illegal under UAE Labour Law)</option>
            <option>Suspicious or unverified employer contact</option>
            <option>Misleading job terms or salary</option>
            <option>Potential discriminatory language</option>
            <option>Other trust & safety concern</option>
          </select>
        </label>
        <div className="modal-actions">
          <button className="secondary-button" onClick={() => setShowReport(false)}>Cancel</button>
          <button className="primary-button" onClick={submitReport}><Flag size={16}/> Submit to Safety Team</button>
        </div>
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

function JobCard({ job, saved, tracked, onSave, onOpen }) {
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
        <button className="jc-open" onClick={onOpen} aria-label={`View and apply: ${job.title}`}>
          View role <ArrowRight size={16}/>
        </button>
      </div>
    </article>
  )
}


function ReviewCard({ job, status, tone, onView, onFlag, onConfirm }) {
  const life = Math.max(4, Math.min(100, Math.round((job.daysLeft / 30) * 100)))
  return (
    <article className={`rc ${tone}`}>
      <div className="rc-top">
        <span className="rc-status"><span className="rc-dot" aria-hidden="true"/> {status}</span>
        <span className="rc-life" title={`${job.daysLeft} of 30 days left`}>
          <i style={{ '--life': `${life}%` }} aria-hidden="true"/>
          {job.daysLeft} days left
        </span>
      </div>

      <div className="rc-body">
        <div className="rc-mono" aria-hidden="true">{job.initials}</div>
        <div className="rc-id">
          <h3>{job.title}</h3>
          <p>{job.company} <span>·</span> {job.emirate}</p>
        </div>
      </div>

      <blockquote className="rc-note">{job.verificationNote}</blockquote>

      <div className="rc-foot">
        <span className="rc-check"><ShieldCheck size={15}/> Zero-fee check passed</span>
        <div className="rc-actions">
          <button className="rc-btn" onClick={onView}>View details</button>
          <button className="rc-btn rc-flag" onClick={onFlag}><Flag size={15}/> Flag</button>
          <button className="rc-btn rc-confirm" onClick={onConfirm}><Check size={15}/> Confirm HR</button>
        </div>
      </div>
    </article>
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
