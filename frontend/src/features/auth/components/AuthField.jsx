export default function AuthField({ icon: Icon, label, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#111111]">{label}</span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
        <input
          {...props}
          className="h-[52px] w-full rounded-2xl border border-[#E5E7EB] bg-white px-11 text-sm text-[#111827] outline-none transition duration-200 placeholder:text-[#9CA3AF] hover:border-[#7C3AED] focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10"
        />
      </span>
    </label>
  )
}
