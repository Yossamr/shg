
import React, { useEffect, useState } from 'react';
import { Button } from './UI';
import { AppIcon } from './AppIcon';
import { Download, Share, PlusSquare, Monitor, X } from 'lucide-react';

export const InstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect Environment
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    const mobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
    
    setIsIOS(ios);
    setIsMobile(mobile);

    // Check if already installed (Standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    // IF NOT INSTALLED -> SHOW BANNER ALWAYS
    if (!isStandalone) {
        setIsVisible(true);
    }

    // Capture Chrome/Android install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
        alert("لتثبيت التطبيق: اضغط على إعدادات المتصفح واختر 'Install App' أو 'Add to Home Screen'");
        return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] p-4 pb-safe flex justify-center pointer-events-none">
      <div className="bg-gray-900/95 backdrop-blur-md border-t-4 border-gold-500 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] w-full max-w-2xl pointer-events-auto animate-slide-up">
        
        <div className="flex items-center gap-4 p-4">
            {/* The New Icon */}
            <div className="shrink-0 relative">
                <div className="absolute inset-0 bg-gold-500 blur-xl opacity-20 animate-pulse"></div>
                <AppIcon size={64} className="drop-shadow-2xl" />
            </div>

            <div className="flex-1 text-right">
                <h3 className="font-bold text-white text-lg leading-tight">تطبيق Gold Master</h3>
                <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                    {isMobile 
                        ? "قم بتنزيل التطبيق الآن للعمل بكامل الشاشة وبدون انترنت."
                        : "نسخة الكمبيوتر متاحة الآن. ثبت البرنامج لتجربة أسرع."}
                </p>
            </div>

            <button 
                onClick={() => setIsVisible(false)} 
                className="absolute top-2 left-2 text-gray-500 hover:text-white transition-colors"
            >
                <X size={20} />
            </button>
        </div>

        <div className="px-4 pb-4">
            {isIOS ? (
                <div className="bg-gray-800 rounded-lg p-3 text-xs text-gray-300 flex items-center justify-between gap-2 border border-gray-700">
                    <div className="flex items-center gap-2">
                        1. اضغط <Share size={16} className="text-blue-500" />
                    </div>
                    <div className="flex items-center gap-2">
                        2. اختر <span className="font-bold text-white">Add to Home Screen</span> <PlusSquare size={16} />
                    </div>
                </div>
            ) : (
                <Button 
                    onClick={handleInstallClick} 
                    className="w-full bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-black font-bold h-12 shadow-lg shadow-gold-500/20 border-none"
                >
                    {isMobile ? <Download className="mr-2" /> : <Monitor className="mr-2" />}
                    {isMobile ? "تثبيت التطبيق على الهاتف" : "تثبيت البرنامج على الكمبيوتر"}
                </Button>
            )}
        </div>
      </div>
    </div>
  );
};
