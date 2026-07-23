import TeamoraLogo from './TeamoraLogo'

/**
 * Full-page loading: one circle only — logo inside, thin loading arc as its border.
 */
export default function BrandLoadingScreen({ message = 'Loading…' }) {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_50%_at_50%_42%,color-mix(in_srgb,var(--tw-primary)_10%,transparent),transparent_72%)]"
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* Single circle: logo + loading border */}
        <div className="relative flex h-20 w-20 items-center justify-center">
          {/* Soft track */}
          <div aria-hidden className="absolute inset-0 rounded-full border-[2.5px] border-primary/15" />
          {/* Spinning arc on the same circle */}
          <div
            aria-hidden
            className="teamora-loading-ring absolute inset-0 rounded-full border-[2.5px] border-transparent border-t-primary"
          />
          {/* Logo centered — no second plate/circle behind it */}
          <TeamoraLogo size="lg" className="relative z-[1] h-11 w-11" rounded="rounded-full" alt="Teamora" />
        </div>

        <p className="mt-7 text-[15px] font-semibold tracking-tight text-text">Teamora</p>
        <p className="mt-1 text-sm text-muted">{message}</p>
      </div>
    </div>
  )
}
