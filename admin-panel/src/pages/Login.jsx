import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError('بيانات الدخول غير صحيحة');
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100" dir="rtl">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">تسجيل الدخول للإدارة</h2>
        
        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">البريد الإلكتروني</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">كلمة المرور</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200"
          >
            {loading ? 'جاري التحقق...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  );
}