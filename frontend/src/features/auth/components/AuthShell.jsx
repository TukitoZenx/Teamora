import teamoraLogo from '../../../assets/hero.png'
import AuthBrandPanel from './AuthBrandPanel'

export default function AuthShell({ children }) {
  return (
    <main className="min-h-screen bg-background font-sans text-text md:grid md:grid-cols-[45%_55%] lg:grid-cols-[40%_60%]">
      <AuthBrandPanel />

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12 md:px-10 lg:px-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--tw-primary)_14%,transparent),transparent_55%)]"
        />
        <div className="relative w-full max-w-auth">
          <div className="mb-10 flex flex-col items-center gap-4 text-center">
            <img
              src={teamoraLogo}
              alt="Teamora logo"
              className="h-11 w-11 rounded-xl border border-border shadow-card"
            />
            <span className="text-lg font-semibold tracking-tight text-text">Teamora</span>
          </div>

          <div className="rounded-card border border-border bg-card/90 p-6 shadow-card backdrop-blur-sm sm:p-8">
            {children}
          </div>
        </div>
      </section>
    </main>
  )
}
