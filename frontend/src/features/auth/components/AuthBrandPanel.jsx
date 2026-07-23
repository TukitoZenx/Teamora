import { Check, FileText, Presentation, Table2, Users, Video, PenTool } from 'lucide-react'
import { Link } from 'react-router-dom'
import teamoraLogo from '../../../assets/hero.png'

const FEATURES = [
  { icon: Users, label: 'Live multiplayer collaboration' },
  { icon: FileText, label: 'Docs, sheets & whiteboards' },
  { icon: Video, label: 'Meetings built into the workspace' },
  { icon: Presentation, label: 'Presentations that stay in sync' }
]

const TOOL_PILLS = [
  { icon: FileText, label: 'Docs' },
  { icon: Table2, label: 'Sheets' },
  { icon: PenTool, label: 'Whiteboard' },
  { icon: Presentation, label: 'Slides' },
  { icon: Video, label: 'Meet' }
]

export default function AuthBrandPanel({ mode = 'signin' }) {
  const isSignup = mode === 'signup'

  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-slate-950 md:flex md:flex-col">
      {/* Layered gradients */}
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
        className="absolute inset-0 bg-[linear-gradient(160deg,rgba(15,23,42,0.2)_0%,rgba(15,23,42,0.85)_100%)]"
      />
      {/* Subtle grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }}
      />

      {/* Floating orbs */}
      <div aria-hidden className="absolute -left-16 top-1/4 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
      <div aria-hidden className="absolute bottom-20 right-10 h-48 w-48 rounded-full bg-info/20 blur-3xl" />

      <div className="relative z-10 flex h-full flex-col justify-between px-10 py-10 xl:px-16 xl:py-12">
        <Link to="/" className="group flex w-fit items-center gap-3">
          <img
            src={teamoraLogo}
            alt="Teamora logo"
            className="h-11 w-11 rounded-xl shadow-lg transition-transform duration-normal group-hover:scale-105"
          />
          <span className="text-xl font-semibold tracking-tight text-white transition-colors group-hover:text-white/90">
            Teamora
          </span>
        </Link>

        <div className="max-w-xl py-10">
          <p className="mb-4 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-white/70 backdrop-blur-sm">
            {isSignup ? 'Start free today' : 'Welcome back'}
          </p>
          <h1 className="text-4xl font-semibold leading-[1.15] tracking-tight text-white xl:text-5xl 2xl:text-[3.25rem]">
            One workspace.
            <br />
            <span className="bg-gradient-to-r from-violet-300 via-fuchsia-200 to-sky-300 bg-clip-text text-transparent">
              Infinite collaboration.
            </span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-white/65 xl:text-lg">
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
        </div>

        <div className="space-y-3">
          {FEATURES.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-2.5 backdrop-blur-sm"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-violet-200">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="text-sm text-white/80">{label}</span>
              <Check className="ml-auto h-4 w-4 shrink-0 text-emerald-400/80" aria-hidden />
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
