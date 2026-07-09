import clsx from 'clsx'
import { Search, X } from 'lucide-react'

export default function SearchBar({ value, onChange, onClear, placeholder = 'Search workspaces...', className }) {
  return (
    <div className={clsx('group relative min-w-0', className)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/60 transition duration-[180ms] group-hover:text-primary group-focus-within:text-primary" />
      <input
        value={value}
        onChange={onChange}
        className="h-12 w-full rounded-input border border-border bg-card pl-11 pr-11 text-sm text-text outline-none transition duration-[180ms] ease-out placeholder:text-muted/50 hover:border-primary focus:border-primary focus:ring-4 focus:ring-primary/10"
        placeholder={placeholder}
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-1 text-muted transition duration-[180ms] hover:bg-primary/10 hover:text-text"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
