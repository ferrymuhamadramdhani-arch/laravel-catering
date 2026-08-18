import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingBag,
  ChefHat,
  Boxes,
  Truck,
  Receipt,
  Users,
  Settings,
  LogOut,
  Menu as MenuIcon,
  X,
  Building2,
  Bell,
  ChevronDown
} from 'lucide-react';
import { cn } from '../lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Menu & Paket', href: '/menus', icon: UtensilsCrossed },
  { label: 'Pesanan', href: '/orders', icon: ShoppingBag, badge: 'MVP' },
  { label: 'Produksi Dapur', href: '/kitchen', icon: ChefHat },
  { label: 'Bahan Baku & Stok', href: '/inventory', icon: Boxes },
  { label: 'Pengiriman & Kurir', href: '/deliveries', icon: Truck },
  { label: 'Keuangan & Invoice', href: '/finance', icon: Receipt },
  { label: 'Staf & Pengguna', href: '/users', icon: Users },
  { label: 'Pengaturan', href: '/settings', icon: Settings },
];

export const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const { user, currentTenant, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-200 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen md:sticky md:top-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-amber-500/20">
              C
            </div>
            <div>
              <span className="font-bold text-white tracking-wide text-lg">CaterOS</span>
              <span className="text-[10px] block text-amber-400 font-semibold uppercase tracking-wider -mt-1">
                SaaS Catering
              </span>
            </div>
          </div>
          <button
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tenant Info Card */}
        <div className="p-4 mx-3 mt-3 rounded-lg bg-slate-800/70 border border-slate-700/50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-white truncate">
              {currentTenant?.name || 'Catering Tenant'}
            </p>
            <span className="text-[10px] text-emerald-400 font-medium">
              ● Active (Starter Plan)
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs uppercase">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">{user?.name || 'Admin User'}</p>
                <p className="text-[10px] text-slate-400 capitalize truncate">{user?.role || 'Owner'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm shadow-slate-100">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              onClick={() => setSidebarOpen(true)}
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>Tenant:</span>
              <span className="px-2 py-1 rounded bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                {currentTenant?.name || 'Default Catering'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              title="Notifications"
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 text-left transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-semibold text-slate-800 leading-none">{user?.name || 'Owner'}</p>
                  <p className="text-[10px] text-slate-500 leading-tight capitalize mt-0.5">{user?.role || 'admin'}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-lg border border-slate-200 py-1 z-50 text-sm">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs text-slate-500">Masuk sebagai</p>
                    <p className="font-semibold text-slate-800 truncate">{user?.email || 'admin@cateros.id'}</p>
                  </div>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    Pengaturan Profil
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    Keluar (Logout)
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
