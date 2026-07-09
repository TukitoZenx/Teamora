import teamoraLogo from '../../../assets/hero.png'
import AuthBrandPanel from './AuthBrandPanel'

export default function AuthShell({ children }) {
  return (
    <main className="min-h-screen bg-background font-sans text-text md:grid md:grid-cols-[45%_55%] lg:grid-cols-[40%_60%]">
      <AuthBrandPanel />

      <section className="relative flex min-h-screen items-center justify-center bg-background px-6 py-12 md:px-10 lg:px-16">
        <div className="w-full max-w-auth">
          <div className="mb-12 flex flex-col items-center gap-4 text-center">
            <img src={teamoraLogo} alt="Teamora logo" className="h-10 w-10 rounded-xl" />
            <span className="text-lg font-medium text-text">Teamora</span>
          </div>

          {children}
        </div>
      </section>
    </main>
  )
}
