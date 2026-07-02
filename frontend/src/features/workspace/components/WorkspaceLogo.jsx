import { Building2 } from 'lucide-react'

export default function WorkspaceLogo({ name }) {
  const initial = name?.charAt(0)?.toUpperCase() || 'W'

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[#F5F3FF] text-sm font-semibold text-[#7C3AED]">
      {initial || <Building2 className="h-4 w-4" />}
    </div>
  )
}
