import clsx from 'clsx'

const sizes = {
  sm: 'h-9 min-h-9 rounded-control px-3 text-xs',
  md: 'h-11 min-h-11 rounded-input px-4 text-sm',
  lg: 'h-12 min-h-12 rounded-input px-4 text-sm'
}

export default function Input({ className, size = 'lg', invalid, success, ...props }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={clsx(
        'w-full border bg-card font-normal text-text outline-none transition duration-normal ease-standard',
        'placeholder:text-muted/50 hover:border-primary',
        'focus:border-primary focus:ring-4 focus:ring-primary/10',
        'disabled:cursor-not-allowed disabled:bg-card-sunken disabled:opacity-60',
        'read-only:bg-card-sunken read-only:text-muted',
        invalid
          ? 'border-danger focus:border-danger focus:ring-danger/15'
          : success
            ? 'border-success focus:border-success focus:ring-success/15'
            : 'border-border',
        sizes[size] || sizes.lg,
        className
      )}
      {...props}
    />
  )
}
