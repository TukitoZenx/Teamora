import teamoraLogo from '../../../assets/hero.png'

export default function TeamoraLoader({ message = 'Preparing your workspace...' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 text-[#111111]">
      <div className="w-full max-w-xs text-center">
        <img src={teamoraLogo} alt="Teamora logo" className="mx-auto h-12 w-12 rounded-xl" />
        <p className="mt-4 text-lg font-medium">Teamora</p>
        <p className="mt-3 text-sm text-[#6B7280]">{message}</p>
        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-[#E5E7EB]">
          <div className="h-full w-1/2 animate-[pulse_1s_ease-in-out_infinite] rounded-full bg-[#7C3AED]" />
        </div>
      </div>
    </div>
  )
}
