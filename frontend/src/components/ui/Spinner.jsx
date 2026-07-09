import clsx from 'clsx'

export default function Spinner({ className = 'h-4 w-4', label = 'Loading' }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={clsx('inline-block animate-spin rounded-full border-2 border-current border-r-transparent', className)}
    />
  )
}
