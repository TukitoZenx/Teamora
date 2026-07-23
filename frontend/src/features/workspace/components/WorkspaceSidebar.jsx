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
  const [showExpandButton, setShowExpandButton] = useState(false)

  return (
    <aside
      data-workspace-sidebar="true"
      className={`flex h-full flex-col border-r border-border bg-card transition-[width] duration-slow ease-in-out ${collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'} ${className}`}
    >
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div
            className="relative flex h-9 w-9 items-center justify-center"
            onMouseEnter={() => setShowExpandButton(true)}
            onMouseLeave={() => setShowExpandButton(false)}
            onFocus={() => setShowExpandButton(true)}
            onBlur={() => setShowExpandButton(false)}
          >
            <div
              className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 shadow-sm transition-all duration-normal ease-standard ${collapsed && showExpandButton ? 'scale-90 opacity-0' : 'scale-100 opacity-100'}`}
            >
              <TeamoraLogo size="md" className="h-9 w-9" rounded="rounded-2xl" />
            </div>

            {collapsed && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className={`absolute inset-0 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted shadow-sm transition-all duration-normal ease-standard hover:scale-105 hover:bg-primary hover:text-on-primary ${showExpandButton ? 'scale-100 opacity-100' : 'pointer-events-none scale-90 opacity-0'}`}
                aria-label="Expand sidebar"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
          {!collapsed && <span className="text-[15px] font-semibold text-text">Teamora</span>}
        </div>

        {!collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted shadow-sm transition-all duration-normal ease-standard hover:scale-105 hover:bg-primary/10 hover:text-primary"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-4">
        <nav className="space-y-3">
          {groups.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-1">
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

      <div className="sticky bottom-0 border-t border-border bg-card p-2">
        {isOwner ? (
          <div className="space-y-1">
            {canLeave && (
              <SidebarItem
                icon={DoorOpen}
                label="Leave Workspace"
                danger
                collapsed={collapsed}
                onClick={onLeaveWorkspace}
              />
            )}
            <SidebarItem
              icon={Trash2}
              label="Delete Workspace"
              danger
              collapsed={collapsed}
              onClick={onDeleteWorkspace}
            />
          </div>
        ) : (
          <SidebarItem
            icon={DoorOpen}
            label="Leave Workspace"
            danger
            collapsed={collapsed}
            onClick={onLeaveWorkspace}
          />
        )}
      </div>
    </aside>
  )
}
