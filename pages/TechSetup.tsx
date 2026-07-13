
import React, { useState } from 'react';
import { Button, Input } from '../components/UI';
import { Shield, Database, Key, CheckCircle, AlertTriangle, Lock } from 'lucide-react';
import * as OTPAuth from 'otpauth';

interface TechSetupProps {
  onComplete: () => void;
}

const TechSetup: React.FC<TechSetupProps> = ({ onComplete }) => {
  const [dbUrl, setDbUrl] = useState('');
  const [dbToken, setDbToken] = useState('');
  const [activationKey, setActivationKey] = useState('');
  const [error, setError] = useState('');
  
  // Secret Key for TOTP (Base32) - Hidden from UI
  const TOTP_SECRET = "K5XW6Z3DPE5K3LMP";
  const ISSUER = "GoldMaster";
  const LABEL = "SystemActivation";

  // Generate TOTP Object
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: LABEL,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(TOTP_SECRET),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!dbUrl || !dbToken || !activationKey) {
      setError('جميع الحقول مطلوبة لتشغيل النظام');
      return;
    }

    // Validate TOTP
    // window: 1 allows for +/- 30 seconds drift
    const delta = totp.validate({ token: activationKey, window: 1 });

    if (delta === null) {
      setError('كلمة مرور التفعيل غير صحيحة.');
      return;
    }

    // Save to LocalStorage
    localStorage.setItem('sys_db_url', dbUrl.trim());
    localStorage.setItem('sys_db_token', dbToken.trim());
    
    // Proceed
    onComplete();
  };

  return (
    <div className="min-h-screen bg-[#030712] relative flex items-center justify-center p-4 md:p-6 overflow-hidden font-sans" dir="rtl">
      {/* Dynamic Background Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold-600/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[140px] animate-float"></div>
      
      <div className="w-full max-w-lg relative">
        {/* Glow border background effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-gold-600/50 to-amber-500/20 rounded-[2.5rem] blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>

        {/* Main Glassmorphic Container */}
        <div className="relative bg-[#0f172a]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] overflow-hidden">
           
           {/* Top Header */}
           <div className="bg-gradient-to-b from-white/5 to-transparent p-8 text-center border-b border-white/5 relative">
              <div className="absolute top-3 right-3 text-[10px] font-mono text-gold-500/30">BOOTLOADER V2.1</div>
              
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-gold-500/20 to-amber-600/10 mb-4 border border-gold-500/30 shadow-[0_0_30px_rgba(245,158,11,0.2)] animate-gold-glow">
                 <Shield size={44} className="text-gold-400" />
              </div>
              <h1 className="text-2xl font-black text-shimmer tracking-wider">تفعيل وتأمين النظام</h1>
              <p className="text-gray-400 text-xs mt-1 uppercase tracking-widest font-mono">Secure Configuration Console</p>
           </div>
           
           <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {error && (
                <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl text-sm flex items-center gap-3 border border-red-500/20 animate-scale-in">
                  <AlertTriangle size={20} className="shrink-0 text-red-500" />
                  <span className="font-bold">{error}</span>
                </div>
              )}

              <div className="space-y-6">
                 {/* Input: DB URL */}
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 flex items-center gap-2 mr-1">
                        <Database size={15} className="text-gold-500" />
                        <span>عنوان قاعدة البيانات (Database URL)</span>
                    </label>
                    <input 
                      className="w-full bg-[#0a0e1a]/60 border border-white/5 text-white px-4 py-3.5 rounded-2xl focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/30 outline-none font-mono text-sm transition-all placeholder-gray-700"
                      placeholder="libsql://your-db-url.turso.io" 
                      value={dbUrl} 
                      onChange={e => setDbUrl(e.target.value)} 
                    />
                 </div>

                 {/* Input: DB Token */}
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 flex items-center gap-2 mr-1">
                        <Key size={15} className="text-gold-500" />
                        <span>رمز الاتصال (Database Token)</span>
                    </label>
                    <textarea 
                      className="w-full bg-[#0a0e1a]/60 border border-white/5 text-white px-4 py-3 rounded-2xl focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/30 outline-none font-mono text-xs h-24 resize-none transition-all placeholder-gray-700 p-3.5 leading-relaxed"
                      placeholder="أدخل رمز الاتصال الطويل هنا (eyJ...)" 
                      value={dbToken} 
                      onChange={e => setDbToken(e.target.value)} 
                    />
                 </div>

                 <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-white/5"></div>
                    </div>
                 </div>

                 {/* Input: TOTP Activation Key */}
                 <div className="space-y-3 bg-[#0a0e1a]/40 p-5 rounded-[2rem] border border-white/5">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-black text-gold-400 uppercase flex items-center gap-2 mr-1">
                            <Lock size={15} />
                            <span>رمز تفعيل الأمان (2FA Token)</span>
                        </label>
                    </div>

                    <input 
                      type="password"
                      inputMode="numeric"
                      placeholder="••••••" 
                      value={activationKey} 
                      onChange={e => setActivationKey(e.target.value)} 
                      className="w-full text-center tracking-[0.6em] font-bold text-2xl h-14 bg-black/60 border border-gold-900/60 focus:border-gold-500/80 rounded-2xl outline-none transition-all text-gold-400 placeholder-gray-800"
                      maxLength={6}
                    />
                    <p className="text-[10px] text-gray-500 text-center font-medium">أدخل رمز الـ 6 أرقام النشط من تطبيق التحقق (Google Authenticator)</p>
                 </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                className="w-full h-14 rounded-2xl text-base font-black transition-all bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-black shadow-lg shadow-gold-500/10 hover:shadow-gold-500/25 flex items-center justify-center gap-2 active:scale-[0.98] mt-4"
              >
                  <CheckCircle size={20} strokeWidth={2.5} />
                  <span>تأكيد والاتصال بالخادم</span>
              </button>
           </form>
           
           {/* Footer status */}
           <div className="bg-black/40 py-3.5 border-t border-white/5 text-center">
             <p className="text-[10px] text-gray-500 font-mono tracking-wider">
                MILITARY-GRADE ENCRYPTION • SECURED WITH TOTP
             </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TechSetup;
