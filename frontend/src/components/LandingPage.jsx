import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Paintbrush,
  TableProperties,
  Presentation,
  Video,
  Folder,
  Calendar,
  Sparkles,
  Shield,
  RefreshCw,
  Layers,
  ArrowRight,
  Play,
  X,
  Users,
  Zap,
  Clock,
  ChevronDown,
  Check,
  PenTool
} from 'lucide-react'
import teamoraLogo from '../assets/hero.png'

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#collaboration', label: 'Showcase' },
  { href: '#why', label: 'Why Teamora' },
  { href: '#faq', label: 'FAQ' }
]

const FEATURES = [
  { id: 'docs', title: 'Documents', desc: 'Co-edit rich docs with live cursors and autosave.', icon: FileText },
  { id: 'sheets', title: 'Spreadsheets', desc: 'Analyze data together cell by cell in real time.', icon: TableProperties },
  { id: 'whiteboard', title: 'Whiteboard', desc: 'Brainstorm freely on an infinite multiplayer canvas.', icon: Paintbrush },
  { id: 'slides', title: 'Presentations', desc: 'Build and present decks without leaving the workspace.', icon: Presentation },
  { id: 'meetings', title: 'Meetings', desc: 'Video, audio, and screen share inside the same room.', icon: Video },
  { id: 'files', title: 'Shared files', desc: 'Keep project assets organized and always in reach.', icon: Folder },
  { id: 'calendar', title: 'Calendar', desc: 'Plan deadlines and meetings next to your work.', icon: Calendar },
  { id: 'workspaces', title: 'Workspaces', desc: 'Separate teams and projects with clear boundaries.', icon: Layers }
]

const WHYS = [
  {
    title: 'Realtime collaboration',
    desc: 'Changes sync instantly so everyone stays aligned without refresh or merge conflicts.',
    icon: Zap
  },
  {
    title: 'Autosave everywhere',
    desc: 'Every keystroke and stroke is saved automatically into workspace history.',
    icon: RefreshCw
  },
  {
    title: 'Secure access control',
    desc: 'Auth, roles, and invite-only workspaces keep your team data private.',
    icon: Shield
  },
  {
    title: 'Meetings in context',
    desc: 'Jump into calls and screen share without switching to another app.',
    icon: Video
  },
  {
    title: 'One place for everything',
    desc: 'Docs, sheets, boards, slides, and files live under a single workspace roof.',
    icon: Folder
  },
  {
    title: 'Version history',
    desc: 'Roll back documents, cells, and slides to any earlier savepoint in one click.',
    icon: Clock
  }
]

const TOOL_PILLS = [
  { icon: FileText, label: 'Docs' },
  { icon: TableProperties, label: 'Sheets' },
  { icon: PenTool, label: 'Whiteboard' },
  { icon: Presentation, label: 'Slides' },
  { icon: Video, label: 'Meet' }
]

const FAQS = [
  {
    q: 'What is Teamora?',
    a: 'Teamora is a unified workspace for multiplayer collaboration. Inside one space your team can co-edit documents, draw on whiteboards, work spreadsheets, build slides, share files, and run meetings without context switching.'
  },
  {
    q: 'Does Teamora support concurrent editing?',
    a: 'Yes. Files stay synchronized in real time. You see cursors, highlights, cells, slides, and strokes update as teammates make changes.'
  },
  {
    q: 'Is there version history?',
    a: 'Teamora keeps snapshots of sheets, documents, and slides so you can review timestamps, see contributors, and restore earlier states.'
  },
  {
    q: 'How secure are workspaces?',
    a: 'Teamora uses standard authentication. Workspace data and realtime traffic are protected, and spaces are joined only through authorized invites or secure room IDs.'
  }
]

const SHOWCASE_TABS = [
  { id: 'docs', label: 'Documents', icon: FileText },
  { id: 'sheets', label: 'Sheets', icon: TableProperties },
  { id: 'slides', label: 'Slides', icon: Presentation },
  { id: 'whiteboard', label: 'Board', icon: Paintbrush },
  { id: 'meetings', label: 'Meet', icon: Video }
]

