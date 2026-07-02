import clsx from 'clsx'

const variants = {
  primary: 'border-transparent bg-[#7C3AED] text-white hover:bg-[#6D28D9]',
  secondary: 'border-[#DADCE0] bg-white text-[#111827] hover:border-[#7C3AED] hover:bg-[#F8F5FF]',
  ghost: 'border-transparent bg-transparent text-[#6B7280] hover:bg-[#F5F3FF] hover:text-[#7C3AED]',
  danger: 'border-transparent bg-transparent text-[#EF4444] hover:bg-red-50'
}

export default function Button({ as: Component = 'button', variant = 'primary', className, children, ...props }) {
  return (
    <Component
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-[14px] border px-5 py-3 text-sm font-semibold leading-none transition duration-[180ms] ease-out disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  )
}
