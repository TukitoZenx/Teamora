import Button from './Button'

export default function Pagination({ page = 1, totalPages = 1, onPrevious, onNext }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Button type="button" variant="secondary" onClick={onPrevious} disabled={page <= 1}>
        Previous
      </Button>
      <span className="text-sm font-medium text-muted">
        {page} / {totalPages}
      </span>
      <Button type="button" variant="secondary" onClick={onNext} disabled={page >= totalPages}>
        Next
      </Button>
    </div>
  )
}
