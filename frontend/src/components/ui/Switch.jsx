export default function Switch({ checked = false, className = '', ...props }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`h-6 w-11 rounded-full p-1 transition duration-[180ms] ${checked ? 'bg-[#7C3AED]' : 'bg-[#E5E7EB]'} ${className}`}
      {...props}
    >
      <span
        className={`block h-4 w-4 rounded-full bg-white shadow-sm transition duration-[180ms] ${checked ? 'translate-x-5' : ''}`}
      />
    </button>
  )
}
