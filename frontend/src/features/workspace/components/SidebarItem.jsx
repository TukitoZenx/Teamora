export default function SidebarItem({ icon: Icon, label, active = false, danger = false, collapsed = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex w-full min-h-[var(--tw-touch-min)] items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium transition duration-normal focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 ${
        collapsed ? 'justify-center px-2' : 'gap-3'
      } ${
        active
          ? 'bg-primary/10 text-primary'
          : danger
            ? 'text-danger hover:bg-danger/10'
            : 'text-muted hover:bg-primary/10 hover:text-primary'
      }`}
    >
      {active && <span className="absolute left-0 top-2.5 h-5 w-1 rounded-full bg-primary" aria-hidden />}
      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-primary' : ''}`} aria-hidden />
      {!collapsed && <span className="truncate">{label}</span>}
      {collapsed && (
        <span className="pointer-events-none absolute left-full z-dropdown ml-2 hidden rounded-md border border-border bg-card-elevated px-2 py-1 text-[11px] font-medium text-text shadow-dropdown group-hover:block group-focus-visible:block">
          {label}
        </span>
      )}
    </button>
  )
}
