import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import LoginPage from '@/pages/Login/LoginPage'
import PDVPage from '@/pages/PDV/PDVPage'
import DashboardPage from '@/pages/Dashboard/DashboardPage'
import EstoquePage from '@/pages/Estoque/EstoquePage'
import CaixaPage from '@/pages/Caixa/CaixaPage'
import RelatoriosPage from '@/pages/Relatorios/RelatoriosPage'
import AuditoriaPage from '@/pages/Auditoria/AuditoriaPage'
import ConfiguracoesPage from '@/pages/Configuracoes/ConfiguracoesPage'
import AdminCentralPage from '@/pages/Admin/AdminCentralPage'
import DocsPage from '@/pages/Docs/DocsPage'
import ComprasPage from '@/pages/Compras/ComprasPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/pdv" element={<PDVPage />} />
          <Route path="/estoque" element={<EstoquePage />} />
          <Route path="/caixa" element={<CaixaPage />} />
          <Route path="/compras" element={<ComprasPage />} />
          <Route path="/relatorios" element={<RelatoriosPage />} />
          <Route path="/auditoria" element={<AuditoriaPage />} />
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
          <Route path="/admin" element={<AdminCentralPage />} />
          <Route path="/docs" element={<DocsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
