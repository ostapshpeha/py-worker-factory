import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Worker } from '../../types'
import { getWorkers, getWorker } from '../../lib/api'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'

interface PageLayoutProps {
  children: React.ReactNode
  /** Worker to highlight as selected in the sidebar */
  activeWorkerId?: number
}

async function fetchAllWorkers(): Promise<Worker[]> {
  const summaries = await getWorkers()
  if (summaries.length === 0) return []
  return Promise.all(summaries.map(s => getWorker(s.id)))
}

export function PageLayout({ children, activeWorkerId }: PageLayoutProps) {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [workers, setWorkers]         = useState<Worker[]>([])

  useEffect(() => {
    fetchAllWorkers().then(setWorkers).catch(() => {/* silent */})
  }, [])

  const selectedWorker = workers.find(w => w.id === activeWorkerId) ?? null

  const handleSelectWorker = useCallback((worker: Worker) => {
    setSidebarOpen(false)
    navigate('/', { state: { workerId: worker.id } })
  }, [navigate])

  return (
    <div className="flex flex-col h-screen bg-abyss overflow-hidden">
      <TopBar
        workers={workers}
        sidebarOpen={sidebarOpen}
        onMenuToggle={() => setSidebarOpen(p => !p)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile backdrop */}
        <div
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
          className={`
            fixed inset-0 z-20 bg-void/75 backdrop-blur-[1px] lg:hidden
            transition-opacity duration-200
            ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
          `}
        />

        <Sidebar
          workers={workers}
          selectedWorker={selectedWorker}
          isOpen={sidebarOpen}
          onSelectWorker={handleSelectWorker}
        />

        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
