import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Server, Trash2, Plus, Link as LinkIcon, Unlink, Edit2, X } from 'lucide-react';

export default function AdminServers() {
  const { token } = useAuth();
  const [servers, setServers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerIp, setNewServerIp] = useState('');
  const [newServerPort, setNewServerPort] = useState<number | ''>(443);
  const [newServerUsername, setNewServerUsername] = useState('');
  const [newServerPassword, setNewServerPassword] = useState('');
  const [newServerPanelUrl, setNewServerPanelUrl] = useState('');
  const [newServerType, setNewServerType] = useState('X-UI');
  const [newServerInboundId, setNewServerInboundId] = useState<number | ''>(1);
  const [newServerLimit, setNewServerLimit] = useState<number | ''>(200);
  const [newServerStatus, setNewServerStatus] = useState('نشط');
  const [errorMsg, setErrorMsg] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [editingServer, setEditingServer] = useState<any>(null);
  const [editErrorMsg, setEditErrorMsg] = useState('');

  const fetchServers = async () => {
    const res = await fetch('/api/admin/servers', { headers: { Authorization: `Bearer ${token}` } });
    if(res.ok) setServers(await res.json());
  };

  const fetchClients = async () => {
    const res = await fetch('/api/admin/clients', { headers: { Authorization: `Bearer ${token}` } });
    if(res.ok) setClients(await res.json());
  };

  useEffect(() => {
    fetchServers();
    fetchClients();
  }, [token]);

  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!newServerName || !newServerIp || !newServerPort || !newServerUsername || !newServerPassword || !newServerPanelUrl || !newServerType || !newServerInboundId || !newServerLimit || !newServerStatus) {
      setErrorMsg('جميع الحقول مطلوبة');
      return;
    }
    
    try {
      const res = await fetch('/api/admin/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          name: newServerName, 
          ip: newServerIp, 
          port: Number(newServerPort),
          username: newServerUsername,
          password: newServerPassword,
          panelUrl: newServerPanelUrl,
          type: newServerType,
          inboundId: Number(newServerInboundId),
          limit: Number(newServerLimit),
          status: newServerStatus
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
         setErrorMsg(data.error || 'حدث خطأ أثناء إضافة السيرفر');
         return;
      }
      
      setNewServerName('');
      setNewServerIp('');
      setNewServerPort(443);
      setNewServerUsername('');
      setNewServerPassword('');
      setNewServerPanelUrl('');
      setNewServerType('X-UI');
      setNewServerInboundId(1);
      setNewServerLimit(200);
      setNewServerStatus('نشط');
      setIsAdding(false);
      fetchServers();
    } catch(err) {
      console.error(err);
      setErrorMsg('تعذر الاتصال بالخادم');
    }
  };

  const confirmDelete = async () => {
    if(!deleteId) return;
    await fetch(`/api/admin/servers/${deleteId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    setDeleteId(null);
    fetchServers();
  };

  const handleEditServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditErrorMsg('');
    if (!editingServer || !editingServer.name || !editingServer.ip || !editingServer.port || !editingServer.username || !editingServer.panelUrl || !editingServer.type || !editingServer.inboundId || !editingServer.limit || !editingServer.status) {
      setEditErrorMsg('جميع الحقول مطلوبة');
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/servers/${editingServer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          name: editingServer.name, 
          ip: editingServer.ip, 
          port: Number(editingServer.port),
          username: editingServer.username,
          password: editingServer.password || undefined, // Send password only if it's changed
          panelUrl: editingServer.panelUrl,
          type: editingServer.type,
          inboundId: Number(editingServer.inboundId),
          limit: Number(editingServer.limit),
          status: editingServer.status
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
         setEditErrorMsg(data.error || 'حدث خطأ أثناء تعديل السيرفر');
         return;
      }
      
      setEditingServer(null);
      fetchServers();
    } catch(err) {
      console.error(err);
      setEditErrorMsg('تعذر الاتصال بالخادم');
    }
  };



  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
        <div>
           <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">إدارة السيرفرات</h1>
           <p className="text-text-secondary text-sm sm:text-base">إضافة وتعديل وحذف سيرفرات الشبكة.</p>
        </div>
        <button 
          onClick={() => {
            setIsAdding(!isAdding);
            setErrorMsg('');
          }}
          className="w-full sm:w-auto bg-accent text-bg-base px-6 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-accent/90 transition-all border border-accent"
        >
          <Plus size={18} /> {isAdding ? "إلغاء" : "إضافة سيرفر"}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddServer} className="bg-bg-card p-6 rounded-xl border border-border-dark mb-8 animate-in fade-in slide-in-from-top-4">
           <h3 className="font-bold text-lg mb-4 text-text-primary">إضافة سيرفر جديد</h3>
           
           {errorMsg && (
             <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg mb-4 text-sm font-bold">
               {errorMsg}
             </div>
           )}

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                 <label className="block text-sm font-semibold mb-2 text-text-secondary">اسم السيرفر</label>
                 <input 
                   autoFocus
                   type="text" 
                   value={newServerName} onChange={e => setNewServerName(e.target.value)} required
                   className="w-full p-2.5 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent text-left font-mono text-sm" dir="ltr"
                 />
              </div>
              <div>
                 <label className="block text-sm font-semibold mb-2 text-text-secondary">IP السيرفر</label>
                 <input 
                   type="text" 
                   value={newServerIp} onChange={e => setNewServerIp(e.target.value)} required
                   className="w-full p-2.5 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent text-left font-mono text-sm" dir="ltr"
                 />
              </div>
              <div>
                 <label className="block text-sm font-semibold mb-2 text-text-secondary">Port</label>
                 <input 
                   type="number" 
                   value={newServerPort} onChange={e => setNewServerPort(e.target.value ? Number(e.target.value) : '')} required
                   className="w-full p-2.5 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent text-left font-mono text-sm" dir="ltr"
                 />
              </div>
              <div>
                 <label className="block text-sm font-semibold mb-2 text-text-secondary">اسم مستخدم اللوحة (Panel Username)</label>
                 <input 
                   type="text" 
                   value={newServerUsername} onChange={e => setNewServerUsername(e.target.value)} required
                   className="w-full p-2.5 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent text-left font-mono text-sm" dir="ltr"
                 />
              </div>
              <div>
                 <label className="block text-sm font-semibold mb-2 text-text-secondary">كلمة مرور اللوحة (Panel Password)</label>
                 <input 
                   type="text" 
                   value={newServerPassword} onChange={e => setNewServerPassword(e.target.value)} required
                   className="w-full p-2.5 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent text-left font-mono text-sm" dir="ltr"
                 />
              </div>
              <div>
                 <label className="block text-sm font-semibold mb-2 text-text-secondary">رابط اللوحة (Panel URL)</label>
                 <input 
                   type="text" 
                   value={newServerPanelUrl} onChange={e => setNewServerPanelUrl(e.target.value)} required
                   className="w-full p-2.5 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent text-left font-mono text-sm" dir="ltr"
                 />
              </div>
              <div>
                 <label className="block text-sm font-semibold mb-2 text-text-secondary">نوع السيرفر</label>
                 <select 
                   value={newServerType} onChange={e => setNewServerType(e.target.value)} required
                   className="w-full p-2.5 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent text-left font-mono text-sm" dir="ltr"
                 >
                   <option value="X-UI">X-UI</option>
                   <option value="3X-UI">3X-UI</option>
                   <option value="V2Ray">V2Ray</option>
                   <option value="SSH">SSH</option>
                 </select>
              </div>
              <div>
                 <label className="block text-sm font-semibold mb-2 text-text-secondary">Inbound ID</label>
                 <input 
                   type="number" 
                   value={newServerInboundId} onChange={e => setNewServerInboundId(e.target.value ? Number(e.target.value) : '')} required min="1"
                   className="w-full p-2.5 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent text-left font-mono text-sm" dir="ltr"
                 />
              </div>
              <div>
                 <label className="block text-sm font-semibold mb-2 text-text-secondary">الحد الأقصى للمستخدمين</label>
                 <input 
                   type="number" 
                   value={newServerLimit} onChange={e => setNewServerLimit(e.target.value ? Number(e.target.value) : '')} required min="1"
                   className="w-full p-2.5 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent text-left font-mono text-sm" dir="ltr"
                 />
              </div>
              <div>
                 <label className="block text-sm font-semibold mb-2 text-text-secondary">الحالة (Status)</label>
                 <select 
                   value={newServerStatus} onChange={e => setNewServerStatus(e.target.value)} required
                   className="w-full p-2.5 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent font-bold text-sm"
                 >
                   <option value="نشط">نشط</option>
                   <option value="غير نشط">غير نشط</option>
                 </select>
              </div>
           </div>
           
           <div className="flex justify-end border-t border-border-dark pt-4 mt-2">
             <button type="submit" className="bg-accent/10 border border-accent/20 text-accent hover:bg-accent hover:text-bg-base font-bold px-8 py-2.5 rounded-lg transition-colors">
               حفظ السيرفر
             </button>
           </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4">
        {servers.map(server => (
          <div key={server.id} className="bg-bg-card p-4 sm:p-6 rounded-xl border border-border-dark flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-4 w-full md:w-auto">
               <div className="bg-accent/10 border border-accent/20 text-accent w-12 h-12 rounded-lg flex items-center justify-center shrink-0">
                 <Server size={24} />
               </div>
               <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-base sm:text-lg text-text-primary font-mono truncate" dir="ltr">{server.name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                     <p className="text-text-secondary text-xs sm:text-sm font-mono shrink-0">{server.ip || "No IP"}</p>
                     {server.status && (
                       <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${server.status === 'نشط' ? 'bg-success/10 text-success' : 'bg-red-500/10 text-red-500'}`}>
                         {server.status}
                       </span>
                     )}
                     {server.type && (
                        <span className="text-[10px] bg-border-dark/50 text-text-secondary px-2 py-0.5 rounded-full font-bold font-mono">
                          {server.type}
                        </span>
                     )}
                     {server.createdAt && (
                       <span className="text-[10px] text-text-secondary bg-bg-base border border-border-dark px-2 py-0.5 rounded-full">
                         {new Date(server.createdAt).toLocaleDateString('en-GB')}
                       </span>
                     )}
                  </div>
               </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center w-full md:w-auto gap-4">
              <div className="flex items-center justify-center bg-bg-base border border-border-dark px-6 py-3 rounded-lg min-w-[120px] w-full sm:w-auto">
                 <div className="text-center">
                    <p className="text-[11px] uppercase tracking-widest font-bold text-text-secondary mb-1">المستخدمين</p>
                    <p className="font-bold text-text-primary font-mono">{server.userCount} / {server.limit || 200}</p>
                 </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                 {server.clientName !== "None" && (
                    <div className="flex-1 sm:flex-none flex flex-wrap items-center justify-start gap-2 bg-success/10 text-success px-4 py-2 rounded-lg border border-success/20 min-w-0">
                       <span className="text-sm font-bold text-center">الموزعين: <span className="font-mono text-center">{server.clientName}</span></span>
                    </div>
                 )}

                 <button 
                   onClick={() => {
                     setEditErrorMsg('');
                     setEditingServer({
                        ...server,
                        password: '' // Don't put the password in the form by default
                     });
                   }}
                   className="p-2.5 text-text-secondary hover:text-primary hover:bg-white/5 rounded-lg transition-colors border border-transparent shrink-0"
                 >
                   <Edit2 size={20} />
                 </button>
                 <button 
                   onClick={() => setDeleteId(server.id)}
                   className="p-2.5 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20 shrink-0"
                 >
                   <Trash2 size={20} />
                 </button>
              </div>
            </div>
          </div>
        ))}

        {servers.length === 0 && !isAdding && (
          <div className="text-center py-16 text-text-secondary">
            <Server size={48} className="mx-auto mb-4 opacity-20" />
            <p>لا توجد سيرفرات حالياً.</p>
          </div>
        )}
      </div>

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-bg-card border border-border-dark w-full max-w-sm rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-6">
              <h3 className="font-bold text-lg text-text-primary mb-2">تأكيد الحذف</h3>
              <p className="text-text-secondary text-sm">هل أنت متأكد من حذف هذا السيرفر؟ لا يمكن التراجع عن هذا الإجراء.</p>
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

      {editingServer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-bg-card border border-border-dark w-full max-w-3xl rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95 my-auto">
            <div className="flex justify-between items-center p-6 border-b border-border-dark">
              <h3 className="font-bold text-xl text-text-primary">تعديل السيرفر</h3>
              <button onClick={() => setEditingServer(null)} className="text-text-secondary hover:text-text-primary">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleEditServer} className="p-6">
              {editErrorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg mb-4 text-sm font-bold">
                  {editErrorMsg}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                   <label className="block text-sm font-semibold mb-2 text-text-secondary">اسم السيرفر</label>
                   <input 
                     type="text" 
                     value={editingServer.name || ''} onChange={e => setEditingServer({...editingServer, name: e.target.value})} required
                     className="w-full p-2.5 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent text-left font-mono text-sm" dir="ltr"
                   />
                </div>
                <div>
                   <label className="block text-sm font-semibold mb-2 text-text-secondary">IP السيرفر</label>
                   <input 
                     type="text" 
                     value={editingServer.ip || ''} onChange={e => setEditingServer({...editingServer, ip: e.target.value})} required
                     className="w-full p-2.5 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent text-left font-mono text-sm" dir="ltr"
                   />
                </div>
                <div>
                   <label className="block text-sm font-semibold mb-2 text-text-secondary">Port</label>
                   <input 
                     type="number" 
                     value={editingServer.port || ''} onChange={e => setEditingServer({...editingServer, port: e.target.value})} required
                     className="w-full p-2.5 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent text-left font-mono text-sm" dir="ltr"
                   />
                </div>
                <div>
                   <label className="block text-sm font-semibold mb-2 text-text-secondary">اسم مستخدم اللوحة</label>
                   <input 
                     type="text" 
                     value={editingServer.username || ''} onChange={e => setEditingServer({...editingServer, username: e.target.value})} required
                     className="w-full p-2.5 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent text-left font-mono text-sm" dir="ltr"
                   />
                </div>
                <div>
                   <label className="block text-sm font-semibold mb-2 text-text-secondary">كلمة مرور اللوحة (اختياري)</label>
                   <input 
                     type="text" 
                     placeholder="اتركه فارغاً للاحتفاظ بكلمة المرور القديمة"
                     value={editingServer.password || ''} onChange={e => setEditingServer({...editingServer, password: e.target.value})}
                     className="w-full p-2.5 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent text-left font-mono text-sm" dir="ltr"
                   />
                </div>
                <div>
                   <label className="block text-sm font-semibold mb-2 text-text-secondary">رابط اللوحة</label>
                   <input 
                     type="text" 
                     value={editingServer.panelUrl || ''} onChange={e => setEditingServer({...editingServer, panelUrl: e.target.value})} required
                     className="w-full p-2.5 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent text-left font-mono text-sm" dir="ltr"
                   />
                </div>
                <div>
                   <label className="block text-sm font-semibold mb-2 text-text-secondary">نوع السيرفر</label>
                   <select 
                     value={editingServer.type || 'X-UI'} onChange={e => setEditingServer({...editingServer, type: e.target.value})} required
                     className="w-full p-2.5 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent text-left font-mono text-sm" dir="ltr"
                   >
                     <option value="X-UI">X-UI</option>
                     <option value="3X-UI">3X-UI</option>
                     <option value="V2Ray">V2Ray</option>
                     <option value="SSH">SSH</option>
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-semibold mb-2 text-text-secondary">Inbound ID</label>
                   <input 
                     type="number" 
                     value={editingServer.inboundId || ''} onChange={e => setEditingServer({...editingServer, inboundId: e.target.value})} required min="1"
                     className="w-full p-2.5 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent text-left font-mono text-sm" dir="ltr"
                   />
                </div>
                <div>
                   <label className="block text-sm font-semibold mb-2 text-text-secondary">الحد الأقصى للمستخدمين</label>
                   <input 
                     type="number" 
                     value={editingServer.limit || ''} onChange={e => setEditingServer({...editingServer, limit: e.target.value})} required min="1"
                     className="w-full p-2.5 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent text-left font-mono text-sm" dir="ltr"
                   />
                </div>
                <div>
                   <label className="block text-sm font-semibold mb-2 text-text-secondary">الحالة (Status)</label>
                   <select 
                     value={editingServer.status || 'نشط'} onChange={e => setEditingServer({...editingServer, status: e.target.value})} required
                     className="w-full p-2.5 bg-bg-base border border-border-dark text-text-primary rounded-lg outline-none focus:border-accent font-bold text-sm"
                   >
                     <option value="نشط">نشط</option>
                     <option value="غير نشط">غير نشط</option>
                   </select>
                </div>
              </div>
              <div className="flex justify-end pt-4 mt-2">
                <button type="submit" className="bg-accent text-bg-base hover:bg-accent/90 font-bold px-8 py-2.5 rounded-lg transition-colors flex w-full sm:w-auto items-center justify-center">
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
