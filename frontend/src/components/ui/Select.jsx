export default function Select({ options = [], className = '', ...props }) {
  return (
    <select
      className={`h-10 rounded-[14px] border border-[#E5E7EB] bg-white px-3 text-sm font-medium text-[#6B7280] outline-none transition duration-[180ms] hover:border-[#7C3AED] focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10 ${className}`}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value ?? option} value={option.value ?? option}>
          {option.label ?? option}
        </option>
      ))}
    </select>
  )
}
