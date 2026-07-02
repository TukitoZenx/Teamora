import clsx from 'clsx'

export default function Card({ as: Component = 'div', className, children, ...props }) {
  return (
    <Component
      className={clsx('rounded-[20px] border border-[#E5E7EB] bg-white p-5 shadow-sm transition duration-[180ms]', className)}
      {...props}
    >
      {children}
    </Component>
  )
}
