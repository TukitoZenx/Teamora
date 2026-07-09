import clsx from 'clsx'

const variants = {
  ghost: 'text-muted hover:bg-primary/10 hover:text-primary',
  secondary: 'border border-border bg-card text-muted hover:border-primary hover:text-primary',
  danger: 'text-danger hover:bg-danger/10'
}

const sizes = {
  sm: 'h-8 w-8 min-h-8 min-w-8 rounded-control',
  md: 'h-10 w-10 min-h-10 min-w-10 rounded-button',
  lg: 'h-11 w-11 min-h-11 min-w-11 rounded-button'
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
  return (
    <button
      type="button"
      aria-label={ariaLabel || label}
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
    </button>
  )
}
