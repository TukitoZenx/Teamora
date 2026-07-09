import { useState } from 'react'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from './ui/Button'
import Input from './ui/Input'
import Modal from './ui/Modal'

export default function DashboardWorkspaceModal({ mode, onClose, onCreateWorkspace, onJoinWorkspace }) {
  const [form, setForm] = useState({ name: '', description: '' })
  const [inviteCode, setInviteCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const isCreate = mode === 'create'

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (isCreate && !form.name.trim()) {
      toast.error('Workspace name is required')
      return
    }

    if (!isCreate && !inviteCode.trim()) {
      toast.error('Invite code is required')
      return
    }

    setSubmitting(true)
    try {
      if (isCreate) {
        await onCreateWorkspace({
          name: form.name.trim(),
          description: form.description.trim()
        })
      } else {
        await onJoinWorkspace(inviteCode.trim())
      }
      onClose()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#111827]">
            {isCreate ? 'New Workspace' : 'Request Access'}
          </h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            {isCreate
              ? 'Create a focused invite-only place for your team.'
              : 'Enter an invite link or code to request access.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-2 text-[#9CA3AF] transition duration-[180ms] hover:bg-[#F3F4F6] hover:text-[#111827]"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isCreate ? (
          <>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#374151]">Name</span>
              <Input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Product Launch"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#374151]">Description</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                className="w-full resize-none rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition duration-[180ms] placeholder:text-[#9CA3AF] hover:border-[#7C3AED] focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10"
                placeholder="Optional"
              />
            </label>
          </>
        ) : (
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#374151]">Invite link or code</span>
            <Input
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              placeholder="https://teamora.app/invite/A1B2C3D4E5"
            />
          </label>
        )}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} className="h-12">
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="h-12">
            {submitting ? 'Working...' : isCreate ? 'Create Workspace' : 'Request Access'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
