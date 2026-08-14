import { useState } from 'react'
import {
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  FileText,
  Folder,
  Home,
  MessageSquare,
  Paintbrush,
  Presentation,
  Settings,
  TableProperties,
  Trash2,
  Users,
  Video
} from 'lucide-react'
import SidebarItem from './SidebarItem'
import TeamoraLogo from '../../../components/ui/TeamoraLogo'

const groups = [
  [{ key: 'home', label: 'Home', icon: Home }],
  [
    { key: 'documents', label: 'Documents', icon: FileText },
    { key: 'spreadsheet', label: 'Spreadsheet', icon: TableProperties },
    { key: 'presentation', label: 'Presentation', icon: Presentation },
    { key: 'whiteboard', label: 'Whiteboard', icon: Paintbrush }
  ],
  [
    { key: 'calendar', label: 'Calendar', icon: Calendar },
    { key: 'tasks', label: 'All Tasks', icon: CheckSquare },
    { key: 'meetings', label: 'Meetings', icon: Video }
  ],
  [
    { key: 'members', label: 'Members', icon: Users },
    { key: 'shared-files', label: 'Shared Files', icon: Folder },
    { key: 'chat', label: 'Chat', icon: MessageSquare }
  ],
  [{ key: 'settings', label: 'Settings', icon: Settings }]
]

export default function WorkspaceSidebar({
  activeItem,
  onSelect,
  onLeaveWorkspace,
  onDeleteWorkspace,
  isOwner = false,
  canLeave = true, // host may leave anytime; ownership is never transferred
  collapsed = false,
  onToggleCollapse,
  className = ''
}) {
  const [logoHovered, setLogoHovered] = useState(false)

  return (
    <aside
      data-workspace-sidebar="true"
      aria-label="Workspace navigation"
      className={`z-sidebar flex h-full shrink-0 flex-col overflow-visible border-r border-border bg-card transition-[width] duration-slow ease-in-out ${collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'} ${className}`}
    >
      <div
        className={`flex h-16 shrink-0 items-center border-b border-border ${collapsed ? 'justify-center px-2' : 'justify-between px-3'}`}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            onMouseEnter={() => setLogoHovered(true)}
            onMouseLeave={() => setLogoHovered(false)}
            onFocus={() => setLogoHovered(true)}
            onBlur={() => setLogoHovered(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-muted shadow-sm transition-all duration-normal ease-standard hover:border-primary hover:bg-primary hover:text-on-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
            aria-label="Expand sidebar"
            aria-expanded={false}
            title="Expand sidebar"
          >
            {logoHovered ? (
              <ChevronRight className="h-4 w-4" aria-hidden />
            ) : (
              <TeamoraLogo size="md" className="h-9 w-9" rounded="rounded-2xl" />
            )}
          </button>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 shadow-sm">
                <TeamoraLogo size="md" className="h-9 w-9" rounded="rounded-2xl" />
              </div>
              <span className="truncate text-[15px] font-semibold text-text">Teamora</span>
            </div>
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted shadow-sm transition-all duration-normal ease-standard hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
              aria-label="Collapse sidebar"
              aria-expanded={true}
              title="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
          </>
        )}
      </div>

      <div className={`min-h-0 flex-1 overflow-y-auto overflow-x-visible py-4 ${collapsed ? 'px-1.5' : 'px-2'}`}>
        <nav className="space-y-3 overflow-visible" aria-label="Workspace sections">
          {groups.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-1 overflow-visible">
              {groupIndex > 0 && !collapsed && <div className="my-3 h-px bg-border" />}
              {group.map((item) => (
                <SidebarItem
                  key={item.key}
                  icon={item.icon}
                  label={item.label}
                  active={activeItem === item.key}
                  collapsed={collapsed}
                  onClick={() => onSelect(item.key)}
                />
              ))}
            </div>
          ))}
        </nav>
      </div>

      <div className={`shrink-0 overflow-visible border-t border-border bg-card ${collapsed ? 'p-1.5' : 'p-2'}`}>
        {isOwner ? (
          <div className="space-y-1 overflow-visible">
            {canLeave && (
              <SidebarItem
                icon={DoorOpen}
                label="Leave Workspace"
                danger
                collapsed={collapsed}
                tooltipPlacement="right-start"
                onClick={onLeaveWorkspace}
              />
            )}
            <SidebarItem
              icon={Trash2}
              label="Delete Workspace"
              danger
              collapsed={collapsed}
              tooltipPlacement="right-start"
              onClick={onDeleteWorkspace}
            />
          </div>
        ) : (
          <SidebarItem
            icon={DoorOpen}
            label="Leave Workspace"
            danger
            collapsed={collapsed}
            tooltipPlacement="right-start"
            onClick={onLeaveWorkspace}
          />
        )}
      </div>
    </aside>
  )
}
