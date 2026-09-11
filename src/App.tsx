import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import UploadPage from './pages/UploadPage'
import AnalyzePage from './pages/AnalyzePage'
import DesignPage from './pages/DesignPage'
import FormatPage from './pages/FormatPage'
import PreviewPage from './pages/PreviewPage'
import ExportPage from './pages/ExportPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/upload" element={<UploadPage />} />
      <Route path="/analyze" element={<AnalyzePage />} />
      <Route path="/design" element={<DesignPage />} />
      <Route path="/format" element={<FormatPage />} />
      <Route path="/preview" element={<PreviewPage />} />
      <Route path="/export" element={<ExportPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
