import clsx from 'clsx'

export default function Switch({ checked = false, className = '', disabled, 'aria-label': ariaLabel, ...props }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={clsx(
        // Expand hit area to ≥44px while keeping the track visually compact.
        'relative inline-flex h-11 min-h-[var(--tw-touch-min)] w-14 shrink-0 items-center justify-center rounded-full',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        className={clsx(
          'relative h-6 w-11 rounded-full p-1 transition duration-normal ease-standard',
          checked ? 'bg-primary' : 'bg-border'
        )}
      >
        <span
          className={clsx(
            'block h-4 w-4 rounded-full bg-card shadow-card transition duration-normal ease-standard',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </span>
    </button>
  )
}
