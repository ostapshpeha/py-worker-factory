import { useState, useCallback } from 'react'
import type { Worker, WorkerStatus } from '../../types'

// ── Bezel corner markers ──────────────────────────────────────────
function CornerMarkers() {
  // Each marker is an L-shape; we rotate it per corner
  const corners = [
    { pos: 'top-0 left-0',     rotate: '' },
    { pos: 'top-0 right-0',    rotate: 'rotate-90' },
    { pos: 'bottom-0 right-0', rotate: 'rotate-180' },
    { pos: 'bottom-0 left-0',  rotate: '-rotate-90' },
  ]
  return (
    <>
      {corners.map(({ pos, rotate }, i) => (
        <div key={i} className={`absolute ${pos} ${rotate} w-4 h-4 z-10 pointer-events-none`}>
          <div className="absolute top-0 left-0 w-full h-px bg-border-bright" />
          <div className="absolute top-0 left-0 w-px h-full bg-border-bright" />
        </div>
      ))}
    </>
  )
}

// ── Screen state components ───────────────────────────────────────

function InitializingScreen({ workerName }: { workerName: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
      {/* Animated bar-chart waveform */}
      <div className="flex items-end gap-[3px]">
        {[14, 22, 10, 28, 16, 20, 12, 24, 18].map((h, i) => (
          <div
            key={i}
            className="w-[3px] bg-warning animate-pulse"
            style={{ height: h, animationDelay: `${i * 80}ms`, animationDuration: '1.2s' }}
          />
        ))}
      </div>
      <div className="text-center space-y-1.5">
        <p className="font-mono text-xs text-warning tracking-[0.2em] uppercase">
          Initializing {workerName}
        </p>
        <p className="font-mono text-[10px] text-slate-700">
          OpenInterpreter starting — 3–4 min
        </p>
      </div>
    </div>
  )
}

function OfflineScreen() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center space-y-3">
        {/* No-signal bars */}
        <div className="flex items-end gap-1 justify-center opacity-20">
          {[6, 10, 14, 18, 22].map((h, i) => (
            <div key={i} className="w-2 bg-slate-600" style={{ height: h }} />
          ))}
        </div>
        <p className="font-mono text-[10px] text-slate-700 uppercase tracking-widest">
          no signal
        </p>
      </div>
    </div>
  )
}

