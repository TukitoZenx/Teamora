import React from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

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
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  handleReturnToDashboard = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-background text-text p-6 font-sans">
          <div className="w-16 h-16 bg-danger/10 border border-danger/30 rounded-2xl flex items-center justify-center text-danger mb-6 animate-pulse">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-2">We couldn't load this workspace.</h1>
          <p className="text-sm text-muted max-w-sm text-center mb-8 leading-relaxed">
            An unexpected error occurred while rendering the workspace editors. Please try refreshing or returning to
            your dashboard.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={this.handleRetry}
              className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm cursor-pointer transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry</span>
            </button>
            <button
              onClick={this.handleReturnToDashboard}
              className="px-5 py-2.5 bg-card hover:bg-primary/10 text-text border border-border rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
