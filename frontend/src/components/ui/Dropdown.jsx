import clsx from 'clsx'

export function DropdownMenu({ children, className }) {
  return (
    <div
      className={clsx(
        'absolute right-0 z-[1200] mt-2 w-52 rounded-2xl border border-border bg-card-elevated p-2 opacity-100 shadow-dropdown transition duration-150 ease-out',
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
      className={clsx(
        'flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-left text-sm font-medium transition duration-150 ease-out',
        danger ? 'text-danger hover:bg-danger/10' : 'text-text hover:bg-primary/10 hover:text-primary',
        className
      )}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  )
}
