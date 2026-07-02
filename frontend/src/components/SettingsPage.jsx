import { useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useOutletContext, useParams } from 'react-router-dom'
import {
  Bell,
  ChevronLeft,
  Laptop,
  Lock,
  Menu,
  ShieldCheck,
  Smartphone,
  User,
  X
} from 'lucide-react'
import Button from './ui/Button'
import Input from './ui/Input'

const sections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Laptop }
]

export default function SettingsPage({ user }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-7xl px-5 py-6">
      <aside className="hidden w-60 shrink-0 pr-6 lg:block">
        <SettingsNav onNavigate={() => setDrawerOpen(false)} />
      </aside>

      <section className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="mb-5 inline-flex items-center gap-2 rounded-[14px] border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#374151] shadow-sm transition duration-[180ms] hover:bg-[#F8F5FF] hover:text-[#7C3AED] lg:hidden"
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
            className="absolute inset-0 bg-black/25 backdrop-blur-[10px]"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close settings menu"
          />
          <div className="absolute left-0 top-0 h-full w-72 bg-white p-5 shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#111827]">Settings</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-xl p-2 text-[#6B7280] transition duration-[180ms] hover:bg-[#F3F4F6] hover:text-[#111827]"
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
    <div className="rounded-[20px] border border-[#E5E7EB] bg-white p-6 shadow-sm">
      {activeSection === 'profile' && <ProfileSection user={user} />}
      {activeSection === 'security' && <SecuritySection />}
      {activeSection === 'notifications' && <NotificationsSection />}
      {activeSection === 'appearance' && <AppearanceSection />}
    </div>
  )
}

function SettingsNav({ onNavigate }) {
  return (
    <nav className="sticky top-24 rounded-[20px] border border-[#E5E7EB] bg-white p-3 shadow-sm">
      <div className="space-y-1">
        {sections.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.id}
              to={`/settings/${item.id}`}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm font-semibold transition duration-[180ms] ${
                  isActive ? 'bg-[#7C3AED] text-white' : 'text-[#6B7280] hover:bg-[#F8F5FF] hover:text-[#7C3AED]'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          )
        })}
      </div>

      <div className="my-3 h-px bg-[#E5E7EB]" />

      <Link
        to="/dashboard"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm font-semibold text-[#6B7280] transition duration-[180ms] hover:bg-[#F8F5FF] hover:text-[#7C3AED]"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
    </nav>
  )
}

function SectionHeader({ title, description }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-[#6B7280]">{description}</p>
    </div>
  )
}

function ProfileSection({ user }) {
  const displayName = user?.fullName || user?.username || user?.email?.split('@')[0] || 'Teamora user'
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <>
      <SectionHeader title="Profile" description="Manage your personal Teamora account details." />
      <form className="grid gap-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#7C3AED] text-xl font-semibold text-white">{initial}</div>
          <Button type="button" variant="secondary" className="py-2">
            Change Picture
          </Button>
        </div>
        <SettingsInput label="Full Name" placeholder="Your full name" defaultValue={user?.fullName || ''} />
        <SettingsInput label="Username" placeholder="teamora-user" defaultValue={user?.username || ''} />
        <SettingsInput label="Email" placeholder="you@example.com" type="email" defaultValue={user?.email || ''} />
        <SettingsInput label="Phone" placeholder="Optional" />
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#374151]">Bio</span>
          <textarea className="min-h-28 w-full resize-none rounded-2xl border border-[#E5E7EB] px-4 py-3 text-sm outline-none transition duration-[180ms] hover:border-[#7C3AED] focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10" placeholder="Optional" />
        </label>
        <Button type="button" className="h-12 w-fit">
          Save Changes
        </Button>
      </form>
    </>
  )
}

function SecuritySection() {
  return (
    <>
      <SectionHeader title="Security" description="Review login methods and account protection settings." />
      <div className="space-y-3">
        <SettingsAction icon={Lock} title="Change Password" description="Update the password used for email sign in." action="Change" />
        <SettingsAction icon={ShieldCheck} title="Connected Google Account" description="Manage the Google account connected to Teamora." action="Manage" />
        <SettingsAction icon={Smartphone} title="Active Sessions" description="Review devices currently signed in to your account." action="View" />
        <SettingsAction title="Sign Out Other Devices" description="Keep this session active and sign out everywhere else." action="Sign Out" danger />
      </div>
    </>
  )
}

function NotificationsSection() {
  return (
    <>
      <SectionHeader title="Notifications" description="Choose which Teamora updates should reach you." />
      <div className="space-y-3">
        {['Workspace Invitations', 'Email Notifications', 'Meeting Reminders', 'Mentions'].map((label) => (
          <ToggleRow key={label} label={label} />
        ))}
      </div>
    </>
  )
}

function AppearanceSection() {
  return (
    <>
      <SectionHeader title="Appearance" description="Future-ready display preferences for your workspace experience." />
      <div className="space-y-3">
        <ToggleRow label="Compact Mode" />
        <PreferenceRow label="Workspace Card Density" value="Comfortable" />
        <PreferenceRow label="Language" value="Coming Soon" />
      </div>
    </>
  )
}

function SettingsInput({ label, type = 'text', placeholder, defaultValue = '' }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#374151]">{label}</span>
      <Input
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
    </label>
  )
}

function SettingsAction({ icon: Icon = ShieldCheck, title, description, action, danger = false }) {
  return (
    <div className="flex flex-col gap-4 rounded-[20px] border border-[#E5E7EB] p-4 transition duration-[180ms] hover:shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#F3F4F6] text-[#6B7280]">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-[#111827]">{title}</h3>
          <p className="mt-1 text-sm text-[#6B7280]">{description}</p>
        </div>
      </div>
      <button type="button" className={`h-10 rounded-[14px] px-4 text-sm font-semibold transition duration-[180ms] ${danger ? 'text-[#EF4444] hover:bg-red-50' : 'text-[#7C3AED] hover:bg-[#F8F5FF]'}`}>
        {action}
      </button>
    </div>
  )
}

function ToggleRow({ label }) {
  return (
    <div className="flex items-center justify-between rounded-[20px] border border-[#E5E7EB] p-4">
      <span className="text-sm font-medium text-[#111827]">{label}</span>
      <button type="button" className="h-6 w-11 rounded-full bg-[#E5E7EB] p-1 transition duration-[180ms] hover:bg-[#DDD6FE]" aria-label={label}>
        <span className="block h-4 w-4 rounded-full bg-white shadow-sm" />
      </button>
    </div>
  )
}

function PreferenceRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-[20px] border border-[#E5E7EB] p-4">
      <span className="text-sm font-medium text-[#111827]">{label}</span>
      <span className="text-sm font-medium text-[#6B7280]">{value}</span>
    </div>
  )
}
