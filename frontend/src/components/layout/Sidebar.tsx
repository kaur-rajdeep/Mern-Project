import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  ShieldAlert,
  FileCheck2,
  Archive,
  FileSpreadsheet,
  FileText,
  Settings,
  FolderLock,
  Award,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserType } from '../../types';
import { LogoutConfirmModal } from '../common/LogoutConfirmModal';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const userType = user?.userType;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs transition ${
      isActive
        ? 'bg-sky-50 text-sky-600 font-bold border border-sky-200 shadow-2xs'
        : 'text-slate-600 hover:text-sky-600 hover:bg-sky-50/60 font-medium'
    }`;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:sticky top-16 bottom-0 left-0 z-50 w-64 h-[calc(100vh-4rem)] shrink-0 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex-1 overflow-y-auto py-5 px-3 flex flex-col">
          {/* Admin Navigation */}
          {userType === UserType.ADMIN && (
            <div className="space-y-1 mb-6">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Administration
              </p>
              <NavLink to="/admin/dashboard" className={linkClass}>
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Dashboard Overview</span>
              </NavLink>
              <NavLink to="/admin/customers" className={linkClass}>
                <Users className="w-4 h-4 shrink-0" />
                <span>Customers Management</span>
              </NavLink>
              <NavLink to="/admin/assessors" className={linkClass}>
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>Auditors (QSA / QA / Cons)</span>
              </NavLink>

              <p className="px-3 pt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Frameworks & Projects
              </p>
              <NavLink to="/admin/compliances" className={linkClass}>
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Compliance Projects</span>
              </NavLink>
              <NavLink to="/admin/questionnaires" className={linkClass}>
                <FileCheck2 className="w-4 h-4 shrink-0" />
                <span>Questionnaires / Controls</span>
              </NavLink>
              <NavLink to="/admin/archives" className={linkClass}>
                <Archive className="w-4 h-4 shrink-0" />
                <span>Archived Processes</span>
              </NavLink>
              <NavLink to="/admin/export-logs" className={linkClass}>
                <FolderLock className="w-4 h-4 shrink-0" />
                <span>Audit Vault Export Logs</span>
              </NavLink>
            </div>
          )}

          {/* Customer Navigation */}
          {userType === UserType.CUSTOMER && (
            <div className="space-y-1 mb-6">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Customer Workspace
              </p>
              <NavLink to="/customer/dashboard" className={linkClass}>
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>My Audit Processes</span>
              </NavLink>
              <NavLink to="/customer/reports" className={linkClass}>
                <Award className="w-4 h-4 shrink-0" />
                <span>Attestations & Reports</span>
              </NavLink>
            </div>
          )}

          {/* QSA Navigation */}
          {userType === UserType.QSA && (
            <div className="space-y-1 mb-6">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                QSA Assessment Portal
              </p>
              <NavLink to="/qsa/dashboard" className={linkClass}>
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Assigned Audits</span>
              </NavLink>
            </div>
          )}

          {/* QA Navigation */}
          {userType === UserType.QA && (
            <div className="space-y-1 mb-6">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Quality Assurance Portal
              </p>
              <NavLink to="/qa/dashboard" className={linkClass}>
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>QA Review Engagements</span>
              </NavLink>
              <NavLink to="/qa/export-logs" className={linkClass}>
                <FolderLock className="w-4 h-4 shrink-0" />
                <span>Audit Vault Export Logs</span>
              </NavLink>
            </div>
          )}

          {/* Consultant Navigation */}
          {userType === UserType.CONSULTANT && (
            <div className="space-y-1 mb-6">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Consultant Portal
              </p>
              <NavLink to="/consultant/dashboard" className={linkClass}>
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Client Consultations</span>
              </NavLink>
            </div>
          )}

          {/* User Settings & Session Actions anchored to bottom */}
          <div className="mt-auto pt-4 border-t border-slate-100 space-y-1">
            <NavLink to="/profile" className={linkClass}>
              <Settings className="w-4 h-4 shrink-0" />
              <span>Profile &amp; Password</span>
            </NavLink>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs text-slate-600 hover:text-rose-600 hover:bg-rose-50/60 font-medium transition text-left group"
            >
              <LogOut className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-rose-600 transition" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-medium">
            <FolderLock className="w-3.5 h-3.5 text-slate-400" />
            <span>Encrypted Audit Vault v2.0</span>
          </div>
        </div>
      </aside>

      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          logout();
          navigate('/login');
        }}
        onCancel={() => setShowLogoutConfirm(false)}
        userName={user?.fullName}
      />
    </>
  );
};
