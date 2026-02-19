import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Worker } from '../../types'
import { mockWorkers } from '../../data/mockData'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'

interface PageLayoutProps {
  children: React.ReactNode
  /** Worker to highlight as selected in the sidebar */
  activeWorkerId?: string
}

export function PageLayout({ children, activeWorkerId }: PageLayoutProps) {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const selectedWorker = mockWorkers.find(w => w.id === activeWorkerId) ?? null

  const handleSelectWorker = useCallback((worker: Worker) => {
    setSidebarOpen(false)
    navigate('/', { state: { workerId: worker.id } })
  }, [navigate])

  return (
    <div className="flex flex-col h-screen bg-abyss overflow-hidden">
      <TopBar
        workers={mockWorkers}
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
          workers={mockWorkers}
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
