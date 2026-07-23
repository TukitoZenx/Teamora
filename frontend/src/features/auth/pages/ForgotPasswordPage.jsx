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
    <AuthShell mode="signin">
      <Link
        to="/signin"
        className="mb-7 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Sign in
      </Link>

      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-[1.75rem]">Forgot password?</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Enter your email and we&apos;ll send you a reset link if an account exists.
        </p>
      </div>

      {error && (
        <div
          className="mb-4 rounded-input border border-danger/20 bg-danger/10 px-3.5 py-3 text-sm text-danger"
          role="alert"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="mb-4 rounded-input border border-success/20 bg-success/10 px-3.5 py-3 text-sm text-success"
          role="status"
        >
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          icon={Mail}
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
        />

        <div className="pt-1">
          <PrimaryButton disabled={submitting} loading={submitting}>
            {submitting ? 'Sending...' : 'Send reset link'}
          </PrimaryButton>
        </div>
      </form>
    </AuthShell>
  )
}
