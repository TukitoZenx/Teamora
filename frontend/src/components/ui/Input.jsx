import clsx from 'clsx'

export default function Input({ className, ...props }) {
  return (
    <input
      className={clsx(
        'h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-normal text-[#111827] outline-none transition duration-[180ms] ease-out placeholder:text-[#9CA3AF] hover:border-[#7C3AED] focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10',
        className
      )}
      {...props}
    />
  )
}
