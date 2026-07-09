export default function AuthField({ icon: Icon, label, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-text">{label}</span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          {...props}
          className="h-[52px] w-full rounded-2xl border border-border bg-card px-11 text-sm text-text outline-none transition duration-200 placeholder:text-muted/65 hover:border-primary focus:border-primary focus:ring-4 focus:ring-primary/10"
        />
      </span>
    </label>
  )
}
