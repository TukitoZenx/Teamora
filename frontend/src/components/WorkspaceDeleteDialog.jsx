import ConfirmDialog from './ConfirmDialog'

export default function WorkspaceDeleteDialog({ workspace, onCancel, onDelete }) {
  return (
    <ConfirmDialog
      title="Delete Workspace?"
      description={`I want to delete "${workspace?.name}".`}
      confirmLabel="Delete"
      cancelLabel="Cancel"
      danger
      onCancel={onCancel}
      onConfirm={() => onDelete?.()}
    />
  )
}
