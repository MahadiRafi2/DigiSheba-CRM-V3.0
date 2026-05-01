import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Settings, 
  Mail,
  Send,
  Clock,
  LogOut,
  Menu,
  X,
  RefreshCw,
  Zap,
  Database
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useBrandingStore } from '../store/brandingStore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { siteName, adminLogoUrl } = useBrandingStore();
  const [dbStatus, setDbStatus] = React.useState<'loading' | 'connected' | 'disconnected'>('loading');

  const checkDbStatus = async () => {
    try {
      // Add cache buster to prevent stale results
      const res = await fetch(`/api/db-status?t=${Date.now()}`);
      if (!res.ok) {
        throw new Error('Server response not OK');
      }
      const data = await res.json();
      setDbStatus(data.status === 'connected' ? 'connected' : 'disconnected');
    } catch (err) {
      console.error('DB Health Check Failed:', err);
      setDbStatus('disconnected');
    }
  };

  React.useEffect(() => {
    checkDbStatus();
    const interval = setInterval(checkDbStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { icon: Package, label: 'Products', path: '/products' },
    { icon: ShoppingCart, label: 'Sales', path: '/sales' },
    { icon: Clock, label: 'Renewals & Expiry', path: '/renewals' },
    { icon: RefreshCw, label: 'WooCommerce', path: '/woocommerce' },
    { icon: Send, label: 'Email Campaigns', path: '/email-campaign' },
    { icon: Zap, label: 'Canva Renewal', path: '/admin/canva-renewal' },
    { icon: BarChart3, label: 'Reports', path: '/reports' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-zinc-900 text-zinc-400 w-64 fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          !isSidebarOpen && "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {adminLogoUrl ? (
                <img src={adminLogoUrl} alt={siteName} className="h-8 w-auto object-contain" />
              ) : (
                <>
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                    {siteName?.[0] || 'D'}
                  </div>
                  <span className="text-white font-bold text-xl tracking-tight">{siteName}</span>
                </>
              )}
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-zinc-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                  location.pathname === item.path 
                    ? "bg-zinc-800 text-white" 
                    : "hover:bg-zinc-800/50 hover:text-zinc-200"
                )}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-zinc-800">
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-medium text-white">
                {user?.name?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-6 sticky top-0 z-40">
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="lg:hidden p-2 -ml-2 text-zinc-500 hover:text-zinc-900"
          >
            <Menu size={24} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-100">
              <div className={cn(
                "w-2 h-2 rounded-full",
                dbStatus === 'connected' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : 
                dbStatus === 'disconnected' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse" : 
                "bg-zinc-300"
              )} />
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-widest",
                dbStatus === 'connected' ? "text-emerald-600" : 
                dbStatus === 'disconnected' ? "text-red-600" : 
                "text-zinc-400"
              )}>
                Database: {dbStatus}
              </span>
              <Database size={12} className={cn(
                dbStatus === 'connected' ? "text-emerald-500" : 
                dbStatus === 'disconnected' ? "text-red-500" : 
                "text-zinc-400"
              )} />
            </div>

            <button className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors">
              <Settings size={20} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
