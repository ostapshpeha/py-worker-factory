import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { TaskHistoryPage } from './pages/TaskHistoryPage'
import { ScreenshotGalleryPage } from './pages/ScreenshotGalleryPage'
import { WorkerDetailPage } from './pages/WorkerDetailPage'
import { ProfilePage } from './pages/ProfilePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

// ── Route guards ───────────────────────────────────────────────────

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <LoadingScreen />
  if (isAuthenticated) return <Navigate to="/" replace />
  return <>{children}</>
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-abyss flex items-center justify-center">
      <span className="font-mono text-[10px] text-slate-700 uppercase tracking-widest animate-pulse">
        initializing…
      </span>
    </div>
  )
}

// ── App ────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public only */}
          <Route path="/login"    element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />

          {/* Protected */}
          <Route path="/"                              element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>} />
          <Route path="/workers/:workerId"             element={<ProtectedRoute><WorkerDetailPage /></ProtectedRoute>} />
          <Route path="/workers/:workerId/tasks"       element={<ProtectedRoute><TaskHistoryPage /></ProtectedRoute>} />
          <Route path="/workers/:workerId/screenshots" element={<ProtectedRoute><ScreenshotGalleryPage /></ProtectedRoute>} />
          <Route path="/profile"                       element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
