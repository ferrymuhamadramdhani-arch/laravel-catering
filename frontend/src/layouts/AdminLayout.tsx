import React, { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  ShieldCheck,
  Settings,
  LogOut,
  Menu as MenuIcon,
  Building2,
  Bell,
  ChevronDown,
  FolderKanban,
  Tag,
  Package,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { cn } from '../lib/utils';

export const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const { user, currentTenant, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isMasterDataActive = location.pathname.startsWith('/master-data');
  const isUserMgmtActive = location.pathname.startsWith('/users') || location.pathname.startsWith('/roles');

  // Default dropdowns to closed/hidden unless currently on active sub-route
  const [masterDataOpen, setMasterDataOpen] = useState(isMasterDataActive);
  const [userMgmtOpen, setUserMgmtOpen] = useState(isUserMgmtActive);

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
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
          'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-200 flex flex-col transition-all duration-300 ease-in-out md:static md:h-screen md:sticky md:top-0',
          // Mobile state
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          // Desktop collapsed state
          sidebarCollapsed ? 'md:hidden md:w-0 md:overflow-hidden' : 'md:w-64'
        )}
      >
        {/* Brand Header with Hide Sidebar Button */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-amber-500/20 flex-shrink-0">
              C
            </div>
            <div className="overflow-hidden">
              <span className="font-bold text-white tracking-wide text-lg block leading-none">CaterOS</span>
              <span className="text-[10px] block text-amber-400 font-semibold uppercase tracking-wider mt-0.5">
                SaaS Catering
              </span>
            </div>
          </div>

          {/* Toggle / Hide Sidebar Button */}
          <button
            onClick={toggleSidebar}
            title="Sembunyikan Sidebar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <PanelLeftClose className="w-5 h-5" />
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
          {/* Dashboard */}
          <NavLink
            to="/dashboard"
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
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </div>
          </NavLink>

          {/* Master Data Section (Collapsible Group) */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setMasterDataOpen(!masterDataOpen)}
              className={cn(
                'w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isMasterDataActive
                  ? 'text-amber-400 bg-slate-800/80 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              )}
            >
              <div className="flex items-center gap-3">
                <FolderKanban className="w-4 h-4" />
                <span>Master Data</span>
              </div>
              <ChevronDown
                className={cn('w-3.5 h-3.5 transition-transform duration-200', masterDataOpen ? 'rotate-180' : '')}
              />
            </button>

            {masterDataOpen && (
              <div className="pl-9 pr-2 py-1 space-y-1 border-l-2 border-slate-800 ml-4 mt-1">
                <NavLink
                  to="/master-data/materials"
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-amber-600/90 text-white font-semibold shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    )
                  }
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>Bahan Baku</span>
                </NavLink>

                <NavLink
                  to="/master-data/categories"
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-amber-600/90 text-white font-semibold shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    )
                  }
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Kategori Menu</span>
                </NavLink>

                <NavLink
                  to="/master-data/menus"
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-amber-600/90 text-white font-semibold shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    )
                  }
                >
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                  <span>Item Menu & Resep (BOM)</span>
                </NavLink>

                <NavLink
                  to="/master-data/packages"
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-amber-600/90 text-white font-semibold shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    )
                  }
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Paket Menu & Bundling</span>
                </NavLink>
              </div>
            )}
          </div>

          {/* Orders */}
          <NavLink
            to="/orders"
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
              <ShoppingBag className="w-4 h-4" />
              <span>Pesanan</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
              MVP
            </span>
          </NavLink>

          {/* Kitchen */}
          <NavLink
            to="/kitchen"
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
              <ChefHat className="w-4 h-4" />
              <span>Produksi Dapur</span>
            </div>
          </NavLink>

          {/* Deliveries */}
          <NavLink
            to="/deliveries"
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
              <Truck className="w-4 h-4" />
              <span>Pengiriman & Kurir</span>
            </div>
          </NavLink>

          {/* Finance */}
          <NavLink
            to="/finance"
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
              <Receipt className="w-4 h-4" />
              <span>Keuangan & Invoice</span>
            </div>
          </NavLink>

          {/* User Management Section (Collapsible Group) */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setUserMgmtOpen(!userMgmtOpen)}
              className={cn(
                'w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isUserMgmtActive
                  ? 'text-amber-400 bg-slate-800/80 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              )}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4" />
                <span>User Management</span>
              </div>
              <ChevronDown
                className={cn('w-3.5 h-3.5 transition-transform duration-200', userMgmtOpen ? 'rotate-180' : '')}
              />
            </button>

            {userMgmtOpen && (
              <div className="pl-9 pr-2 py-1 space-y-1 border-l-2 border-slate-800 ml-4 mt-1">
                <NavLink
                  to="/users"
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-amber-600/90 text-white font-semibold shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    )
                  }
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Daftar Pengguna / Staf</span>
                </NavLink>

                <NavLink
                  to="/roles"
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-amber-600/90 text-white font-semibold shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    )
                  }
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Role & Hak Akses</span>
                </NavLink>
              </div>
            )}
          </div>

          {/* Settings */}
          <NavLink
            to="/settings"
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
              <Settings className="w-4 h-4" />
              <span>Pengaturan Bisnis</span>
            </div>
          </NavLink>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm shadow-slate-100">
          <div className="flex items-center gap-3">
            {/* Sidebar Toggle Button (Visible on Mobile & when Desktop is Collapsed) */}
            <button
              onClick={toggleSidebar}
              title={sidebarCollapsed ? 'Tampilkan Menu Sidebar' : 'Sembunyikan Menu Sidebar'}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-5 h-5 text-amber-600" />
              ) : (
                <MenuIcon className="w-5 h-5" />
              )}
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
