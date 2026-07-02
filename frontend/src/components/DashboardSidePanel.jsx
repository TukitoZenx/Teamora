import { ArrowRight, Building2, RefreshCw, Users } from 'lucide-react'
import toast from 'react-hot-toast'

const formatDate = (value) => {
  if (!value) return 'Recently'
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export default function DashboardSidePanel({ workspaces, recentWorkspaces, onOpenWorkspace, onRefresh }) {
  const activityItems = recentWorkspaces.slice(0, 3)
  const memberCount = workspaces.reduce((total, workspace) => total + (workspace.members?.length || 0), 0)

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-neutral-850 dark:bg-neutral-900">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black">Recent Workspaces</h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400">Your owned and joined workspaces.</p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 dark:border-neutral-800 dark:hover:bg-neutral-850"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {recentWorkspaces.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 px-5 py-12 text-center dark:border-neutral-800">
            <Building2 className="mx-auto h-8 w-8 text-slate-300 dark:text-neutral-700" />
            <p className="mt-3 text-sm font-bold">No workspaces yet</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">Create or join a workspace to see it here.</p>
          </div>
        ) : (
          <div className="space-y-3 transition-opacity duration-300">
            {recentWorkspaces.map((workspace) => (
              <button
                key={workspace._id}
                type="button"
                onClick={() => onOpenWorkspace(workspace._id).catch((error) => toast.error(error.message))}
                className="flex w-full items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-slate-950 hover:bg-white dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600 dark:hover:bg-neutral-900"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">{workspace.name}</span>
                  <span className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-neutral-400">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {workspace.members?.length || 0}
                    </span>
                    <span>{formatDate(workspace.updatedAt)}</span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-neutral-850 dark:bg-neutral-900">
          <h2 className="text-base font-black">Overview</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 p-3 dark:border-neutral-800">
              <p className="text-2xl font-black">{workspaces.length}</p>
              <p className="text-xs text-slate-500 dark:text-neutral-400">Workspaces</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 dark:border-neutral-800">
              <p className="text-2xl font-black">{memberCount}</p>
              <p className="text-xs text-slate-500 dark:text-neutral-400">Members</p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-neutral-850 dark:bg-neutral-900">
          <h2 className="text-base font-black">Recent Activity</h2>
          <div className="mt-4 space-y-3">
            {activityItems.length > 0 ? (
              activityItems.map((workspace) => (
                <p key={workspace._id} className="text-xs text-slate-500 dark:text-neutral-400">
                  {workspace.name} updated {formatDate(workspace.updatedAt)}
                </p>
              ))
            ) : (
              <p className="text-xs text-slate-500 dark:text-neutral-400">No recent activity yet.</p>
            )}
          </div>
        </section>
      </div>
    </section>
  )
}
