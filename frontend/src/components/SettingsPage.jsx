import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useOutletContext, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Bell, Camera, ChevronLeft, Laptop, Lock, Menu, ShieldCheck, Smartphone, User, X } from 'lucide-react'
import Button from './ui/Button'
import Input from './ui/Input'
import Avatar from './ui/Avatar'
import Switch from './ui/Switch'
import { useAuth } from '../hooks/useAuth'
import { completeProfile, forgotPassword, getGoogleAuthUrl } from '../features/auth/services/auth'

const sections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Laptop }
]

export default function SettingsPage({ user }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <main className="mx-auto flex min-h-[calc(100vh-var(--tw-navbar-height))] max-w-7xl px-5 py-6">
      <aside className="hidden w-60 shrink-0 pr-6 lg:block">
        <SettingsNav onNavigate={() => setDrawerOpen(false)} />
      </aside>

      <section className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="mb-5 inline-flex items-center gap-2 rounded-button border border-border bg-card px-4 py-2 text-sm font-semibold text-text-secondary shadow-sm transition duration-normal hover:bg-primary-subtle hover:text-primary lg:hidden"
        >
          <Menu className="h-4 w-4" />
          Settings Menu
        </button>

        <Outlet context={{ user }} />
      </section>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 teamora-scrim"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close settings menu"
          />
          <div className="absolute left-0 top-0 h-full w-72 bg-card p-5 shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text">Settings</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-xl p-2 text-muted transition duration-normal hover:bg-card-sunken hover:text-text"
                aria-label="Close settings menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SettingsNav onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </main>
  )
}

export function SettingsIndex() {
  return <Navigate to="profile" replace />
}

export function SettingsSection() {
  const { section = 'profile' } = useParams()
  const { user } = useOutletContext()
  const activeSection = sections.some((item) => item.id === section) ? section : 'profile'

  if (section !== activeSection) return <Navigate to="/settings/profile" replace />

  return (
    <div className="rounded-card border border-border bg-card p-6 shadow-sm">
      {activeSection === 'profile' && <ProfileSection key={user?._id || 'profile'} user={user} />}
      {activeSection === 'security' && <SecuritySection />}
      {activeSection === 'notifications' && <NotificationsSection />}
      {activeSection === 'appearance' && <AppearanceSection />}
    </div>
  )
}

function SettingsNav({ onNavigate }) {
  const lastWorkspaceId = window.localStorage.getItem('teamora-last-workspace-id')
  return (
    <nav className="sticky top-24 rounded-card border border-border bg-card p-3 shadow-sm">
      <div className="space-y-1">
        {sections.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.id}
              to={`/settings/${item.id}`}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-button px-3 py-2.5 text-sm font-semibold transition duration-normal ${isActive ? 'bg-primary text-on-primary' : 'text-muted hover:bg-primary-subtle hover:text-primary'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          )
        })}
      </div>

      <div className="my-3 h-px bg-border" />

      <Link
        to={lastWorkspaceId ? `/workspace/${lastWorkspaceId}` : '/dashboard'}
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-button px-3 py-2.5 text-sm font-semibold text-muted transition duration-normal hover:bg-primary-subtle hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        {lastWorkspaceId ? 'Back to Workspace' : 'Back to Dashboard'}
      </Link>
    </nav>
  )
}

function SectionHeader({ title, description }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-text">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
    </div>
  )
}

