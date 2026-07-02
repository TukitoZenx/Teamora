import { Check } from 'lucide-react'
import teamoraLogo from '../../../assets/hero.png'

export default function AuthBrandPanel() {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-[#09090B] px-10 md:flex md:flex-col lg:px-14">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_26%_22%,rgba(109,40,255,0.22),transparent_34%)]" />

      <div className="relative z-10 flex h-full flex-col justify-between py-10">
        <div className="flex items-center gap-3">
          <img src={teamoraLogo} alt="Teamora logo" className="h-10 w-10 rounded-xl" />
          <span className="text-lg font-medium text-white">Teamora</span>
        </div>

        <div className="max-w-sm">
          <h1 className="text-4xl font-medium leading-tight tracking-tight text-white lg:text-5xl">
            One Workspace.
            <br />
            Infinite Collaboration.
          </h1>
          <p className="mt-6 text-xl leading-8 text-white/85">
            Create.
            <br />
            Collaborate.
            <br />
            Ship faster.
          </p>
          <p className="mt-6 text-sm leading-6 text-white/55">
            Everything your team needs in one secure workspace.
          </p>
        </div>

        <div className="space-y-4 text-sm text-white/70">
          {['Live Collaboration', 'Secure Workspace', 'Cloud Sync'].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/8 text-white">
                <Check className="h-3.5 w-3.5" />
              </span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
