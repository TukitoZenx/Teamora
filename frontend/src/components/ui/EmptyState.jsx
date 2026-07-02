import Button from './Button'

export default function EmptyState({ title, description, primaryAction, secondaryAction }) {
  return (
    <section className="mx-auto flex min-h-[360px] max-w-xl flex-col justify-center rounded-[20px] border border-[#E5E7EB] bg-white p-10 text-center shadow-sm">
      <h2 className="text-2xl font-semibold tracking-tight text-[#111827]">{title}</h2>
      {description && <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#6B7280]">{description}</p>}
      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {primaryAction && <Button type="button" onClick={primaryAction.onClick}>{primaryAction.label}</Button>}
          {secondaryAction && <Button type="button" variant="secondary" onClick={secondaryAction.onClick}>{secondaryAction.label}</Button>}
        </div>
      )}
    </section>
  )
}
