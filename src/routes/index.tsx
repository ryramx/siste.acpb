import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import { MainLayout } from '../layouts/MainLayout';
import { ProtectedRoute } from '../components/common/ProtectedRoute';

// Pages
import { Login } from '../pages/auth/Login';
import { Dashboard } from '../pages/dashboard/Dashboard';
import { MembersList } from '../pages/members/MembersList';
import { MemberForm } from '../pages/members/MemberForm';
import { MemberDetails } from '../pages/members/MemberDetails';
import { VolunteersList } from '../pages/volunteers/VolunteersList';
import { BeneficiariesList } from '../pages/beneficiaries/BeneficiariesList';
import { BeneficiaryDetails } from '../pages/beneficiaries/BeneficiaryDetails';
import { ProjectsList } from '../pages/projects/ProjectsList';
import { ProjectDetails } from '../pages/projects/ProjectDetails';
import { EventsList } from '../pages/events/EventsList';
import { EventDetails } from '../pages/events/EventDetails';
import { EventInscriptions } from '../pages/events/EventInscriptions';
import { FinancialDashboard } from '../pages/financial/FinancialDashboard';
import { ReceitasPage } from '../pages/financial/ReceitasPage';
import { DespesasPage } from '../pages/financial/DespesasPage';
import { MovimentacoesPage } from '../pages/financial/MovimentacoesPage';
import { CadastrosFinanceiros } from '../pages/financial/CadastrosFinanceiros';
import { ReportsPage } from '../pages/reports/ReportsPage';
import { AssetsList } from '../pages/assets/AssetsList';
import { AuditPage } from '../pages/audit/AuditPage';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { AvisoServidorIniciando } from '../components/common/AvisoServidorIniciando';

export const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          {/* Fora das rotas: vale em qualquer tela, inclusive no login e enquanto a sessão
              está sendo restaurada na abertura do app. */}
          <AvisoServidorIniciando />
          <Routes>
            {/* Rota de Login */}
            <Route path="/login" element={<Login />} />

            {/* Rotas Protegidas no MainLayout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route
                path="dashboard"
                element={
                  <ProtectedRoute permission="view_dashboard">
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Membros */}
              <Route
                path="membros"
                element={
                  <ProtectedRoute permission="view_members">
                    <MembersList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="membros/novo"
                element={
                  <ProtectedRoute permission="edit_members">
                    <MemberForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="membros/:id/editar"
                element={
                  <ProtectedRoute permission="edit_members">
                    <MemberForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="membros/:id"
                element={
                  <ProtectedRoute permission="view_members">
                    <MemberDetails />
                  </ProtectedRoute>
                }
              />

              {/* Voluntários */}
              <Route
                path="voluntarios"
                element={
                  <ProtectedRoute permission="view_volunteers">
                    <VolunteersList />
                  </ProtectedRoute>
                }
              />

              {/* Beneficiários */}
              <Route
                path="beneficiarios"
                element={
                  <ProtectedRoute permission="view_beneficiaries">
                    <BeneficiariesList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="beneficiarios/:id"
                element={
                  <ProtectedRoute permission="view_beneficiaries">
                    <BeneficiaryDetails />
                  </ProtectedRoute>
                }
              />

              {/* Projetos */}
              <Route
                path="projetos"
                element={
                  <ProtectedRoute permission="view_projects">
                    <ProjectsList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="projetos/:id"
                element={
                  <ProtectedRoute permission="view_projects">
                    <ProjectDetails />
                  </ProtectedRoute>
                }
              />

              {/* Eventos */}
              <Route
                path="eventos"
                element={
                  <ProtectedRoute permission="view_events">
                    <EventsList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="eventos/:id"
                element={
                  <ProtectedRoute permission="view_events">
                    <EventDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="eventos/:id/inscricoes"
                element={
                  <ProtectedRoute permission="view_events">
                    <EventInscriptions />
                  </ProtectedRoute>
                }
              />

              {/* Financeiro */}
              <Route
                path="financeiro"
                element={
                  <ProtectedRoute permission="view_financial">
                    <FinancialDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="financeiro/receitas"
                element={
                  <ProtectedRoute permission="view_financial">
                    <ReceitasPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="financeiro/despesas"
                element={
                  <ProtectedRoute permission="view_financial">
                    <DespesasPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="financeiro/movimentacoes"
                element={
                  <ProtectedRoute permission="view_financial">
                    <MovimentacoesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="financeiro/cadastros"
                element={
                  <ProtectedRoute permission="view_financial">
                    <CadastrosFinanceiros />
                  </ProtectedRoute>
                }
              />

              {/* Relatórios — sem permissão de rota: a própria tela só oferece os
                  relatórios cujos módulos o usuário pode visualizar. */}
              <Route
                path="relatorios"
                element={
                  <ProtectedRoute>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />

              {/* Patrimônio */}
              <Route
                path="patrimonio"
                element={
                  <ProtectedRoute permission="view_assets">
                    <AssetsList />
                  </ProtectedRoute>
                }
              />

              {/* Auditoria */}
              <Route
                path="auditoria"
                element={
                  <ProtectedRoute permission="view_audit">
                    <AuditPage />
                  </ProtectedRoute>
                }
              />

              {/* Configurações */}
              <Route
                path="configuracoes"
                element={
                  <ProtectedRoute permission="view_settings">
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Rota Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};
