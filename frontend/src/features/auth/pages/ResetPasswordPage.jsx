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
    <AuthShell>
      <div className="mb-10 text-center">
        <h2 className="text-4xl font-medium tracking-tight text-text">Reset your password</h2>
        <p className="mt-4 text-base text-muted">Choose a new password for your Teamora account.</p>
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
          icon={Lock}
          label="New Password"
          type="password"
          required
          value={form.password}
          onChange={(event) => updateField('password', event.target.value)}
          placeholder="New password"
        />

        <AuthField
          icon={Lock}
          label="Confirm Password"
          type="password"
          required
          value={form.confirmPassword}
          onChange={(event) => updateField('confirmPassword', event.target.value)}
          placeholder="Confirm password"
        />

        <PrimaryButton disabled={submitting} loading={submitting}>
          {submitting ? 'Please wait...' : 'Reset Password'}
        </PrimaryButton>
      </form>
    </AuthShell>
  )
}
