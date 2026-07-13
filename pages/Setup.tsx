
import React, { useState } from 'react';
import { Button, Input } from '../components/UI';
import { SettingsService } from '../services/storage';
import { Shield, Store, User, CheckCircle, Lock, Mail } from 'lucide-react';

interface SetupProps {
  onComplete: () => void;
}

const Setup: React.FC<SetupProps> = ({ onComplete }) => {
  const [storeName, setStoreName] = useState('');
  const [slogan, setSlogan] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName || !ownerName || !pin || !email) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    if (pin.length < 4) {
      setError('يجب أن يتكون الرقم السري من 4 أرقام على الأقل');
      return;
    }
    if (pin !== confirmPin) {
      setError('الرقم السري غير متطابق');
      return;
    }
    
    setLoading(true);
    try {
        await SettingsService.initializeSystem(storeName, slogan, ownerName, pin, email);
        onComplete();
    } catch (e) {
        setError("فشل في إنشاء الحساب، تأكد من الاتصال بالإنترنت");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-6 animate-fade-in font-sans" dir="rtl">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
           <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gold-600 shadow-xl shadow-gold-600/30 mb-4 border-4 border-gray-800">
               <Shield size={48} className="text-white" />
           </div>
           <h1 className="text-3xl font-bold text-white mb-2">Gold Master Egypt</h1>
           <p className="text-gray-400">إعداد النظام لأول مرة (حساب المدير)</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
           <div className="bg-gold-500 p-4 text-center">
              <h2 className="text-xl font-bold text-white">بيانات التأسيس</h2>
              <p className="text-gold-100 text-sm">أدخل بيانات المحل والمدير لإنشاء قاعدة البيانات</p>
           </div>
           
           <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center font-bold border border-red-200">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Store size={16} className="text-gold-500" /> بيانات المحل
                    </label>
                    <Input 
                      placeholder="اسم المحل (مثال: مجوهرات الأمانة)" 
                      value={storeName} 
                      onChange={e => setStoreName(e.target.value)} 
                      required
                    />
                    <Input 
                      placeholder="وصف مختصر / شعار (Slogan)" 
                      value={slogan} 
                      onChange={e => setSlogan(e.target.value)} 
                    />
                 </div>

                 <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-4"></div>

                 <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <User size={16} className="text-gold-500" /> بيانات المدير (المالك)
                    </label>
                    <Input 
                      placeholder="اسم المدير المسؤول" 
                      value={ownerName} 
                      onChange={e => setOwnerName(e.target.value)} 
                      required
                    />
                    <Input 
                      placeholder="البريد الإلكتروني (لتسجيل الدخول)" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      type="email"
                      required
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <Input 
                           type="password"
                           placeholder="الرقم السري للمدير" 
                           value={pin} 
                           onChange={e => setPin(e.target.value)} 
                           required
                           maxLength={8}
                        />
                     </div>
                     <div>
                        <Input 
                           type="password"
                           placeholder="تأكيد الرقم السري" 
                           value={confirmPin} 
                           onChange={e => setConfirmPin(e.target.value)} 
                           required
                           maxLength={8}
                        />
                     </div>
                 </div>
                 <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Lock size={12} /> يستخدم هذا البريد والكود للدخول من أي جهاز.
                 </p>
              </div>

              <Button type="submit" className="w-full h-12 text-lg font-bold shadow-lg mt-6" disabled={loading}>
                  <CheckCircle size={20} /> {loading ? 'جاري إنشاء القاعدة...' : 'حفظ وبدء التشغيل'}
              </Button>
           </form>
        </div>
        
        <p className="text-center text-gray-600 text-xs mt-8">
            © 2024 Gold Master System - Secured & Cloud Synced
        </p>
      </div>
    </div>
  );
};

export default Setup;
