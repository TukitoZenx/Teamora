import { useState } from 'react'
import {
  ArrowLeft,
  Clipboard,
  FileText,
  Globe2,
  Lock,
  Paintbrush,
  Presentation,
  RefreshCw,
  TableProperties,
  User,
  Users
} from 'lucide-react'
import toast from 'react-hot-toast'

const moduleCards = [
  { label: 'Documents', icon: FileText },
  { label: 'Spreadsheet', icon: TableProperties },
  { label: 'Whiteboard', icon: Paintbrush },
  { label: 'Presentation', icon: Presentation }
]

const formatDateTime = (value) => {
  if (!value) return 'Recently'
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getUserLabel = (member) => member?.fullName || member?.username || member?.email || 'Member'

export default function WorkspaceHome({ workspace, currentUserName, onBack, onRefresh }) {
  const [copied, setCopied] = useState(false)
  const VisibilityIcon = workspace.visibility === 'public' ? Globe2 : Lock

  const copyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(workspace.inviteCode)
      setCopied(true)
      toast.success('Invite code copied')
      setTimeout(() => setCopied(false), 1500)
    } catch (error) {
      toast.error('Could not copy invite code')
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-850"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </button>

        <button
          type="button"
          onClick={() => onRefresh().catch((error) => toast.error(error.message))}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-850"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-850 dark:bg-neutral-900">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize text-slate-700 dark:bg-neutral-850 dark:text-neutral-200">
                <VisibilityIcon className="h-3.5 w-3.5" />
                {workspace.visibility}
              </span>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-neutral-850 dark:text-neutral-200">
                Invite {workspace.inviteCode}
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">{workspace.name}</h1>
            {workspace.description && (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-neutral-400">{workspace.description}</p>
            )}
          </div>

          <button
            type="button"
            onClick={copyInviteCode}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
          >
            <Clipboard className="h-4 w-4" />
            {copied ? 'Copied' : 'Invite'}
          </button>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-neutral-850 dark:bg-neutral-900">
            <h2 className="mb-4 flex items-center gap-2 text-base font-black">
              <User className="h-4 w-4 text-slate-400" />
              Owner
            </h2>
            <p className="text-sm font-bold">{getUserLabel(workspace.owner)}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">{workspace.owner?.email || currentUserName}</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-neutral-850 dark:bg-neutral-900">
            <h2 className="mb-4 flex items-center gap-2 text-base font-black">
              <Users className="h-4 w-4 text-slate-400" />
              Members
            </h2>
            <div className="space-y-3">
              {(workspace.members || []).map((member) => (
                <div key={member._id || member.email} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-neutral-950">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 text-xs font-black text-slate-700 dark:bg-neutral-800 dark:text-neutral-200">
                    {getUserLabel(member).charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{getUserLabel(member)}</span>
                    <span className="block truncate text-xs text-slate-500 dark:text-neutral-400">{member.email}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-neutral-850 dark:bg-neutral-900">
            <h2 className="mb-4 text-base font-black">Recent Activity</h2>
            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-neutral-950">
                Workspace created on {formatDateTime(workspace.createdAt)}
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-neutral-950">
                Last updated on {formatDateTime(workspace.updatedAt)}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {moduleCards.map((module) => {
              const Icon = module.icon
              return (
                <div key={module.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-neutral-850 dark:bg-neutral-900">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-neutral-850 dark:text-neutral-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-black">{module.label}</h3>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-400">Coming Soon</p>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}