function ProfileSection({ user }) {
  const { refreshUser } = useAuth()
  const displayName = user?.fullName || user?.username || user?.email?.split('@')[0] || 'Teamora user'
  const initial = displayName.charAt(0).toUpperCase()
  const fileInputRef = useRef(null)
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    username: user?.username || '',
    avatar: user?.avatar || ''
  })
  const [saving, setSaving] = useState(false)

  const handlePictureChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.')
      return
    }
    // Server stores avatars as data URLs capped at ~200k chars; base64 expands
    // ~33%, so keep the raw file under ~140 KB to avoid a late 400/413.
    if (file.size > 140 * 1024) {
      toast.error('Choose an image smaller than 140 KB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      if (dataUrl.length > 200_000) {
        toast.error('Image is too large after encoding. Try a smaller file.')
        return
      }
      setForm((current) => ({ ...current, avatar: dataUrl }))
      toast.success('Picture ready to save')
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!form.fullName.trim() || !form.username.trim()) {
      toast.error('Full name and username are required.')
      return
    }

    setSaving(true)
    try {
      await completeProfile({ fullName: form.fullName.trim(), username: form.username.trim(), avatar: form.avatar })
      await refreshUser()
      toast.success('Profile updated')
    } catch (error) {
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <SectionHeader title="Profile" description="Manage your personal Teamora account details." />
      <form className="grid gap-5" onSubmit={(event) => event.preventDefault()}>
        <div className="flex items-center gap-4">
          <Avatar label={initial} src={form.avatar} className="h-16 w-16 text-xl" />
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePictureChange} className="hidden" />
          <Button type="button" variant="secondary" className="py-2" onClick={() => fileInputRef.current?.click()}>
            <Camera className="mr-2 h-4 w-4" />
            Change Picture
          </Button>
        </div>
        <SettingsInput
          label="Full Name"
          placeholder="Your full name"
          value={form.fullName}
          onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
        />
        <SettingsInput
          label="Username"
          placeholder="teamora-user"
          value={form.username}
          onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
        />
        <SettingsInput label="Email" placeholder="you@example.com" type="email" value={user?.email || ''} readOnly />
        <p className="-mt-2 text-xs text-muted">Email changes aren't supported yet.</p>
        <Button type="button" className="h-12 w-fit" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </>
  )
}

function SecuritySection() {
  const { user } = useAuth()
  const isGoogleAccount = user?.provider === 'google'
  const [sendingReset, setSendingReset] = useState(false)

  const sendPasswordReset = async () => {
    if (!user?.email || sendingReset) return
    setSendingReset(true)
    try {
      await forgotPassword(user.email)
      toast.success('Password reset email sent')
    } catch (error) {
      toast.error(error.message || 'Unable to send password reset email')
    } finally {
      setSendingReset(false)
    }
  }

  const connectGoogle = () => {
    sessionStorage.setItem('teamora-google-auth-started', 'true')
    window.location.assign(getGoogleAuthUrl())
  }

  return (
    <>
      <SectionHeader title="Security" description="Review login methods and account protection settings." />
      <div className="space-y-3">
        {isGoogleAccount ? (
          <SettingsAction
            icon={Lock}
            title="Password"
            description="Your account signs in with Google, so there is no Teamora password to change."
            action="Google sign-in"
            onClick={() => { }}
          />
        ) : (
          <SettingsAction
            icon={Lock}
            title="Change Password"
            description="Send a password reset link to your email to choose a new password."
            action={sendingReset ? 'Sending...' : 'Change'}
            onClick={sendPasswordReset}
          />
        )}
        <SettingsAction
          icon={ShieldCheck}
          title="Connected Google Account"
          description={
            isGoogleAccount ? 'Your account signs in with Google.' : 'Your account signs in with an email and password.'
          }
          action={isGoogleAccount ? 'Connected' : 'Connect'}
          onClick={isGoogleAccount ? undefined : connectGoogle}
        />
        <SettingsAction
          icon={Smartphone}
          title="Active Sessions"
          description={`You are signed in on this browser as ${user?.email || 'this account'}. Multi-device session management is not available yet.`}
          action="This browser"
          onClick={() => { }}
        />
      </div>
    </>
  )
}

function NotificationsSection() {
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = window.localStorage.getItem('teamora-notifications')
      return saved
        ? JSON.parse(saved)
        : {
          emailNotifications: true,
          workspaceInvitations: true,
          meetingReminders: true,
          documentActivity: true,
          mentionNotifications: true
        }
    } catch {
      return {
        emailNotifications: true,
        workspaceInvitations: true,
        meetingReminders: true,
        documentActivity: true,
        mentionNotifications: true
      }
    }
  })

  useEffect(() => {
    window.localStorage.setItem('teamora-notifications', JSON.stringify(preferences))
    window.dispatchEvent(new CustomEvent('teamora-notification-preferences-changed', { detail: preferences }))
  }, [preferences])

  const toggle = async (key) => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    setPreferences((current) => ({ ...current, [key]: !current[key] }))
  }

  const testNotification = (title) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      toast.success(`${title} preference saved`)
      return
    }
    new Notification('Teamora notification', { body: `${title} is enabled.` })
  }

  return (
    <>
      <SectionHeader
        title="Notifications"
        description="Preferences are stored on this device only. Email delivery from these toggles is not enabled yet."
      />
      <div className="space-y-3">
        <ToggleRow
          label="Email notifications"
          active={preferences.emailNotifications}
          onToggle={() => toggle('emailNotifications')}
          onTest={() => testNotification('Email notifications')}
        />
        <ToggleRow
          label="Workspace invitations"
          active={preferences.workspaceInvitations}
          onToggle={() => toggle('workspaceInvitations')}
        />
        <ToggleRow
          label="Meeting reminders"
          active={preferences.meetingReminders}
          onToggle={() => toggle('meetingReminders')}
          onTest={() => testNotification('Meeting notifications')}
        />
        <ToggleRow
          label="Document activity"
          active={preferences.documentActivity}
          onToggle={() => toggle('documentActivity')}
          onTest={() => testNotification('Document notifications')}
        />
        <ToggleRow
          label="Mention notifications"
          active={preferences.mentionNotifications}
          onToggle={() => toggle('mentionNotifications')}
          onTest={() => testNotification('Mention notifications')}
        />
      </div>
    </>
  )
}

