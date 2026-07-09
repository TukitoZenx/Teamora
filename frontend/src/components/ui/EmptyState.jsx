import clsx from 'clsx'
import Button from './Button'

export default function EmptyState({ icon: Icon, title, description, primaryAction, secondaryAction, className }) {
  return (
    <section
      className={clsx(
        'mx-auto flex min-h-[360px] max-w-xl flex-col items-center justify-center rounded-card border border-border bg-card p-10 text-center shadow-card',
        className
      )}
    >
      {Icon && (
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
      )}
      <h2 className="text-2xl font-semibold tracking-tight text-text">{title}</h2>
      {description && <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">{description}</p>}
      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          {primaryAction && (
            <Button type="button" onClick={primaryAction.onClick} disabled={primaryAction.disabled}>
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              type="button"
              variant="secondary"
              onClick={secondaryAction.onClick}
              disabled={secondaryAction.disabled}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </section>
  )
}
