export default function Tabs({ options, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition duration-[180ms] ease-out ${
            active === option
              ? 'bg-primary text-white'
              : 'bg-card text-muted ring-1 ring-border hover:bg-primary/10 hover:text-primary'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
