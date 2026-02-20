import { useState, useCallback, useEffect } from 'react'
import type { Worker } from '../../types'
import { getWorkers, getWorker, createWorker, deleteWorker, stopWorker, startWorker, createTask, captureScreenshot, getScreenshots, getTask } from '../../lib/api'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { LogPanel } from './LogPanel'
import { LiveViewBezel, LiveViewEmpty } from '../workers/LiveViewBezel'
import { TaskInputPanel } from './TaskInputPanel'

const POLL_INTERVAL_MS = 10_000

/** Fetch all workers with full details (max 3, so N+1 requests is fine). */
async function fetchAllWorkers(): Promise<Worker[]> {
  const summaries = await getWorkers()
  if (summaries.length === 0) return []
  return Promise.all(summaries.map(s => getWorker(s.id)))
}

export function DashboardLayout() {
  const [sidebarOpen,  setSidebarOpen]  = useState(false)
  const [logPanelOpen, setLogPanelOpen] = useState(false)
  const [workers, setWorkers]           = useState<Worker[]>([])
  const [selectedId, setSelectedId]     = useState<number | null>(null)
  const [fetchError, setFetchError]         = useState<string | null>(null)
  const [lastScreenshotUrl, setLastScreenshotUrl] = useState<string | undefined>(undefined)
  const [taskLogs,   setTaskLogs]   = useState<string | null>(null)
  const [taskResult, setTaskResult] = useState<string | null>(null)
  const [taskPrompt, setTaskPrompt] = useState<string | null>(null)

  const toggleSidebar  = useCallback(() => setSidebarOpen(prev => !prev), [])
  const closeSidebar   = useCallback(() => setSidebarOpen(false), [])
  const toggleLogPanel = useCallback(() => setLogPanelOpen(prev => !prev), [])

  // Derived: keep selectedWorker in sync with workers array
  const selectedWorker = workers.find(w => w.id === selectedId) ?? null

  // ── Fetch & poll ───────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const fresh = await fetchAllWorkers()
      setWorkers(fresh)
      setFetchError(null)
      // Auto-select first worker if none selected yet
      setSelectedId(prev => prev ?? (fresh[0]?.id ?? null))
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load workers')
    }
  }, [])

  useEffect(() => {
    void refresh()
    const id = setInterval(() => void refresh(), POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [refresh])

  // ── Fetch most recent task output whenever worker state updates ──
  useEffect(() => {
    const tasks = selectedWorker?.tasks
    if (!tasks?.length) { setTaskLogs(null); setTaskResult(null); setTaskPrompt(null); return }
    // Sort newest-first (selectinload returns unordered)
    const recent = [...tasks].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
    let cancelled = false
    getTask(recent.id)
      .then(t => { if (!cancelled) { setTaskLogs(t.logs); setTaskResult(t.result); setTaskPrompt(t.prompt) } })
      .catch(() => {})
    return () => { cancelled = true }
  }, [selectedWorker])

  // ── Load last screenshot when selected worker changes ─────────
  useEffect(() => {
    if (!selectedId) { setLastScreenshotUrl(undefined); return }
    getScreenshots(selectedId)
      .then(shots => setLastScreenshotUrl(shots[0]?.s3_url || undefined))
      .catch(() => setLastScreenshotUrl(undefined))
  }, [selectedId])

  // ── Actions ────────────────────────────────────────────────────

  const handleSelectWorker = useCallback((worker: Worker) => {
    setSelectedId(worker.id)
    closeSidebar()
  }, [closeSidebar])

  const handleToggleWorker = useCallback(async (id: number) => {
    const worker = workers.find(w => w.id === id)
    if (!worker) return
    try {
      if (worker.status === 'OFFLINE') {
        await startWorker(id)
      } else {
        await stopWorker(id)
      }
      await refresh()
    } catch {
      // Error surfaced in WorkerCard via re-render; silent here
    }
  }, [workers, refresh])

  const handleDeleteWorker = useCallback(async (id: number) => {
    try {
      await deleteWorker(id)
      if (selectedId === id) setSelectedId(null)
      await refresh()
    } catch {
      // Silent; polling will re-sync state
    }
  }, [selectedId, refresh])

  const handleSpawnWorker = useCallback(async (name: string) => {
    const created = await createWorker(name)
    // Show the VNC password once — it's not stored after this
    if (created.vnc_password) {
      alert(`Worker created!\n\nVNC password (save this — shown only once):\n${created.vnc_password}`)
    }
    await refresh()
    setSelectedId(created.id)
  }, [refresh])

  const handleSubmitTask = useCallback(async (prompt: string) => {
    if (!selectedWorker) return
    await createTask(selectedWorker.id, prompt)
    await refresh()
  }, [selectedWorker, refresh])

  const handleCapture = useCallback(async () => {
    if (!selectedWorker) return
    const shot = await captureScreenshot(selectedWorker.id)
    setLastScreenshotUrl(shot.s3_url)
  }, [selectedWorker])

  return (
    <div className="flex flex-col h-screen bg-abyss overflow-hidden">
      <TopBar
        workers={workers}
        sidebarOpen={sidebarOpen}
        logPanelOpen={logPanelOpen}
        onMenuToggle={toggleSidebar}
        onLogPanelToggle={toggleLogPanel}
      />

      <div className="flex flex-1 overflow-hidden relative">

        {/* Mobile backdrop */}
        <div
          aria-hidden="true"
          onClick={closeSidebar}
          className={`
            fixed inset-0 z-20 bg-void/75 backdrop-blur-[1px] lg:hidden
            transition-opacity duration-200
            ${sidebarOpen
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none'
            }
          `}
        />

        <Sidebar
          workers={workers}
          selectedWorker={selectedWorker}
          isOpen={sidebarOpen}
          onSelectWorker={handleSelectWorker}
          onToggleWorker={id => void handleToggleWorker(id)}
          onDeleteWorker={id => void handleDeleteWorker(id)}
          onSpawnWorker={handleSpawnWorker}
        />

        {/* ── Main content column ── */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Panel toolbar */}
          <div className="flex items-center justify-between px-5 py-2.5 bg-surface/30 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <span className="label-ops">Live View</span>
              {selectedWorker && (
                <>
                  <span className="text-slate-700 font-mono text-[10px]">/</span>
                  <span className="font-mono text-[11px] text-slate-300 font-medium">
                    {selectedWorker.name}
                  </span>
                </>
              )}
            </div>

            {selectedWorker && (
              <div className="flex items-center gap-3">
                {fetchError && (
                  <span className="font-mono text-[10px] text-danger/70">{fetchError}</span>
                )}
                {selectedWorker.vnc_port && (
                  <span className="font-mono text-[10px] text-slate-700 hidden sm:block">
                    vnc :{selectedWorker.vnc_port}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── Scrollable canvas ── */}
          {selectedWorker ? (
            <div className="flex-1 overflow-y-auto">
              <div className="grid-bg min-h-full">
                <div className="p-5 flex flex-col gap-4">
                  <LiveViewBezel
                    worker={selectedWorker}
                    onCapture={handleCapture}
                    lastScreenshotUrl={lastScreenshotUrl}
                  />
                  <TaskInputPanel
                    worker={selectedWorker}
                    onSubmitTask={handleSubmitTask}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 grid-bg scanlines relative flex items-center justify-center">
              {fetchError ? (
                <p className="font-mono text-[11px] text-danger/70 uppercase tracking-widest">
                  {fetchError}
                </p>
              ) : (
                <LiveViewEmpty />
              )}
            </div>
          )}
        </main>

        {/* ── Log panel ── */}
        <div className={`shrink-0 hidden ${logPanelOpen ? 'sm:flex' : ''} xl:flex`}>
          <LogPanel
            logs={taskLogs}
            result={taskResult}
            taskPrompt={taskPrompt}
            workerName={selectedWorker?.name}
          />
        </div>

      </div>
    </div>
  )
}
