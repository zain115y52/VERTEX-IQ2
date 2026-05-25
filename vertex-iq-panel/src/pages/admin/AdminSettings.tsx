import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Settings, Save, KeyRound, User } from 'lucide-react';

export default function AdminSettings() {
  const { user, token, login } = useAuth(); // login from context updates token and user state
  const [username, setUsername] = useState(user?.username || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!username) {
      setErrorMsg('اسم المستخدم مطلوب');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg('كلمات المرور الجديدة غير متطابقة');
      return;
    }

    if (newPassword && !oldPassword) {
      setErrorMsg('يجب إدخال كلمة المرور الحالية لتغيير كلمة المرور');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          username,
          oldPassword,
          newPassword
        })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setErrorMsg(data.error || 'حدث خطأ أثناء حفظ الإعدادات');
      } else {
        setSuccessMsg('تم حفظ الإعدادات بنجاح!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        // Update user context with new token and user data
        if (data.token) {
           login(data.token, data.user);
        }
      }
    } catch (err) {
      setErrorMsg('تعذر الاتصال بالخادم');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 animate-in fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8 border-b border-border-dark pb-6">
        <div className="bg-accent/10 p-3 rounded-xl">
           <Settings size={28} className="text-accent" />
        </div>
        <div>
           <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">إعدادات الحساب</h1>
           <p className="text-text-secondary text-sm sm:text-base">تغيير اسم المستخدم وكلمة المرور الخاصة بك.</p>
        </div>
      </div>

      <div className="bg-bg-card border border-border-dark rounded-xl p-6 shadow-sm">
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 font-bold">
            {errorMsg}
          </div>
        )}
        
        {successMsg && (
          <div className="bg-success/10 border border-success/20 text-success p-4 rounded-xl mb-6 font-bold">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username Section */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-text-primary flex items-center gap-2">
              <User size={18} className="text-accent" /> بيانات الحساب
            </h3>
            <div>
              <label className="block text-sm font-semibold mb-2 text-text-secondary">اسم المستخدم الجديد</label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                required
                className="w-full p-3 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent text-left font-mono" 
                dir="ltr"
              />
            </div>
          </div>

          <div className="my-6 border-t border-border-dark"></div>

          {/* Password Section */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-text-primary flex items-center gap-2">
              <KeyRound size={18} className="text-accent" /> تغيير كلمة المرور (اختياري)
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-text-secondary">كلمة المرور الحالية</label>
                <input 
                  type="password" 
                  value={oldPassword} 
                  onChange={e => setOldPassword(e.target.value)}
                  className="w-full p-3 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent text-left font-mono" 
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-text-secondary">كلمة المرور الجديدة</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full p-3 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent text-left font-mono" 
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-text-secondary">تأكيد كلمة المرور الجديدة</label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full p-3 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent text-left font-mono" 
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border-dark flex justify-end">
             <button 
               type="submit" 
               disabled={isLoading}
               className="bg-accent text-bg-base hover:bg-accent/90 px-8 py-3 rounded-xl font-bold transition-all shadow-[0_0_15px_var(--color-accent)] shadow-accent/20 flex items-center justify-center gap-2 min-w-[150px] disabled:opacity-70 disabled:cursor-not-allowed"
             >
               {isLoading ? 'جاري الحفظ...' : (
                  <>
                    <Save size={18} /> حفظ الإعدادات
                  </>
               )}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
