import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Dashboard() {
  const [stats, setStats] = useState({ expenses: 0, paid: 0, pending: 0 });

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    async function fetchStats() {
      const { data, error } = await supabase.rpc('get_dashboard_totals');
      
      if (!error && data) {
        setStats({
          expenses: data.total_expenses || 0,
          paid: data.total_paid || 0,
          pending: data.total_pending || 0
        });
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row" dir="rtl">
      {/* القائمة الجانبية */}
      <aside className="w-full md:w-64 bg-gray-900 text-white flex flex-col shadow-xl">
        <div className="p-6 text-xl font-bold border-b border-gray-800 text-center">
          إدارة المبيعات
        </div>
        <nav className="flex-1 p-4 space-y-2 mt-2">
          <Link to="/" className="block py-3 px-4 bg-blue-600 rounded-lg shadow font-medium">الرئيسية</Link>
          <Link to="/partners" className="block py-3 px-4 hover:bg-gray-800 rounded-lg transition font-medium">العملاء والمناديب</Link>
          <span className="block py-3 px-4 text-gray-400 rounded-lg cursor-not-allowed">الفواتير والمصروفات</span>
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button 
            onClick={handleLogout} 
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* المحتوى الرئيسي */}
      <main className="flex-1 p-6 md:p-10">
        <h2 className="text-3xl font-bold text-gray-800 mb-8">نظرة عامة على النظام</h2>
        
        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border-r-4 border-blue-500">
            <h3 className="text-gray-500 text-sm font-semibold mb-1">إجمالي المصروفات</h3>
            <p className="text-3xl font-bold text-gray-800">{stats.expenses} ر.س</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border-r-4 border-green-500">
            <h3 className="text-gray-500 text-sm font-semibold mb-1">المسدد</h3>
            <p className="text-3xl font-bold text-gray-800">{stats.paid} ر.س</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border-r-4 border-yellow-500">
            <h3 className="text-gray-500 text-sm font-semibold mb-1">المتبقي (قيد الانتظار)</h3>
            <p className="text-3xl font-bold text-gray-800">{stats.pending} ر.س</p>
          </div>
        </div>
      </main>
    </div>
  );
}