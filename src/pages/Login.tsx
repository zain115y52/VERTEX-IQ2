import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Wifi, Zap, Headphones, ChevronLeft, UserCog, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [role, setRole] = useState<'admin' | 'client' | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تسجيل الدخول');
      
      login(data.token, data.user);
      navigate(data.user.role === 'admin' ? '/admin' : '/client');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base relative flex items-center justify-center overflow-hidden">
      {/* Background Graphic elements mimicking the original design */}
      <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-accent/10 to-transparent"></div>
      
      {/* Header Info */}
      <div className="hidden sm:flex absolute top-6 right-6 lg:right-10 items-center gap-3 bg-bg-card border border-border-dark px-4 py-2 rounded-full shadow-none">
        <div className="bg-accent/20 text-accent rounded-full w-8 h-8 flex items-center justify-center">
          <Users size={18} />
        </div>
        <div>
          <p className="text-xs text-text-secondary">اسم المالك</p>
          <p className="font-bold text-text-primary text-sm">Zain Al-Yassiri</p>
        </div>
      </div>
      
      <div className="hidden sm:flex absolute top-6 left-6 lg:left-10 items-center gap-3 bg-bg-card border border-border-dark px-4 py-2 rounded-full shadow-none">
        <div className="text-right">
          <p className="text-xs text-text-secondary">رقم التواصل</p>
          <p className="font-bold text-text-primary text-sm font-mono" dir="ltr">07829141115</p>
        </div>
        <div className="bg-accent/10 text-accent border border-accent/20 rounded-full w-8 h-8 flex items-center justify-center">
          <Wifi size={18} />
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-2xl relative z-10 flex flex-col items-center px-4 sm:px-0">
        {/* LOGO */}
        <div className="flex flex-col sm:flex-row items-center justify-center mb-8 sm:mb-10 gap-3">
            <div className="relative">
              {/* V icon simplified */}
              <div className="w-16 h-20 sm:w-20 sm:h-24 relative flex justify-center">
                 <div className="absolute w-5 h-20 sm:w-6 sm:h-24 bg-accent/80 rounded-full transform -rotate-[25deg] origin-bottom-right"></div>
                 <div className="absolute w-5 h-20 sm:w-6 sm:h-24 bg-blue-500/80 rounded-full transform rotate-[25deg] origin-bottom-left"></div>
                 <div className="absolute -inset-2 sm:-inset-4 border border-accent/20 rounded-full opacity-60"></div>
                 <div className="absolute -inset-4 sm:-inset-8 border border-accent/10 rounded-full opacity-40"></div>
              </div>
            </div>
            <div className="flex flex-col ml-0 sm:ml-4 mt-6 sm:mt-0 text-center sm:text-left">
              <span className="text-4xl sm:text-5xl font-bold tracking-widest text-text-primary">VERTEX</span>
              <span className="text-2xl sm:text-4xl text-accent font-light tracking-[0.3em] flex justify-center items-center"><span className="h-[1px] w-6 sm:w-8 mx-2 bg-border-dark"></span>IQ<span className="h-[1px] w-6 sm:w-8 mx-2 bg-border-dark"></span></span>
            </div>
        </div>

        {/* Features Row */}
        <div className="hidden sm:flex justify-between w-full px-8 max-w-xl mb-12 relative">
          <div className="absolute top-5 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-border-dark to-transparent -z-10"></div>
          {[
            { icon: ShieldCheck, title: "ثقة وأمان", sub: "TRUST & SECURITY" },
            { icon: Wifi, title: "اتصال دائم", sub: "STAY CONNECTED" },
            { icon: Zap, title: "سرعة فائقة", sub: "ULTRA FAST", highlight: true },
            { icon: Headphones, title: "دعم مستمر", sub: "24/7 SUPPORT" },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div className="bg-bg-sidebar border border-border-dark rounded-full p-2.5 mb-2">
                <item.icon className={item.highlight ? "text-accent" : "text-text-secondary"} size={22} />
              </div>
              <p className="font-bold text-text-primary text-sm mb-0.5">{item.title}</p>
              <p className="text-[9px] text-text-secondary uppercase tracking-wider font-mono">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* Title sub */}
        <p className="text-text-secondary tracking-[0.2em] sm:tracking-[0.3em] uppercase text-[10px] sm:text-xs font-semibold mb-6 sm:mb-8 text-center px-4">CONNECT • SERVE • SIMPLIFY</p>

        {/* Login Box */}
        <div className="w-full max-w-sm bg-bg-card border border-border-dark rounded-[2rem] p-6 sm:p-8 pb-8 sm:pb-10 transition-all shadow-2xl mx-4 sm:mx-0">
          <h2 className="text-center font-bold text-xl sm:text-2xl text-text-primary mb-6 sm:mb-8">تسجيل الدخول</h2>
          
          {!role ? (
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => setRole('admin')}
                className="w-full flex items-center justify-between bg-bg-sidebar hover:bg-bg-sidebar/80 border border-border-dark text-text-primary p-4 rounded-2xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-white/5 rounded-lg text-accent">
                     <ShieldCheck size={20} />
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-text-primary">دخول المدير</p>
                    <p className="text-xs text-text-secondary font-mono">Admin Login</p>
                  </div>
                </div>
                <ChevronLeft className="opacity-50 group-hover:translate-x-[-4px] transition-transform" />
              </button>

              <button 
                onClick={() => setRole('client')}
                className="w-full flex items-center justify-between bg-accent text-bg-base hover:bg-accent/90 p-4 rounded-2xl transition-all shadow-md shadow-accent/20 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-black/10 rounded-lg">
                     <UserCog size={20} />
                  </div>
                  <div className="text-right">
                    <p className="font-bold">دخول الموزع</p>
                    <p className="text-xs text-bg-base/80 font-mono">Reseller Login</p>
                  </div>
                </div>
                <ChevronLeft className="opacity-50 group-hover:translate-x-[-4px] transition-transform" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <button 
                  type="button" 
                  onClick={() => { setRole(null); setError(''); }}
                  className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-1 mb-2"
                >
                  الرجوع للخلف <ChevronLeft size={12} className="rotate-180" />
               </button>
               
               {error && <div className="bg-red-500/10 text-red-500 text-sm p-3 rounded-lg border border-red-500/20">{error}</div>}

               <div>
                 <label className="block text-text-secondary text-xs uppercase tracking-widest font-bold mb-2">اسم المستخدم</label>
                 <input 
                   type="text" 
                   value={username}
                   onChange={e => setUsername(e.target.value)}
                   className="w-full p-3 bg-bg-base border border-border-dark rounded-xl text-text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none text-left font-mono"
                   dir="ltr"
                   required
                 />
               </div>
               <div>
                 <label className="block text-text-secondary text-xs uppercase tracking-widest font-bold mb-2">كلمة المرور</label>
                 <input 
                   type="password" 
                   value={password}
                   onChange={e => setPassword(e.target.value)}
                   className="w-full p-3 bg-bg-base border border-border-dark rounded-xl text-text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none text-left font-mono"
                   dir="ltr"
                   required
                 />
               </div>
               <button 
                  type="submit"
                  className={`w-full mt-4 font-bold p-3.5 rounded-xl transition-colors ${role === 'admin' ? 'bg-bg-sidebar hover:bg-bg-sidebar/80 text-text-primary border border-border-dark' : 'bg-accent hover:bg-accent/90 text-bg-base'}`}
               >
                 تسجيل الدخول
               </button>
            </form>
          )}
        </div>
      </div>

      <div className="absolute bottom-6 w-full text-center">
         <p className="bg-bg-sidebar text-text-secondary border border-border-dark text-xs px-6 py-2 rounded-full inline-block font-mono">
            © 2026 VERTEX IQ. All rights reserved.
         </p>
      </div>
    </div>
  );
}
