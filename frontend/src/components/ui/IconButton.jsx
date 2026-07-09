import clsx from 'clsx'

export default function IconButton({ className, children, ...props }) {
  return (
    <button
      type="button"
      className={clsx(
        'inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted transition duration-[180ms] hover:bg-primary/10 hover:text-primary',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
