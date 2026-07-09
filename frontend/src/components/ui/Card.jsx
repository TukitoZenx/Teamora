import clsx from 'clsx'

const variants = {
  default: 'border-border bg-card shadow-card',
  elevated: 'border-border bg-card-elevated shadow-dropdown',
  sunken: 'border-border bg-card-sunken shadow-none',
  interactive:
    'border-border bg-card shadow-card hover:border-primary/40 hover:shadow-hover transition duration-normal ease-standard'
}

export default function Card({ as: Component = 'div', variant = 'default', className, children, ...props }) {
  return (
    <Component className={clsx('rounded-card border p-5', variants[variant] || variants.default, className)} {...props}>
      {children}
    </Component>
  )
}
