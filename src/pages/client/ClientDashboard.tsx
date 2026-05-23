import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Wifi, Clock, Activity, LogOut, HardDrive, BarChart2, Check, Copy, UserPlus, X, Edit2, Save, QrCode, ScanLine } from 'lucide-react';
import ThemeSwitcher from '../../components/ThemeSwitcher';
import { QRCodeSVG } from 'qrcode.react';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function ClientDashboard() {
  const { user, token, logout } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUser, setGeneratedUser] = useState<any>(null);
  const [generateError, setGenerateError] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedV2RayId, setCopiedV2RayId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [showQrForLink, setShowQrForLink] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState('');


  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/client/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if(res.ok) setData(await res.json());
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDashboard();
    
    // Auto refresh every 30 seconds for live feel
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const handleSaveDisplayName = async (userId: string) => {
    try {
      const res = await fetch(`/api/client/users/${userId}/display-name`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ displayName: editDisplayName })
      });
      if (res.ok) {
        await fetchDashboard();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEditingUserId(null);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError('');
    setGeneratedUser(null);
    setCopied(false);
    try {
      const res = await fetch('/api/client/users/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) {
        setGenerateError(json.error || 'حدث خطأ أثناء توليد المستخدم');
      } else {
        setGeneratedUser(json);
        // Refresh dashboard to show new user
        const resDash = await fetch('/api/client/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if(resDash.ok) setData(await resDash.json());
      }
    } catch(e: any) {
      let msg = e.message || 'تعذر الاتصال بالخادم';
      if (msg === "Failed to fetch") msg = "تعذر الاتصال بخادم التطبيق. يرجى المحاولة مرة أخرى.";
      setGenerateError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedUser?.vlessUrl) {
      navigator.clipboard.writeText(generatedUser.vlessUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if(!data) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-bg-base">
         <div className="animate-spin text-accent mb-4"><Activity size={40} /></div>
         <p className="text-text-secondary font-bold">جاري تحميل البيانات...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Navbar */}
      <nav className="bg-bg-card border-b border-border-dark sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-between items-center py-3 sm:h-16 gap-3 sm:gap-0">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-accent to-blue-500 rounded-md p-1.5 text-bg-base shrink-0">
                <Wifi size={20} className="sm:w-6 sm:h-6" />
              </div>
              <span className="font-bold text-lg sm:text-xl text-text-primary tracking-widest hidden sm:block">VERTEX</span>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
              <div className="hidden md:block">
                <ThemeSwitcher />
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-1.5 bg-bg-base rounded-md border border-border-dark">
                 <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0"></span>
                 <span className="text-xs sm:text-sm font-bold text-text-primary font-mono truncate max-w-[100px] sm:max-w-none">{user?.username}</span>
              </div>
              <button 
                onClick={logout}
                className="text-text-secondary hover:text-text-primary transition-colors p-1"
                title="تسجيل الخروج"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
          {/* Mobile Theme Switcher (sub-nav) */}
          <div className="md:hidden py-2 border-t border-border-dark flex justify-center">
             <ThemeSwitcher />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 animate-in fade-in duration-500 overflow-x-hidden relative">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
           <h1 className="text-xl sm:text-2xl font-bold text-text-primary">نظرة عامة</h1>
           <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
             <button
               onClick={() => setIsScanning(true)}
               className="w-full sm:w-auto bg-bg-card text-text-primary px-6 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-white/5 transition-all border border-border-dark shadow-sm"
             >
               <ScanLine size={18} />
               مسح بالكاميرا
             </button>
             <button
               onClick={handleGenerate}
               disabled={isGenerating}
               className="w-full sm:w-auto bg-accent text-bg-base px-6 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-accent/90 transition-all border border-accent disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_15px_var(--color-accent)] shadow-accent/20"
             >
               <UserPlus size={18} />
               {isGenerating ? "جاري التوليد..." : "توليد مستخدم V2 جديد"}
             </button>
           </div>
         </div>

         {/* Error Generate User */}
         {generateError && (
             <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 font-bold flex justify-between items-center w-full max-w-sm ml-auto mr-auto sm:ml-0">
               <span>{generateError}</span>
               <button onClick={() => setGenerateError('')} className="p-1 hover:bg-red-500/20 rounded-md">
                 <X size={16} />
               </button>
             </div>
         )}
         
         {/* Stats Row */}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12">
            {[
              { title: 'إجمالي المستخدمين', value: `${data.totalUsers} / ${data.clientLimit || 0}`, icon: Users, c1: "bg-accent/10 border-accent/20 text-accent", border: 'border-border-dark' },
              { title: 'المتصلين الآن', value: data.onlineUsers, icon: Wifi, c1: "bg-success/10 border-success/20 text-success", border: 'border-border-dark' },
              { title: 'الاستهلاك الكلي', value: `${data.totalUsage} GB`, icon: BarChart2, c1: "bg-purple-500/10 border-purple-500/20 text-purple-400", border: 'border-border-dark' },
              { title: 'المتبقي من الباقة', value: `${data.remainingData} GB`, icon: HardDrive, c1: "bg-blue-500/10 border-blue-500/20 text-blue-400", border: 'border-border-dark' },
            ].map((stat, i) => (
              <div key={i} className={`bg-bg-card rounded-xl p-5 sm:p-6 border ${stat.border}`}>
                 <div className="flex justify-between items-start mb-4">
                   <p className="text-text-secondary uppercase text-[10px] sm:text-[11px] font-bold tracking-widest">{stat.title}</p>
                   <div className={`p-1.5 sm:p-2 rounded-lg border ${stat.c1}`}><stat.icon size={18} className="sm:w-5 sm:h-5" /></div>
                 </div>
                 <h2 className="text-2xl sm:text-3xl font-bold text-text-primary font-mono" dir="ltr">{stat.value}</h2>
              </div>
            ))}
         </div>

         <div className="bg-bg-card rounded-xl border border-border-dark overflow-hidden flex flex-col w-full">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border-dark flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <Activity className="text-text-secondary" size={18} />
                  <h3 className="font-bold text-text-primary text-sm">تفاصيل السيرفرات والمشتركين</h3>
               </div>
            </div>
            
            <div className="overflow-x-auto w-full pb-2">
               <table className="w-full text-right text-sm border-collapse min-w-[700px]">
                  <thead className="bg-[#1e232e] text-text-secondary text-[10px] sm:text-[11px] uppercase tracking-wider font-bold">
                     <tr>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border-dark">اسم المستخدم</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border-dark">السيرفر</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-center border-b border-border-dark">الاستهلاك</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-center border-b border-border-dark">المتبقي</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-center border-b border-border-dark">الأيام المتبقية</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-center border-b border-border-dark">الحالة</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dark bg-bg-card">
                     {data.usersList.map((u: any, idx: number) => (
                       <tr key={idx} className="hover:bg-white/5 transition-colors group">
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-text-primary text-xs sm:text-[13px]" dir="ltr">
                             <div className="flex items-center gap-2">
                               <span className="font-mono text-text-secondary">{u.username}</span>
                               {editingUserId === u.id ? (
                                 <div className="flex items-center gap-1">
                                   <input
                                     type="text"
                                     value={editDisplayName}
                                     onChange={(e) => setEditDisplayName(e.target.value)}
                                     className="bg-bg-base border border-border-dark text-text-primary text-xs px-2 py-1 rounded w-32 focus:outline-none focus:border-primary"
                                     placeholder="تسمية (اختياري)"
                                     autoFocus
                                     onKeyDown={(e) => { if (e.key === 'Enter') handleSaveDisplayName(u.id); }}
                                   />
                                   <button 
                                     onClick={() => handleSaveDisplayName(u.id)}
                                     className="p-1 text-success hover:bg-success/20 rounded transition-colors"
                                     title="حفظ"
                                   >
                                     <Save size={14} />
                                   </button>
                                   <button 
                                     onClick={() => setEditingUserId(null)}
                                     className="p-1 text-text-secondary hover:bg-white/10 rounded transition-colors"
                                     title="إلغاء"
                                   >
                                     <X size={14} />
                                   </button>
                                 </div>
                               ) : (
                                 <div className="flex items-center gap-2">
                                   {u.displayName && (
                                     <span className="bg-bg-base border border-border-dark px-2 py-0.5 rounded text-primary font-bold text-[10px]">
                                       {u.displayName}
                                     </span>
                                   )}
                                   <button
                                     onClick={() => {
                                       setEditingUserId(u.id);
                                       setEditDisplayName(u.displayName || "");
                                     }}
                                     className="p-1 text-text-secondary hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                                     title="تعديل اسم الزبون"
                                   >
                                     <Edit2 size={13} />
                                   </button>
                                   {u.v2rayLink && (
                                     <>
                                       <button
                                         onClick={() => {
                                           navigator.clipboard.writeText(u.v2rayLink);
                                           setCopiedV2RayId(u.id);
                                           setTimeout(() => setCopiedV2RayId(null), 2000);
                                         }}
                                         className="p-1 text-text-secondary hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                                         title="نسخ رابط V2Ray"
                                       >
                                         {copiedV2RayId === u.id ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                                       </button>
                                       <button
                                         onClick={() => {
                                           setShowQrForLink(u.v2rayLink);
                                         }}
                                         className="p-1 text-text-secondary hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                                         title="عرض الباركود"
                                       >
                                         <QrCode size={13} />
                                       </button>
                                     </>
                                   )}
                                 </div>
                               )}
                             </div>
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-text-secondary text-[11px] sm:text-xs">{u.serverName}</td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-center font-mono text-xs sm:text-[13px]">
                             <span className="text-text-primary font-bold">
                                {u.usageGb} GB
                             </span>
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-center font-mono text-xs sm:text-[13px]">
                             <span className="text-success font-bold">
                                {u.remainingGb} GB
                             </span>
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-center font-mono">
                             <div className="flex items-center justify-center gap-1.5 text-text-secondary text-xs sm:text-[13px]">
                                <Clock size={14} /> <span>{u.daysRatio}</span>
                             </div>
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-center">
                             {u.isOnline ? (
                                <span className="inline-flex items-center gap-1.5 text-success font-bold text-[10px] sm:text-[11px] tracking-wider uppercase">
                                   <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-success shadow-[0_0_8px_var(--color-success)]"></div>
                                   Online
                                </span>
                             ) : (
                                <span className="inline-flex items-center gap-1.5 text-text-secondary font-bold text-[10px] sm:text-[11px] tracking-wider uppercase">
                                   <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-500"></div>
                                   Offline
                                </span>
                             )}
                          </td>
                       </tr>
                     ))}
                     {data.usersList.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 sm:px-6 py-8 sm:py-12 text-center text-text-secondary text-sm">
                             لا يوجد مستخدمين مسجلين حالياً.
                          </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      </main>

      {/* Generated User Modal */}
      {generatedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-bg-card border border-border-dark w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 sm:p-8 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-success">تم التوليد بنجاح!</h3>
              <button 
                onClick={() => setGeneratedUser(null)}
                className="p-2 bg-bg-base hover:bg-border-dark rounded-full text-text-secondary transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="flex flex-col items-center mb-6 p-4 bg-bg-base border border-border-dark rounded-xl">
              <span className="text-xs text-text-secondary font-bold uppercase tracking-widest mb-2">الاسم التلقائي</span>
              <span className="text-2xl font-bold text-text-primary font-mono tracking-widest">{generatedUser.username}</span>
            </div>

            <div className="flex flex-col items-center mb-6 bg-white p-4 rounded-xl border-4 border-bg-base shadow-sm">
                <QRCodeSVG 
                  value={generatedUser.vlessUrl} 
                  size={200} 
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="Q"
                />
            </div>
            
            <div className="flex flex-col gap-2 relative">
               <label className="text-xs text-text-secondary font-bold uppercase tracking-widest pl-1">VLESS URL</label>
               <input 
                 type="text" 
                 readOnly 
                 value={generatedUser.vlessUrl} 
                 className="w-full bg-bg-base border border-border-dark p-3.5 pr-12 rounded-xl text-text-primary outline-none font-mono text-xs focus:border-accent selection:bg-accent/30"
                 dir="ltr"
                 onClick={(e) => e.currentTarget.select()}
               />
               <button 
                 onClick={copyToClipboard}
                 className="absolute bottom-2 right-2 p-2 bg-accent text-bg-base rounded-lg hover:bg-accent/90 transition-colors shadow-none"
                 title="نسخ الرابط"
               >
                 {copied ? <Check size={16} /> : <Copy size={16} />}
               </button>
            </div>
          </div>
        </div>
      )}

      {showQrForLink && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-bg-card border border-border-dark w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 items-center animate-in zoom-in-95">
            <div className="flex justify-between items-center w-full mb-6">
              <h3 className="font-bold text-lg text-text-primary">مسح الباركود</h3>
              <button 
                onClick={() => setShowQrForLink(null)}
                className="text-text-secondary hover:text-text-primary bg-bg-base hover:bg-white/5 p-2 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="bg-white p-4 rounded-xl border-4 border-bg-base shadow-sm mt-2">
               <QRCodeSVG 
                 value={showQrForLink} 
                 size={220} 
                 bgColor="#ffffff"
                 fgColor="#000000"
                 level="Q"
               />
            </div>
             <p className="mt-6 text-sm text-center text-text-secondary font-medium">امسح الباركود باستخدام التطبيق الخاص بك</p>
          </div>
        </div>
      )}

      {isScanning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-bg-card border border-border-dark w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 items-center animate-in zoom-in-95">
            <div className="flex justify-between items-center w-full mb-6">
              <h3 className="font-bold text-lg text-text-primary">مسح باركود بالكاميرا</h3>
              <button 
                onClick={() => {
                   setIsScanning(false);
                   setScannedResult('');
                }}
                className="text-text-secondary hover:text-text-primary bg-bg-base hover:bg-white/5 p-2 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {scannedResult ? (
              <div className="flex flex-col gap-4 w-full text-center">
                 <p className="text-success font-bold">تم المسح بنجاح!</p>
                 <div className="bg-bg-base border border-border-dark p-3 rounded-xl overflow-x-auto text-[10px] text-text-primary text-left font-mono" dir="ltr">
                    {scannedResult}
                 </div>
                 <button
                   onClick={() => {
                      navigator.clipboard.writeText(scannedResult);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                   }}
                   className="w-full bg-accent text-bg-base px-6 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-accent/90 transition-all border border-accent mt-2"
                 >
                   {copied ? <Check size={18} /> : <Copy size={18} />}
                   {copied ? "تم النسخ" : "نسخ الرابط"}
                 </button>
                 <button
                   onClick={() => setScannedResult('')}
                   className="w-full bg-bg-base text-text-secondary px-6 py-2.5 rounded-lg font-bold flex items-center justify-center hover:bg-white/5 transition-all border border-border-dark"
                 >
                   مسح باركود آخر
                 </button>
              </div>
            ) : (
                <div className="w-full flex flex-col items-center">
                  <div className="w-full rounded-xl overflow-hidden border-2 border-border-dark bg-bg-base aspect-square relative flex items-center justify-center">
                    <Scanner
                      onScan={(result) => { 
                        if (result && result.length > 0) {
                           setScannedResult(result[0].rawValue);
                        }
                      }}
                      onError={(error) => {
                         console.error(error);
                      }}
                      components={({
                         finder: false
                      } as any)}
                    />
                  </div>
                  <p className="mt-4 mb-2 text-sm text-center text-text-secondary font-medium">وجه الكاميرا نحو الباركود</p>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
