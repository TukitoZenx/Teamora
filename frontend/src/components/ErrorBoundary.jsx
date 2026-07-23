import React from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import TeamoraLogo from './ui/TeamoraLogo'

const LAST_WORKSPACE_KEY = 'teamora-last-workspace-id'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    // Full reload re-mounts the tree cleanly after a render crash.
    window.location.reload()
  }

  handleReturnToDashboard = () => {
    // Clear the last-workspace pointer so a hard navigation does not bounce
    // the user back into the same broken workspace route.
    try {
      localStorage.removeItem(LAST_WORKSPACE_KEY)
    } catch {
      // ignore storage failures
    }

    // Always hard-navigate. This ErrorBoundary wraps the router, so React
    // Router hooks/navigate are unavailable here — and setState alone would
    // re-render the same crashing children without leaving the page.
    window.location.assign('/dashboard')
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen w-screen flex-col items-center justify-center bg-background p-6 font-sans text-text">
          <TeamoraLogo size="lg" className="mb-4" />
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-danger/30 bg-danger/10 text-danger">
            <AlertTriangle className="h-8 w-8" aria-hidden />
          </div>
          <h1 className="mb-2 text-2xl font-extrabold tracking-tight">We couldn&apos;t load this workspace.</h1>
          <p className="mb-8 max-w-sm text-center text-sm leading-relaxed text-muted">
            An unexpected error occurred while rendering the workspace. Please try refreshing or return to your
            dashboard.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-hover"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              <span>Retry</span>
            </button>
            <button
              type="button"
              onClick={this.handleReturnToDashboard}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-primary/10"
            >
              <Home className="h-4 w-4" aria-hidden />
              <span>Return to Dashboard</span>
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
