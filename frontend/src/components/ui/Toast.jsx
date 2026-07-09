export default function Toast({ title, description, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-border text-text',
    success: 'border-success/30 text-success',
    danger: 'border-danger/30 text-danger'
  }

  return (
    <div className={`rounded-2xl border bg-card p-4 shadow-dropdown ${tones[tone]}`}>
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
    </div>
  )
}
