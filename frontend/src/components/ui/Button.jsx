import clsx from 'clsx'

const variants = {
  primary:
    'border-transparent bg-primary text-on-primary hover:bg-primary-hover focus-visible:ring-primary/30 active:bg-primary-hover',
  secondary:
    'border-border bg-card text-text hover:border-primary hover:bg-primary/10 hover:text-primary focus-visible:ring-primary/20 active:bg-primary/15',
  ghost:
    'border-transparent bg-transparent text-muted hover:bg-primary/10 hover:text-primary focus-visible:ring-primary/20 active:bg-primary/15',
  danger:
    'border-transparent bg-danger text-on-primary hover:bg-danger-hover focus-visible:ring-danger/30 active:bg-danger-hover',
  'danger-ghost':
    'border-transparent bg-transparent text-danger hover:bg-danger/10 focus-visible:ring-danger/20 active:bg-danger/15',
  outline:
    'border-border bg-transparent text-text hover:border-primary hover:text-primary focus-visible:ring-primary/20'
}

const sizes = {
  sm: 'h-9 min-h-9 gap-1.5 rounded-control px-3 text-xs',
  md: 'h-11 min-h-11 gap-2 rounded-button px-5 text-sm',
  lg: 'h-12 min-h-12 gap-2 rounded-button px-6 text-sm',
  icon: 'h-10 w-10 min-h-10 min-w-10 rounded-button p-0'
}

export default function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  className,
  children,
  loading = false,
  disabled,
  type,
  ...props
}) {
  const isDisabled = disabled || loading

  return (
    <Component
      type={Component === 'button' ? type || 'button' : type}
      disabled={Component === 'button' ? isDisabled : undefined}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      className={clsx(
        'inline-flex items-center justify-center font-semibold leading-none transition duration-normal ease-standard',
        'focus-visible:outline-none focus-visible:ring-4',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
            aria-hidden
          />
          <span className="sr-only">Loading</span>
          {children}
        </>
      ) : (
        children
      )}
    </Component>
  )
}
