import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import AppNavbar from './AppNavbar'
import api from '../services/api'

function SkeletonBlock({ className = '' }) {
  return <div className={`skeleton-shimmer ${className}`} />
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-input border border-border bg-background p-4">
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <p className="mt-2 break-all text-sm font-semibold text-text">{value || 'N/A'}</p>
    </div>
  )
}

export default function InviteWorkspacePage({ onOpenWorkspace }) {
  const { inviteCode } = useParams()
  const navigate = useNavigate()
  const [workspace, setWorkspace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    // Defer setState so we don't call it synchronously in the effect body
    // (react-hooks/set-state-in-effect). inviteCode changes still re-fetch cleanly.
    queueMicrotask(() => {
      if (cancelled) return
      setLoading(true)
      setWorkspace(null)

      api
        .get(`/api/v1/workspaces/invite/${inviteCode}`)
        .then(({ data }) => {
          if (!cancelled) setWorkspace(data.workspace)
        })
        .catch((error) => {
          if (cancelled) return
          toast.error(error.message)
          navigate('/dashboard', { replace: true })
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    })

    return () => {
      cancelled = true
    }
  }, [inviteCode, navigate])

  const requestAccess = async () => {
    setSubmitting(true)
    try {
      const { data } = await api.post(`/api/v1/workspaces/invite/${inviteCode}/request`, {})
      if (data.joined && data.workspace?._id) {
        toast.success('Joined workspace')
        onOpenWorkspace(data.workspace._id)
        return
      }
      setWorkspace(data.workspace)
      toast.success('Access request sent')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-navbar text-text">
        <AppNavbar onDashboard={() => navigate('/dashboard')} />
        <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-5 py-10 outline-none">
          <div className="rounded-card border border-border bg-card p-8 shadow-sm">
            <SkeletonBlock className="h-4 w-36" />
            <SkeletonBlock className="mt-4 h-9 w-64" />
            <SkeletonBlock className="mt-4 h-16 w-full" />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <SkeletonBlock className="h-20 w-full" />
              <SkeletonBlock className="h-20 w-full" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-navbar text-text">
      <AppNavbar onDashboard={() => navigate('/dashboard')} />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto flex min-h-[calc(100vh-var(--tw-navbar-height))] max-w-3xl items-center px-5 py-10 outline-none"
      >
        <section className="w-full rounded-card border border-border bg-card p-8 shadow-sm">
          <p className="text-sm font-semibold text-primary">
            {workspace?.visibility === 'private' ? 'Private workspace' : 'Invite-only workspace'}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{workspace?.name}</h1>
          <p className="mt-3 text-sm leading-6 text-muted">{workspace?.description || 'No description provided.'}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <InfoTile label="Workspace ID" value={workspace?.workspaceId} />
            <InfoTile label="Members" value={String(workspace?.memberCount || 0)} />
          </div>

          {!workspace?.isMember && workspace?.allowsJoin === false && (
            <p className="mt-6 rounded-button border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
              This workspace is private. Invite links cannot add new members. Ask the owner to switch visibility to
              invite-only or to share access another way.
            </p>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="h-12 rounded-button border border-border px-5 text-sm font-semibold text-text-secondary transition hover:bg-card-sunken"
            >
              Back to Dashboard
            </button>
            {workspace?.isMember ? (
              <button
                type="button"
                onClick={() => onOpenWorkspace(workspace._id)}
                className="h-12 rounded-button bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover"
              >
                Open Workspace
              </button>
            ) : (
              <button
                type="button"
                disabled={workspace?.allowsJoin === false || workspace?.hasPendingRequest || submitting}
                onClick={requestAccess}
                className="h-12 rounded-button bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-primary-muted"
              >
                {workspace?.allowsJoin === false
                  ? 'Joining disabled'
                  : workspace?.hasPendingRequest
                    ? 'Request Pending'
                    : submitting
                      ? 'Sending...'
                      : 'Request Access'}
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
