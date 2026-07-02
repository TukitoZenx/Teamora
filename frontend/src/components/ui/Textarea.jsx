import clsx from 'clsx'

export default function Textarea({ className, ...props }) {
  return (
    <textarea
      className={clsx(
        'w-full resize-none rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition duration-[180ms] placeholder:text-[#9CA3AF] hover:border-[#7C3AED] focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10',
        className
      )}
      {...props}
    />
  )
}
