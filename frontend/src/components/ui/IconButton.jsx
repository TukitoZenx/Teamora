import clsx from 'clsx'

const variants = {
  ghost: 'text-muted hover:bg-primary/10 hover:text-primary',
  secondary: 'border border-border bg-card text-muted hover:border-primary hover:text-primary',
  danger: 'text-danger hover:bg-danger/10'
}

const sizes = {
  // Keep visual size compact but enforce ≥44px touch/hit target via min-* utilities.
  sm: 'h-9 w-9 min-h-[var(--tw-touch-min)] min-w-[var(--tw-touch-min)] rounded-control',
  md: 'h-11 w-11 min-h-[var(--tw-touch-min)] min-w-[var(--tw-touch-min)] rounded-button',
  lg: 'h-12 w-12 min-h-12 min-w-12 rounded-button'
}

export default function IconButton({
  className,
  children,
  variant = 'ghost',
  size = 'md',
  label,
  'aria-label': ariaLabel,
  ...props
}) {
  const accessibleName = ariaLabel || label
  return (
    <button
      type="button"
      aria-label={accessibleName}
      title={label || ariaLabel}
      className={clsx(
        'inline-flex items-center justify-center transition duration-normal ease-standard',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant] || variants.ghost,
        sizes[size] || sizes.md,
        className
      )}
      {...props}
    >
      {children}
      {!accessibleName ? <span className="sr-only">Action</span> : null}
    </button>
  )
}
