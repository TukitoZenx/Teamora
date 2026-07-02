import clsx from 'clsx'
import { Search, X } from 'lucide-react'

export default function SearchBar({ value, onChange, onClear, placeholder = 'Search workspaces...', className }) {
  return (
    <div className={clsx('group relative min-w-0', className)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF] transition duration-[180ms] group-hover:text-[#7C3AED] group-focus-within:text-[#7C3AED]" />
      <input
        value={value}
        onChange={onChange}
        className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-11 pr-11 text-sm text-[#111827] outline-none transition duration-[180ms] ease-out placeholder:text-[#9CA3AF] hover:border-[#7C3AED] focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10"
        placeholder={placeholder}
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-1 text-[#9CA3AF] transition duration-[180ms] hover:bg-[#F3F4F6] hover:text-[#111827]"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
