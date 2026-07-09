import clsx from 'clsx'

export default function Checkbox({ className = '', ...props }) {
  return (
    <input
      type="checkbox"
      className={clsx(
        'h-4 w-4 rounded border-border accent-primary focus:ring-2 focus:ring-primary/30',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...props}
    />
  )
}
