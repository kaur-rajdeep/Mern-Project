import React, { useState } from 'react';
import { ShieldCheck, LogOut, User as UserIcon, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { LogoutConfirmModal } from '../common/LogoutConfirmModal';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const getRoleTitle = (type?: number) => {
    switch (type) {
      case 1:
        return 'Super Administrator';
      case 2:
        return 'Qualified Security Assessor (QSA)';
      case 3:
        return 'Quality Assurance (QA)';
      case 4:
        return 'Compliance Consultant';
      default:
        return 'Customer Portal';
    }
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 text-slate-800">
      <div className="px-4 lg:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shadow-2xs transition">
              <ShieldCheck className="w-4 h-4 text-sky-600" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900">
                PANACEA <span className="text-sky-600">INFOSEC</span>
              </h1>
              <p className="text-[10px] text-slate-500 leading-none font-medium">Compliance & Security Assessment Portal</p>
            </div>
          </Link>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2.5 px-3 py-1.5 rounded-lg bg-sky-50/60 border border-sky-100">
            <div className="w-6 h-6 rounded-md bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-900 leading-tight">{user?.fullName}</p>
              <p className="text-[10px] text-sky-700 font-medium">{getRoleTitle(user?.userType)}</p>
            </div>
          </div>

          <Link
            to="/profile"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            title="Profile & Settings"
          >
            <UserIcon className="w-4 h-4 text-slate-500" />
          </Link>

          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
        userName={user?.fullName}
      />
    </header>
  );
};

