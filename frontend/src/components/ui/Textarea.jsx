import clsx from 'clsx'

export default function Textarea({ className, ...props }) {
  return (
    <textarea
      className={clsx(
        'w-full resize-none rounded-input border border-border bg-card px-4 py-3 text-sm text-text outline-none transition duration-[180ms] placeholder:text-muted/50 hover:border-primary focus:border-primary focus:ring-4 focus:ring-primary/10',
        className
      )}
      {...props}
    />
  )
}
