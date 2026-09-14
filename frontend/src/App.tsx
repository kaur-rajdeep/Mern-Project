import React from 'react';
import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { CustomersManagement } from './pages/admin/CustomersManagement';
import { AssessorsManagement } from './pages/admin/AssessorsManagement';
import { ComplianceProjects } from './pages/admin/ComplianceProjects';
import { AdminComplianceAuditView } from './pages/admin/AdminComplianceAuditView';
import { QuestionnairesManagement } from './pages/admin/QuestionnairesManagement';
import { ArchivedProcesses } from './pages/admin/ArchivedProcesses';

// Customer Pages
import { CustomerDashboard } from './pages/customer/CustomerDashboard';
import { ProcessDetailsPage } from './pages/customer/ProcessDetailsPage';
import { EvidenceAuditView } from './pages/customer/EvidenceAuditView';
import { AttestationReportsPage } from './pages/customer/AttestationReportsPage';

// Assessor Pages
import { QsaDashboard } from './pages/qsa/QsaDashboard';
import { QsaAuditView } from './pages/qsa/QsaAuditView';
import { QaDashboard } from './pages/qa/QaDashboard';
import { QaAuditView } from './pages/qa/QaAuditView';
import { ConsultantDashboard } from './pages/consultant/ConsultantDashboard';
import { ConsultantAuditView } from './pages/consultant/ConsultantAuditView';

// Profile Page
import { ProfilePage } from './pages/profile/ProfilePage';
import { UserType } from './types';

const queryClient = new QueryClient();

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: UserType[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center text-white text-sm font-bold">
        Authenticating session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.userType)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Root Role Redirector
const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  switch (user.userType) {
    case UserType.ADMIN:
      return <Navigate to="/admin/dashboard" replace />;
    case UserType.QSA:
      return <Navigate to="/qsa/dashboard" replace />;
    case UserType.QA:
      return <Navigate to="/qa/dashboard" replace />;
    case UserType.CONSULTANT:
      return <Navigate to="/consultant/dashboard" replace />;
    default:
      return <Navigate to="/customer/dashboard" replace />;
  }
};

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Protected Routes inside AppLayout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<RootRedirect />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={[UserType.ADMIN]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/customers"
          element={
            <ProtectedRoute allowedRoles={[UserType.ADMIN]}>
              <CustomersManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/assessors"
          element={
            <ProtectedRoute allowedRoles={[UserType.ADMIN]}>
              <AssessorsManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/compliances"
          element={
            <ProtectedRoute allowedRoles={[UserType.ADMIN]}>
              <ComplianceProjects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/compliances/:projectId"
          element={
            <ProtectedRoute allowedRoles={[UserType.ADMIN]}>
              <AdminComplianceAuditView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/questionnaires"
          element={
            <ProtectedRoute allowedRoles={[UserType.ADMIN]}>
              <QuestionnairesManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/archives"
          element={
            <ProtectedRoute allowedRoles={[UserType.ADMIN]}>
              <ArchivedProcesses />
            </ProtectedRoute>
          }
        />

        {/* Customer Routes */}
        <Route
          path="/customer/dashboard"
          element={
            <ProtectedRoute allowedRoles={[UserType.CUSTOMER]}>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/processes/:processId"
          element={
            <ProtectedRoute allowedRoles={[UserType.CUSTOMER]}>
              <ProcessDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/evidence-audit"
          element={
            <ProtectedRoute allowedRoles={[UserType.CUSTOMER]}>
              <EvidenceAuditView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/reports"
          element={
            <ProtectedRoute allowedRoles={[UserType.CUSTOMER]}>
              <AttestationReportsPage />
            </ProtectedRoute>
          }
        />

        {/* QSA Routes */}
        <Route
          path="/qsa/dashboard"
          element={
            <ProtectedRoute allowedRoles={[UserType.QSA]}>
              <QsaDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/qsa/audit-view"
          element={
            <ProtectedRoute allowedRoles={[UserType.QSA]}>
              <QsaAuditView />
            </ProtectedRoute>
          }
        />

        {/* QA Routes */}
        <Route
          path="/qa/dashboard"
          element={
            <ProtectedRoute allowedRoles={[UserType.QA]}>
              <QaDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/qa/audit-view"
          element={
            <ProtectedRoute allowedRoles={[UserType.QA]}>
              <QaAuditView />
            </ProtectedRoute>
          }
        />

        {/* Consultant Routes */}
        <Route
          path="/consultant/dashboard"
          element={
            <ProtectedRoute allowedRoles={[UserType.CONSULTANT]}>
              <ConsultantDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/consultant/audit-view"
          element={
            <ProtectedRoute allowedRoles={[UserType.CONSULTANT]}>
              <ConsultantAuditView />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </>
  )
);

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster richColors position="top-right" />
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
};
