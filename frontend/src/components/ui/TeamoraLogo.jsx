import teamoraLogo from '../../assets/hero.png'

/**
 * Teamora brand mark used wherever the project icon should appear.
 * size: 'sm' | 'md' | 'lg' | 'xl' or a Tailwind class for h/w
 */
const sizes = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16'
}

export default function TeamoraLogo({ size = 'md', className = '', alt = 'Teamora', rounded = 'rounded-xl' }) {
  const dim = sizes[size] || size
  return (
    <img
      src={teamoraLogo}
      alt={alt}
      className={`${dim} shrink-0 object-contain ${rounded} ${className}`.trim()}
      draggable={false}
    />
  )
}

/**
 * Workspace mark: custom icon (emoji/text/url) when set, otherwise Teamora logo.
 */
export function WorkspaceIcon({ icon, name, size = 'lg', className = '' }) {
  const dim = sizes[size] || size
  const value = typeof icon === 'string' ? icon.trim() : ''

  // Remote or data URL icon
  if (value && (/^https?:\/\//i.test(value) || value.startsWith('data:image/'))) {
    return (
      <img
        src={value}
        alt={name || 'Workspace'}
        className={`${dim} shrink-0 rounded-2xl object-cover ${className}`.trim()}
        draggable={false}
      />
    )
  }

  // Emoji / short custom mark
  if (value && value.length <= 4) {
    return (
      <span
        className={`flex ${dim} shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl ${className}`.trim()}
        aria-hidden
      >
        {value}
      </span>
    )
  }

  return (
    <span
      className={`flex ${dim} shrink-0 items-center justify-center rounded-2xl bg-primary/10 p-1.5 ${className}`.trim()}
    >
      <TeamoraLogo size="md" className="h-full w-full" rounded="rounded-lg" alt="" />
    </span>
  )
}
