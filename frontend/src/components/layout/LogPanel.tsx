import { useRef, useEffect, useCallback, useState } from 'react'

interface LogPanelProps {
  logs?:       string | null
  result?:     string | null
  taskPrompt?: string | null
  workerName?: string
}

export function LogPanel({ logs, result, taskPrompt, workerName }: LogPanelProps) {
  const scrollRef     = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const [showJumpBtn, setShowJumpBtn] = useState(false)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 64
    isAtBottomRef.current = atBottom
    setShowJumpBtn(!atBottom)
  }, [])

  // Auto-scroll on new content if already at bottom
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !isAtBottomRef.current) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [logs, result])

  // Jump to bottom on worker change
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    isAtBottomRef.current = true
    setShowJumpBtn(false)
  }, [workerName])

  const jumpToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [])

  const logLines = logs ? logs.split('\n').filter(l => l.trim()) : []
  const hasContent = logLines.length > 0 || result

  return (
    <aside className="w-80 bg-void border-l border-border flex flex-col shrink-0">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <span className="label-ops">Task Output</span>
        {workerName && (
          <span className="font-mono text-[10px] text-slate-700">{workerName}</span>
        )}
      </div>

      {/* ── Task prompt ── */}
      {taskPrompt && (
        <div className="px-4 py-2 border-b border-border bg-surface/20 shrink-0">
          <p className="font-mono text-[10px] text-slate-600 truncate" title={taskPrompt}>
            ▸ {taskPrompt}
          </p>
        </div>
      )}

      {/* ── Scrollable content ── */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto p-3"
        >
          {!hasContent ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
              <div className="w-8 h-8 border border-border-bright flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-slate-700" />
              </div>
              <p className="font-mono text-[10px] text-slate-700 uppercase tracking-widest">
                awaiting task…
              </p>
            </div>
          ) : (
            <div className="space-y-[1px]">

              {/* Raw log lines */}
              {logLines.map((line, i) => (
                <div
                  key={i}
                  className="font-mono text-[10.5px] leading-[1.65] text-slate-400 hover:text-slate-300 hover:bg-surface/30 px-1 -mx-1 transition-colors break-words"
                >
                  {line}
                </div>
              ))}

              {/* Result block */}
              {result && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="font-mono text-[9px] text-agent/50 uppercase tracking-widest mb-1.5">
                    Result
                  </p>
                  <p className="font-mono text-[10.5px] leading-relaxed text-agent/80 break-words whitespace-pre-wrap">
                    {result}
                  </p>
                </div>
              )}

              {/* Terminal cursor */}
              <div className="flex gap-2 font-mono text-[10.5px] pt-1 px-1">
                <span className="text-agent opacity-75 animate-pulse select-none">█</span>
              </div>
            </div>
          )}
        </div>

        {showJumpBtn && (
          <button
            onClick={jumpToBottom}
            className="
              absolute bottom-3 right-3 z-10
              flex items-center gap-1.5
              font-mono text-[9px] tracking-widest uppercase
              px-2.5 py-1.5 border
              text-agent border-agent/40 bg-void
              hover:bg-agent/8 hover:border-agent
              transition-all duration-150
              shadow-[0_4px_12px_rgba(0,0,0,0.4)]
            "
          >
            ↓ latest
          </button>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-4 py-2 border-t border-border shrink-0">
        <span className="font-mono text-[9px] text-slate-700">
          {logLines.length > 0 ? `${logLines.length} lines` : result ? 'result only' : 'no output'}
        </span>
      </div>
    </aside>
  )
}
