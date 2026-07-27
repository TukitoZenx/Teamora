import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Calendar,
  CheckSquare,
  ChevronDown,
  FileText,
  Folder,
  MessageSquare,
  Paintbrush,
  Presentation,
  TableProperties,
  Users,
  Video
} from 'lucide-react'
import teamoraLogo from '../assets/hero.png'

/** Real Teamora workspace tools only (matches product sidebar). */
const features = [
  {
    id: 'documents',
    title: 'Documents',
    desc: 'Rich text docs with live cursors and multi-file tabs.',
    icon: FileText
  },
  {
    id: 'spreadsheet',
    title: 'Spreadsheet',
    desc: 'Shared grids, formulas, and .xlsx import/export.',
    icon: TableProperties
  },
  {
    id: 'presentation',
    title: 'Presentation',
    desc: 'Slides, themes, and full-screen present mode.',
    icon: Presentation
  },
  {
    id: 'whiteboard',
    title: 'Whiteboard',
    desc: 'Multi-page board with pen, pencil, highlighter, and eraser.',
    icon: Paintbrush
  },
  { id: 'meetings', title: 'Meetings', desc: 'Video calls with mic, camera, and screen share.', icon: Video },
  {
    id: 'shared-files',
    title: 'Shared Files',
    desc: 'Folders, uploads, and open files in the right editor.',
    icon: Folder
  },
  { id: 'calendar', title: 'Calendar', desc: 'Month view for tasks with dates, times, and reminders.', icon: Calendar },
  {
    id: 'tasks',
    title: 'All Tasks',
    desc: 'Task list with status, priority, assignee, and filters.',
    icon: CheckSquare
  },
  { id: 'chat', title: 'Chat', desc: 'Workspace chat with optional attachments.', icon: MessageSquare },
  { id: 'members', title: 'Members', desc: 'Invite by link or code; owners can approve join requests.', icon: Users }
]

const showcaseTabs = [
  { id: 'docs', label: 'Documents', icon: FileText },
  { id: 'sheets', label: 'Spreadsheet', icon: TableProperties },
  { id: 'slides', label: 'Presentation', icon: Presentation },
  { id: 'board', label: 'Whiteboard', icon: Paintbrush },
  { id: 'meet', label: 'Meetings', icon: Video }
]

