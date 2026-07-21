import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import teamoraLogo from '../../../assets/hero.png'
import AuthBrandPanel from './AuthBrandPanel'
import { motion } from 'framer-motion'

export default function AuthShell({ children }) {
  return (
    <main className="min-h-screen bg-background font-sans text-text md:grid md:grid-cols-[45%_55%] lg:grid-cols-[40%_60%]">
      <AuthBrandPanel />

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12 md:px-10 lg:px-16">
        <div className="absolute left-6 top-6 z-10 md:left-10 md:top-10">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-button border border-border bg-card/50 px-4 py-2 text-sm font-semibold text-text-secondary shadow-sm backdrop-blur-md transition duration-normal hover:bg-card hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--tw-primary)_22%,transparent),transparent_65%)]"
        />
        <div className="relative z-10 w-full max-w-auth">
          <div className="mb-10 flex flex-col items-center gap-4 text-center">
            <Link to="/" className="flex flex-col items-center gap-4 cursor-pointer group">
              <div className="relative w-20 h-20 flex items-center justify-center">
                {/* Glowing rotating aura */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-tr from-[#00d2ff] via-[#3a7bd5] to-[#ff00c8] rounded-full blur-xl opacity-40"
                  animate={{
                    rotate: 360,
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3]
                  }}
                  transition={{
                    rotate: { duration: 8, repeat: Infinity, ease: 'linear' },
                    scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
                    opacity: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
                  }}
                />

                {/* The actual logo image animated */}
                <motion.img
                  src={teamoraLogo}
                  alt="Teamora logo"
                  className="relative z-10 h-16 w-16 drop-shadow-2xl object-contain"
                  animate={{
                    y: [-3, 3, -3]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                />
              </div>
              <span className="text-2xl font-bold tracking-tight text-text group-hover:text-primary transition-colors duration-300">
                Teamora
              </span>
            </Link>
          </div>

          <div className="relative overflow-hidden rounded-card border border-border/50 bg-card/60 p-6 shadow-modal backdrop-blur-xl sm:p-8">
            <div className="absolute -left-4 -top-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
            <div className="absolute -bottom-4 -right-4 h-32 w-32 rounded-full bg-info/10 blur-2xl" />
            <div className="relative z-10">{children}</div>
          </div>
        </div>
      </section>
    </main>
  )
}
