import clsx from 'clsx'

export default function Avatar({ label, src, className = '', size = 'md' }) {
  const sizeClass =
    size === 'sm'
      ? 'h-8 w-8 text-[10px]'
      : size === 'lg'
        ? 'h-12 w-12 text-sm'
        : size === 'xl'
          ? 'h-16 w-16 text-xl'
          : 'h-9 w-9 text-xs'

  if (src) {
    return (
      <img
        src={src}
        alt={label || 'User avatar'}
        referrerPolicy="no-referrer"
        className={clsx(
          'flex shrink-0 rounded-avatar object-cover shadow-card transition duration-normal ease-standard',
          'hover:scale-[1.03] hover:shadow-hover',
          sizeClass,
          className
        )}
      />
    )
  }

  return (
    <span
      aria-hidden={!label}
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-avatar bg-primary/10 font-semibold text-primary shadow-card',
        'transition duration-normal ease-standard hover:scale-[1.03] hover:shadow-hover',
        sizeClass,
        className
      )}
    >
      {label}
    </span>
  )
}
