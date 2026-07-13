
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory'; 
import Sales from './pages/Sales';
import Reps from './pages/Reps';
import Settings from './pages/Settings';
import Customers from './pages/Customers';
import Safes from './pages/Safes';
import Ghawayesh from './pages/Ghawayesh';
import Invoices from './pages/Invoices';
import SalesLedger from './pages/SalesLedger';
import Expenses from './pages/Expenses';
import Setup from './pages/Setup'; 
import Audit from './pages/Audit'; 
import Zakat from './pages/Zakat'; 
import Login from './pages/Login';
import Debts from './pages/Debts';
import TechSetup from './pages/TechSetup';
import MarketCoverage from './pages/MarketCoverage';
import { GoldTicker } from './components/GoldTicker';
import { AuthService, SettingsService, SyncService } from './services/storage';
import { DbService } from './services/db';
import { AppIcon } from './components/AppIcon';
import { OfflineScreen } from './components/OfflineScreen'; // New Import
import { LayoutDashboard, ShoppingCart, Users, Menu, X, Lock, Settings as SettingsIcon, BookUser, Wallet, RotateCcw, FileText, FileSpreadsheet, Package, RefreshCw, ClipboardCheck, Heart, LogOut, ClipboardList, Home, WifiOff, Bell, Plus, LayoutGrid, Briefcase, Store, ArrowRight } from 'lucide-react';

const BottomNavItem = ({ to, icon, label, active }: { to: string, icon: React.ReactNode, label: string, active: boolean }) => (
    <Link to={to} className="flex-1 relative group">
        <div className="flex flex-col items-center justify-center h-full transition-all duration-300 py-1">
            {/* Icon Container with pop effect */}
            <div className={`
              relative p-2.5 rounded-2xl transition-all duration-300 flex items-center justify-center
              ${active ? 'bg-amber-500/15 text-amber-500 scale-110 -translate-y-1 shadow-lg shadow-amber-500/10' : 'text-slate-400 group-hover:text-slate-200 group-hover:scale-105'}
            `}>
                {React.cloneElement(icon as React.ReactElement<any>, { 
                    size: 22, 
                    strokeWidth: active ? 2.5 : 2,
                    fill: active ? "rgba(245, 158, 11, 0.15)" : "none"
                })}
                
                {/* Glow Behind Active Icon */}
                {active && (
                    <span className="absolute inset-0 rounded-2xl bg-amber-500/10 blur-md -z-10 animate-pulse"></span>
                )}
            </div>
            
            {/* Label or Dot Indicator */}
            {active ? (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_10px_#f59e0b] mt-1"></span>
            ) : (
                <span className="text-[10px] font-bold text-slate-500 mt-1 transition-opacity duration-300 group-hover:opacity-100">
                    {label}
                </span>
            )}
        </div>
    </Link>
);

