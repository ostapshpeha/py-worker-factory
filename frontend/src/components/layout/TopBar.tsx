import { Link } from 'react-router-dom'
import type { Worker } from '../../types'
import { useAuth } from '../../context/AuthContext'

interface TopBarProps {
  workers: Worker[]
  sidebarOpen: boolean
  onMenuToggle: () => void
  logPanelOpen?: boolean
  onLogPanelToggle?: () => void
}

export function TopBar({
  workers,
  sidebarOpen,
  onMenuToggle,
  logPanelOpen = false,
  onLogPanelToggle,
}: TopBarProps) {
  const { user } = useAuth()
  const onlineCount   = workers.filter(w => w.status !== 'OFFLINE').length
  const busyCount     = workers.filter(w => w.status === 'BUSY').length
  const startingCount = workers.filter(w => w.status === 'STARTING').length

  return (
    <header className="flex items-center justify-between h-12 px-4 bg-void border-b border-border-bright shrink-0 z-10">

      {/* ── Left: hamburger + brand ── */}
      <div className="flex items-center gap-3">

        {/* Hamburger — visible below lg only */}
        <button
          onClick={onMenuToggle}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          className="lg:hidden relative w-5 h-4 flex flex-col justify-between p-0 text-slate-500 hover:text-slate-300 transition-colors shrink-0"
        >
          <span className={`block w-full h-px bg-current transition-all duration-200 origin-center ${sidebarOpen ? 'rotate-45 translate-y-[7.5px]' : ''}`} />
          <span className={`block w-full h-px bg-current transition-all duration-200 ${sidebarOpen ? 'opacity-0 scale-x-0' : ''}`} />
          <span className={`block w-full h-px bg-current transition-all duration-200 origin-center ${sidebarOpen ? '-rotate-45 -translate-y-[7.5px]' : ''}`} />
        </button>

        {/* Brand — links back to dashboard */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-agent opacity-50" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-agent agent-glow" />
          </span>
          <span className="font-mono text-xs font-semibold tracking-[0.18em] uppercase text-agent agent-text-glow group-hover:opacity-80 transition-opacity">
            Worker Factory
          </span>
          <span className="hidden sm:block font-mono text-[10px] text-slate-700 tracking-widest">
            / ops
          </span>
        </Link>
      </div>

      {/* ── Center: system status chips ── */}
      <div className="hidden md:flex items-center gap-5">
        <StatusChip dot="bg-agent agent-glow" label={`${onlineCount} online`} />
        {busyCount > 0 && (
          <StatusChip dot="bg-info info-glow" label={`${busyCount} processing`} />
        )}
        {startingCount > 0 && (
          <StatusChip dot="bg-warning warning-glow animate-pulse" label={`${startingCount} starting`} />
        )}
        <span className="font-mono text-[10px] text-slate-700">{workers.length}/3 workers</span>
      </div>

      {/* ── Right: log toggle + profile ── */}
      <div className="flex items-center gap-3">

        {/* Log panel toggle — only renders when handler is provided */}
        {onLogPanelToggle && (
          <button
            onClick={onLogPanelToggle}
            className={`
              xl:hidden font-mono text-[10px] tracking-widest uppercase
              px-2.5 py-1 border transition-colors duration-150
              ${logPanelOpen
                ? 'text-agent border-agent/40 bg-agent/5'
                : 'text-slate-600 border-border-bright hover:text-slate-400 hover:border-slate-600'
              }
            `}
          >
            logs
          </button>
        )}

        <div className="w-px h-4 bg-border-bright hidden sm:block" />

        {/* Profile link */}
        <Link
          to="/profile"
          className="
            hidden sm:flex items-center gap-2
            font-mono text-xs text-slate-400
            hover:text-slate-200 transition-colors duration-150
            group
          "
        >
          <span className="w-5 h-5 border border-border-bright flex items-center justify-center group-hover:border-slate-500 transition-colors">
            <span className="font-mono text-[9px] text-slate-600 group-hover:text-slate-400">
              {user ? user.email[0].toUpperCase() : 'op'}
            </span>
          </span>
          {user ? user.email.split('@')[0] : 'operator'}
        </Link>
      </div>
    </header>
  )
}

function StatusChip({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      <span className="label-ops">{label}</span>
    </div>
  )
}
