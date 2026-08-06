import { useId } from 'react'
import Modal from './Modal'

export default function Dialog({ title, description, children, onClose, size }) {
  const titleId = useId()
  const descriptionId = useId()

  return (
    <Modal
      onClose={onClose}
      size={size}
      titleId={title ? titleId : undefined}
      descriptionId={description ? descriptionId : undefined}
    >
      {(title || description) && (
        <div className="mb-5">
          {title && (
            <h2 id={titleId} className="text-xl font-semibold tracking-tight text-text">
              {title}
            </h2>
          )}
          {description && (
            <p id={descriptionId} className="mt-1 text-sm text-muted">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </Modal>
  )
}
