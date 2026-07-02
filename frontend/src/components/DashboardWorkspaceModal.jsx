import { useState } from 'react'
import { Globe2, Lock, X } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from './ui/Button'
import Input from './ui/Input'
import Modal from './ui/Modal'

export default function DashboardWorkspaceModal({ mode, onClose, onCreateWorkspace, onJoinWorkspace }) {
  const [form, setForm] = useState({ name: '', description: '', visibility: 'private' })
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
          description: form.description.trim(),
          visibility: form.visibility
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
              {isCreate ? 'New Workspace' : 'Join Workspace'}
            </h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              {isCreate ? 'Create a focused place for your team.' : 'Enter an invitation code to join a team.'}
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

              <div>
                <span className="mb-2 block text-sm font-medium text-[#374151]">Visibility</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'private', label: 'Private', icon: Lock },
                    { value: 'public', label: 'Public', icon: Globe2 }
                  ].map((option) => {
                    const Icon = option.icon
                    const active = form.visibility === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, visibility: option.value }))}
                        className={`flex h-11 items-center justify-center gap-2 rounded-[14px] border text-sm font-semibold transition duration-[180ms] ${
                          active
                            ? 'border-[#7C3AED] bg-[#7C3AED] text-white'
                            : 'border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#7C3AED] hover:bg-[#F8F5FF] hover:text-[#7C3AED]'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#374151]">Invite code</span>
              <Input
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                className="uppercase"
                placeholder="A1B2C3D4E5"
              />
            </label>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="h-12 w-full"
          >
            {submitting ? 'Working...' : isCreate ? 'Create Workspace' : 'Join Workspace'}
          </Button>
        </form>
    </Modal>
  )
}
