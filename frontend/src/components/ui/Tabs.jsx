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
              ? 'bg-[#7C3AED] text-white'
              : 'bg-white text-[#6B7280] ring-1 ring-[#E5E7EB] hover:bg-[#F8F5FF] hover:text-[#7C3AED]'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
