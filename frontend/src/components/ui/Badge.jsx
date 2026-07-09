import clsx from 'clsx'

export default function Badge({ children, tone = 'neutral', className }) {
  const tones = {
    neutral: 'bg-muted/10 text-muted',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger'
  }

  return (
    <span
      className={clsx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', tones[tone], className)}
    >
      {children}
    </span>
  )
}