const MobileHeader = ({ title, onSync, isSyncing, onSettings, selectedShop, onSwitchShop }: { title: string, onSync: () => void, isSyncing: boolean, onSettings: () => void, selectedShop: string | null, onSwitchShop: () => void }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/' || location.pathname === '/dashboard';
  const otherShop = selectedShop === 'المحل الأساسي' ? 'المحل الثاني' : 'المحل الأساسي';

  return (
    <div className="bg-[#0f172a] px-4 pt-safe-top pb-3 flex justify-between items-center border-b border-white/5 safe-pt">
        <div className="flex items-center gap-3">
            {!isHome ? (
              <button 
                onClick={() => navigate('/dashboard')}
                title="الرجوع للرئيسية"
                className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 hover:border-gold-500/30 flex items-center justify-center text-gray-400 hover:text-gold-400 transition-all active:scale-90 shadow-lg shrink-0"
              >
                  <ArrowRight size={20} />
              </button>
            ) : (
              <div className="w-10 h-10 rounded-full bg-dark-card border border-gold-600/30 flex items-center justify-center p-1 shadow-lg shrink-0">
                  <AppIcon size={32} />
              </div>
            )}
            <div>
                <h1 className="text-white font-bold text-lg leading-none">{title}</h1>
                <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] text-gray-400 font-medium">متصل بالخادم</span>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-2">
            {/* Branch Switcher Button */}
            {selectedShop && (
              <button
                onClick={onSwitchShop}
                title={`التحويل إلى ${otherShop}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border transition-all duration-200 active:scale-90"
                style={{
                  background: 'rgba(251,191,36,0.08)',
                  border: '1.5px solid rgba(251,191,36,0.35)',
                }}
              >
                <Store size={13} className="text-gold-400 shrink-0" />
                <span className="text-[11px] font-black text-gold-300 max-w-[90px] truncate leading-none">{selectedShop}</span>
                <svg width="10" height="10" viewBox="0 0 20 20" fill="none" className="text-gold-400 shrink-0">
                  <path d="M5 8l5-5 5 5M15 12l-5 5-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}

            <button onClick={onSync} className={`p-2 rounded-full bg-dark-card border border-dark-border text-gray-400 active:text-gold-400 transition-all ${isSyncing ? 'animate-spin text-gold-400' : ''}`}>
                <RefreshCw size={20} />
            </button>
            <button onClick={onSettings} className="p-2 rounded-full bg-dark-card border border-dark-border text-gray-400 active:text-gold-400">
                <SettingsIcon size={20} />
            </button>
        </div>
    </div>
  );
};

const Layout = ({ children, selectedShop, onSwitchShop }: { children?: React.ReactNode, selectedShop: string | null, onSwitchShop: () => void }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [storeProfile, setStoreProfile] = useState(SettingsService.getStoreProfile());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  // Scroll to top when location.pathname changes
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  // --- THEME HANDLING LOGIC: FORCED DARK MODE ---
  useEffect(() => {
    // Always force dark mode
    document.documentElement.classList.add('dark');
    
    // Also update store profile if changed
    const handleProfileUpdate = () => setStoreProfile(SettingsService.getStoreProfile());
    window.addEventListener('store-profile-updated', handleProfileUpdate);

    // --- KEYBOARD VISIBILITY LOGIC ---
    const handleFocus = (e: FocusEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
            setIsKeyboardOpen(true);
            setTimeout(() => {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    };
    const handleBlur = () => {
        setTimeout(() => setIsKeyboardOpen(false), 100);
    };

    window.addEventListener('focusin', handleFocus);
    window.addEventListener('focusout', handleBlur);

    // --- SYNC LOGIC ---
    // 1. Sync immediately on mount (When App Opens / Layout Mounts)
    if (navigator.onLine) {
        SyncService.sync().catch(console.error);
    }

    // 2. Auto-Sync every 1 Hour (3600000 ms)
    const syncInterval = setInterval(() => {
        if (navigator.onLine && !isSyncing) {
            SyncService.sync().catch(err => console.error("Auto-sync error", err));
        }
    }, 3600000); // 1 Hour

    return () => {
        window.removeEventListener('store-profile-updated', handleProfileUpdate);
        window.removeEventListener('focusin', handleFocus);
        window.removeEventListener('focusout', handleBlur);
        clearInterval(syncInterval);
    };
  }, []);

  const handleManualSync = () => {
      setIsSyncing(true);
      SyncService.sync().then(() => {
          setTimeout(() => setIsSyncing(false), 1000);
      });
  };

  return (
    <div className="flex flex-col h-screen bg-dark-bg text-white overflow-hidden font-sans">
      {/* Unified Sticky Header */}
      {location.pathname !== '/sales' && (
        <div className={`sticky top-0 z-[100] w-full bg-[#0f172a] shadow-xl border-b border-gold-600/20 transition-all duration-300 ${isKeyboardOpen ? '-translate-y-full opacity-0 absolute pointer-events-none' : 'translate-y-0 opacity-100'}`}>
            <MobileHeader 
              title={storeProfile.name || 'Gold Master'} 
              onSync={handleManualSync} 
              isSyncing={isSyncing} 
              onSettings={() => navigate('/settings')}
              selectedShop={selectedShop}
              onSwitchShop={onSwitchShop}
            />
        </div>
      )}
      
      <main ref={mainRef} className={`flex-1 overflow-y-auto overflow-x-hidden relative custom-scrollbar bg-gradient-to-b from-dark-bg to-dark-bg/95 ${location.pathname === '/sales' ? 'pb-0 overflow-hidden' : isKeyboardOpen ? 'pb-0 pt-safe-top' : 'pb-28 safe-pb'}`}>
         <div key={location.pathname} className="page-enter h-full">
           {children}
         </div>
      </main>

      {/* Chic Glass Bottom Navigation - HIDDEN ON SALES CHECKOUT AND WHEN KEYBOARD IS OPEN */}
      {location.pathname !== '/sales' && (
        <nav 
          className={`fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md transition-all duration-300 ${isKeyboardOpen ? 'translate-y-[150%] opacity-0' : 'translate-y-0 opacity-100'}`}
        >
            {/* Glass Container */}
            <div className="bg-[#0f172a]/80 backdrop-blur-2xl border border-white/10 rounded-[2.2rem] shadow-[0_20px_50px_rgba(0,0,0,0.6)] px-2 py-1">
                <div className="flex justify-between items-center h-16">
                    <BottomNavItem to="/dashboard" icon={<LayoutGrid />} label="الرئيسية" active={location.pathname === '/dashboard' || location.pathname === '/'} />
                    <BottomNavItem to="/safes" icon={<Wallet />} label="الخزنة" active={location.pathname === '/safes'} />
                    <BottomNavItem to="/reps" icon={<Briefcase />} label="الورش" active={location.pathname === '/reps'} />
                    <BottomNavItem to="/expenses" icon={<ClipboardList />} label="المصروفات" active={location.pathname === '/expenses'} />
                    <BottomNavItem to="/sales-ledger" icon={<FileSpreadsheet />} label="الدفتر" active={location.pathname === '/sales-ledger'} />
                </div>
            </div>
        </nav>
      )}
    </div>
  );
};

interface ShopSelectionProps {
  onSelect: (shopName: string) => void;
}

const ShopSelection: React.FC<ShopSelectionProps> = ({ onSelect }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-6 animate-fade-in font-sans" dir="rtl">
      <div className="w-full max-w-lg relative">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-gold-600 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob"></div>
        <div className="absolute bottom-0 -right-4 w-72 h-72 bg-blue-600 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000"></div>

        <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl overflow-hidden relative z-10 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gold-500/10 mb-4 border border-gold-500/30">
              <Store size={40} className="text-gold-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">اختر فرع العمل</h1>
            <p className="text-gray-400 text-sm mt-2 font-medium">يرجى اختيار الفرع لبدء تسجيل العمليات</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div 
              onClick={() => onSelect('المحل الأساسي')}
              className="group relative overflow-hidden rounded-[2rem] p-6 cursor-pointer select-none border border-white/5 hover:border-gold-500/50 bg-[#1e293b]/80 backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 text-center flex flex-col items-center justify-center min-h-[160px]"
            >
              <div className="absolute inset-0 bg-gold-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="w-12 h-12 rounded-full bg-gold-500/20 text-gold-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Store size={24} />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-gold-400 transition-colors">المحل الأساسي</h3>
              <p className="text-xs text-gray-500 mt-2 font-medium">الفرع الرئيسي والمخزن العام</p>
            </div>

            <div 
              onClick={() => onSelect('المحل الثاني')}
              className="group relative overflow-hidden rounded-[2rem] p-6 cursor-pointer select-none border border-white/5 hover:border-gold-500/50 bg-[#1e293b]/80 backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 text-center flex flex-col items-center justify-center min-h-[160px]"
            >
              <div className="absolute inset-0 bg-gold-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="w-12 h-12 rounded-full bg-gold-500/20 text-gold-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Store size={24} />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-gold-400 transition-colors">المحل الثاني</h3>
              <p className="text-xs text-gray-500 mt-2 font-medium">فرع المعرض والمبيعات الإضافية</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [isTechSetup, setIsTechSetup] = useState<boolean>(false);
  const [isSetup, setIsSetup] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [selectedShop, setSelectedShop] = useState<string | null>(localStorage.getItem('selected_shop'));

  useEffect(() => {
     // Check Initial Tech Setup
     const checkTechSetup = () => {
        if (DbService.isConfigured()) { setIsTechSetup(true); initApp(); } 
        else { setIsTechSetup(false); }
     };
     checkTechSetup();

     // --- ONLINE/OFFLINE LISTENERS ---
     const handleOnline = () => {
         setIsOnline(true);
         // Sync immediately when back online
         SyncService.sync();
     };
     const handleOffline = () => setIsOnline(false);

     window.addEventListener('online', handleOnline);
     window.addEventListener('offline', handleOffline);

     return () => {
         window.removeEventListener('online', handleOnline);
         window.removeEventListener('offline', handleOffline);
     };
  }, []);

  const initApp = async () => {
     await DbService.init();
     const setup = await SettingsService.isAppInitialized();
     setIsSetup(setup);
     setIsAuthenticated(!!AuthService.getCurrentUser());
     
     // Ensure sync runs on app startup if online
     if (navigator.onLine) {
         SyncService.sync().catch(console.error);
     }
  };

  const handleTechSetupComplete = () => { setIsTechSetup(true); initApp(); };
  const handleLogin = () => { setIsAuthenticated(true); };
  const handleSetup = () => { setIsSetup(true); };

  const Content = () => {
      // 1. Critical: Check Connection First
      if (!isOnline) return <OfflineScreen />;

      if (!isTechSetup) return <TechSetup onComplete={handleTechSetupComplete} />;
      if (isSetup === null) return (
        <div className="flex flex-col h-screen items-center justify-center bg-gradient-to-br from-[#070b19] via-[#0b1329] to-[#040812] relative overflow-hidden" dir="rtl">
          {/* Ambient luminous spots */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none animate-float" />
          <div className="absolute top-1/3 left-10 w-64 h-64 bg-amber-600/5 rounded-full blur-[80px] pointer-events-none animate-float" style={{ animationDelay: '2s' }} />

          {/* Main Glass Panel */}
          <div className="flex flex-col items-center bg-[#111c35]/30 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-10 max-w-sm w-[90%] mx-auto shadow-[0_30px_100px_rgba(0,0,0,0.8)] relative z-10">
            {/* Elegant luxury gold ring */}
            <div className="relative mb-8">
              <div 
                className="w-36 h-36 rounded-full flex items-center justify-center"
                style={{
                  background: 'conic-gradient(from 0deg, #f59e0b 0%, rgba(245, 158, 11, 0.2) 50%, transparent 100%)',
                  animation: 'spinSlow 2.5s linear infinite',
                  padding: '2.5px',
                  borderRadius: '50%'
                }}
              >
                <div className="w-full h-full rounded-full bg-[#0b1329] flex items-center justify-center">
                  {/* Inside Logo Center */}
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-900/10 border border-amber-500/20 flex items-center justify-center shadow-[inset_0_0_20px_rgba(245,158,11,0.1)] animate-gold-glow">
                    <svg width="48" height="48" viewBox="0 0 512 512" fill="none" className="drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                      <defs>
                        <linearGradient id="gl-logo" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#FFFBEB"/>
                          <stop offset="30%" stopColor="#FCD34D"/>
                          <stop offset="70%" stopColor="#D97706"/>
                          <stop offset="100%" stopColor="#78350f"/>
                        </linearGradient>
                      </defs>
                      <path d="M256 20L470 135V377L256 492L42 377V135L256 20Z" fill="#0b1329" stroke="url(#gl-logo)" strokeWidth="16"/>
                      <path d="M256 120L360 220L256 360L152 220Z" fill="url(#gl-logo)"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Orbiting Luxury Particle */}
              <div className="absolute inset-0" style={{ animation: 'spinSlow 2.5s linear infinite' }}>
                <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-white/40 shadow-[0_0_15px_rgba(245,158,11,0.9)] absolute -top-1.5 left-1/2 -translate-x-1/2" />
              </div>
            </div>

            {/* Typography */}
            <h1 className="text-3xl font-extrabold text-shimmer mb-1.5 tracking-wide text-center">جولد ماستر</h1>
            <p className="text-xs text-amber-500/80 font-medium tracking-widest uppercase mb-1">GOLD MASTER</p>
            <p className="text-[11px] text-gray-400 font-medium mb-8 text-center leading-relaxed">نظام الإدارة الذكي لمحلات الصاغة والمجوهرات</p>

            {/* Premium Loader Progress */}
            <div className="w-full space-y-3">
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                <div
                  className="h-full rounded-full animate-pulse"
                  style={{
                    background: 'linear-gradient(90deg, #b45309, #fbbf24, #fffbeb, #fbbf24, #b45309)',
                    backgroundSize: '200% auto',
                    animation: 'shimmer 1.4s linear infinite',
                    width: '100%'
                  }}
                />
              </div>
              <div className="flex justify-between items-center px-1 text-[10px] text-gray-400">
                <span className="animate-pulse">جاري تهيئة النظام وتحميل البيانات...</span>
                <span className="font-mono text-amber-400/80 font-bold">100%</span>
              </div>
            </div>
          </div>
        </div>
      );
      if (!isSetup) return <Setup onComplete={handleSetup} />;
      if (!isAuthenticated) return <Login onLoginSuccess={handleLogin} />;

      if (!selectedShop) {
          return (
              <ShopSelection 
                  onSelect={(shopName) => {
                      localStorage.setItem('selected_shop', shopName);
                      setSelectedShop(shopName);
                  }} 
              />
          );
      }
      
      const handleSwitchShop = () => {
        const next = selectedShop === 'المحل الأساسي' ? 'المحل الثاني' : 'المحل الأساسي';
        localStorage.setItem('selected_shop', next);
        setSelectedShop(next);
        // Notify other components that shop changed
        window.dispatchEvent(new Event('shop-changed'));
      };

      return (
        <Router>
          <Layout selectedShop={selectedShop} onSwitchShop={handleSwitchShop}>
            <Routes>
              {/* Main Home is now Dashboard */}
              <Route path="/" element={<Dashboard />} /> 
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/safes" element={<Safes />} />
              <Route path="/sales-ledger" element={<SalesLedger />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/reps" element={<Reps />} />
              <Route path="/ghawayesh" element={<Ghawayesh />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/debts" element={<Debts />} />
              <Route path="/audit" element={<Audit />} />
              <Route path="/zakat" element={<Zakat />} />
              <Route path="/market-coverage" element={<MarketCoverage />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        </Router>
      );
  };

  return <Content />;
};

export default App;