function ActiveScreen({ worker }: { worker: Worker }) {
  return (
    <div className="absolute inset-0 bg-[#060A0E]">
      {/* Simulated desktop wallpaper grid */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(42,63,88,0.6) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Simulated browser window */}
      <div className="absolute inset-4 border border-border-bright/30 bg-surface/10 flex flex-col">
        {/* Fake browser bar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60 bg-void/60 shrink-0">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-danger/40" />
            <div className="w-2 h-2 rounded-full bg-warning/40" />
            <div className="w-2 h-2 rounded-full bg-agent/30" />
          </div>
          <div className="flex-1 bg-void/60 border border-border/60 px-2 py-0.5">
            <span className="font-mono text-[9px] text-slate-700 truncate block">
              https://target-site.com/products
            </span>
          </div>
        </div>

        {/* Fake page content */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="space-y-2 opacity-40">
            {[90, 70, 85, 55, 75].map((w, i) => (
              <div
                key={i}
                className="h-px bg-slate-600"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        </div>

        {/* KasmVNC label */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/40 bg-void/60 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-info animate-pulse" />
            <span className="font-mono text-[9px] text-slate-600">
              {worker.name} · KasmVNC
            </span>
          </div>
          <span className="font-mono text-[9px] text-slate-700">:{worker.vnc_port}</span>
        </div>
      </div>

      {/* Current task overlay ribbon at bottom of screen */}
      {(() => {
        const activeTask = worker.tasks?.find(t => t.status === 'PROCESSING')
        return activeTask ? (
          <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-4 py-2 bg-void/90 border-t border-info/20 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-info info-glow animate-pulse shrink-0" />
            <p className="font-mono text-[10px] text-slate-400 truncate">
              {activeTask.prompt}
            </p>
          </div>
        ) : null
      })()}
    </div>
  )
}

function IdleScreen({ worker }: { worker: Worker }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="w-12 h-12 border border-border-bright flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-agent agent-glow" />
        </div>
        {/* Pulse ring */}
        <div className="absolute inset-0 border border-agent/20 animate-ping" />
      </div>
      <div className="text-center space-y-1">
        <p className="font-mono text-xs text-agent tracking-widest uppercase">Ready</p>
        <p className="font-mono text-[10px] text-slate-700">{worker.name} awaiting task</p>
      </div>
    </div>
  )
}

// ── Status LED ────────────────────────────────────────────────────
const STATUS_LED: Record<WorkerStatus, string> = {
  BUSY:     'bg-info info-glow',
  IDLE:     'bg-agent agent-glow',
  STARTING: 'bg-warning warning-glow animate-pulse',
  OFFLINE:  'bg-slate-700',
}
const STATUS_TEXT: Record<WorkerStatus, string> = {
  BUSY:     'text-info',
  IDLE:     'text-agent',
  STARTING: 'text-warning',
  OFFLINE:  'text-slate-600',
}

// ── LiveViewBezel ─────────────────────────────────────────────────
interface LiveViewBezleProps {
  worker: Worker
  onCapture?: () => Promise<void>
  lastScreenshotUrl?: string
}

export function LiveViewBezel({ worker, onCapture, lastScreenshotUrl }: LiveViewBezleProps) {
  const canCapture = worker.status === 'BUSY' || worker.status === 'IDLE'

  const [capturing, setCapturing] = useState(false)
  const [cooldown,  setCooldown]  = useState(false)
  const [captureError, setCaptureError] = useState<string | null>(null)

  const handleCapture = useCallback(async () => {
    if (!canCapture || capturing || cooldown || !onCapture) return
    setCapturing(true)
    setCaptureError(null)
    try {
      await onCapture()
      setCooldown(true)
      setTimeout(() => setCooldown(false), 30_000)
    } catch (err) {
      setCaptureError(err instanceof Error ? err.message : 'Capture failed')
    } finally {
      setCapturing(false)
    }
  }, [canCapture, capturing, cooldown, onCapture])

  return (
    <div className="w-full">
      {/* Outer bezel shell — mimics an industrial rack-mount monitor */}
      <div
        className="border border-border-bright"
        style={{
          background: 'linear-gradient(160deg, #1A2235 0%, #0D1520 55%, #111827 100%)',
          boxShadow: '0 16px 56px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(255,255,255,0.025)',
        }}
      >
        {/* Bezel padding around the screen */}
        <div className="p-2.5 pb-0">
          {/* The screen itself — 16:9 */}
          <div
            className="relative w-full overflow-hidden bg-void scanlines"
            style={{
              aspectRatio: '1280 / 1024',
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.7), inset 0 2px 12px rgba(0,0,0,0.5)',
            }}
          >
            {/* Real screenshot when available, otherwise state placeholder */}
            {lastScreenshotUrl ? (
              <img
                src={lastScreenshotUrl}
                alt="Worker desktop"
                className="absolute inset-0 w-full h-full object-contain bg-void"
              />
            ) : (
              <>
                {worker.status === 'STARTING' && <InitializingScreen workerName={worker.name} />}
                {worker.status === 'OFFLINE'  && <OfflineScreen />}
                {worker.status === 'IDLE'     && <IdleScreen worker={worker} />}
                {worker.status === 'BUSY'     && <ActiveScreen worker={worker} />}
              </>
            )}

            {/* Corner markers — sit above content */}
            <CornerMarkers />

            {/* Screen vignette — edge darkening for screen-like depth */}
            <div
              className="absolute inset-0 pointer-events-none z-[5]"
              style={{
                background:
                  'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)',
              }}
            />
          </div>
        </div>

        {/* Capture error strip */}
        {captureError && (
          <div className="px-4 py-1.5 mt-2.5 border-t border-danger/30 bg-danger/5">
            <span className="font-mono text-[10px] text-danger/80">{captureError}</span>
          </div>
        )}

        {/* Bottom label strip — part of the bezel */}
        <div className={`flex items-center justify-between px-4 py-3 border-t border-border gap-4 ${captureError ? '' : 'mt-2.5'}`}>

          {/* Left: status + worker info */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_LED[worker.status]}`} />
              <span className={`font-mono text-[10px] font-semibold tracking-wider ${STATUS_TEXT[worker.status]}`}>
                {worker.status}
              </span>
            </div>
            <div className="w-px h-3 bg-border-bright shrink-0" />
            <span className="font-mono text-[10px] text-slate-400 truncate">{worker.name}</span>
            <span className="font-mono text-[10px] text-slate-700 shrink-0 hidden sm:block">
              vnc :{worker.vnc_port}
            </span>
          </div>

          {/* Right: capture button */}
          <button
            onClick={handleCapture}
            disabled={!canCapture || capturing || cooldown}
            className={`
              shrink-0 flex items-center gap-2
              font-mono text-xs font-medium tracking-widest uppercase
              px-4 py-2 border
              transition-all duration-200
              ${capturing
                ? 'text-info border-info/60 bg-info/8 cursor-wait'
                : cooldown
                ? 'text-slate-600 border-slate-800 bg-transparent cursor-not-allowed'
                : canCapture
                ? 'text-slate-200 border-border-bright bg-surface/60 hover:border-info/70 hover:text-info hover:bg-info/8 hover:shadow-[0_0_14px_rgba(56,189,248,0.12)]'
                : 'text-slate-700 border-slate-800 bg-transparent cursor-not-allowed'
              }
            `}
          >
            {/* Icon */}
            <span className={`text-sm leading-none ${capturing ? 'animate-pulse' : ''}`}>
              ⊙
            </span>

            {/* Label */}
            <span>
              {capturing ? 'Capturing…' : cooldown ? 'Cooldown' : 'Capture'}
            </span>

            {/* Cooldown countdown badge */}
            {cooldown && (
              <span className="font-mono text-[9px] text-slate-700">30s</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Empty state (no worker selected) ─────────────────────────────
export function LiveViewEmpty() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      {/* Nested frame motif */}
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 border border-border-bright" />
        <div className="absolute inset-3 border border-border opacity-50" />
        <div className="absolute inset-6 border border-border opacity-25" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <p className="label-ops">No active session</p>
        <p className="font-mono text-[10px] text-slate-700">
          select a worker from the sidebar
        </p>
      </div>
    </div>
  )
}
