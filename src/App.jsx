import React, { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BadgeCheck, Bookmark, BriefcaseBusiness, Check,
  CheckCircle2, ChevronDown, ChevronRight, CircleHelp, ClipboardCheck,
  FilePenLine, FileText, Flag, HandHeart, HeartHandshake, Home,
  LockKeyhole, MapPin, Menu, MoreHorizontal, Plus, Search, ShieldCheck,
  SlidersHorizontal, Sparkles, UsersRound, X, RotateCcw, ExternalLink,
  Clock3, Mail, Building2, Eye, Send, Info
} from 'lucide-react'
import { NAV, SAMPLE_JOBS, SAMPLE_VOLUNTEER } from './data'

const icons = {
  briefcase: BriefcaseBusiness, bookmark: Bookmark, sparkles: Sparkles,
  heart: HeartHandshake, users: UsersRound, shield: ShieldCheck,
  plus: Plus, file: FileText, check: ClipboardCheck, flag: Flag
}
const NAMES = { seeker: 'Job seeker', employer: 'Employer', moderator: 'Moderator' }
const demoKey = 'ephworks-local-demo-v1'
const defaultDemo = { saved: [], interests: [], role: 'seeker', drafts: [], reviews: {}, reports: [] }
function getSavedDemo() {
  try {
    const value = JSON.parse(window.localStorage.getItem(demoKey))
    if (!value || typeof value !== 'object') return defaultDemo
    return { ...defaultDemo, ...value, saved: Array.isArray(value.saved) ? value.saved : [], interests: Array.isArray(value.interests) ? value.interests : [], drafts: Array.isArray(value.drafts) ? value.drafts : [], reports: Array.isArray(value.reports) ? value.reports : [], reviews: value.reviews && typeof value.reviews === 'object' ? value.reviews : {} }
  } catch { return defaultDemo }
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
  const [reportReason, setReportReason] = useState('Misleading information')
  const [draftForm, setDraftForm] = useState({ title: '', company: '', emirate: 'Dubai', type: 'Full-time', pay: '', description: '' })
  const role = NAMES[demo.role] ? demo.role : 'seeker'
  const nav = NAV[role]
  const currentNav = nav.find(n => n.id === page)
  const demoJobs = SAMPLE_JOBS
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
      if (e.key === 'Escape') { setSelectedJob(null); setShowMobileMore(false); setShowAbout(false); setShowReset(false); setShowReport(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => {
    const modal = selectedJob || showMobileMore || showAbout || showReset || showReport
    document.body.classList.toggle('modal-open', Boolean(modal))
    return () => document.body.classList.remove('modal-open')
  }, [selectedJob, showMobileMore, showAbout, showReset, showReport])
  const go = id => { setPage(id); setShowMobileMore(false); setBanner(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const setRole = next => { updateDemo({ role: next }); setPage(next === 'moderator' ? 'review' : 'opportunities'); setShowMobileMore(false); notify(`Switched to ${NAMES[next]} demo view`) }
  const toggleSave = id => {
    const already = demo.saved.includes(id)
    updateDemo({ saved: already ? demo.saved.filter(x => x !== id) : [...demo.saved, id] })
    notify(already ? 'Removed from your saved sample opportunities.' : 'Saved on this device for the demo.')
  }
  const expressInterest = id => {
    if (!demo.interests.includes(id)) updateDemo({ interests: [...demo.interests, id] })
    notify('Demo interest recorded on this device only. Nothing was sent and no personal information was shared.')
  }
  const reset = () => {
    setDemo({ ...defaultDemo }); setPage('opportunities'); setSelectedJob(null); setSearch(''); setEmirate('All emirates'); setWorkType('Any work type'); setTab('all'); setShowReset(false); setShowMobileMore(false); notify('Demo reset. Your local sample activity was cleared.')
  }
  const submitDraft = e => {
    e.preventDefault()
    const fields = [draftForm.title, draftForm.company, draftForm.pay, draftForm.description]
    if (fields.some(v => !v.trim())) return notify('Complete all fields before saving the sample draft.')
    const item = { ...draftForm, id: `draft-${Date.now()}`, created: new Date().toLocaleDateString(), status: 'Draft · local only' }
    updateDemo({ drafts: [item, ...demo.drafts] })
    setDraftForm({ title: '', company: '', emirate: 'Dubai', type: 'Full-time', pay: '', description: '' })
    go('drafts'); notify('Sample draft saved in this browser. It was not published or submitted.')
  }
  const submitReport = () => {
    if (!selectedJob) return
    updateDemo({ reports: [...demo.reports, { id: `report-${Date.now()}`, jobId: selectedJob.id, reason: reportReason, status: 'Open' }] })
    setShowReport(false); setSelectedJob(null); notify('Sample report added to the local moderator queue. No message was sent.')
  }
  const reviewDraft = (id, status) => {
    updateDemo({ reviews: { ...demo.reviews, [id]: status } }); notify(`Demo review status changed to ${status}. No public listing was updated.`)
  }
  const markReport = id => { updateDemo({ reports: demo.reports.map(r => r.id === id ? { ...r, status: 'Resolved (demo)' } : r) }); notify('Sample report marked resolved on this device.') }
  const userMainNav = nav.slice(0, 3)

  return <div className="app-shell">
    <aside className="sidebar" aria-label="Main navigation">
      <Brand />
      <div className="sidebar-tag"><span className="status-dot"/> UAE · Sample community</div>
      <div className="side-label">YOUR WORKSPACE</div>
      <nav className="sidebar-nav">
        {nav.map(n => { const Icon = icons[n.icon]; return <button key={n.id} type="button" className={`side-link ${page === n.id ? 'active' : ''}`} onClick={() => go(n.id)}><Icon size={18}/><span>{n.label}</span>{n.id === 'interests' && demo.saved.length > 0 && <span className="count">{demo.saved.length}</span>}</button> })}
      </nav>
      <div className="sidebar-bottom"><div className="community-illustration"><div className="mini-circle left"/><div className="mini-circle right"/><div className="mini-path"/></div><span className="side-label">BUILT ON COMMUNITY</span><p>Good opportunities begin with people who care.</p><button className="text-link side-link-out" onClick={() => go('churches')}>For church partners <ArrowRight size={15}/></button></div>
      <div className="sidebar-profile"><span className="avatar">JM</span><span><strong>Jordan Morgan</strong><small>Fictional demo account</small></span></div>
    </aside>

    <div className="body-area">
      <header className="topbar">
        <div className="mobile-brand"><Brand compact /></div>
        <div className="breadcrumb"><span>Workspace</span><ChevronRight size={15}/><strong>{currentNav?.label || 'Opportunities'}</strong></div>
        <div className="header-actions"><span className="brand-name-desktop">Ephworks — People, opportunity, purpose</span><button className="icon-button help-button" aria-label="About this prototype" title="About this prototype" onClick={() => setShowAbout(true)}><CircleHelp size={19}/></button><span className="avatar header-avatar">JM</span></div>
      </header>
      <main className="main-content">
        <div className="role-ribbon"><div className="role-text"><span className="role-kicker">PREVIEW AS</span><div className="role-copy">Switch demo role <span className="role-note">See how Ephworks works for everyone.</span></div></div><div className="role-selector" role="group" aria-label="Preview as role">{Object.entries(NAMES).map(([key, label]) => <button key={key} type="button" onClick={() => setRole(key)} className={role === key ? 'selected' : ''}>{label}</button>)}</div></div>
        <div className="safety-bar"><span><ShieldCheck size={16}/> <strong>#HACK PROTOTYPE</strong><span className="safety-divider">|</span> Fictional data · No real applications or verification</span><button type="button" onClick={() => setShowReset(true)}><RotateCcw size={15}/> Reset demo</button></div>
        {banner && <div className="toast-banner" role="status"><CheckCircle2 size={18}/><span>{banner}</span><button aria-label="Dismiss notification" onClick={() => setBanner(null)}><X size={16}/></button></div>}
        {page === 'opportunities' && <>
          <section className="hero"><div className="hero-copy"><div className="hero-eyebrow"><span className="hero-dot"/> OPPORTUNITY, WITH A HUMAN CONNECTION</div><h1>Good work.<br/><em>Meaningful connections.</em></h1><p>Explore opportunities shared within your community. Take your next step with confidence.</p><button className="hero-button" onClick={() => document.getElementById('opp-list')?.scrollIntoView({ behavior: 'smooth' })}>Explore opportunities <ArrowRight size={17}/></button></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-1"/><div className="orbit orbit-2"/><div className="orbit orbit-3"/><div className="hero-shape shape-back"/><div className="hero-shape shape-mid"/><div className="hero-shape shape-front"/><div className="hero-art-star one">✦</div><div className="hero-art-star two">✧</div><div className="hero-art-star three">✦</div></div></section>
          <div className="support-card"><div className="support-icon"><Sparkles size={23}/></div><div><div className="eyebrow">A LITTLE SUPPORT GOES A LONG WAY</div><h3>Let your experience speak for itself.</h3><p>Explore CV guidance and support from volunteer HR professionals.</p></div><button className="soft-button" onClick={() => go('career')}>Explore career support <ArrowRight size={17}/></button></div>
          <section id="opp-list" className="opportunity-section"><SectionTitle title="Find your next opportunity" subtitle="UAE community noticeboard" /><div className="filters"><label className="search-box"><Search size={19}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search opportunities" aria-label="Search opportunities"/></label><label className="select-box"><span>Filter by emirate</span><select value={emirate} onChange={e => setEmirate(e.target.value)}>{['All emirates','Dubai','Abu Dhabi','Sharjah'].map(x => <option key={x}>{x}</option>)}</select></label><label className="select-box"><span>Employment type</span><select value={workType} onChange={e => setWorkType(e.target.value)}>{['Any work type', 'Full-time', 'Part-time'].map(x => <option key={x}>{x}</option>)}</select></label></div>
          <div className="listing-header"><div className="tab-list" role="tablist" aria-label="Opportunity tabs"><button role="tab" aria-selected={tab === 'all'} className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>All opportunities</button><button role="tab" aria-selected={tab === 'saved'} className={tab === 'saved' ? 'active' : ''} onClick={() => setTab('saved')}>Saved <span className="tab-count">{demo.saved.length}</span></button></div><span className="result-count">{visibleJobs.length} sample {visibleJobs.length === 1 ? 'role' : 'roles'}</span></div>
          <div className="job-list">{visibleJobs.length ? visibleJobs.map(job => <JobCard key={job.id} job={job} saved={demo.saved.includes(job.id)} onSave={() => toggleSave(job.id)} onOpen={() => setSelectedJob(job)}/>) : <Empty title="No sample roles match" description="Try a different keyword or change your filters." icon={Search}/>}</div>
          <div className="disclaimer-foot"><ShieldCheck size={18}/> Ephworks is a community noticeboard prototype, not a recruiter or placement service. No fees, real listings, applications, or transfers take place.</div>
          </section>
        </>}
        {page === 'interests' && <><PageHeading eyebrow="YOUR COMMUNITY JOURNEY" title="My interests" desc="Your saved opportunities and demo expressions of interest stay in this browser."/><SectionTitle title="Saved opportunities" subtitle={`${demo.saved.length} saved sample roles`}/>{demo.saved.length ? <div className="job-list">{SAMPLE_JOBS.filter(j => demo.saved.includes(j.id)).map(job => <JobCard key={job.id} job={job} saved onSave={() => toggleSave(job.id)} onOpen={() => setSelectedJob(job)}/>)}</div> : <Empty title="Nothing saved yet" description="Save a sample role from the community board to keep it here."/>}<div className="spacer-24"/><SectionTitle title="Expressions of interest" subtitle="For demonstration only"/>{demo.interests.length ? <div className="plain-card">{SAMPLE_JOBS.filter(j => demo.interests.includes(j.id)).map(j => <div className="mini-row" key={j.id}><CheckCircle2 size={19}/><div><strong>{j.title}</strong><small>Interest saved locally · Nothing sent</small></div><button className="text-link" onClick={() => setSelectedJob(j)}>View</button></div>)}</div> : <Empty title="No demo interests" description="Choose “I'm interested” on a sample role to see how the interest flow might work."/>}</>}
        {page === 'career' && <><PageHeading eyebrow="PRACTICAL CAREER SUPPORT" title="Your next step starts here." desc="Simple, people-first resources and fictional examples to help you prepare confidently."/><div className="feature-grid"><Feature icon={FilePenLine} title="CV guidance" desc="Keep your CV clear, relevant and easy to scan. Use concrete examples of what you contributed." list={['Start with a concise professional summary.', 'Tailor your experience to a real job description.', 'Use accurate achievements, not invented figures.']}/><Feature icon={UsersRound} title="Volunteer HR support" desc="A future place to connect with vetted volunteer mentors. Connections are disabled in this prototype." list={['Short CV review sessions', 'Practice interview questions', 'Career transition conversations']}/><Feature icon={Sparkles} title="Interview preparation" desc="Practice communicating your strengths with confidence and honesty." list={['Use situation, action and result.', 'Prepare thoughtful employer questions.', 'Understand your eligibility to work.']}/></div><Warning>This is an illustrative resource page. There are no live mentors, appointments or personal-data collection.</Warning></>}
        {page === 'volunteering' && <><PageHeading eyebrow="GIVE WHAT YOU CAN" title="Small acts. Real community." desc="Illustrative volunteering ideas for a future local programme."/><div className="feature-grid">{SAMPLE_VOLUNTEER.map(v => <div className="feature-card" key={v.title}><div className="feature-icon"><HandHeart size={22}/></div><h3>{v.title}</h3><p>{v.summary}</p><div className="volunteer-meta"><MapPin size={15}/>{v.location}</div><div className="volunteer-meta"><Clock3 size={15}/>{v.commitment}</div><Pill type="subtle">Fictional opportunity</Pill></div>)}</div><Warning>Volunteer participation is not available in this prototype. Any future initiative needs safeguarding and privacy review.</Warning></>}
        {page === 'churches' && <><PageHeading eyebrow="FOR LOCAL CHURCHES" title="Help your community move forward." desc="A thoughtful space for churches to share opportunities and practical support, without acting as a recruitment agency."/><div className="feature-grid"><Feature icon={BriefcaseBusiness} title="Community noticeboard" desc="Allow members to share legitimate opportunities. The platform does not match, place or charge workers." list={['Free to post and browse', 'Clear employer and role information', 'Moderator review before public visibility']}/><Feature icon={HeartHandshake} title="Member-to-member support" desc="Make space for encouragement, practical career advice and volunteering." list={['Opt-in, privacy-first participation', 'Community partner orientation', 'No premium visibility or seeker fees']}/><Feature icon={ShieldCheck} title="Responsible governance" desc="Require independent legal and compliance review before enabling real activity." list={['No religion-based job criteria', 'No personal CV collection in prototype', 'No real-person verification claims']}/></div><Warning tone="strong">Important: The UAE legal position has not been formally reviewed. This #HACK2026 app is a sample-only prototype and must not go live for real people or job opportunities until reviewed by qualified UAE counsel.</Warning></>}
        {page === 'profile' && <><PageHeading eyebrow="DEMO PROFILE" title="Your privacy matters." desc="Explore the prototype using a fictional demo account."/><div className="profile-card"><div className="profile-top"><span className="avatar big">JM</span><div><h2>Jordan Morgan</h2><p>Fictional demo account · {NAMES[role]} preview</p></div></div><div className="profile-grid"><div><span>Data storage</span><strong>This browser only</strong></div><div><span>Contact information</span><strong>Not collected</strong></div><div><span>Messages sent</span><strong>None</strong></div><div><span>Real applications</span><strong>Disabled</strong></div></div><button className="secondary-button" onClick={() => setShowReset(true)}><RotateCcw size={17}/> Clear local demo data</button></div><div className="spacer-24"/><Warning>Saved roles, interests, sample posts and moderation choices use your browser's localStorage. Clearing your browser data removes them.</Warning></>}
        {page === 'post' && <><PageHeading eyebrow="EMPLOYER WORKSPACE" title="Create a sample post" desc="Use fictional data to explore how a community opportunity could be drafted."/><div className="form-panel"><Warning tone="strong">Demo only. Do not enter real company details, identifiable personal information, confidential data or actual vacancies. Submitting saves only to this browser.</Warning><form className="post-form" onSubmit={submitDraft}><label>Sample job title<input maxLength={95} placeholder="e.g. Office Coordinator" value={draftForm.title} onChange={e => setDraftForm({ ...draftForm, title: e.target.value })} required/></label><label>Fictional company name<input maxLength={95} placeholder="e.g. Example Studio" value={draftForm.company} onChange={e => setDraftForm({ ...draftForm, company: e.target.value })} required/></label><div className="form-two"><label>Emirate<select value={draftForm.emirate} onChange={e => setDraftForm({ ...draftForm, emirate: e.target.value })}><option>Dubai</option><option>Abu Dhabi</option><option>Sharjah</option></select></label><label>Work type<select value={draftForm.type} onChange={e => setDraftForm({ ...draftForm, type: e.target.value })}><option>Full-time</option><option>Part-time</option></select></label></div><label>Illustrative monthly pay range<input maxLength={95} placeholder="e.g. AED 4,000 – 6,000" value={draftForm.pay} onChange={e => setDraftForm({ ...draftForm, pay: e.target.value })} required/></label><label>Sample role description<textarea rows={5} maxLength={1600} placeholder="Describe a fictional opportunity. Do not request religion, ethnicity or other protected characteristics." value={draftForm.description} onChange={e => setDraftForm({ ...draftForm, description: e.target.value })} required/></label><button className="primary-button" type="submit"><FilePenLine size={17}/> Save local sample draft</button></form></div></>}
        {page === 'drafts' && <><PageHeading eyebrow="EMPLOYER WORKSPACE" title="My sample posts" desc="Your local fictional drafts. These cannot be published from this prototype." action={<button className="primary-button" onClick={() => go('post')}><Plus size={17}/> New sample post</button>}/>{demo.drafts.length ? <div className="job-list">{demo.drafts.map(d => <div className="draft-card" key={d.id}><div><Pill type="subtle">{d.status}</Pill><h3>{d.title}</h3><p>{d.company} · {d.emirate} · {d.type}</p><small>{d.pay} / month</small><div className="draft-desc">{d.description}</div></div><button className="secondary-button" onClick={() => { updateDemo({ drafts: demo.drafts.filter(x => x.id !== d.id) }); notify('Local sample draft removed.') }}>Remove draft</button></div>)}</div> : <Empty icon={FileText} title="No sample posts yet" description="Create a fictional draft to test the employer workflow."/>}</>}
        {page === 'guidelines' && <><PageHeading eyebrow="TRUST & SAFETY" title="Community standards" desc="Draft safeguards that guide the experience; not a substitute for legal advice."/><div className="feature-grid"><Feature icon={CheckCircle2} title="Clear, fair listings" desc="Every job post should describe a genuine role using neutral, non-discriminatory language." list={['No religious criteria in job posts', 'No misleading or invented employer claims', 'Pay and location details where known']}/><Feature icon={LockKeyhole} title="No seeker fees" desc="Community access should remain free, without preferred paid placement or hidden charges." list={['No premium or paid job tiers', 'No CV sales', 'No recruitment or placement fees']}/><Feature icon={ShieldCheck} title="Local moderation" desc="Community moderators flag risks and remove unsuitable content, without claiming official verification." list={['Review and report workflows', 'No assurance of employer legitimacy', 'No launch until professional UAE legal review']}/></div><Warning tone="strong">Ephworks is not licensed as a recruitment or employment placement agency. The prototype makes no applications, introductions, offers or employment decisions.</Warning></>}
        {page === 'review' && <><PageHeading eyebrow="MODERATOR WORKSPACE" title="Sample review queue" desc="Practice reviewing fictional content. Decisions affect this browser only."/><Warning>Moderation status here is demonstrative; it does not verify employers or alter any live listing.</Warning><div className="review-list">{SAMPLE_JOBS.slice(0, 3).map(j => <div className="review-card" key={j.id}><div className="company-icon sage"><Building2 size={21}/></div><div className="review-info"><h3>{j.title}</h3><p>{j.company} · Fictional · {j.emirate}</p><Pill type="subtle">{demo.reviews[j.id] || 'Pending demo review'}</Pill></div><div className="review-actions"><button className="outline-small" onClick={() => setSelectedJob(j)}>Details</button><button className="approve-small" onClick={() => reviewDraft(j.id, 'Approved (demo)')}><Check size={15}/> Approve</button><button className="reject-small" onClick={() => reviewDraft(j.id, 'Flagged (demo)')}><Flag size={15}/> Flag</button></div></div>)}</div></>}
        {page === 'reports' && <><PageHeading eyebrow="MODERATOR WORKSPACE" title="Sample reports" desc="Illustrative reports submitted within this browser session."/>{demo.reports.length ? <div className="job-list">{demo.reports.map(r => { const j = SAMPLE_JOBS.find(x => x.id === r.jobId); return <div className="review-card" key={r.id}><div className="feature-icon"><Flag size={20}/></div><div className="review-info"><h3>{j?.title || 'Sample role'}</h3><p>Reason: {r.reason}</p><Pill type="subtle">{r.status}</Pill></div><button className="approve-small" disabled={r.status !== 'Open'} onClick={() => markReport(r.id)}>Resolve locally</button></div> })}</div> : <Empty icon={Flag} title="No sample reports" description="Use 'Report this opportunity' from any sample listing to test this queue."/>}</>}
        <footer className="footer"><span>Ephworks · A community helping people move forward.</span><button onClick={() => setShowAbout(true)}>About this prototype <ArrowRight size={14}/></button></footer>
      </main>
    </div>

    <nav className="mobile-nav" aria-label="Mobile navigation">{userMainNav.map(n => { const Icon = icons[n.icon]; return <button key={n.id} aria-current={page === n.id ? 'page' : undefined} className={page === n.id ? 'active' : ''} onClick={() => go(n.id)}><Icon size={21}/><span>{n.label}</span></button> })}<button className={showMobileMore || (!userMainNav.some(n => n.id === page)) ? 'active' : ''} onClick={() => setShowMobileMore(true)} aria-haspopup="dialog" aria-expanded={showMobileMore}><MoreHorizontal size={22}/><span>More</span></button></nav>
    {showMobileMore && <div className="overlay mobile-more-overlay" onMouseDown={e => e.target === e.currentTarget && setShowMobileMore(false)}><div className="more-sheet" role="dialog" aria-modal="true" aria-label="More navigation"><div className="sheet-head"><strong>More from Ephworks</strong><button className="icon-button" onClick={() => setShowMobileMore(false)} aria-label="Close menu"><X size={20}/></button></div><div className="sheet-items">{nav.map(n => { const Icon = icons[n.icon]; return <button key={n.id} className={page === n.id ? 'active' : ''} onClick={() => go(n.id)}><Icon size={19}/>{n.label}<ChevronRight size={15}/></button> })}</div><button className="sheet-about" onClick={() => { setShowMobileMore(false); setShowAbout(true) }}>About this prototype <ArrowRight size={16}/></button></div></div>}

    {selectedJob && <div className="overlay job-overlay" onMouseDown={e => e.target === e.currentTarget && setSelectedJob(null)}><section className="job-drawer" role="dialog" aria-modal="true" aria-label={`${selectedJob.title} sample opportunity`}><div className="drawer-header"><button className="back-button" onClick={() => setSelectedJob(null)}><ArrowLeft size={17}/> Back to opportunities</button><button className="icon-button" aria-label="Close opportunity" onClick={() => setSelectedJob(null)}><X size={21}/></button></div><div className="drawer-body"><Pill type="mint"><ShieldCheck size={13}/> Sample review</Pill><div className={`company-icon large ${selectedJob.hue}`}>{selectedJob.initials}</div><h2>{selectedJob.title}</h2><p className="drawer-company">{selectedJob.company} · {selectedJob.emirate}, UAE · Fictional company</p><div className="detail-grid"><div><span>MONTHLY COMPENSATION</span><strong>{selectedJob.salary}</strong></div><div><span>EMPLOYMENT TYPE</span><strong>{selectedJob.type} · {selectedJob.mode}</strong></div><div><span>WORKING HOURS</span><strong>{selectedJob.hours}</strong></div><div><span>OPPORTUNITY CATEGORY</span><strong>{selectedJob.category}</strong></div></div><h3>A little about the role</h3><p>{selectedJob.description}</p><h3>What you'll do</h3><ul>{selectedJob.responsibilities.map(v => <li key={v}>{v}</li>)}</ul><h3>What you'll bring</h3><div className="tags">{selectedJob.requirements.map(x => <Pill key={x} type="subtle">{x}</Pill>)}</div><div className="authorization"><h4><ShieldCheck size={17}/> Work-authorisation information</h4><p>{selectedJob.sponsorship}</p></div><button className="primary-button full" onClick={() => expressInterest(selectedJob.id)}>{demo.interests.includes(selectedJob.id) ? <CheckCircle2 size={18}/> : <HeartHandshake size={18}/>} {demo.interests.includes(selectedJob.id) ? 'Interested (demo)' : "I'm interested"} <ArrowRight size={17}/></button><p className="private-copy"><LockKeyhole size={14}/> No information is sent. This interaction is saved locally for the demo.</p><div className="drawer-footer-actions"><button onClick={() => toggleSave(selectedJob.id)}><Bookmark size={16} fill={demo.saved.includes(selectedJob.id) ? 'currentColor' : 'none'}/>{demo.saved.includes(selectedJob.id) ? 'Saved' : 'Save role'}</button><button onClick={() => setShowReport(true)}><Flag size={16}/> Report this opportunity</button></div></div></section></div>}

    {showAbout && <Modal onClose={() => setShowAbout(false)} title="About this prototype"><div className="about-mark"><img src="/logo.svg" alt="Ephworks placeholder logo"/><span>Ephworks</span></div><p><strong>People, opportunity, purpose.</strong> A community opportunity prototype created for #HACK2026.</p><p>Fictional job listings, profiles, volunteer ideas, role previews, draft posts, reports and review actions demonstrate a possible product experience.</p><Warning tone="strong">There is no backend, account system, employer verification, application service or live matching. No real people or companies should use this app. Launch requires independent UAE legal and privacy review.</Warning><button className="primary-button full" onClick={() => setShowAbout(false)}>Understood</button></Modal>}
    {showReset && <Modal onClose={() => setShowReset(false)} title="Reset local demo?"><p>This clears saved roles, demo interests, fictional draft posts, sample reports and moderation choices from this browser.</p><div className="modal-actions"><button className="secondary-button" onClick={() => setShowReset(false)}>Cancel</button><button className="danger-button" onClick={reset}><RotateCcw size={16}/> Reset demo</button></div></Modal>}
    {showReport && <Modal onClose={() => setShowReport(false)} title="Report sample opportunity"><p>Choose a reason to try the local moderation flow. No real report is sent.</p><label className="form-label">Reason<select value={reportReason} onChange={e => setReportReason(e.target.value)}>{['Misleading information','Potential discrimination','Request for payment','Suspicious employer details','Other concern'].map(x => <option key={x}>{x}</option>)}</select></label><div className="modal-actions"><button className="secondary-button" onClick={() => setShowReport(false)}>Cancel</button><button className="primary-button" onClick={submitReport}><Flag size={16}/> Add sample report</button></div></Modal>}
  </div>
}

function Brand({ compact = false }) { return <div className={`brand ${compact ? 'compact' : ''}`}><img src="/logo.svg" alt=""/><div><strong>Ephworks</strong>{!compact && <span>PEOPLE · OPPORTUNITY · PURPOSE</span>}</div></div> }
function JobCard({ job, saved, onSave, onOpen }) { return <article className="job-card"><div className={`company-icon ${job.hue}`}>{job.initials}</div><div className="job-info"><div className="job-title-row"><h3>{job.title}</h3><Pill type="reviewed"><BadgeCheck size={13}/> Sample post reviewed</Pill></div><p className="company-name">{job.company} <span>· Fictional</span></p><div className="job-tags"><span><MapPin size={15}/>{job.emirate}</span><span><BriefcaseBusiness size={15}/>{job.type}</span><span className="pay">{job.salary} / month</span></div></div><div className="job-actions"><button className={`save-button ${saved ? 'is-saved' : ''}`} aria-label={`${saved ? 'Remove' : 'Save'} ${job.title}`} onClick={onSave}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'}/><span>{saved ? 'Saved' : 'Save'}</span></button><button className="open-job" onClick={onOpen} aria-label={`View ${job.title}`}>View role <ArrowRight size={17}/></button></div></article> }
function Feature({ icon: Icon, title, desc, list }) { return <article className="feature-card"><div className="feature-icon"><Icon size={23}/></div><h3>{title}</h3><p>{desc}</p><ul>{list.map(item => <li key={item}><Check size={16}/>{item}</li>)}</ul></article> }
function Modal({ onClose, title, children }) { return <div className="overlay centered-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}><section className="dialog" role="dialog" aria-modal="true" aria-label={title}><div className="dialog-top"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X size={21}/></button></div><div className="dialog-content">{children}</div></section></div> }
