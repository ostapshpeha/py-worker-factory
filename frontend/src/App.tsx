import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { TaskHistoryPage } from './pages/TaskHistoryPage'
import { ScreenshotGalleryPage } from './pages/ScreenshotGalleryPage'
import { ProfilePage } from './pages/ProfilePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                               element={<DashboardLayout />} />
        <Route path="/workers/:workerId/tasks"        element={<TaskHistoryPage />} />
        <Route path="/workers/:workerId/screenshots"  element={<ScreenshotGalleryPage />} />
        <Route path="/profile"                        element={<ProfilePage />} />
      </Routes>
    </BrowserRouter>
  )
}
