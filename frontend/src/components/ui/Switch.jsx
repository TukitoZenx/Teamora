import clsx from 'clsx'

export default function Switch({ checked = false, className = '', disabled, ...props }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={clsx(
        'relative h-6 w-11 shrink-0 rounded-full p-1 transition duration-normal ease-standard',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20',
        'disabled:cursor-not-allowed disabled:opacity-60',
        checked ? 'bg-primary' : 'bg-border',
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        className={clsx(
          'block h-4 w-4 rounded-full bg-card shadow-card transition duration-normal ease-standard',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}
