export default function SidebarItem({ icon: Icon, label, active = false, danger = false, collapsed = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      aria-label={label}
      className={`group relative flex w-full items-center rounded-[14px] px-3 py-2.5 text-left text-sm font-medium transition duration-[180ms] ${
        collapsed ? 'justify-center px-2' : 'gap-3'
      } ${
        active
          ? 'bg-[#F5F3FF] text-[#7C3AED]'
          : danger
            ? 'text-[#EF4444] hover:bg-red-50'
            : 'text-[#6B7280] hover:bg-[#F5F3FF] hover:text-[#7C3AED]'
      }`}
    >
      {active && <span className="absolute left-0 top-2 h-6 w-1 rounded-full bg-[#7C3AED]" />}
      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-[#7C3AED]' : ''}`} />
      {!collapsed && <span className="truncate">{label}</span>}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-2 hidden rounded-md bg-[#111827] px-2 py-1 text-[11px] font-medium text-white shadow-lg group-hover:block">
          {label}
        </span>
      )}
    </button>
  )
}
