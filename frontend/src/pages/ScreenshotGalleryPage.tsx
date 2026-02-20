import { useState, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageLayout } from '../components/layout/PageLayout'
import { getWorker, getScreenshots } from '../lib/api'
import type { Worker, Screenshot } from '../types'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

const GRADIENTS = [
  'linear-gradient(135deg, #0F1923 0%, #1A2C3D 50%, #0C1520 100%)',
  'linear-gradient(150deg, #0D1520 0%, #0F2030 55%, #111827 100%)',
  'linear-gradient(120deg, #111827 0%, #0A1A2A 60%, #0D1925 100%)',
  'linear-gradient(160deg, #0C1520 0%, #162233 50%, #080E18 100%)',
  'linear-gradient(140deg, #0E1B2A 0%, #1C2D3E 55%, #0A1522 100%)',
  'linear-gradient(130deg, #111827 0%, #0F2030 45%, #0D1825 100%)',
]

export function ScreenshotGalleryPage() {
  const { workerId } = useParams<{ workerId: string }>()
  const workerIdNum = workerId ? parseInt(workerId, 10) : NaN

  const [worker,      setWorker]      = useState<Worker | null>(null)
  const [screenshots, setScreenshots] = useState<Screenshot[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)

  const load = useCallback(async () => {
    if (isNaN(workerIdNum)) { setError('Invalid worker ID'); setLoading(false); return }
    try {
      const [w, s] = await Promise.all([getWorker(workerIdNum), getScreenshots(workerIdNum)])
      setWorker(w)
      setScreenshots(s)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [workerIdNum])

  useEffect(() => { void load() }, [load])

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
        <span className="label-ops">Screenshots</span>
        {worker && (
          <>
            <span className="text-slate-700 font-mono text-[10px]">/</span>
            <span className="font-mono text-[11px] text-slate-300">{worker.name}</span>
          </>
        )}
        {screenshots.length > 0 && (
          <span className="ml-auto font-mono text-[10px] text-slate-700">
            {screenshots.length} capture{screenshots.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Gallery */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="font-mono text-[10px] text-slate-700 uppercase tracking-widest animate-pulse">
              loading…
            </span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <p className="font-mono text-[11px] text-danger/70 uppercase tracking-widest">{error}</p>
          </div>
        ) : !worker ? (
          <div className="flex items-center justify-center h-full">
            <p className="font-mono text-[11px] text-slate-700 uppercase tracking-widest">Worker not found</p>
          </div>
        ) : screenshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-12 h-12 border border-border-bright flex items-center justify-center">
              <span className="font-mono text-lg text-slate-700">⊙</span>
            </div>
            <p className="font-mono text-[11px] text-slate-700 uppercase tracking-widest">
              no screenshots captured
            </p>
          </div>
        ) : (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {screenshots.map((shot, i) => {
              const gradient = GRADIENTS[i % GRADIENTS.length]

              return (
                <div
                  key={shot.id}
                  className="border border-border hover:border-border-bright transition-colors duration-150 group"
                >
                  {/* Thumbnail — 16:9 */}
                  <div
                    className="relative w-full scanlines overflow-hidden"
                    style={{ aspectRatio: '16/9', background: shot.s3_url ? undefined : gradient }}
                  >
                    {shot.s3_url ? (
                      <img
                        src={shot.s3_url}
                        alt={`Screenshot ${shot.id}`}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <>
                        {[
                          'top-0 left-0',
                          'top-0 right-0 rotate-90',
                          'bottom-0 right-0 rotate-180',
                          'bottom-0 left-0 -rotate-90',
                        ].map((pos, ci) => (
                          <div key={ci} className={`absolute ${pos} w-3 h-3 pointer-events-none`}>
                            <div className="absolute top-0 left-0 w-full h-px bg-border-bright opacity-60" />
                            <div className="absolute top-0 left-0 w-px h-full bg-border-bright opacity-60" />
                          </div>
                        ))}
                        <div className="absolute top-2 left-2 font-mono text-[9px] text-slate-700 bg-void/70 px-1.5 py-px">
                          #{String(i + 1).padStart(3, '0')}
                        </div>
                      </>
                    )}

                    {/* Hover overlay */}
                    {shot.s3_url && (
                      <a
                        href={shot.s3_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 bg-void/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
                        onClick={e => e.stopPropagation()}
                      >
                        <span className="font-mono text-[10px] text-slate-300 uppercase tracking-widest">
                          open ↗
                        </span>
                      </a>
                    )}
                  </div>

                  {/* Metadata strip */}
                  <div className="px-3 py-2 bg-void/40">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-slate-400 truncate">
                        {formatDate(shot.created_at)}
                      </span>
                      <span className="font-mono text-[9px] text-slate-700 shrink-0">#{shot.id}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
