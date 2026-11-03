import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/students', label: 'Students', icon: Users, end: false },
  { to: '/courses', label: 'Courses', icon: BookOpen, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
];

export const AdminLayout: React.FC = () => {
  const { admin, settings, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    setMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-indigo-950 text-white shadow-xl z-30">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-indigo-900/80">
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0 overflow-hidden p-1">
            <img
              src="/ash-academy-logo.png"
              alt="Ash Academy Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-heading text-base font-bold tracking-tight text-white truncate">
             ASH BILLING
            </h1>
            <p className="text-xs text-indigo-300 truncate">{settings.academyName}</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3.5 py-6 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-indigo-200 hover:bg-indigo-900/60 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Admin User Footer */}
        <div className="p-4 border-t border-indigo-900/80 bg-indigo-950/60">
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <p className="text-xs font-bold text-white truncate">
                  {admin?.name || 'Administrator'}
                </p>
              </div>
              <p className="text-[11px] text-indigo-300 truncate">{admin?.email}</p>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              title="Sign Out"
              className="p-2 rounded-lg text-indigo-300 hover:text-white hover:bg-indigo-900 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header & Drawer */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-indigo-950 text-white shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center overflow-hidden p-0.5">
            <img
              src="/ash-academy-logo.png"
              alt="Ash Academy Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-bold text-sm">Student Fee Manager</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-indigo-200 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-64 h-full bg-indigo-950 text-white flex flex-col p-4">
            <div className="flex items-center justify-between pb-4 border-b border-indigo-900">
              <span className="font-bold text-sm">{settings.academyName}</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-indigo-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'text-indigo-200 hover:bg-indigo-900/60'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-900/80 text-indigo-200 hover:text-white text-sm font-semibold"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-indigo-900">
                  Confirm Sign Out
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Are you sure you want to sign out?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shadow-2xs transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Yes, Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
       <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