function SectionHeading({ eyebrow, title, subtitle, align = 'center' }) {
  return (
    <div className={`mb-12 max-w-2xl ${align === 'center' ? 'mx-auto text-center' : ''}`}>
      {eyebrow && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
      )}
      <h2 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">{subtitle}</p>}
    </div>
  )
}

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState('docs')
  const [showDemoModal, setShowDemoModal] = useState(false)
  const [demoProgress, setDemoProgress] = useState(0)
  const [demoPlaying, setDemoPlaying] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const tabs = SHOWCASE_TABS.map((t) => t.id)
    const interval = setInterval(() => {
      setActiveTab((prev) => tabs[(tabs.indexOf(prev) + 1) % tabs.length])
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let timer
    if (showDemoModal && demoPlaying) {
      timer = setInterval(() => {
        setDemoProgress((p) => {
          if (p >= 100) {
            setDemoPlaying(false)
            return 0
          }
          return p + 1
        })
      }, 100)
    }
    return () => clearInterval(timer)
  }, [showDemoModal, demoPlaying])

  const openDemo = () => {
    setShowDemoModal(true)
    setDemoPlaying(true)
    setDemoProgress(0)
  }

  return (
    <div className="relative w-full bg-background font-sans text-text selection:bg-primary/15 selection:text-text">
      {/* ── Navbar ─────────────────────────────────────────── */}
      <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
        <header
          className={[
            'flex h-14 w-full max-w-6xl items-center justify-between rounded-full border px-4 transition-all duration-normal sm:px-5',
            scrolled
              ? 'border-border/70 bg-card/80 shadow-dropdown backdrop-blur-xl'
              : 'border-border/40 bg-card/55 shadow-sm backdrop-blur-lg'
          ].join(' ')}
        >
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="group flex items-center gap-2.5"
          >
            <img
              src={teamoraLogo}
              alt="Teamora"
              className="h-8 w-8 rounded-lg object-contain shadow-sm transition-transform duration-normal group-hover:scale-105"
            />
            <span className="text-base font-semibold tracking-tight text-text transition-colors group-hover:text-primary">
              Teamora
            </span>
          </a>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-card-sunken hover:text-text"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/signin"
              className="hidden rounded-full px-4 py-2 text-sm font-semibold text-muted transition-colors hover:bg-card-sunken hover:text-text sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-hover"
            >
              Get started
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </header>
      </div>

      {/* ── Hero: 60% brand / 40% CTA ──────────────────────── */}
      <section className="relative min-h-screen overflow-hidden pt-20 md:grid md:min-h-screen md:grid-cols-[minmax(0,60%)_minmax(0,40%)] md:pt-0">
        {/* Left brand panel — matches auth */}
        <div className="relative flex min-h-[70vh] flex-col justify-between overflow-hidden bg-slate-950 px-6 py-16 sm:px-10 md:min-h-screen md:px-12 md:py-12 lg:px-16">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_15%_20%,rgba(124,58,237,0.55),transparent_55%)]"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_85%_80%,rgba(59,130,246,0.28),transparent_50%)]"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(160deg,rgba(15,23,42,0.15)_0%,rgba(15,23,42,0.75)_100%)]"
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
              backgroundSize: '48px 48px'
            }}
          />
          <div aria-hidden className="absolute -left-16 top-1/4 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
          <div aria-hidden className="absolute bottom-20 right-10 h-48 w-48 rounded-full bg-info/20 blur-3xl" />

          <div className="relative z-10 flex h-full flex-1 flex-col justify-center py-8 md:py-16">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-white/70 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-violet-300" />
                Real-time workspace suite
              </p>

              <h1 className="max-w-xl text-4xl font-semibold leading-[1.12] tracking-tight text-white sm:text-5xl xl:text-[3.25rem]">
                One workspace.
                <br />
                <span className="bg-gradient-to-r from-violet-300 via-fuchsia-200 to-sky-300 bg-clip-text text-transparent">
                  Infinite collaboration.
                </span>
              </h1>

              <p className="mt-6 max-w-md text-base leading-relaxed text-white/65 sm:text-lg">
                Docs, sheets, whiteboards, slides, and meetings — everything your team needs to create and ship faster,
                together.
              </p>

              <div className="mt-8 flex flex-wrap gap-2">
                {TOOL_PILLS.map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm"
                  >
                    <Icon className="h-3.5 w-3.5 text-violet-300" aria-hidden />
                    {label}
                  </span>
                ))}
              </div>

              <ul className="mt-10 space-y-3">
                {['Live multiplayer collaboration', 'Secure workspaces', 'Autosave & version history'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-white/80">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>

        {/* Right CTA column ~40% (form content ~30% feel) */}
        <div className="relative flex min-h-[50vh] flex-col justify-center overflow-hidden bg-background px-6 py-16 sm:px-10 md:min-h-screen md:px-8 lg:px-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,color-mix(in_srgb,var(--tw-primary)_14%,transparent),transparent_70%)]"
          />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="relative z-10 mx-auto w-full max-w-[22rem] sm:max-w-[24rem]"
          >
            <h2 className="text-2xl font-semibold tracking-tight text-text sm:text-[1.75rem]">
              Start collaborating free
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Create an account in seconds and invite your team into one unified workspace.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <Link
                to="/signup"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-button bg-primary text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-hover"
              >
                Get started free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/signin"
                className="inline-flex h-12 w-full items-center justify-center rounded-button border border-border bg-card text-sm font-semibold text-text shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
              >
                Sign in to workspace
              </Link>
              <button
                type="button"
                onClick={openDemo}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-button border border-transparent text-sm font-semibold text-muted transition-colors hover:bg-card-sunken hover:text-text"
              >
                <Play className="h-4 w-4 fill-current text-primary" />
                Watch demo
              </button>
            </div>

            <div className="mt-10 rounded-card border border-border/70 bg-card/70 p-4 shadow-card backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Live right now</p>
              <div className="mt-3 space-y-2.5">
                {[
                  { name: 'Alice', task: 'Requirements.docx', color: 'bg-emerald-500' },
                  { name: 'Bob', task: 'Budget.xlsx', color: 'bg-blue-500' },
                  { name: 'Charlie', task: 'Pitch Deck.pptx', color: 'bg-violet-500' }
                ].map((m) => (
                  <div key={m.name} className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${m.color}`}
                    >
                      {m.name[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">{m.name}</p>
                      <p className="truncate text-xs text-muted">editing {m.task}</p>
                    </div>
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────── */}
      <section id="features" className="scroll-mt-24 border-t border-border px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="Product"
            title="Everything modern teams need"
            subtitle="One platform for writing, planning, designing, presenting, and meeting — without the tab chaos."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feat) => {
              const Icon = feat.icon
              return (
                <div
                  key={feat.id}
                  className="group rounded-card border border-border/70 bg-card p-5 shadow-card transition duration-normal hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-hover"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/10 bg-primary/10 transition-colors group-hover:bg-primary/15">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-text">{feat.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted sm:text-sm">{feat.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Collaboration showcase ─────────────────────────── */}
      <section
        id="collaboration"
        className="scroll-mt-24 border-y border-border bg-card-sunken/50 px-6 py-24 sm:px-10"
      >
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              <Users className="h-3.5 w-3.5" />
              Multiplayer sync
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
              All editing.
              <br />
              All at once.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
              Watch teammates collaborate on different assets in the same workspace — no context switching, no lag.
            </p>
            <Link
              to="/signup"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              Try it free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="lg:col-span-8">
            <div className="overflow-hidden rounded-card border border-border/70 bg-card shadow-modal ring-1 ring-black/5">
              <div className="flex h-12 items-center justify-between border-b border-border bg-card-sunken px-4">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-red-400" />
                    <span className="h-3 w-3 rounded-full bg-amber-400" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400" />
                  </div>
                  <span className="ml-2 rounded-md border border-border bg-card px-2.5 py-0.5 text-[10px] font-medium text-muted">
                    teamora.app/workspace/marketing
                  </span>
                </div>
                <div className="flex -space-x-1.5">
                  {['A', 'B', 'C', 'D'].map((n) => (
                    <span
                      key={n}
                      className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-primary/15 text-[9px] font-bold text-primary"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-1 overflow-x-auto border-b border-border bg-card-sunken px-2 pt-1">
                {SHOWCASE_TABS.map((tab) => {
                  const Icon = tab.icon
                  const active = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={[
                        'flex items-center gap-1.5 rounded-t-lg border-x border-t px-3 py-2 text-[11px] font-semibold transition-colors',
                        active
                          ? 'border-border bg-card text-primary'
                          : 'border-transparent text-muted hover:text-text'
                      ].join(' ')}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  )
                })}
              </div>

              <div className="relative h-72 overflow-hidden bg-card p-6 sm:h-80">
                <AnimatePresence mode="wait">
                  {activeTab === 'docs' && (
                    <ShowcasePane key="docs">
                      <div className="flex h-full flex-col rounded-xl border border-border/60 bg-card p-4 shadow-sm">
                        <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                          <FileText className="h-4 w-4 text-primary" />
                          Rich text editor
                        </div>
                        <h4 className="mb-2 text-base font-semibold text-text">Product strategy</h4>
                        <p className="text-sm text-muted">
                          Real-time collaborative editing with live cursors.
                          <motion.span
                            animate={{ opacity: [1, 0] }}
                            transition={{ repeat: Infinity, duration: 0.8 }}
                            className="ml-0.5 inline-block h-3.5 w-0.5 bg-primary align-middle"
                          />
                        </p>
                        <div className="mt-4 space-y-2">
                          <div className="h-2 w-4/5 rounded-full bg-border/70" />
                          <div className="h-2 w-3/5 rounded-full bg-border/50" />
                        </div>
                        <div className="absolute right-8 top-8 rounded-md bg-blue-500 px-2 py-1 text-[9px] font-bold text-white shadow-sm">
                          Bob is writing
                        </div>
                      </div>
                    </ShowcasePane>
                  )}

                  {activeTab === 'sheets' && (
                    <ShowcasePane key="sheets">
                      <div className="h-full overflow-hidden rounded-xl border border-border/60 bg-card p-4 shadow-sm">
                        <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                          <TableProperties className="h-4 w-4 text-emerald-500" />
                          Spreadsheet
                        </div>
                        <table className="w-full border-collapse text-left text-[11px]">
                          <thead>
                            <tr className="border-b border-border bg-card-sunken text-muted">
                              <th className="p-2 font-semibold">Metric</th>
                              <th className="p-2 font-semibold">Q3</th>
                              <th className="p-2 font-semibold">Δ</th>
                            </tr>
                          </thead>
                          <tbody className="text-text">
                            <tr className="border-b border-border/60">
                              <td className="p-2">Revenue</td>
                              <td className="p-2 font-mono">$45,000</td>
                              <td className="p-2 font-mono text-emerald-600">12%</td>
                            </tr>
                            <tr>
                              <td className="p-2">Marketing</td>
                              <td className="relative border border-emerald-500 bg-emerald-500/10 p-2 font-mono">
                                $12,500
                                <span className="absolute -top-3 right-0 rounded bg-emerald-500 px-1 text-[8px] font-bold text-white">
                                  Alice
                                </span>
                              </td>
                              <td className="p-2 font-mono text-emerald-600">8%</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </ShowcasePane>
                  )}

                  {activeTab === 'slides' && (
                    <ShowcasePane key="slides">
                      <div className="relative flex h-full flex-col items-center justify-center rounded-xl border border-border/60 bg-card p-6 text-center shadow-sm">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 to-primary" />
                        <Presentation className="mb-3 h-8 w-8 text-primary" />
                        <h5 className="text-sm font-semibold text-text">Q3 Strategy Deck</h5>
                        <p className="mt-1 max-w-xs text-[11px] text-muted">
                          Native presentations with multiplayer editing and clean transitions.
                        </p>
                      </div>
                    </ShowcasePane>
                  )}

                  {activeTab === 'whiteboard' && (
                    <ShowcasePane key="whiteboard">
                      <div className="relative flex h-full items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-[radial-gradient(color-mix(in_srgb,var(--tw-border)_80%,transparent)_1px,transparent_1px)] [background-size:16px_16px]">
                        <svg className="pointer-events-none absolute inset-0 h-full w-full">
                          <motion.path
                            d="M 80 140 Q 200 60 320 140 T 520 100"
                            fill="none"
                            stroke="var(--tw-primary)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                          />
                        </svg>
                        <div className="absolute left-1/4 top-1/4 -rotate-3 rounded border border-amber-400/40 bg-amber-200/80 px-3 py-2 text-[10px] font-bold text-amber-900 shadow-sm dark:bg-amber-900/40 dark:text-amber-100">
                          Brainstorm!
                        </div>
                      </div>
                    </ShowcasePane>
                  )}

                  {activeTab === 'meetings' && (
                    <ShowcasePane key="meetings">
                      <div className="flex h-full flex-col rounded-xl border border-border/60 bg-card p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                            <Video className="h-4 w-4 text-red-500" />
                            Meeting
                          </div>
                          <span className="flex items-center gap-1 rounded bg-red-500/10 px-2 py-0.5 text-[8px] font-bold text-red-500">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                            LIVE
                          </span>
                        </div>
                        <div className="grid flex-1 grid-cols-2 gap-2">
                          {['Sarah', 'You'].map((name, i) => (
                            <div
                              key={name}
                              className="relative flex items-center justify-center rounded-lg border border-border bg-slate-800"
                            >
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                                {name[0]}
                              </span>
                              <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[8px] font-semibold text-white">
                                {i === 0 ? 'Sarah (Host)' : 'You'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </ShowcasePane>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why ────────────────────────────────────────────── */}
      <section id="why" className="scroll-mt-24 px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="Why Teamora"
            title="Built for focused product teams"
            subtitle="Smooth realtime sync, secure access, and a calm interface that stays out of your way."
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {WHYS.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className="flex gap-4 rounded-card border border-border/70 bg-card p-5 shadow-card transition duration-normal hover:border-primary/20"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card-sunken">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text">{item.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted sm:text-sm">{item.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CTA band ───────────────────────────────────────── */}
      <section className="px-6 py-8 sm:px-10">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-card border border-white/10 bg-slate-950 px-8 py-14 sm:px-12">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_20%_50%,rgba(124,58,237,0.45),transparent_60%)]"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_90%_30%,rgba(59,130,246,0.25),transparent_50%)]"
          />
          <div className="relative z-10 flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-lg">
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Ready to ship faster together?
              </h2>
              <p className="mt-2 text-sm text-white/65">
                Join Teamora and put docs, boards, sheets, slides, and meetings in one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="inline-flex h-12 items-center gap-2 rounded-button bg-white px-6 text-sm font-semibold text-slate-900 transition hover:bg-white/90"
              >
                Create free account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/signin"
                className="inline-flex h-12 items-center rounded-button border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────── */}
      <section id="faq" className="scroll-mt-24 px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-2xl">
          <SectionHeading
            eyebrow="FAQ"
            title="Frequently asked questions"
            subtitle="Quick answers about collaboration, history, and security."
          />
          <div className="space-y-3">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx
              return (
                <div
                  key={item.q}
                  className="overflow-hidden rounded-card border border-border/70 bg-card shadow-card transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left"
                  >
                    <span className="text-sm font-semibold text-text">{item.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-muted transition-transform duration-normal ${isOpen ? 'rotate-180 text-primary' : ''}`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="border-t border-border px-5 pb-5 pt-3 text-sm leading-relaxed text-muted">
                          {item.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card-sunken/40 px-6 py-14 sm:px-10">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 border-b border-border pb-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="group mb-4 inline-flex items-center gap-2.5"
            >
              <img src={teamoraLogo} alt="" className="h-8 w-8 rounded-lg object-contain" />
              <span className="font-semibold text-text transition-colors group-hover:text-primary">Teamora</span>
            </a>
            <p className="max-w-sm text-sm leading-relaxed text-muted">
              The collaboration workspace for product teams who want one place to create, meet, and ship.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-7">
            <div className="flex flex-col gap-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text">Product</span>
              <a href="#features" className="text-sm text-muted hover:text-primary">
                Features
              </a>
              <a href="#collaboration" className="text-sm text-muted hover:text-primary">
                Showcase
              </a>
              <a href="#why" className="text-sm text-muted hover:text-primary">
                Why Teamora
              </a>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text">Resources</span>
              <a href="#faq" className="text-sm text-muted hover:text-primary">
                FAQ
              </a>
              <Link to="/signup" className="text-sm text-muted hover:text-primary">
                Get started
              </Link>
              <Link to="/signin" className="text-sm text-muted hover:text-primary">
                Sign in
              </Link>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text">Legal</span>
              <span className="text-sm text-muted">Security</span>
              <span className="text-sm text-muted">Privacy</span>
              <span className="text-sm text-muted">Terms</span>
            </div>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 pt-8 text-xs text-muted sm:flex-row">
          <span>&copy; {new Date().getFullYear()} Teamora. All rights reserved.</span>
          <span className="font-medium">One workspace. Infinite collaboration.</span>
        </div>
      </footer>

      {/* Demo modal */}
      <AnimatePresence>
        {showDemoModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setShowDemoModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-card border border-border bg-card shadow-modal"
            >
              <div className="flex h-12 items-center justify-between border-b border-border bg-card-sunken px-4">
                <span className="flex items-center gap-2 text-sm font-semibold text-text">
                  <Play className="h-4 w-4 text-primary" />
                  Teamora walkthrough
                </span>
                <button
                  type="button"
                  onClick={() => setShowDemoModal(false)}
                  className="rounded-lg p-1.5 text-muted transition-colors hover:bg-border/50 hover:text-text"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex min-h-[280px] flex-col justify-between p-6">
                <div className="flex flex-1 items-center justify-center text-center">
                  <AnimatePresence mode="wait">
                    {demoProgress < 30 && (
                      <DemoStep
                        key="s1"
                        icon={Layers}
                        title="1. Dedicated workspaces"
                        body="Workspaces hold docs, boards, sheets, meetings, and files. Create one or join with a room ID."
                      />
                    )}
                    {demoProgress >= 30 && demoProgress < 65 && (
                      <DemoStep
                        key="s2"
                        icon={Zap}
                        title="2. Realtime multiplayer"
                        body="Edits stream live. Cursors and presence show exactly what teammates are working on."
                      />
                    )}
                    {demoProgress >= 65 && (
                      <DemoStep
                        key="s3"
                        icon={Users}
                        title="3. Meetings in context"
                        body="Host calls, share screens, and plan next steps without leaving the workspace."
                      />
                    )}
                  </AnimatePresence>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDemoPlaying(!demoPlaying)}
                    className="rounded-button bg-primary px-4 py-2 text-xs font-semibold text-on-primary transition-colors hover:bg-primary-hover"
                  >
                    {demoPlaying ? 'Pause' : 'Resume'}
                  </button>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full bg-primary transition-all duration-100"
                      style={{ width: `${demoProgress}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-mono text-[10px] text-muted">
                    {Math.min(Math.floor(demoProgress / 10), 9)}s / 10s
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ShowcasePane({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-6"
    >
      {children}
    </motion.div>
  )
}

function DemoStep({ icon: Icon, title, body }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="max-w-sm"
    >
      <Icon className="mx-auto mb-4 h-10 w-10 text-primary" />
      <h4 className="mb-2 text-lg font-semibold text-text">{title}</h4>
      <p className="text-sm leading-relaxed text-muted">{body}</p>
    </motion.div>
  )
}
