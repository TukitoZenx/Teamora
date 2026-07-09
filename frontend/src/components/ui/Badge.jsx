import clsx from 'clsx'

export default function Badge({ children, tone = 'neutral', className }) {
  const tones = {
    neutral: 'bg-[#F3F4F6] text-[#6B7280]',
    primary: 'bg-[#F5F3FF] text-[#7C3AED]',
    success: 'bg-emerald-50 text-[#10B981]',
    danger: 'bg-red-50 text-[#EF4444]'
  }

  return (
    <span
      className={clsx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', tones[tone], className)}
    >
      {children}
    </span>
  )
}
