import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Lock } from 'lucide-react'
import AuthField from '../components/AuthField'
import AuthShell from '../components/AuthShell'
import { PrimaryButton } from '../components/AuthButtons'
import { resetPassword } from '../services/auth'
import { getFriendlyAuthError } from '../hooks/useAuthForm'

export default function ResetPasswordPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const updateField = (field, value) => {
    setError('')
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setSubmitting(true)
    try {
      await resetPassword({ token, password: form.password })
      setSuccess('Password updated successfully.')
      toast.success('Password updated successfully.')
      setTimeout(() => navigate('/signin', { replace: true }), 1200)
    } catch (authError) {
      setError(getFriendlyAuthError(authError.message))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell mode="signin">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-[1.75rem]">Reset your password</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">Choose a new password for your Teamora account.</p>
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
          icon={Lock}
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          value={form.password}
          onChange={(event) => updateField('password', event.target.value)}
          placeholder="At least 8 characters"
        />

        <AuthField
          icon={Lock}
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          value={form.confirmPassword}
          onChange={(event) => updateField('confirmPassword', event.target.value)}
          placeholder="Repeat new password"
        />

        <div className="pt-1">
          <PrimaryButton disabled={submitting} loading={submitting}>
            {submitting ? 'Updating...' : 'Reset password'}
          </PrimaryButton>
        </div>
      </form>
    </AuthShell>
  )
}
