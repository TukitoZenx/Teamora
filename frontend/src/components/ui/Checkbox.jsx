export default function Checkbox({ className = '', ...props }) {
  return (
    <input
      type="checkbox"
      className={`h-4 w-4 rounded border-[#E5E7EB] accent-[#7C3AED] focus:ring-[#7C3AED] ${className}`}
      {...props}
    />
  )
}
