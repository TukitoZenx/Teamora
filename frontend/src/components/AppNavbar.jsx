import ProfileDropdown from './ProfileDropdown'
import NotificationButton from './ui/NotificationButton'
import teamoraLogo from '../assets/hero.png'

export default function AppNavbar({ onDashboard }) {
  return (
    <header className="fixed inset-x-0 top-0 z-[1000] h-[72px] border-b border-[#E5E7EB] bg-white px-6">
      <div className="flex h-full w-full items-center justify-between">
        <button
          type="button"
          onClick={onDashboard}
          className="flex min-w-0 items-center gap-3 rounded-xl text-left transition duration-[180ms] hover:opacity-80"
          title="Dashboard"
        >
          <img src={teamoraLogo} alt="Teamora" className="h-9 w-9 shrink-0 rounded-xl object-contain" />
          <span className="block text-sm font-semibold tracking-tight text-[#111827]">Teamora</span>
        </button>

        <div className="flex items-center gap-3">
          <NotificationButton />
          <ProfileDropdown />
        </div>
      </div>
    </header>
  )
}
