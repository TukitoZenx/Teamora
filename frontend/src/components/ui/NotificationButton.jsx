import { Bell } from 'lucide-react'

export default function NotificationButton() {
  return (
    <button
      type="button"
      className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6B7280] transition duration-[180ms] ease-out hover:bg-[#F3F4F6] hover:text-[#7C3AED]"
      aria-label="Notifications"
    >
      <Bell className="h-4 w-4" />
    </button>
  )
}
