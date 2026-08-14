import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import teamoraLogo from '../../../assets/hero.png'
import AuthBrandPanel from './AuthBrandPanel'
import { ensureCsrfToken } from '../../../services/api'

/**
 * Auth layout: left brand panel 60%, form column the remaining ~40%
 * (form content is max-width constrained so it reads ~30% of large screens).
 * Scales with viewport via percentage grid columns. Mobile: form full-width.
 */
export default function AuthShell({ children, mode = 'signin' }) {
  useEffect(() => {
    ensureCsrfToken().catch(() => {})
  }, [])

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen bg-background font-sans text-text outline-none md:grid md:grid-cols-[minmax(0,60%)_minmax(0,40%)]"
    >
      <AuthBrandPanel mode={mode} />

      <section className="relative flex min-h-screen flex-col overflow-hidden bg-background">
        {/* Soft ambient background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,color-mix(in_srgb,var(--tw-primary)_14%,transparent),transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-info/5 blur-3xl"
        />

        {/* Top bar */}
        <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-button border border-border/80 bg-card/70 px-3.5 py-2 text-sm font-medium text-text-secondary shadow-sm backdrop-blur-md transition duration-normal hover:border-primary/30 hover:bg-card hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Home</span>
          </Link>

          {/* Mobile brand mark — hidden when left brand panel is visible */}
          <Link to="/" className="flex items-center gap-2.5 md:hidden">
            <img src={teamoraLogo} alt="" className="h-8 w-8 rounded-lg object-contain shadow-sm" />
            <span className="text-base font-semibold tracking-tight text-text">Teamora</span>
          </Link>
        </header>

        {/* Form column — content max-width keeps the form ~30% of large viewports */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-5 pb-10 pt-2 sm:px-6 lg:px-8">
          <div className="w-full max-w-[min(100%,22rem)] sm:max-w-[min(100%,24rem)]">{children}</div>
        </div>
      </section>
    </main>
  )
}
