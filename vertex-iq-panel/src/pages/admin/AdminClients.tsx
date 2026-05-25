import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Trash2, Plus, KeyRound, Server } from 'lucide-react';

export default function AdminClients() {
  const { token } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  
  const [isAdding, setIsAdding] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [serverId, setServerId] = useState('');
  const [limit, setLimit] = useState<number | ''>(50);
  const [status, setStatus] = useState('نشط');
  const [errorMsg, setErrorMsg] = useState('');

  const [editingLimitId, setEditingLimitId] = useState<string | null>(null);
  const [editLimitValue, setEditLimitValue] = useState<number | ''>('');

  const [showPass, setShowPass] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  const togglePassword = (id: string) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const fetchClients = async () => {
    const res = await fetch('/api/admin/clients', { headers: { Authorization: `Bearer ${token}` } });
    if(res.ok) setClients(await res.json());
  };

  const fetchServers = async () => {
    const res = await fetch('/api/admin/servers', { headers: { Authorization: `Bearer ${token}` } });
    if(res.ok) setServers(await res.json());
  };

  useEffect(() => {
    fetchClients();
    fetchServers();
  }, [token]);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if(!username || !password || !serverId || !limit || !status) {
      setErrorMsg('جميع الحقول مطلوبة');
      return;
    }
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username, password, serverId, limit: Number(limit), status })
      });
      const data = await res.json();
      if(res.ok) {
         setUsername('');
         setPassword('');
         setServerId('');
         setLimit(50);
         setStatus('نشط');
         setIsAdding(false);
         fetchClients();
         fetchServers(); // refresh servers to update assignments
      } else {
         setErrorMsg(data.error || "فشل إضافة الموزع");
      }
    } catch(err) {
      setErrorMsg("تعذر الاتصال بالخادم");
    }
  };

  const confirmDelete = async () => {
    if(!deleteId) return;
    await fetch(`/api/admin/clients/${deleteId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    setDeleteId(null);
    fetchClients();
    fetchServers();
  };

  const handleSaveLimit = async (id: string) => {
    if (editLimitValue === '' || editLimitValue < 0) {
      alert("الرجاء إدخال قيمة صحيحة (أكبر من أو يساوي 0)");
      return;
    }
    try {
      const res = await fetch(`/api/admin/clients/${id}/limit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ limit: editLimitValue })
      });
      if (res.ok) {
        setEditingLimitId(null);
        fetchClients();
      } else {
        const err = await res.json();
        alert(err.error || 'حدث خطأ');
      }
    } catch (e) {
      alert("خطأ في الاتصال");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
        <div>
           <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">إدارة الموزعين</h1>
           <p className="text-text-secondary text-sm sm:text-base">إضافة لوحات للعملاء، حذفها، أو تغيير الباسورد.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="w-full sm:w-auto bg-accent text-bg-base px-6 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-accent/90 transition-all border border-accent"
        >
          <Plus size={18} /> {isAdding ? "إلغاء" : "إضافة موزع"}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddClient} className="bg-bg-card p-6 rounded-xl border border-border-dark mb-8 animate-in fade-in slide-in-from-top-4">
           <h3 className="font-bold text-lg mb-4 text-text-primary">إضافة موزع جديد</h3>
           
           {errorMsg && (
             <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg mb-4 text-sm font-bold">
               {errorMsg}
             </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                 <label className="block text-sm font-semibold mb-2 text-text-secondary">اسم المستخدم للوحة الموزع</label>
                 <input 
                   autoFocus
                   type="text" 
                   value={username} onChange={e => setUsername(e.target.value)} required
                   className="w-full p-2.5 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent text-left font-mono text-sm" dir="ltr"
                 />
              </div>
              <div>
                 <label className="block text-sm font-semibold mb-2 text-text-secondary">كلمة المرور</label>
                 <div className="relative">
                   <input 
                     type={showPass ? "text" : "password"} 
                     value={password} onChange={e => setPassword(e.target.value)} required
                     className="w-full p-2.5 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent text-left font-mono text-sm pr-10" dir="ltr"
                   />
                   <button 
                     type="button"
                     onClick={() => setShowPass(!showPass)}
                     className="absolute top-1/2 right-3 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                   >
                     {showPass ? "إخفاء" : "إظهار"}
                   </button>
                 </div>
              </div>
              <div>
                 <label className="block text-sm font-semibold mb-2 text-text-secondary">السيرفر (المرتبط بالموزع)</label>
                 <select 
                   value={serverId} onChange={e => setServerId(e.target.value)} required
                   className="w-full p-2.5 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent text-left font-mono text-sm" dir="ltr"
                 >
                   <option value="">اختار سيرفر...</option>
                   {servers.map(s => (
                     <option key={s.id} value={s.id}>
                         {s.name}
                     </option>
                   ))}
                 </select>
              </div>
              <div>
                 <label className="block text-sm font-semibold mb-2 text-text-secondary">الحد الأقصى للمستخدمين (للموزع)</label>
                 <input 
                   type="number" 
                   value={limit} onChange={e => setLimit(e.target.value ? Number(e.target.value) : '')} required min="1"
                   className="w-full p-2.5 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent text-left font-mono text-sm" dir="ltr"
                 />
              </div>
              <div>
                 <label className="block text-sm font-semibold mb-2 text-text-secondary">الحالة (Status)</label>
                 <select 
                   value={status} onChange={e => setStatus(e.target.value)} required
                   className="w-full p-2.5 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent font-bold text-sm"
                 >
                   <option value="نشط">نشط</option>
                   <option value="غير نشط">غير نشط</option>
                 </select>
              </div>
           </div>
           
           <div className="flex justify-end border-t border-border-dark pt-4 mt-4">
             <button type="submit" className="bg-accent/10 border border-accent/20 text-accent hover:bg-accent hover:text-bg-base font-bold px-8 py-2.5 rounded-lg transition-colors">
               حفظ الموزع
             </button>
           </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4">
        {clients.map(client => (
          <div key={client.id} className="bg-bg-card p-4 sm:p-6 rounded-xl border border-border-dark flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 animate-in fade-in">
            <div className="flex items-center gap-4 w-full md:w-auto">
               <div className="bg-border-dark/50 text-text-secondary border border-border-dark w-12 h-12 rounded-lg flex items-center justify-center shrink-0">
                 <Users size={24} />
               </div>
               <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-base sm:text-lg text-text-primary font-mono truncate" dir="ltr">{client.username}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                     <p className="text-text-secondary text-xs sm:text-sm">موزع</p>
                     {client.assignedServer && (
                       <span className="text-[10px] bg-border-dark/50 text-text-secondary px-2 py-0.5 rounded-full font-bold font-mono">
                         {client.assignedServer}
                       </span>
                     )}
                     {client.status && (
                       <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${client.status === 'نشط' ? 'bg-success/10 text-success' : 'bg-red-500/10 text-red-500'}`}>
                         {client.status}
                       </span>
                     )}
                     {client.limit !== undefined && (
                       <span className="text-[10px] text-text-secondary bg-bg-base border border-border-dark px-2 py-0.5 rounded-full font-mono flex items-center gap-1 cursor-pointer hover:bg-bg-sidebar transition-colors" onClick={() => {
                         setEditingLimitId(client.id);
                         setEditLimitValue(client.limit);
                       }}>
                         Limit: {client.limit}
                       </span>
                     )}
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
               {editingLimitId === client.id ? (
                 <div className="flex items-center gap-2 mr-auto" dir="ltr">
                   <input 
                     type="number" 
                     value={editLimitValue}
                     onChange={e => setEditLimitValue(e.target.value ? Number(e.target.value) : '')}
                     className="w-20 p-1.5 bg-bg-base border border-border-dark text-text-primary rounded-lg text-sm text-center outline-none focus:border-accent"
                     min="0"
                   />
                   <button onClick={() => handleSaveLimit(client.id)} className="bg-accent text-bg-base px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-accent/90">حفظ</button>
                   <button onClick={() => setEditingLimitId(null)} className="bg-bg-base border border-border-dark text-text-secondary px-3 py-1.5 rounded-lg text-xs font-bold hover:text-text-primary">إلغاء</button>
                 </div>
               ) : null}
               <button 
                 onClick={() => togglePassword(client.id)}
                 className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-bg-base hover:bg-bg-base/80 border border-border-dark text-text-primary rounded-lg text-sm font-bold transition-colors font-mono"
                 dir="ltr"
               >
                 <KeyRound size={16} /> 
                 <span className="hidden sm:inline">
                   {revealedPasswords[client.id] ? client.plainPass : "تغيير الباسورد"}
                 </span>
                 <span className="sm:hidden">
                   {revealedPasswords[client.id] ? client.plainPass : "باسورد"}
                 </span>
               </button>

               <button 
                 onClick={() => setDeleteId(client.id)}
                 className="p-2.5 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20 shrink-0"
               >
                 <Trash2 size={20} />
               </button>
            </div>
          </div>
        ))}

        {clients.length === 0 && !isAdding && (
          <div className="text-center py-16 text-text-secondary">
            <Users size={48} className="mx-auto mb-4 opacity-20" />
            <p>لا يوجد موزعين حالياً.</p>
          </div>
        )}
      </div>

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-bg-card border border-border-dark w-full max-w-sm rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-6">
              <h3 className="font-bold text-lg text-text-primary mb-2">تأكيد الحذف</h3>
              <p className="text-text-secondary text-sm">هل أنت متأكد من حذف هذا الموزع؟ لا يمكن التراجع عن هذا الإجراء.</p>
            </div>
            <div className="flex items-center gap-2 px-6 py-4 bg-bg-base/50 border-t border-border-dark">
              <button 
                onClick={() => setDeleteId(null)}
                className="flex-1 bg-bg-base border border-border-dark hover:bg-border-dark text-text-secondary font-bold py-2 rounded-lg transition-colors"
              >
                إلغاء
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-lg transition-colors"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
