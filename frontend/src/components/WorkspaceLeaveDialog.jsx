import ConfirmDialog from './ConfirmDialog'

export default function WorkspaceLeaveDialog({ onCancel, onLeave }) {
  return (
    <ConfirmDialog
      title="Leave Workspace?"
      description="Are you sure you want to leave this workspace?"
      confirmLabel="Leave Workspace"
      danger
      onCancel={onCancel}
      onConfirm={() => onLeave?.()}
    />
  )
}
