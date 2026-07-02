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
        <h2 className="text-4xl font-medium tracking-tight text-[#111111]">Reset your password</h2>
        <p className="mt-4 text-base text-[#6B7280]">Choose a new password for your Teamora account.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
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
