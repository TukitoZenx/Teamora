import clsx from 'clsx'

/**
 * Standard authenticated page frame under the fixed app navbar.
 * Use for Dashboard, Settings, Invite, and other app-level pages.
 */
export default function PageShell({ children, className, innerClassName, fullWidth = false }) {
  return (
    <div className={clsx('teamora-page', className)}>
      <div className={clsx(fullWidth ? 'w-full px-5 py-6' : 'teamora-page-inner', innerClassName)}>{children}</div>
    </div>
  )
}
