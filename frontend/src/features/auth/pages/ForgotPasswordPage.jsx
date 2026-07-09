import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Mail } from 'lucide-react'
import AuthField from '../components/AuthField'
import AuthShell from '../components/AuthShell'
import { PrimaryButton } from '../components/AuthButtons'
import { forgotPassword } from '../services/auth'
import { getFriendlyAuthError } from '../hooks/useAuthForm'

const SUCCESS_MESSAGE = "Check your email. If an account exists, we've sent a password reset link."

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      await forgotPassword(email)
      setSuccess(SUCCESS_MESSAGE)
      toast.success('Password reset email sent.')
    } catch (authError) {
      setError(getFriendlyAuthError(authError.message))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell>
      <Link
        to="/signin"
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Sign In
      </Link>

      <div className="mb-10 text-center">
        <h2 className="text-4xl font-medium tracking-tight text-text">Forgot your password?</h2>
        <p className="mt-4 text-base text-muted">Enter your email and we'll send you a password reset link.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-card border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-card border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          icon={Mail}
          label="Email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />

        <PrimaryButton disabled={submitting} loading={submitting}>
          {submitting ? 'Sending...' : 'Send Reset Link'}
        </PrimaryButton>
      </form>
    </AuthShell>
  )
}
