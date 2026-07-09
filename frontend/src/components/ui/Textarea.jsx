import clsx from 'clsx'

export default function Textarea({ className, invalid, ...props }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={clsx(
        'w-full resize-none rounded-input border bg-card px-4 py-3 text-sm text-text outline-none',
        'transition duration-normal ease-standard placeholder:text-muted/50 hover:border-primary',
        'focus:border-primary focus:ring-4 focus:ring-primary/10',
        'disabled:cursor-not-allowed disabled:bg-card-sunken disabled:opacity-60',
        'read-only:bg-card-sunken read-only:text-muted',
        invalid ? 'border-danger focus:border-danger focus:ring-danger/15' : 'border-border',
        className
      )}
      {...props}
    />
  )
}
