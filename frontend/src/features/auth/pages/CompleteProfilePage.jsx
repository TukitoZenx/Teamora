import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Users } from 'lucide-react'
import AuthField from '../components/AuthField'
import AuthShell from '../components/AuthShell'
import { PrimaryButton } from '../components/AuthButtons'
import { useAuth } from '../hooks/useAuth'
import { completeProfile } from '../services/auth'
import { getFriendlyAuthError } from '../hooks/useAuthForm'

export default function CompleteProfilePage() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    username: user?.username || ''
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const updateField = (field, value) => {
    setError('')
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!form.fullName.trim() || !form.username.trim()) {
      setError('Full name and username are required.')
      return
    }

    setSubmitting(true)
    try {
      await completeProfile(form)
      await refreshUser()
      navigate('/dashboard', { replace: true })
    } catch (authError) {
      setError(getFriendlyAuthError(authError.message))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell mode="signup">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-[1.75rem]">
          Complete your profile
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Finish setting up your Teamora account to continue.
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          icon={User}
          label="Full name"
          autoComplete="name"
          required
          value={form.fullName}
          onChange={(event) => updateField('fullName', event.target.value)}
          placeholder="Alex Morgan"
        />

        <AuthField
          icon={Users}
          label="Username"
          autoComplete="username"
          required
          value={form.username}
          onChange={(event) => updateField('username', event.target.value)}
          placeholder="alex"
        />

        <div className="pt-1">
          <PrimaryButton disabled={submitting} loading={submitting}>
            {submitting ? 'Saving...' : 'Continue'}
          </PrimaryButton>
        </div>
      </form>
    </AuthShell>
  )
}
