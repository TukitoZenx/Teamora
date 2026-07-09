import Input from '../../../components/ui/Input'

export default function AuthField({ icon: Icon, label, invalid, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-text">{label}</span>
      <span className="relative block">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
        )}
        <Input
          size="lg"
          invalid={invalid}
          className={Icon ? 'h-[52px] rounded-xl pl-11' : 'h-[52px] rounded-xl'}
          {...props}
        />
      </span>
    </label>
  )
}
