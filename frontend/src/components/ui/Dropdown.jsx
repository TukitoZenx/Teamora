import clsx from 'clsx'

export function DropdownMenu({ children, className }) {
  return (
    <div
      role="menu"
      className={clsx(
        'absolute right-0 z-modal mt-2 w-52 rounded-card border border-border bg-card-elevated p-2 shadow-dropdown',
        'transition duration-fast ease-standard',
        className
      )}
    >
      {children}
    </div>
  )
}

export function DropdownItem({ icon: Icon, danger = false, className, children, ...props }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={clsx(
        'flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-sm font-medium',
        'transition duration-fast ease-standard',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        danger ? 'text-danger hover:bg-danger/10' : 'text-text hover:bg-primary/10 hover:text-primary',
        className
      )}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}
      {children}
    </button>
  )
}
