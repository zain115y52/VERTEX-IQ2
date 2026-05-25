import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldCheck, Activity } from 'lucide-react';

export default function AdminLogs() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/logs', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
       if (Array.isArray(data)) {
           setLogs(data);
       }
       setLoading(false);
    })
    .catch((err) => {
       console.error(err);
       setLoading(false);
    });
  }, [token]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Activity className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8 border-b border-border-dark pb-6">
        <div className="bg-accent/10 p-3 rounded-xl">
           <ShieldCheck size={28} className="text-accent" />
        </div>
        <div>
           <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">سجلات النظام (الأمان)</h1>
           <p className="text-text-secondary text-sm sm:text-base">عرض أحدث 200 نشاط في النظام للحماية والتدقيق.</p>
        </div>
      </div>

      <div className="bg-bg-card rounded-xl border border-border-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-bg-base/50 text-text-secondary border-b border-border-dark font-mono uppercase">
              <tr>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">الوقت</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">الإجراء</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">المستخدم</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">IP</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap w-2/3">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-secondary">لا توجد سجلات حالياً</td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-text-secondary whitespace-nowrap font-mono" dir="ltr">
                       {new Date(log.createdAt).toLocaleString('en-GB')}
                    </td>
                    <td className="px-6 py-4 font-bold text-accent whitespace-nowrap">
                       {log.action}
                    </td>
                    <td className="px-6 py-4 text-text-primary whitespace-nowrap font-mono">
                       {log.username || '-'}
                    </td>
                    <td className="px-6 py-4 text-text-secondary whitespace-nowrap font-mono">
                       {log.ipAddress || '-'}
                    </td>
                    <td className="px-6 py-4 text-text-secondary text-xs sm:text-sm truncate max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-xl" title={log.details}>
                       {log.details || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
