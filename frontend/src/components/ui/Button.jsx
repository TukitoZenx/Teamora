import clsx from 'clsx'

const variants = {
  primary: 'border-transparent bg-primary text-white hover:bg-primary-hover',
  secondary: 'border-border bg-card text-text hover:border-primary hover:bg-primary/10 hover:text-primary',
  ghost: 'border-transparent bg-transparent text-muted hover:bg-primary/10 hover:text-primary',
  danger: 'border-transparent bg-transparent text-danger hover:bg-danger/10'
}

export default function Button({ as: Component = 'button', variant = 'primary', className, children, ...props }) {
  return (
    <Component
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-button border px-5 py-3 text-sm font-semibold leading-none transition duration-[180ms] ease-out disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  )
}
