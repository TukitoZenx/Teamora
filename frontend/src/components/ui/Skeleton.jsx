import clsx from 'clsx'

export default function Skeleton({ className }) {
  return <div className={clsx('animate-pulse rounded-[14px] bg-[#E5E7EB]', className)} />
}