function AppearanceSection() {
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = window.localStorage.getItem('teamora-appearance')
      return saved
        ? JSON.parse(saved)
        : { theme: 'Light', density: 'Comfortable', language: 'English', timeZone: 'UTC', dateFormat: 'MM/DD/YYYY' }
    } catch {
      return { theme: 'Light', density: 'Comfortable', language: 'English', timeZone: 'UTC', dateFormat: 'MM/DD/YYYY' }
    }
  })

  useEffect(() => {
    window.localStorage.setItem('teamora-appearance', JSON.stringify(preferences))
    window.dispatchEvent(new CustomEvent('teamora-appearance-changed', { detail: preferences }))
  }, [preferences])

  return (
    <>
      <SectionHeader
        title="Appearance"
        description="Adjust layout and regional preferences for your workspace experience."
      />
      <div className="space-y-3">
        <SelectRow
          label="Color theme"
          value={preferences.theme || 'Light'}
          options={['Light', 'Dark', 'System']}
          onChange={(value) => setPreferences((current) => ({ ...current, theme: value }))}
        />
        <SelectRow
          label="Interface density"
          value={preferences.density}
          options={['Comfortable', 'Compact']}
          onChange={(value) => setPreferences((current) => ({ ...current, density: value }))}
        />
        <SelectRow
          label="Language"
          value={preferences.language}
          options={['English', 'Español', 'Français']}
          onChange={(value) => setPreferences((current) => ({ ...current, language: value }))}
        />
        <SelectRow
          label="Time zone"
          value={preferences.timeZone}
          options={['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo']}
          onChange={(value) => setPreferences((current) => ({ ...current, timeZone: value }))}
        />
        <SelectRow
          label="Date format"
          value={preferences.dateFormat}
          options={['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']}
          onChange={(value) => setPreferences((current) => ({ ...current, dateFormat: value }))}
        />
      </div>
    </>
  )
}

function SettingsInput({ label, type = 'text', placeholder, value = '', onChange, readOnly = false }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-text-secondary">{label}</span>
      <Input type={type} value={value} onChange={onChange} placeholder={placeholder} readOnly={readOnly} />
    </label>
  )
}

function SettingsAction({ icon: Icon = ShieldCheck, title, description, action, danger = false, onClick }) {
  return (
    <div className="flex flex-col gap-4 rounded-card border border-border p-4 transition duration-normal hover:shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-button bg-card-sunken text-muted">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-text">{title}</h3>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClick}
        className={`h-10 rounded-button px-4 text-sm font-semibold transition duration-normal ${danger ? 'text-danger hover:bg-red-50' : 'text-primary hover:bg-primary-subtle'}`}
      >
        {action}
      </button>
    </div>
  )
}

function ToggleRow({ label, active = false, onToggle, onTest }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-border p-4">
      <span className="text-sm font-medium text-text">{label}</span>
      <div className="flex items-center gap-2">
        {active && onTest && (
          <button
            type="button"
            onClick={onTest}
            className="h-9 rounded-control px-3 text-xs font-semibold text-primary transition hover:bg-primary-subtle"
          >
            Test
          </button>
        )}
        <Switch checked={active} onClick={onToggle} aria-label={label} />
      </div>
    </div>
  )
}

function SelectRow({ label, value, options, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-border p-4">
      <span className="text-sm font-medium text-text">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-button border border-border bg-card px-3 py-2 text-sm text-text-secondary outline-none focus:border-primary"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}
