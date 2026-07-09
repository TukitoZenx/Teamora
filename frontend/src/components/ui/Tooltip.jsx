export default function Tooltip({ label, children }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-tooltip mt-2 -translate-x-1/2 whitespace-nowrap rounded-control border border-border bg-card-elevated px-2 py-1 text-xs font-medium text-text opacity-0 shadow-dropdown transition duration-fast group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  )
}
