export default function Select({ options = [], className = '', ...props }) {
  return (
    <select
      className={`h-10 rounded-button border border-border bg-card px-3 text-sm font-medium text-text outline-none transition duration-[180ms] hover:border-primary focus:border-primary focus:ring-4 focus:ring-primary/10 ${className}`}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value ?? option} value={option.value ?? option}>
          {option.label ?? option}
        </option>
      ))}
    </select>
  )
}
