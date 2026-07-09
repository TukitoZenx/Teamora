import clsx from 'clsx'

export default function Select({ options = [], className = '', invalid, ...props }) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={clsx(
        'h-11 min-h-11 rounded-button border bg-card px-3 text-sm font-medium text-text outline-none',
        'transition duration-normal ease-standard hover:border-primary',
        'focus:border-primary focus:ring-4 focus:ring-primary/10',
        'disabled:cursor-not-allowed disabled:opacity-60',
        invalid ? 'border-danger' : 'border-border',
        className
      )}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value ?? option} value={option.value ?? option}>
          {option.label ?? option}
        </option>
      ))}
    </select>
  )
}
