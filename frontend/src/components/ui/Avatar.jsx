export default function Avatar({ label, src, className = '' }) {
  if (src) {
    return (
      <img
        src={src}
        alt={label || 'User avatar'}
        referrerPolicy="no-referrer"
        className={`flex h-9 w-9 rounded-avatar object-cover shadow-card transition duration-[180ms] ease-out hover:scale-[1.03] hover:shadow-hover ${className}`}
      />
    )
  }

  return (
    <span
      className={`flex h-9 w-9 items-center justify-center rounded-avatar bg-primary/10 text-xs font-semibold text-primary shadow-card transition duration-[180ms] ease-out hover:scale-[1.03] hover:shadow-hover ${className}`}
    >
      {label}
    </span>
  )
}
