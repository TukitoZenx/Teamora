export default function Avatar({ label, className = '' }) {
  return (
    <span
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-[#F8F5FF] text-xs font-semibold text-[#7C3AED] shadow-sm transition duration-[180ms] ease-out hover:scale-[1.03] hover:shadow-[0_8px_24px_rgba(124,58,237,0.18)] ${className}`}
    >
      {label}
    </span>
  )
}
