import Spinner from './Spinner'

export default function Loader({ label = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center gap-3 text-sm font-medium text-muted">
      <Spinner />
      {label}
    </div>
  )
}
