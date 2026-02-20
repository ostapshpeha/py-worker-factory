import { useState, useCallback } from 'react'
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
  onSubmitTask?: (prompt: string) => Promise<void>
}

export function TaskInputPanel({ worker, onSubmitTask }: TaskInputPanelProps) {
  const [selectedSkill, setSelectedSkill] = useState<SkillId | null>(null)
  const [skillsOpen, setSkillsOpen]       = useState(false)
  const [taskText, setTaskText]           = useState('')
  const [submitting, setSubmitting]       = useState(false)
  const [submitError, setSubmitError]     = useState<string | null>(null)

  const activeSkill = selectedSkill ? SKILLS.find(s => s.id === selectedSkill) ?? null : null
  const canExecute  = worker?.status === 'IDLE' && taskText.trim().length > 0 && !submitting

  const handleSubmit = useCallback(async () => {
    if (!canExecute || !onSubmitTask) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const prompt = activeSkill ? `use @${activeSkill.file}\n${taskText.trim()}` : taskText.trim()
      await onSubmitTask(prompt)
      setTaskText('')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit task')
    } finally {
      setSubmitting(false)
    }
  }, [canExecute, onSubmitTask, taskText, activeSkill])

  const statusHint =
    !worker              ? 'select a worker to submit a task'
    : worker.status === 'BUSY'     ? 'worker is busy — wait for task to finish'
    : worker.status === 'STARTING' ? 'worker is initializing — please wait'
    : worker.status === 'OFFLINE'  ? 'worker is offline — spawn a new one'
    : null  // IDLE → no hint needed

  return (
    <div className="border border-border bg-surface/30 overflow-hidden">

      {/* ── Skill selector row ── */}
      <div className="flex items-stretch border-b border-border">

        {/* "SKILL" label + toggle */}
        <button
          onClick={() => setSkillsOpen(prev => !prev)}
          className="flex items-center gap-2 px-3 border-r border-border shrink-0 hover:bg-surface/40 transition-colors duration-150"
        >
          <span className="label-ops">Skill</span>
          <span className={`font-mono text-[10px] text-slate-600 transition-transform duration-150 ${skillsOpen ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </button>

        {skillsOpen ? (
          /* Scrollable chips — allows overflow on narrow screens */
          <div className="flex items-center gap-px p-1.5 overflow-x-auto">
            {SKILLS.map(skill => {
              const isActive = skill.id === selectedSkill
              return (
                <button
                  key={skill.id}
                  onClick={() => setSelectedSkill(isActive ? null : skill.id)}
                  title={isActive ? 'Click to deselect' : skill.hint}
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
        ) : (
          /* Collapsed: compact active skill indicator (or "none") */
          <div className="flex items-center gap-2 px-3 py-1.5">
            {activeSkill ? (
              <>
                <span className="font-mono text-[12px] leading-none text-agent/70">{activeSkill.icon}</span>
                <span className="font-mono text-[10px] text-agent/60 tracking-wider uppercase">{activeSkill.label}</span>
                <span className="font-mono text-[10px] text-slate-800">·</span>
                <span className="font-mono text-[10px] text-slate-700">use @{activeSkill.file}</span>
              </>
            ) : (
              <span className="font-mono text-[10px] text-slate-700 italic">no skill — raw prompt</span>
            )}
          </div>
        )}
      </div>

      {/* ── Active skill hint bar (only when expanded and a skill is selected) ── */}
      {skillsOpen && activeSkill && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border bg-void/30">
          <span className="font-mono text-[10px] text-agent/60">{activeSkill.icon}</span>
          <span className="font-mono text-[10px] text-agent/50 select-none">
            use @{activeSkill.file}
          </span>
          <span className="font-mono text-[10px] text-slate-800">·</span>
          <span className="font-mono text-[10px] text-slate-700 italic">
            {activeSkill.hint}
          </span>
        </div>
      )}

      {/* ── Textarea ── */}
      <div className="relative">
        <textarea
          value={taskText}
          onChange={e => setTaskText(e.target.value)}
          onKeyDown={e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canExecute) {
              e.preventDefault()
              void handleSubmit()
            }
          }}
          placeholder={activeSkill ? `Describe the task for this agent using the ${activeSkill.label} skill…` : 'Describe the task for this agent…'}
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

      {/* ── Submit error ── */}
      {submitError && (
        <div className="px-4 py-1.5 border-b border-danger/30 bg-danger/5">
          <span className="font-mono text-[10px] text-danger/80">{submitError}</span>
        </div>
      )}

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
            onClick={() => void handleSubmit()}
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
            {submitting ? 'Sending…' : 'Send ▶'}
          </button>
        </div>
      </div>
    </div>
  )
}
