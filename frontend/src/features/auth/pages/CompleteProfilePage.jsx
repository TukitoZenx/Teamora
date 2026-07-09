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
      <div className="mb-8">
        <h2 className="text-4xl font-medium tracking-tight text-text">Complete your profile</h2>
        <p className="mt-3 text-base text-muted">Finish setting up your Teamora account.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-card border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          icon={User}
          label="Full Name"
          required
          value={form.fullName}
          onChange={(event) => updateField('fullName', event.target.value)}
          placeholder="Alex Morgan"
        />

        <AuthField
          icon={Users}
          label="Username"
          required
          value={form.username}
          onChange={(event) => updateField('username', event.target.value)}
          placeholder="alex"
        />

        <PrimaryButton disabled={submitting} loading={submitting}>
          {submitting ? 'Please wait...' : 'Continue'}
        </PrimaryButton>
      </form>
    </AuthShell>
  )
}
