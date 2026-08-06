import { useId } from 'react'
import Input from '../../../components/ui/Input'

export default function AuthField({
  icon: Icon,
  label,
  hint,
  invalid,
  error,
  className,
  id,
  'aria-label': ariaLabel,
  ...props
}) {
  const generatedId = useId()
  const inputId = id || generatedId
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [errorId, props['aria-describedby']].filter(Boolean).join(' ') || undefined

  return (
    <div className="block">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-sm font-medium text-text">
          {label}
        </label>
        {hint}
      </div>
      <div className="relative block">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
        )}
        <Input
          id={inputId}
          size="lg"
          invalid={Boolean(invalid || error)}
          aria-label={ariaLabel || label}
          aria-invalid={Boolean(invalid || error) || undefined}
          aria-describedby={describedBy}
          className={[Icon ? 'h-12 rounded-input pl-10' : 'h-12 rounded-input', className].filter(Boolean).join(' ')}
          {...props}
        />
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
