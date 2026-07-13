import React, { useState } from 'react';
import { Button, Input } from '../components/UI';
import { AuthService, SyncService } from '../services/storage';
import { Shield, Lock, Mail } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await AuthService.login(email, pin);
      if (user) {
        await SyncService.sync();
        onLoginSuccess();
      } else {
        setError('البريد الإلكتروني أو كود الدخول غير صحيح');
      }
    } catch (e) {
      setError('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-6 animate-fade-in font-sans" dir="rtl">
      <div className="w-full max-w-md relative">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-gold-600 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob"></div>
        <div className="absolute bottom-0 -right-4 w-72 h-72 bg-blue-600 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000"></div>

        <div className="bg-gray-900 border border-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10">
          <div className="p-8 pb-4 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gold-500/10 mb-4 border border-gold-500/30 shadow-lg group hover:scale-110 transition-transform duration-300">
               <Shield size={36} className="text-gold-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">تسجيل الدخول</h1>
            <p className="text-gold-500/80 text-sm mt-2 font-medium">نظام Gold Master Egypt للمجوهرات</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-6">
             {error && (
               <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl text-xs text-center font-bold border border-red-500/20">
                 {error}
               </div>
             )}

             <div className="space-y-4">
                <div>
                   <label className="text-xs font-bold text-gray-400 flex items-center gap-1.5 mb-1.5 mr-1">
                       <Mail size={14} className="text-gold-500" /> البريد الإلكتروني
                   </label>
                   <Input 
                     type="email"
                     value={email} 
                     onChange={e => setEmail(e.target.value)} 
                     required
                     placeholder="example@goldmaster.com"
                     autoFocus
                   />
                </div>

                <div>
                   <label className="text-xs font-bold text-gray-400 flex items-center gap-1.5 mb-1.5 mr-1">
                       <Lock size={14} className="text-gold-500" /> كود الدخول (PIN)
                   </label>
                   <Input 
                     type="password"
                     value={pin} 
                     onChange={e => setPin(e.target.value)} 
                     required
                     placeholder="••••"
                   />
                </div>
             </div>

             <Button type="submit" className="w-full h-13 text-base font-bold shadow-lg shadow-gold-500/20" disabled={loading}>
                 {loading ? 'جاري التحقق...' : 'دخول النظام'}
             </Button>
          </form>
          
          <div className="bg-black/30 p-5 text-center text-xs text-gray-500 border-t border-white/5">
              للدعم الفني وتفعيل حسابات جديدة يرجى مراجعة مدير الفرع.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
