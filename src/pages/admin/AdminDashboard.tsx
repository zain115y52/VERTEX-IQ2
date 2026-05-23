import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Server, Users, Zap, ShieldCheck } from 'lucide-react';

export default function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/stats', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(setStats)
    .catch(console.error);
  }, [token]);

  if (!stats) return <div className="p-8">جاري التحميل...</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">لوحة الإحصائيات</h1>
      <p className="text-text-secondary mb-8">نظرة عامة على النظام والموارد.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: "إجمالي السيرفرات", value: stats.totalServers, icon: Server, color: "bg-accent/10 border-accent/20 text-accent" },
          { label: "الموزعين (العملاء)", value: stats.totalClients, icon: ShieldCheck, color: "bg-success/10 border-success/20 text-success" },
          { label: "المستخدمين النشطين", value: stats.totalVpnUsers, icon: Users, color: "bg-purple-500/10 border-purple-500/20 text-purple-400" },
          { label: "المتصلين الآن", value: stats.onlineVpnUsers, icon: Zap, color: "bg-red-500/10 border-red-500/20 text-red-500" },
        ].map((stat, i) => (
          <div key={i} className="bg-bg-card rounded-xl p-6 border border-border-dark flex items-center gap-4">
             <div className={`${stat.color} border w-12 h-12 rounded-lg flex items-center justify-center`}>
                <stat.icon size={24} />
             </div>
             <div>
               <p className="text-text-secondary text-xs uppercase tracking-wider font-semibold mb-1">{stat.label}</p>
               <p className="text-3xl font-bold text-text-primary font-mono">{stat.value}</p>
             </div>
          </div>
        ))}
      </div>

      <div className="mt-8 sm:mt-12 bg-bg-card rounded-xl border border-border-dark p-6 sm:p-8">
        <h2 className="text-lg sm:text-xl font-bold text-text-primary mb-4">تعليمات النظام الاساسية</h2>
        <ul className="space-y-4 text-text-secondary text-sm">
           <li className="flex gap-3 items-start sm:items-center"><div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5 sm:mt-0"></div> يتم إنشاء المستخدمين في السيرفر بشكل تلقائي بصيغة (VERTEX01, VERTEX02...) ولا حاجة للتدخل اليدوي.</li>
           <li className="flex gap-3 items-start sm:items-center"><div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5 sm:mt-0"></div> كل سيرفر يتحمل كحد أقصى 200 مستخدم.</li>
           <li className="flex gap-3 items-start sm:items-center"><div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5 sm:mt-0"></div> الاشتراكات مقفلة تلقائياً على 100 جيجابايت وصلاحية 30 يوم لضمان الاستقرار.</li>
           <li className="flex gap-3 items-start sm:items-center"><div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5 sm:mt-0"></div> الموزع يملك صلاحيات القراءة (رؤية الاستهلاك وحالة المتصلين) فقط ولا يستطيع التعديل أو كسر الحماية.</li>
        </ul>
      </div>
    </div>
  );
}
