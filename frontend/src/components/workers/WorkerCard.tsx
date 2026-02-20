import { Link } from 'react-router-dom'
import type { Worker, WorkerStatus } from '../../types'

// ── Status config ───────────────────────────────────────────────────
const STATUS_COLOR: Record<WorkerStatus, string> = {
  BUSY:     'var(--color-info)',
  IDLE:     'var(--color-agent)',
  STARTING: 'var(--color-warning)',
  OFFLINE:  'var(--color-slate-700)',
}

const STATUS_DOT: Record<WorkerStatus, string> = {
  BUSY:     'bg-info info-glow',
  IDLE:     'bg-agent agent-glow',
  STARTING: 'bg-warning warning-glow animate-pulse',
  OFFLINE:  'bg-slate-700',
}

const STATUS_BADGE: Record<WorkerStatus, string> = {
  BUSY:     'text-info     border-info/40',
  IDLE:     'text-agent    border-agent/40',
  STARTING: 'text-warning  border-warning/40',
  OFFLINE:  'text-slate-600 border-slate-800',
}

const STATUS_LABEL: Record<WorkerStatus, string> = {
  BUSY:     'BUSY',
  IDLE:     'IDLE',
  STARTING: 'INIT',
  OFFLINE:  'OFF',
}

interface WorkerCardProps {
  worker: Worker
  isSelected: boolean
  onClick: () => void
  onToggle?: () => void
  onDelete?: () => void
}

export function WorkerCard({ worker, isSelected, onClick, onToggle, onDelete }: WorkerCardProps) {
  const isActive  = worker.status !== 'OFFLINE'
  // Can toggle only when IDLE (stop) or OFFLINE (start); not while BUSY or STARTING
  const canToggle = worker.status === 'IDLE' || worker.status === 'OFFLINE'

  return (
    <button
      onClick={onClick}
      className={`
        relative w-full text-left pl-4 pr-3 py-3
        transition-colors duration-150 group
        focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-agent
        ${isSelected
          ? 'bg-elevated'
          : `hover:bg-surface/60 ${!isActive ? 'opacity-40 hover:opacity-60' : ''}`
        }
      `}
    >
      {/* Left status bar */}
      <div
        className={`
          absolute left-0 inset-y-0 w-[2px]
          transition-opacity duration-150
          ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}
        `}
        style={{ backgroundColor: STATUS_COLOR[worker.status] }}
      />

      {/* Row 1: name + badge */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${STATUS_DOT[worker.status]}`} />
          <span className="font-mono text-xs font-semibold text-slate-100 truncate">
            {worker.name}
          </span>
        </div>
        <span className={`
          shrink-0 font-mono text-[9px] font-semibold tracking-wider
          px-1.5 py-px border
          ${STATUS_BADGE[worker.status]}
        `}>
          {STATUS_LABEL[worker.status]}
        </span>
      </div>

      {/* Row 2: id · port */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="font-mono text-[10px] text-slate-600 truncate">#{worker.id}</span>
        {worker.vnc_port && (
          <span className="font-mono text-[10px] text-slate-700 shrink-0">:{worker.vnc_port}</span>
        )}
      </div>

      {/* Row 3: current task or completed count */}
      {(() => {
        const activeTask = worker.tasks?.find(t => t.status === 'PROCESSING')
        const completedCount = worker.tasks?.filter(t => t.status === 'COMPLETED').length ?? 0
        return activeTask ? (
          <p className="font-mono text-[10px] text-slate-500 truncate leading-tight">
            ▸ {activeTask.prompt}
          </p>
        ) : completedCount > 0 ? (
          <p className="font-mono text-[10px] text-slate-700">
            {completedCount} tasks completed
          </p>
        ) : null
      })()}

      {/* Row 4: nav links + action buttons — only when selected */}
      {isSelected && (
        <div
          className="flex items-center gap-1 mt-2.5 pt-2.5 border-t border-border"
          onClick={e => e.stopPropagation()}
        >
          {/* Nav links */}
          <Link
            to={`/workers/${worker.id}`}
            className="flex items-center gap-1 font-mono text-[10px] text-slate-600 hover:text-slate-200 px-2 py-1 hover:bg-surface/60 transition-colors border border-transparent hover:border-border-bright"
          >
            ⊡ Detail
          </Link>
          <Link
            to={`/workers/${worker.id}/tasks`}
            className="flex items-center gap-1 font-mono text-[10px] text-slate-600 hover:text-slate-200 px-2 py-1 hover:bg-surface/60 transition-colors border border-transparent hover:border-border-bright"
          >
            ≡ Tasks
          </Link>
          <Link
            to={`/workers/${worker.id}/screenshots`}
            className="flex items-center gap-1 font-mono text-[10px] text-slate-600 hover:text-slate-200 px-2 py-1 hover:bg-surface/60 transition-colors border border-transparent hover:border-border-bright"
          >
            ⊙ Shots
          </Link>

          {/* Action buttons pushed to the right */}
          <div className="ml-auto flex items-center gap-1">
            {canToggle && onToggle && (
              <button
                onClick={onToggle}
                title={isActive ? 'Stop worker' : 'Start worker'}
                className={`
                  font-mono text-[10px] px-2 py-1 border transition-colors duration-150
                  ${isActive
                    ? 'text-slate-500 border-slate-800 hover:text-warning hover:border-warning/40'
                    : 'text-slate-500 border-slate-800 hover:text-agent  hover:border-agent/40'
                  }
                `}
              >
                {isActive ? '⏹' : '▷'}
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                title="Delete worker"
                className="font-mono text-[10px] px-2 py-1 border border-slate-800 text-slate-600 hover:text-danger hover:border-danger/40 transition-colors duration-150"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}
    </button>
  )
}
