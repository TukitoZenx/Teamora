import { useId } from 'react'
import Input from '../../../components/ui/Input'

export default function AuthField({ icon: Icon, label, hint, invalid, className, id, ...props }) {
  const generatedId = useId()
  const inputId = id || generatedId

  return (
    <label className="block" htmlFor={inputId}>
      <span className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-text">{label}</span>
        {hint}
      </span>
      <span className="relative block">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
        )}
        <Input
          id={inputId}
          size="lg"
          invalid={invalid}
          className={[Icon ? 'h-12 rounded-input pl-10' : 'h-12 rounded-input', className].filter(Boolean).join(' ')}
          {...props}
        />
      </span>
    </label>
  )
}
