import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

/**
 * Isolates presentation crashes so they cannot take down the whole workspace.
 */
export default class PresentationErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Presentation failed to render'
    }
  }

  componentDidCatch(error, info) {
    console.error('Presentation crash:', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-[240px] w-full flex-col items-center justify-center gap-3 rounded-card border border-border bg-card p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-danger/30 bg-danger/10 text-danger">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-text">Presentation editor hit an error</h2>
          <p className="max-w-md text-sm text-muted">
            Your workspace is still open. You can reset the editor and continue without losing the rest of the app.
          </p>
          {this.state.message ? (
            <p className="max-w-lg break-words font-mono text-[11px] text-muted/80">{this.state.message}</p>
          ) : null}
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
          >
            <RotateCcw className="h-4 w-4" /> Reset presentation editor
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
