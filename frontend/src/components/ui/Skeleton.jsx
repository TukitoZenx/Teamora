import clsx from 'clsx'

export default function Skeleton({ className, ...props }) {
  return <div className={clsx('skeleton-shimmer', className)} role="presentation" aria-hidden="true" {...props} />
}
