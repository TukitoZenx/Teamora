export default function Toast({ title, description, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-[#E5E7EB] text-[#111827]',
    success: 'border-emerald-200 text-[#10B981]',
    danger: 'border-red-200 text-[#EF4444]'
  }

  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${tones[tone]}`}>
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="mt-1 text-sm text-[#6B7280]">{description}</p>}
    </div>
  )
}
