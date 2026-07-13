
import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflineScreen = () => {
  return (
    <div className="fixed inset-0 z-[99999] bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
        <div className="relative bg-[#1e293b] p-6 rounded-full border-2 border-red-500/50 shadow-2xl">
           <WifiOff size={64} className="text-red-500" />
        </div>
      </div>

      <h1 className="text-3xl font-bold text-white mb-4">انقطع الاتصال بالإنترنت</h1>
      <p className="text-gray-400 text-lg mb-8 max-w-md leading-relaxed">
        لضمان سلامة البيانات والتزامن مع الفرع الرئيسي، يتطلب هذا النظام اتصالاً مستمراً بالإنترنت.
        <br />
        <span className="text-[#f4c025] font-bold mt-2 block">يرجى الاتصال بشبكة Wi-Fi أو البيانات للمتابعة.</span>
      </p>

      <button 
        onClick={() => window.location.reload()} 
        className="bg-[#f4c025] hover:bg-[#d9aa20] text-[#0a0e1a] font-bold py-4 px-8 rounded-xl flex items-center gap-3 transition-transform active:scale-95 shadow-lg shadow-[#f4c025]/20"
      >
        <RefreshCw size={24} /> محاولة الاتصال مجدداً
      </button>

      <div className="absolute bottom-10 text-gray-600 text-xs font-mono">
        Gold Master System • Online Mode Only
      </div>
    </div>
  );
};
