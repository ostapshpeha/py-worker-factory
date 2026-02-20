import { useState, useRef } from 'react'
import type { Worker } from '../../types'
import { WorkerCard } from '../workers/WorkerCard'

interface SidebarProps {
  workers: Worker[]
  selectedWorker: Worker | null
  isOpen: boolean
  onSelectWorker: (worker: Worker) => void
  onToggleWorker?: (id: number) => void
  onDeleteWorker?: (id: number) => void
  onSpawnWorker?: (name: string) => Promise<void>
}

export function Sidebar({ workers, selectedWorker, isOpen, onSelectWorker, onToggleWorker, onDeleteWorker, onSpawnWorker }: SidebarProps) {
  const activeCount = workers.filter(w => w.status !== 'OFFLINE').length

  const [spawning, setSpawning]   = useState(false)
  const [spawnName, setSpawnName] = useState('')
  const [spawnBusy, setSpawnBusy] = useState(false)
  const [spawnError, setSpawnError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function openSpawnForm() {
    setSpawnName('')
    setSpawnError(null)
    setSpawning(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  async function handleSpawn() {
    const name = spawnName.trim()
    if (!name || !onSpawnWorker) return
    setSpawnBusy(true)
    setSpawnError(null)
    try {
      await onSpawnWorker(name)
      setSpawning(false)
      setSpawnName('')
    } catch (err) {
      setSpawnError(err instanceof Error ? err.message : 'Failed to spawn worker')
    } finally {
      setSpawnBusy(false)
    }
  }

  return (
    <aside
      className={`
        absolute inset-y-0 left-0 z-30
        flex flex-col w-60 bg-void border-r border-border
        transition-transform duration-200 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:static lg:translate-x-0 lg:transition-none
      `}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <span className="label-ops">Workers</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-slate-600">{activeCount} active</span>
          <span className="font-mono text-[10px] text-slate-700">·</span>
          <span className="font-mono text-[10px] text-slate-700">{workers.length}/3</span>
        </div>
      </div>

      {/* ── Worker list ── */}
      <div className="flex-1 overflow-y-auto">
        {workers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-10 h-10 border border-border-bright flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
            </div>
            <p className="font-mono text-[10px] text-slate-700 uppercase tracking-widest">
              no workers
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {workers.map(worker => (
              <WorkerCard
                key={worker.id}
                worker={worker}
                isSelected={selectedWorker?.id === worker.id}
                onClick={() => onSelectWorker(worker)}
                onToggle={onToggleWorker ? () => onToggleWorker(worker.id) : undefined}
                onDelete={onDeleteWorker ? () => onDeleteWorker(worker.id) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer: spawn ── */}
      <div className="p-3 border-t border-border shrink-0 space-y-2">
        {spawning ? (
          <>
            <input
              ref={inputRef}
              value={spawnName}
              onChange={e => setSpawnName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') void handleSpawn()
                if (e.key === 'Escape') setSpawning(false)
              }}
              placeholder="worker name…"
              className="
                w-full bg-void border border-border-bright
                font-mono text-[11px] text-slate-200 placeholder:text-slate-700
                px-3 py-1.5 focus:outline-none focus:border-agent/60
              "
            />
            {spawnError && (
              <p className="font-mono text-[10px] text-danger/80">{spawnError}</p>
            )}
            <div className="flex gap-1.5">
              <button
                onClick={() => void handleSpawn()}
                disabled={!spawnName.trim() || spawnBusy}
                className="
                  flex-1 py-1.5 font-mono text-[10px] tracking-widest uppercase
                  text-agent border border-agent/50
                  hover:border-agent hover:bg-agent/5
                  disabled:opacity-30 disabled:cursor-not-allowed
                  transition-colors duration-150
                "
              >
                {spawnBusy ? 'Spawning…' : 'Confirm'}
              </button>
              <button
                onClick={() => setSpawning(false)}
                disabled={spawnBusy}
                className="
                  px-3 py-1.5 font-mono text-[10px] text-slate-600
                  border border-border hover:border-slate-600
                  transition-colors duration-150
                "
              >
                ✕
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              onClick={openSpawnForm}
              disabled={workers.length >= 3}
              className="
                w-full py-2 px-4
                font-mono text-[11px] tracking-widest uppercase
                text-agent border border-agent-dark
                hover:border-agent hover:bg-agent/5
                active:bg-agent/10
                disabled:opacity-30 disabled:cursor-not-allowed
                transition-colors duration-150
              "
            >
              + Spawn Worker
            </button>
            {workers.length >= 3 && (
              <p className="font-mono text-[9px] text-slate-700 text-center tracking-widest uppercase">
                max workers reached
              </p>
            )}
          </>
        )}
      </div>
    </aside>
  )
}
