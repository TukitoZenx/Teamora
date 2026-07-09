import clsx from 'clsx'

export default function Card({ as: Component = 'div', className, children, ...props }) {
  return (
    <Component
      className={clsx(
        'rounded-card border border-border bg-card p-5 shadow-card transition duration-[180ms]',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  )
}
