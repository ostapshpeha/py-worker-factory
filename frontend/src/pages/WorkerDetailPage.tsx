import { useState, useEffect, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { PageLayout } from '../components/layout/PageLayout'
import { getWorker, stopWorker, startWorker, deleteWorker } from '../lib/api'
import type { Worker, WorkerStatus } from '../types'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_DOT: Record<WorkerStatus, string> = {
  BUSY:     'bg-info info-glow',
  IDLE:     'bg-agent agent-glow',
  STARTING: 'bg-warning warning-glow animate-pulse',
  OFFLINE:  'bg-slate-700',
}

const STATUS_BADGE: Record<WorkerStatus, string> = {
  BUSY:     'text-info    border-info/40',
  IDLE:     'text-agent   border-agent/40',
  STARTING: 'text-warning border-warning/40',
  OFFLINE:  'text-slate-600 border-slate-800',
}

export function WorkerDetailPage() {
  const { workerId } = useParams<{ workerId: string }>()
  const navigate = useNavigate()
  const workerIdNum = workerId ? parseInt(workerId, 10) : NaN

  const [worker, setWorker]   = useState<Worker | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionBusy, setActionBusy]   = useState(false)

  const load = useCallback(async () => {
    if (isNaN(workerIdNum)) { setError('Invalid worker ID'); setLoading(false); return }
    try {
      setWorker(await getWorker(workerIdNum))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load worker')
    } finally {
      setLoading(false)
    }
  }, [workerIdNum])

  useEffect(() => { void load() }, [load])

  async function handleToggle() {
    if (!worker || actionBusy) return
    setActionBusy(true)
    setActionError(null)
    try {
      if (worker.status === 'OFFLINE') await startWorker(worker.id)
      else await stopWorker(worker.id)
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionBusy(false)
    }
  }

  async function handleDelete() {
    if (!worker || actionBusy) return
    setActionBusy(true)
    setActionError(null)
    try {
      await deleteWorker(worker.id)
      navigate('/')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Delete failed')
      setActionBusy(false)
    }
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="flex-1 flex items-center justify-center">
          <span className="font-mono text-[10px] text-slate-700 uppercase tracking-widest animate-pulse">
            loading…
          </span>
        </div>
      </PageLayout>
    )
  }

  if (error || !worker) {
    return (
      <PageLayout>
        <div className="flex-1 flex items-center justify-center">
          <p className="font-mono text-[11px] text-slate-700 uppercase tracking-widest">
            {error ?? 'worker not found'}
          </p>
        </div>
      </PageLayout>
    )
  }

  const canToggle  = worker.status === 'IDLE' || worker.status === 'OFFLINE'
  const isActive   = worker.status !== 'OFFLINE'
  const activeTask = worker.tasks?.find(t => t.status === 'PROCESSING')
  const completedCount = worker.tasks?.filter(t => t.status === 'COMPLETED').length ?? 0
  const failedCount    = worker.tasks?.filter(t => t.status === 'FAILED').length    ?? 0

  return (
    <PageLayout activeWorkerId={workerIdNum}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-border bg-surface/30 shrink-0">
        <Link
          to="/"
          className="font-mono text-[10px] text-slate-600 hover:text-slate-300 transition-colors uppercase tracking-widest"
        >
          ← Dashboard
        </Link>
        <span className="text-slate-700 font-mono text-[10px]">/</span>
        <span className="label-ops">Worker</span>
        <span className="text-slate-700 font-mono text-[10px]">/</span>
        <span className="font-mono text-[11px] text-slate-300">{worker.name}</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 max-w-xl space-y-px">

          {/* Identity */}
          <div className="border border-border bg-surface/30 p-5 flex items-start gap-4">
            <div className="w-12 h-12 border border-border-bright bg-void flex items-center justify-center shrink-0">
              <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[worker.status]}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <p className="font-mono text-sm font-semibold text-slate-100">{worker.name}</p>
                <span className={`font-mono text-[9px] font-semibold tracking-wider px-1.5 py-px border ${STATUS_BADGE[worker.status]}`}>
                  {worker.status}
                </span>
              </div>
              <p className="font-mono text-[11px] text-slate-500 mt-0.5">#{worker.id}</p>
              {activeTask && (
                <p className="font-mono text-[10px] text-slate-600 mt-1 truncate">
                  ▸ {activeTask.prompt}
                </p>
              )}
            </div>
          </div>

          {/* Details */}
          <Section title="Details">
            <Row label="VNC port"  value={worker.vnc_port ? `:${worker.vnc_port}` : '—'} />
            <Row label="Created"   value={worker.created_at ? formatDate(worker.created_at) : '—'} />
            <Row label="Status"    value={worker.status} />
          </Section>

          {/* Activity */}
          <Section title="Activity">
            <Row label="Tasks completed" value={String(completedCount)} />
            <Row label="Tasks total"     value={String(worker.tasks?.length ?? 0)} />
            <Row label="Failed tasks"    value={String(failedCount)} dim={failedCount > 0} />
          </Section>

          {/* Navigation */}
          <Section title="Data">
            <div className="flex items-center gap-2 py-2.5">
              <Link
                to={`/workers/${worker.id}/tasks`}
                className="font-mono text-[10px] text-slate-500 hover:text-slate-200 px-3 py-1.5 border border-border hover:border-border-bright transition-colors"
              >
                ≡ Task History
              </Link>
              <Link
                to={`/workers/${worker.id}/screenshots`}
                className="font-mono text-[10px] text-slate-500 hover:text-slate-200 px-3 py-1.5 border border-border hover:border-border-bright transition-colors"
              >
                ⊙ Screenshots
              </Link>
            </div>
          </Section>

          {/* Controls */}
          <Section title="Controls">
            <div className="flex flex-col gap-2 py-2.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void handleToggle()}
                  disabled={!canToggle || actionBusy}
                  className={`
                    font-mono text-[10px] tracking-widest uppercase px-3 py-1.5 border
                    transition-colors duration-150
                    disabled:opacity-30 disabled:cursor-not-allowed
                    ${isActive
                      ? 'border-warning/40 text-warning hover:bg-warning/8 hover:border-warning'
                      : 'border-agent/40  text-agent  hover:bg-agent/8  hover:border-agent'
                    }
                  `}
                >
                  {actionBusy ? '…' : isActive ? '⏹ Stop Worker' : '▷ Start Worker'}
                </button>
                {worker.status === 'BUSY' && (
                  <span className="font-mono text-[10px] text-slate-700">busy — cannot stop</span>
                )}
              </div>
              {actionError && (
                <p className="font-mono text-[10px] text-danger/80">{actionError}</p>
              )}
            </div>
          </Section>

          {/* Danger zone */}
          <Section title="Danger Zone">
            <div className="flex items-center justify-between py-1">
              <span className="font-mono text-[11px] text-slate-400">
                Permanently remove this worker and its container
              </span>
              <button
                onClick={() => void handleDelete()}
                disabled={actionBusy}
                className="font-mono text-[10px] tracking-widest uppercase px-3 py-1.5 border border-danger/40 text-danger hover:bg-danger/8 hover:border-danger transition-colors duration-150 disabled:opacity-30"
              >
                Delete
              </button>
            </div>
          </Section>

        </div>
      </div>
    </PageLayout>
  )
}

// ── Helpers ───────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border bg-surface/20">
      <div className="px-4 py-2 border-b border-border bg-void/30">
        <span className="label-ops">{title}</span>
      </div>
      <div className="px-4 py-1 divide-y divide-border/50">
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, dim = false }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="font-mono text-[10px] text-slate-600 uppercase tracking-wider shrink-0">
        {label}
      </span>
      <span className={`font-mono text-[11px] text-right break-all ${dim ? 'text-danger/70' : 'text-slate-300'}`}>
        {value}
      </span>
    </div>
  )
}
