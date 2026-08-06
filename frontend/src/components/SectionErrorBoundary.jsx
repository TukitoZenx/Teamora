import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

/**
 * Lightweight boundary for a single workspace section so one crash
 * does not take down the entire workspace shell.
 */
export default class SectionErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, retryKey: 0 }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[SectionErrorBoundary:${this.props.name || 'section'}]`, error, errorInfo)
  }

  handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryKey: prev.retryKey + 1
    }))
    this.props.onRetry?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex h-full min-h-[240px] flex-col items-center justify-center gap-4 rounded-card border border-border bg-card p-8 text-center"
          role="alert"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-danger/30 bg-danger/10 text-danger">
            <AlertTriangle className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text">Something went wrong</h2>
            <p className="mt-1 max-w-sm text-sm text-muted">
              {this.props.name ? `The ${this.props.name} section failed to load.` : 'This section failed to load.'} Try
              reloading it without leaving the workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex min-h-[var(--tw-touch-min)] items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-sm transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reload section
          </button>
        </div>
      )
    }

    return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>
  }
}