const faqs = [
  {
    q: 'What is Teamora?',
    a: 'A workspace app where your team can work on documents, spreadsheets, presentations, whiteboards, meetings, files, calendar, tasks, and chat together.'
  },
  {
    q: 'Can multiple people edit at the same time?',
    a: 'Yes. Docs, sheets, slides, and whiteboards sync in real time so everyone sees the same content as it changes.'
  },
  {
    q: 'How do I invite my team?',
    a: 'Create a workspace, then share the invite link or code. Owners can require approval before someone joins.'
  },
  {
    q: 'How do I sign up?',
    a: 'Use email and password, or continue with Google. Then create a workspace or join one with an invite.'
  }
]

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState('docs')
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div className="relative w-full bg-card font-sans text-text">
      {/* Full-width sticky navbar */}
      <header className="sticky top-0 z-50 border-b border-border/70 bg-card/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
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
              className="h-8 w-8 rounded-lg object-contain transition-transform duration-200 group-hover:scale-105"
            />
            <span className="text-base font-bold tracking-tight text-text transition-colors group-hover:text-primary">
              TEAMORA
            </span>
          </a>

          <nav className="hidden items-center gap-1 md:flex">
            {[
              { href: '#features', label: 'Features' },
              { href: '#collaboration', label: 'Workspace' },
              { href: '#faq', label: 'FAQ' }
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted transition-colors duration-200 hover:bg-primary/10 hover:text-primary"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              to="/signin"
              className="hidden rounded-full border border-border px-4 py-2 text-sm font-semibold text-text transition-all duration-200 hover:border-primary hover:bg-primary hover:text-white hover:shadow-md hover:shadow-primary/30 sm:inline-flex"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-primary-hover hover:shadow-md hover:shadow-primary/30"
            >
              Get Started
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto flex min-h-[85vh] w-full flex-col items-center justify-center overflow-hidden px-6 pb-20 pt-16 text-center md:px-12">
        <div aria-hidden className="pointer-events-none absolute inset-0 flex justify-center opacity-70">
          <div className="absolute -top-32 h-[600px] w-[800px] rounded-full bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--tw-primary)_25%,transparent),transparent_65%)] blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center">
          <h1 className="mb-6 text-5xl font-extrabold leading-[1.1] tracking-tight text-text md:text-7xl">
            One Workspace.
            <br />
            <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
              Infinite Collaboration.
            </span>
          </h1>

          <p className="mb-10 max-w-2xl text-base leading-relaxed text-muted md:text-lg">
            Documents, spreadsheets, presentations, whiteboards, meetings, files, calendar, tasks, and chat — in one
            workspace, in real time.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/signup"
              className="flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-xs font-bold uppercase tracking-wider text-white shadow-[0_4px_20px_color-mix(in_srgb,var(--tw-primary)_40%,transparent)] transition-all duration-200 hover:bg-primary-hover hover:shadow-[0_4px_28px_color-mix(in_srgb,var(--tw-primary)_55%,transparent)]"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/signin"
              className="rounded-full border-2 border-border bg-transparent px-8 py-4 text-xs font-bold uppercase tracking-wider text-text shadow-sm transition-all duration-200 hover:border-primary hover:bg-primary hover:text-white hover:shadow-[0_4px_20px_color-mix(in_srgb,var(--tw-primary)_40%,transparent)]"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features — product only */}
      <section
        id="features"
        className="mx-auto w-full max-w-7xl scroll-mt-16 border-t border-border px-6 py-24 md:px-12"
      >
        <div className="mx-auto mb-14 max-w-xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text">What&apos;s in Teamora</h2>
          <p className="mt-2 text-sm text-muted">The tools you get when you open a workspace.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {features.map((feat) => {
            const Icon = feat.icon
            return (
              <div
                key={feat.id}
                className="group flex flex-col items-start rounded-2xl border border-border/60 bg-card/40 p-5 shadow-sm backdrop-blur-xl transition-all duration-300 hover:border-primary/20 hover:bg-card hover:shadow-md"
              >
                <div className="mb-3 rounded-xl border border-primary/10 bg-primary/10 p-2.5 transition-colors group-hover:bg-primary/15">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-1 text-sm font-bold text-text">{feat.title}</h3>
                <p className="text-xs leading-relaxed text-muted">{feat.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Workspace preview — simple, no fake demo modal */}
      <section
        id="collaboration"
        className="w-full scroll-mt-16 border-y border-border bg-card-sunken px-6 py-24 md:px-12"
      >
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-text">
              One sidebar.
              <br />
              All your tools.
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-muted">
              Create a workspace or join with an invite. Open docs, sheets, slides, the board, meetings, files,
              calendar, tasks, and chat without leaving Teamora.
            </p>
            <ul className="space-y-2.5 text-sm text-muted">
              {[
                'Live co-editing on docs, sheets, slides, and boards',
                'Video meetings with screen share',
                'Invite link or code for teammates'
              ].map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-8">
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl shadow-primary/5 ring-1 ring-black/5">
              <div className="flex h-12 items-center justify-between border-b border-border/60 bg-card-sunken px-4">
                <div className="flex items-center gap-2">
                  <div className="mr-3 flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-yellow-400" />
                    <div className="h-3 w-3 rounded-full bg-green-400" />
                  </div>
                  <span className="rounded-md border border-border/50 bg-card px-3 py-1 text-[10px] font-semibold text-muted shadow-sm">
                    workspace / tools
                  </span>
                </div>
              </div>

              <div className="flex gap-1 overflow-x-auto border-b border-border bg-card-sunken px-2 pt-1">
                {showcaseTabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 rounded-t-lg border-x border-t px-4 py-2 text-[10px] font-bold transition-colors ${isActive
                        ? 'border-border bg-card text-primary'
                        : 'border-transparent bg-transparent text-muted hover:text-text'
                        }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  )
                })}
              </div>

              <div className="relative h-72 select-none overflow-hidden bg-card p-6 sm:h-80">
                <AnimatePresence mode="wait">
                  {activeTab === 'docs' && (
                    <Preview key="docs">
                      <div className="flex h-full flex-col rounded-xl border border-border/50 bg-card p-4 shadow-sm">
                        <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                          <FileText className="h-4 w-4 text-primary" />
                          Document
                        </div>
                        <h4 className="mb-2 text-base font-extrabold text-text">Project notes</h4>
                        <p className="text-xs leading-relaxed text-muted">
                          Rich text with live cursors when teammates are editing the same file.
                        </p>
                        <div className="mt-4 space-y-2">
                          <div className="h-2 w-4/5 rounded-full bg-border/70" />
                          <div className="h-2 w-3/5 rounded-full bg-border/50" />
                        </div>
                      </div>
                    </Preview>
                  )}
                  {activeTab === 'sheets' && (
                    <Preview key="sheets">
                      <div className="h-full rounded-xl border border-border/50 bg-card p-4 shadow-sm">
                        <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                          <TableProperties className="h-4 w-4 text-emerald-500" />
                          Spreadsheet
                        </div>
                        <table className="w-full border-collapse text-left text-[11px]">
                          <thead>
                            <tr className="border-b border-border bg-card-sunken text-muted">
                              <th className="p-2 font-semibold">Item</th>
                              <th className="p-2 font-semibold">Value</th>
                            </tr>
                          </thead>
                          <tbody className="text-text">
                            <tr className="border-b border-border/60">
                              <td className="p-2">Revenue</td>
                              <td className="p-2 font-mono">$45,000</td>
                            </tr>
                            <tr>
                              <td className="p-2">Marketing</td>
                              <td className="p-2 font-mono">$12,500</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </Preview>
                  )}
                  {activeTab === 'slides' && (
                    <Preview key="slides">
                      <div className="relative flex h-full flex-col items-center justify-center rounded-xl border border-border/50 bg-card p-6 text-center shadow-sm">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 to-primary" />
                        <Presentation className="mb-3 h-8 w-8 text-primary" />
                        <h5 className="text-sm font-extrabold text-text">Q3 Deck</h5>
                        <p className="mt-1 max-w-xs text-[11px] text-muted">
                          Build slides, apply themes, and present full screen.
                        </p>
                      </div>
                    </Preview>
                  )}
                  {activeTab === 'board' && (
                    <Preview key="board">
                      <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-border/50 bg-card">
                        <div className="flex items-center gap-1.5 border-b border-border/50 bg-card-sunken px-3 py-2">
                          <span className="rounded-md bg-primary px-2 py-1 text-[10px] font-semibold text-white">
                            Pen
                          </span>
                          <span className="rounded-md border border-border bg-card px-2 py-1 text-[10px] font-medium text-muted">
                            Pencil
                          </span>
                          <span className="rounded-md border border-border bg-card px-2 py-1 text-[10px] font-medium text-muted">
                            Highlighter
                          </span>
                          <span className="rounded-md border border-border bg-card px-2 py-1 text-[10px] font-medium text-muted">
                            Eraser
                          </span>
                          <span className="ml-auto text-[10px] font-medium text-muted">Page 1</span>
                        </div>
                        <div className="relative flex flex-1 items-center justify-center bg-[radial-gradient(color-mix(in_srgb,var(--tw-border)_70%,transparent)_1px,transparent_1px)] [background-size:14px_14px] p-6">
                          <svg className="h-28 w-full max-w-sm" viewBox="0 0 320 100" fill="none" aria-hidden>
                            <path
                              d="M20 70 C 60 18, 100 90, 150 40 S 240 15, 300 55"
                              stroke="var(--tw-primary)"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                            <path
                              d="M36 82 C 90 48, 130 88, 190 62 S 270 78, 304 50"
                              stroke="color-mix(in srgb, var(--tw-primary) 35%, transparent)"
                              strokeWidth="12"
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-medium text-muted shadow-sm">
                            <Paintbrush className="h-3.5 w-3.5 text-primary" />
                            Freehand drawing
                          </div>
                        </div>
                      </div>
                    </Preview>
                  )}
                  {activeTab === 'meet' && (
                    <Preview key="meet">
                      <div className="flex h-full flex-col rounded-xl border border-border/50 bg-card p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                            <Video className="h-4 w-4 text-red-500" />
                            Meeting
                          </div>
                          <span className="rounded bg-red-500/10 px-2 py-0.5 text-[8px] font-bold text-red-500">
                            LIVE
                          </span>
                        </div>
                        <div className="grid flex-1 grid-cols-2 gap-2">
                          {['You', 'Teammate'].map((name) => (
                            <div
                              key={name}
                              className="relative flex items-center justify-center rounded-lg border border-border bg-slate-800"
                            >
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                                {name[0]}
                              </span>
                              <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[8px] font-semibold text-white">
                                {name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Preview>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="w-full scroll-mt-16 border-t border-border bg-card-sunken px-6 py-24 md:px-12">
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-text">FAQ</h2>
            <p className="mt-2 text-sm text-muted">Short answers about how Teamora works.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((item, idx) => {
              const isOpen = openFaq === idx
              return (
                <div key={item.q} className="overflow-hidden rounded-2xl border border-border bg-card">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left font-bold text-text transition-colors hover:text-primary"
                  >
                    <span className="text-sm tracking-tight">{item.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-muted transition-transform ${isOpen ? 'rotate-180 text-primary' : ''}`}
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

      {/* Footer */}
      <footer className="w-full border-t border-border bg-card-sunken px-6 py-12 text-muted md:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="flex items-center gap-2"
          >
            <img src={teamoraLogo} alt="" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-bold text-text">Teamora</span>
          </a>
          <div className="flex flex-wrap justify-center gap-5 text-xs">
            <a href="#features" className="hover:text-primary">
              Features
            </a>
            <a href="#collaboration" className="hover:text-primary">
              Workspace
            </a>
            <a href="#faq" className="hover:text-primary">
              FAQ
            </a>
            <Link to="/signin" className="hover:text-primary">
              Sign in
            </Link>
            <Link to="/signup" className="hover:text-primary">
              Sign up
            </Link>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">
            &copy; {new Date().getFullYear()} Teamora
          </span>
        </div>
      </footer>
    </div>
  )
}

function Preview({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="absolute inset-6"
    >
      {children}
    </motion.div>
  )
}
