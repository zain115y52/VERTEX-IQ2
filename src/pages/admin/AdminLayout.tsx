import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, Server, Users, LogOut, Menu, X, Settings, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import ThemeSwitcher from '../../components/ThemeSwitcher';

export default function AdminLayout() {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const nav = [
    { name: 'لوحة التحكم', path: '/admin', icon: LayoutDashboard },
    { name: 'السيرفرات', path: '/admin/servers', icon: Server },
    { name: 'الموزعين (العملاء)', path: '/admin/clients', icon: Users },
    { name: 'سجلات النظام', path: '/admin/logs', icon: ShieldCheck },
    { name: 'إعدادات الحساب', path: '/admin/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ forceAll: false })
      });
    } catch(e) {
      console.error(e);
    } finally {
      logout();
    }
  };

  return (
    <div className="flex bg-bg-base min-h-screen lg:flex-row flex-col">
      {/* Mobile Topbar */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-bg-sidebar border-b border-border-dark sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="bg-accent text-bg-base rounded-md p-1.5 shrink-0"><Server size={18} /></div>
          <div className="font-bold text-lg tracking-wider text-text-primary">VERTEX IQ</div>
        </div>
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-text-primary bg-bg-card rounded-lg border border-border-dark"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 right-0 w-72 bg-bg-sidebar border-l border-border-dark flex flex-col z-50 transition-transform duration-300 lg:static lg:translate-x-0 lg:w-64",
        sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
         <div className="p-6 border-b border-border-dark flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-accent text-bg-base rounded-md p-1.5"><Server size={20} /></div>
              <div className="font-bold text-xl tracking-wider text-text-primary">VERTEX IQ</div>
            </div>
            <button className="lg:hidden text-text-secondary hover:text-text-primary" onClick={() => setSidebarOpen(false)}>
              <X size={24} />
            </button>
         </div>
         
         <div className="p-6 pb-2">
            <p className="text-xs text-text-secondary font-bold uppercase tracking-widest mb-4">القائمة الرئيسية</p>
            <nav className="space-y-1">
              {nav.map(item => {
                 const active = location.pathname === item.path;
                 return (
                   <Link 
                     key={item.path} 
                     to={item.path}
                     onClick={() => setSidebarOpen(false)}
                     className={cn(
                       "flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-semibold",
                       active ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                     )}
                   >
                     <item.icon size={18} />
                     {item.name}
                   </Link>
                 )
              })}
            </nav>
         </div>

         <div className="mt-auto border-t border-border-dark flex flex-col">
            <div className="p-4 border-b border-border-dark flex justify-center">
               <ThemeSwitcher />
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6 px-4">
                 <div className="bg-bg-card border border-border-dark rounded-md w-10 h-10 flex items-center justify-center font-bold text-accent shrink-0">
                    {user?.username.charAt(0).toUpperCase()}
                 </div>
                 <div className="min-w-0">
                    <p className="text-sm font-bold text-text-primary truncate">{user?.username}</p>
                    <p className="text-xs text-success">مدير النظام</p>
                 </div>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center justify-center w-full gap-2 px-4 py-3 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors text-sm font-bold border border-red-500/20"
              >
                <LogOut size={16} /> تسجيل الخروج
              </button>
            </div>
         </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto opacity-100 animate-in fade-in duration-500 relative">
         <Outlet />
      </main>
    </div>
  );
}
