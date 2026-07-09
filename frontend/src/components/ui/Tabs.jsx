import clsx from 'clsx'

export default function Tabs({ options, active, onChange, className }) {
  return (
    <div role="tablist" className={clsx('flex flex-wrap gap-2', className)}>
      {options.map((option) => {
        const selected = active === option
        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option)}
            className={clsx(
              'rounded-full px-4 py-2 text-sm font-semibold transition duration-normal ease-standard',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20',
              selected
                ? 'bg-primary text-on-primary'
                : 'bg-card text-muted ring-1 ring-border hover:bg-primary/10 hover:text-primary'
            )}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}
