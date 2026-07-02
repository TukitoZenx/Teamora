import Modal from './Modal'

export default function Dialog({ title, description, children, onClose }) {
  return (
    <Modal onClose={onClose}>
      {(title || description) && (
        <div className="mb-5">
          {title && <h2 className="text-xl font-semibold tracking-tight text-[#111827]">{title}</h2>}
          {description && <p className="mt-1 text-sm text-[#6B7280]">{description}</p>}
        </div>
      )}
      {children}
    </Modal>
  )
}
