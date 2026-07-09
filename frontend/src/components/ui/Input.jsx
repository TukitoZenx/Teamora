import clsx from 'clsx'

export default function Input({ className, ...props }) {
  return (
    <input
      className={clsx(
        'h-12 w-full rounded-input border border-border bg-card px-4 text-sm font-normal text-text outline-none transition duration-[180ms] ease-out placeholder:text-muted/50 hover:border-primary focus:border-primary focus:ring-4 focus:ring-primary/10',
        className
      )}
      {...props}
    />
  )
}
