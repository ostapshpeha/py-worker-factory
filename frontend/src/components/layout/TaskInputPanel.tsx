import { useState } from 'react'
import type { Worker, WorkerStatus, SkillId } from '../../types'
import { SKILLS } from '../../lib/skills'

// Inline to avoid cross-file constant sprawl
const STATUS_INDICATOR_COLOR: Record<WorkerStatus, string> = {
  BUSY:     'var(--color-info)',
  IDLE:     'var(--color-agent)',
  STARTING: 'var(--color-warning)',
  OFFLINE:  'var(--color-slate-700)',
}

interface TaskInputPanelProps {
  worker: Worker | null
}

export function TaskInputPanel({ worker }: TaskInputPanelProps) {
  const [selectedSkill, setSelectedSkill] = useState<SkillId>('planner')
  const [taskText, setTaskText]           = useState('')

  const canExecute = worker?.status === 'IDLE' && taskText.trim().length > 0

  const statusHint =
    !worker              ? 'select a worker to submit a task'
    : worker.status === 'BUSY'     ? 'worker is busy — wait for task to finish'
    : worker.status === 'STARTING' ? 'worker is initializing — please wait'
    : worker.status === 'OFFLINE'  ? 'worker is offline — spawn a new one'
    : null  // IDLE → no hint needed

  const activeSkill = SKILLS.find(s => s.id === selectedSkill)!

  return (
    <div className="border border-border bg-surface/30 overflow-hidden">

      {/* ── Skill selector row ── */}
      <div className="flex items-stretch border-b border-border">

        {/* "SKILL" label cell */}
        <div className="flex items-center px-3 border-r border-border shrink-0">
          <span className="label-ops">Skill</span>
        </div>

        {/* Scrollable chips — allows overflow on narrow screens */}
        <div className="flex items-center gap-px p-1.5 overflow-x-auto">
          {SKILLS.map(skill => {
            const isActive = skill.id === selectedSkill
            return (
              <button
                key={skill.id}
                onClick={() => setSelectedSkill(skill.id)}
                title={skill.hint}
                className={`
                  shrink-0 flex items-center gap-1.5 whitespace-nowrap
                  font-mono text-[10px] tracking-wider uppercase
                  px-3 py-1.5 border transition-all duration-150
                  ${isActive
                    ? 'text-agent border-agent/50 bg-agent/8'
                    : 'text-slate-600 border-transparent hover:text-slate-300 hover:border-border-bright'
                  }
                `}
              >
                <span className="text-[12px] leading-none">{skill.icon}</span>
                <span>{skill.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Active skill hint bar ── */}
      <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border bg-void/30">
        <span className="font-mono text-[10px] text-agent/60">{activeSkill.icon}</span>
        <span className="font-mono text-[10px] text-slate-700 italic">
          {activeSkill.hint}
        </span>
      </div>

      {/* ── Textarea ── */}
      <div className="relative">
        <textarea
          value={taskText}
          onChange={e => setTaskText(e.target.value)}
          onKeyDown={e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canExecute) {
              e.preventDefault()
              // TODO: wire to API
            }
          }}
          placeholder={`Describe the task for this agent using the ${activeSkill.label} skill…`}
          rows={8}
          className="
            w-full bg-transparent
            px-4 py-4
            font-mono text-xs text-slate-200 leading-relaxed
            placeholder:text-slate-700
            resize-none focus:outline-none
            border-b border-border
          "
        />
        {taskText.length > 0 && (
          <span className="absolute bottom-3 right-3 font-mono text-[9px] text-slate-700 pointer-events-none select-none">
            {taskText.length} chars
          </span>
        )}
      </div>

      {/* ── Footer: context + execute ── */}
      <div className="flex items-center justify-between px-3 py-2 bg-void/20">

        {/* Left: worker context */}
        <div className="flex items-center gap-2 min-w-0">
          {worker ? (
            <>
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: STATUS_INDICATOR_COLOR[worker.status] }}
              />
              <span className="font-mono text-[10px] text-slate-500 truncate">
                {worker.name}
              </span>
              {statusHint && (
                <span className="font-mono text-[10px] text-slate-700 truncate hidden sm:block">
                  — {statusHint}
                </span>
              )}
            </>
          ) : (
            <span className="font-mono text-[10px] text-slate-700">
              {statusHint}
            </span>
          )}
        </div>

        {/* Right: keyboard hint + send button */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-mono text-[9px] text-slate-700 hidden md:block select-none">
            ⌘ ↵
          </span>
          <button
            disabled={!canExecute}
            className="
              flex items-center gap-2
              font-mono text-[11px] font-semibold tracking-widest uppercase
              px-5 py-2 border
              transition-all duration-150
              bg-agent/10 text-agent border-agent/50
              hover:bg-agent hover:text-void hover:border-agent
              hover:shadow-[0_0_20px_rgba(0,255,136,0.25)]
              disabled:text-slate-700 disabled:border-slate-800
              disabled:bg-transparent disabled:cursor-not-allowed
              disabled:shadow-none
            "
          >
            Send ▶
          </button>
        </div>
      </div>
    </div>
  )
}
