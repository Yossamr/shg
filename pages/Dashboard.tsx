
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TransactionService, ExpenseService, SafeService, InventoryService, ScrapGoldService, GhawayeshService, SyncService, MarketCoverageService, AuthService } from '../services/storage';
import { Transaction, Expense, Safe, ScrapGoldLog } from '../types';
import { 
  TrendingUp, Wallet, ClipboardList, Coins, 
  ShoppingCart, Plus, ArrowUpRight, ArrowDownLeft, 
  Box, Users, ChevronRight, Activity, Zap, RotateCcw, X,
  FileText, ArrowLeftRight, ArrowDown, ArrowUp
} from 'lucide-react';

import { GoldTicker } from '../components/GoldTicker';

// --- HomeKit Style Card Component ---
interface HomeKitCardProps {
  title: string;
  subtitle?: string;
  value?: string;
  icon: React.ReactNode;
  colorTheme: 'gold' | 'blue' | 'green' | 'red' | 'purple' | 'slate';
  to?: string;
  onClick?: () => void;
  isActive?: boolean;
  valuePosition?: 'bottom' | 'top';
}

const HomeKitCard: React.FC<HomeKitCardProps> = ({ title, subtitle, value, icon, colorTheme, to, onClick, isActive = true, valuePosition = 'bottom' }) => {
  const navigate = useNavigate();

  const themes = {
    gold:   { bg: 'bg-amber-500/10', glow: 'group-hover:bg-amber-500/20', iconBg: 'bg-amber-500', text: 'text-amber-500' },
    blue:   { bg: 'bg-blue-500/10', glow: 'group-hover:bg-blue-500/20', iconBg: 'bg-blue-500', text: 'text-blue-500' },
    green:  { bg: 'bg-emerald-500/10', glow: 'group-hover:bg-emerald-500/20', iconBg: 'bg-emerald-500', text: 'text-emerald-500' },
    red:    { bg: 'bg-rose-500/10', glow: 'group-hover:bg-rose-500/20', iconBg: 'bg-rose-500', text: 'text-rose-500' },
    purple: { bg: 'bg-purple-500/10', glow: 'group-hover:bg-purple-500/20', iconBg: 'bg-purple-500', text: 'text-purple-500' },
    slate:  { bg: 'bg-slate-700/30', glow: 'group-hover:bg-slate-600/30', iconBg: 'bg-slate-500', text: 'text-slate-400' },
  };

  const theme = themes[colorTheme];

  const handleClick = () => {
    if (navigator.vibrate) navigator.vibrate(10);
    if (onClick) onClick();
    if (to) navigate(to);
  };

  return (
    <div 
      onClick={handleClick}
      className={`
        group relative overflow-hidden rounded-[2rem] p-5 cursor-pointer select-none
        transition-all duration-300 ease-out active:scale-95
        border border-white/5 hover:border-white/10
        ${isActive ? 'bg-[#1e293b]/80 backdrop-blur-md shadow-lg' : 'bg-[#1e293b]/40 opacity-70'}
      `}
    >
      {/* Background Glow Effect */}
      <div className={`absolute inset-0 opacity-0 transition-opacity duration-500 ${theme.glow}`} />
      
      {/* Dynamic Status Light (Like HomeKit bulb status) */}
      <div className="flex justify-between items-start mb-6 relative z-10">
        {value && valuePosition === 'top' ? (
           <p className="text-2xl font-black text-white font-mono tracking-tight mt-1">
             {value}
           </p>
        ) : <div />}
        
        <div className={`
          w-12 h-12 rounded-full flex items-center justify-center 
          shadow-lg transition-transform duration-300 group-hover:scale-110
          ${isActive ? theme.iconBg + ' text-white' : 'bg-gray-700 text-gray-500'}
        `}>
          {React.cloneElement(icon as React.ReactElement, { 
            size: (icon as React.ReactElement).props.size || 24, 
            strokeWidth: (icon as React.ReactElement).props.strokeWidth || 2.5 
          })}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col gap-1">
        <h3 className={`text-base font-bold text-white leading-tight ${!isActive && 'text-gray-400'}`}>
          {title}
        </h3>
        
        {subtitle && <p className="text-xs text-gray-400 font-medium">{subtitle}</p>}
        
        {value && valuePosition !== 'top' && (
           <p className="text-2xl font-black text-white mt-1 font-mono tracking-tight">
             {value}
           </p>
        )}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [safes, setSafes] = useState<Safe[]>([]);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [scrapGoldBalance, setScrapGoldBalance] = useState(0);
  const [ghawayeshCount, setGhawayeshCount] = useState(0);
  const [ghawayeshWeight, setGhawayeshWeight] = useState(0);

  const [currentShop, setCurrentShop] = useState(localStorage.getItem('selected_shop') || 'المحل الأساسي');

  // Scrap gold details states
  const [showScrapDetails, setShowScrapDetails] = useState(false);
  const [scrapBalances, setScrapBalances] = useState<Record<string, number>>({ 'المحل الأساسي': 0, 'المحل الثاني': 0 });
  const [scrapLogs, setScrapLogs] = useState<ScrapGoldLog[]>([]);

  const loadData = useCallback(() => {
    const t = TransactionService.getAll();
    setTxs(t);
    setExpenses(ExpenseService.getAll());
    setSafes(SafeService.getAll());
    
    // Filter inventory count by active shop
    const activeItems = InventoryService.getAll().filter(i => (i.shop || 'المحل الأساسي') === currentShop);
    setInventoryCount(activeItems.length);

    // Load scrap gold balance
    const balances = ScrapGoldService.getBalances();
    setScrapBalances(balances);
    setScrapGoldBalance(balances[currentShop] || 0);

    // Load scrap gold logs
    setScrapLogs(ScrapGoldService.getLogs());

    // Load Ghawayesh totals
    const totals = GhawayeshService.getLastTotals();
    setGhawayeshCount(totals.count);
    setGhawayeshWeight(totals.weight);
  }, [currentShop]);

  useEffect(() => {
    const handleShopChanged = () => {
      setCurrentShop(localStorage.getItem('selected_shop') || 'المحل الأساسي');
    };
    window.addEventListener('shop-changed', handleShopChanged);
    window.addEventListener('data-synced', loadData);
    return () => {
      window.removeEventListener('shop-changed', handleShopChanged);
      window.removeEventListener('data-synced', loadData);
    };
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [currentShop, loadData]);

  const [showTransferScrap, setShowTransferScrap] = useState(false);
  const [transferWeight, setTransferWeight] = useState('');

  const handleTransferScrapSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const weightVal = Number(transferWeight);
    if (weightVal <= 0 || weightVal > scrapGoldBalance) {
      alert('الوزن المدخل غير صالح أو يتجاوز رصيد الكسر الحالي');
      return;
    }
    const otherShop = currentShop === 'المحل الأساسي' ? 'المحل الثاني' : 'المحل الأساسي';
    const user = AuthService.getCurrentUser()?.name || 'غير معروف';
    const success = ScrapGoldService.transfer(currentShop, otherShop, weightVal, user);
    if (success) {
      alert(`تم تحويل ${weightVal} جم ذهب كسر إلى ${otherShop} بنجاح`);
      setShowTransferScrap(false);
      setTransferWeight('');
      SyncService.sync();
      loadData();
    } else {
      alert('فشلت عملية التحويل');
    }
  };

  const today = new Date().setHours(0,0,0,0);
  const todayTxs = txs.filter(t => t.date >= today);
  const totalSalesToday = todayTxs.filter(t => t.type === 'SALE').reduce((sum, t) => sum + t.totalPrice, 0);
  const salesCount = todayTxs.filter(t => t.type === 'SALE').length;

  const activeSafeId = currentShop === 'المحل الثاني' ? 'SAFE_2' : 'SAFE_1';
  const mainSafeBalance = safes.find(s => s.id === activeSafeId)?.balance || 0;
  const todayCoverage = MarketCoverageService.getCoverageForDate(new Date(), currentShop);
  
  // Greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مرحباً';

  return (
    <div className="px-4 py-6 pb-32 space-y-8 animate-fade-in min-h-full">
      
      {/* Header Section (HomeKit Style Summary) */}
      <div className="flex flex-col gap-1 px-2">
         <div className="text-sm font-medium text-gold-500 uppercase tracking-widest mb-1">{new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
         <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            {greeting} <span className="animate-pulse">👋</span>
         </h1>
         
         {/* Status Strip */}
         <div className="flex items-center gap-4 mt-2 overflow-x-auto no-scrollbar pb-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm whitespace-nowrap">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
               <span className="text-xs font-bold text-gray-300">النظام متصل</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm whitespace-nowrap">
               <Activity size={12} className="text-gold-500" />
               <span className="text-xs font-bold text-gray-300">{salesCount} عملية اليوم</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm whitespace-nowrap">
               <Box size={12} className="text-blue-500" />
               <span className="text-xs font-bold text-gray-300">{inventoryCount} قطعة بالمخزن</span>
            </div>
         </div>
      </div>

      {/* Gold Price Ticker (Only visible on main screen / Dashboard) */}
      <div className="bg-[#1e293b]/30 rounded-3xl overflow-hidden border border-white/5 shadow-lg">
          <GoldTicker />
      </div>

      {/* Main Grid (The "Devices") */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        
        {/* 1. New Sale (The "Primary Switch") */}
        <div className="col-span-2">
           <HomeKitCard 
              title="بيع جديد" 
              subtitle="اضغط للبدء فوراً"
              icon={<Plus />} 
              colorTheme="gold" 
              to="/sales"
              isActive={true}
           />

         {/* 8. Market Coverage Card */}
         <HomeKitCard 
            title="تغطية السوق" 
            value={`${Math.abs(todayCoverage.net21).toFixed(2)} جم`}
            subtitle={todayCoverage.net21 < 0 ? "عجز تغطية (باع أكثر)" : todayCoverage.net21 > 0 ? "فائض تغطية (اشترى أكثر)" : "التغطية متعادلة"}
            icon={<TrendingUp size={28} strokeWidth={2.8} />} 
            colorTheme={todayCoverage.net21 < 0 ? "red" : todayCoverage.net21 > 0 ? "green" : "slate"}
            to="/market-coverage"
            valuePosition="top"
         />
        </div>

        {/* 2. Safes (Cash Status) */}
        <HomeKitCard 
           title="الخزنة" 
           value={mainSafeBalance.toLocaleString()}
           subtitle="الرصيد الحالي"
           icon={<Wallet />} 
           colorTheme="green"
           to="/safes"
        />

        {/* 3. Sales Today */}
        <HomeKitCard 
           title="مبيعات اليوم" 
           value={totalSalesToday.toLocaleString()}
           subtitle={`${salesCount} فاتورة`}
           icon={<Coins />} 
           colorTheme="blue"
           to="/sales-ledger"
        />

        {/* 4. Inventory */}
        <HomeKitCard 
           title="المخزن" 
           subtitle="جرد الأصناف"
           icon={<Box />} 
           colorTheme="purple"
           to="/inventory"
        />

        {/* 5. Customers */}
        <HomeKitCard 
           title="العملاء" 
           subtitle="قاعدة البيانات"
           icon={<Users />} 
           colorTheme="slate"
           to="/customers"
        />

        {/* 6. Expenses */}
        <HomeKitCard 
           title="المصروفات" 
           subtitle="تسجيل مصروف"
           icon={<ClipboardList />} 
           colorTheme="red"
           to="/expenses"
        />

        {/* 7. Ghawayesh Card */}
        <HomeKitCard 
           title="دفتر الغوايش" 
           subtitle="سجل حركات ورصيد البناجر"
           icon={<RotateCcw />} 
           colorTheme="gold"
           to="/ghawayesh"
        />

        {/* 8. Scrap Gold Card */}
        <div 
           onClick={() => setShowScrapDetails(true)}
           className="group relative overflow-hidden rounded-[2rem] p-5 border border-white/5 hover:border-white/10 bg-[#1e293b]/80 backdrop-blur-md shadow-lg transition-all duration-300 cursor-pointer active:scale-95 select-none flex flex-col justify-between"
        >
           <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:bg-amber-500/20 bg-amber-500/10" />
           
           <div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                 <div />
                 <div className="w-12 h-12 rounded-full flex items-center justify-center bg-amber-500 text-white shadow-lg shrink-0 transition-transform duration-300 group-hover:scale-110">
                    <TrendingUp size={24} strokeWidth={2.5} />
                 </div>
              </div>
              <div className="relative z-10 flex flex-col gap-1">
                 <h3 className="text-base font-bold text-white leading-tight">الذهب الكسر</h3>
                 <p className="text-xs text-gray-400 font-medium">الوزن الحالي (عيار 21)</p>
                 <p className="text-2xl font-black text-white mt-1 font-mono tracking-tight">
                    {scrapGoldBalance.toFixed(2)} <span className="text-xs text-gold-500">جم</span>
                 </p>
              </div>
           </div>

           <div className="relative z-20 mt-4 pt-3 border-t border-white/5">
              <button 
                 onClick={(e) => { e.stopPropagation(); setShowTransferScrap(true); }}
                 className="w-full bg-white/5 hover:bg-amber-500 hover:text-black border border-white/5 hover:border-amber-500/20 text-white text-[11px] font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
              >
                 <ArrowLeftRight size={12} />
                 تحويل فروع
              </button>
           </div>
        </div>

      </div>

      {/* Recent Activity List (HomeKit List Style) */}
      <div>
         <div className="flex items-center justify-between px-2 mb-4">
            <h2 className="text-lg font-bold text-white">آخر النشاطات</h2>
            <Link to="/sales-ledger" className="text-gold-500 text-xs font-bold flex items-center gap-1 hover:gap-2 transition-all">
               عرض السجل <ChevronRight size={14} />
            </Link>
         </div>
         
         <div className="bg-[#1e293b]/50 backdrop-blur-md rounded-3xl overflow-hidden border border-white/5 divide-y divide-white/5">
             {todayTxs.slice(0, 5).map(tx => (
                 <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                     <div className="flex items-center gap-4">
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'SALE' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                             {tx.type === 'SALE' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                         </div>
                         <div>
                             <div className="text-sm font-bold text-white">{tx.type === 'SALE' ? 'عملية بيع' : 'عملية شراء'}</div>
                             <div className="text-xs text-gray-500 font-medium">
                                {new Date(tx.date).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})} • {tx.customerName}
                             </div>
                         </div>
                     </div>
                     <div className="font-mono font-bold text-white">
                         {tx.totalPrice.toLocaleString()}
                     </div>
                 </div>
             ))}
             {todayTxs.length === 0 && (
                 <div className="p-8 text-center text-gray-500 text-sm">
                     لا توجد نشاطات مسجلة اليوم
                 </div>
             )}
         </div>
      </div>

      {/* Scrap Gold Transfer Modal */}
      {showTransferScrap && (
         <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" dir="rtl">
            <div className="bg-[#1e293b] border border-white/10 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative">
               <button onClick={() => setShowTransferScrap(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                  <X size={20} />
               </button>
               <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-500 mb-4 mx-auto">
                  <TrendingUp size={32} />
               </div>
               <h3 className="font-bold text-xl text-center mb-2 text-white">تحويل الذهب الكسر</h3>
               <p className="text-gray-400 text-center text-xs mb-6">
                  من: {currentShop} ➔ إلى: {currentShop === 'المحل الأساسي' ? 'المحل الثاني' : 'المحل الأساسي'}
               </p>
               <form onSubmit={handleTransferScrapSubmit} className="space-y-4">
                  <div className="text-center text-gray-400 text-sm">
                     الرصيد المتاح: <span className="text-white font-bold">{scrapGoldBalance.toFixed(2)} جم</span>
                  </div>
                  <input 
                     type="number"
                     step="any"
                     autoFocus 
                     className="w-full bg-[#0f172a] border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-500 text-center text-lg font-bold font-mono"
                     placeholder="الوزن بالجرام"
                     value={transferWeight} 
                     onChange={e => setTransferWeight(e.target.value)} 
                     required 
                  />
                  <button type="submit" className="w-full bg-amber-500 text-black font-bold py-4 rounded-2xl text-lg hover:bg-amber-600 transition-colors">
                     تأكيد التحويل
                  </button>
               </form>
            </div>
         </div>
      )}

      {/* Scrap Gold Details Modal */}
      {showScrapDetails && (
         <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in" dir="rtl">
            <div className="bg-[#1e293b] border border-white/10 w-full max-w-lg rounded-[2rem] p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
               
               {/* Close button */}
               <button onClick={() => setShowScrapDetails(false)} className="absolute top-6 left-6 text-gray-500 hover:text-white transition-colors">
                  <X size={20} />
               </button>

               {/* Title */}
               <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-500 shrink-0">
                     <TrendingUp size={24} />
                  </div>
                  <div>
                     <h3 className="font-bold text-xl text-white">تفاصيل رصيد الذهب الكسر</h3>
                     <p className="text-gray-400 text-xs mt-0.5">سجل الحركات والأرصدة بين الفروع والمشتريات والمدفوعات</p>
                  </div>
               </div>

               {/* Balances Grid */}
               <div className="grid grid-cols-2 gap-3 mb-6 bg-[#0f172a]/50 p-4 rounded-2xl border border-white/5">
                  <div className="text-center p-3 rounded-xl bg-[#0f172a]/80">
                     <div className="text-xs text-gray-400 mb-1 font-bold">رصيد المحل الأساسي</div>
                     <div className="font-mono text-lg font-black text-white">
                        {(scrapBalances['المحل الأساسي'] || 0).toFixed(2)} <span className="text-xs text-amber-500">جم</span>
                     </div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-[#0f172a]/80">
                     <div className="text-xs text-gray-400 mb-1 font-bold">رصيد المحل الثاني</div>
                     <div className="font-mono text-lg font-black text-white">
                        {(scrapBalances['المحل الثاني'] || 0).toFixed(2)} <span className="text-xs text-amber-500">جم</span>
                     </div>
                  </div>
                  <div className="col-span-2 text-center pt-2 border-t border-white/5 flex justify-between items-center px-2">
                     <span className="text-xs text-gray-400 font-bold">إجمالي رصيد الكسر بالفروع:</span>
                     <span className="font-mono text-lg font-black text-amber-500">
                        {((scrapBalances['المحل الأساسي'] || 0) + (scrapBalances['المحل الثاني'] || 0)).toFixed(2)} جم
                     </span>
                  </div>
               </div>

               {/* Quick Actions inside Modal */}
               <div className="flex gap-2 mb-6">
                  <button 
                     onClick={() => {
                        setShowScrapDetails(false);
                        setShowTransferScrap(true);
                     }}
                     className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors shadow-lg"
                  >
                     <ArrowLeftRight size={16} />
                     تحويل جزء من الرصيد
                  </button>
                  {scrapBalances['المحل الثاني'] > 0 && (
                     <button 
                        onClick={() => {
                           if (confirm('هل أنت متأكد من تصفية كامل رصيد المحل الثاني ونقله للمحل الأساسي؟')) {
                              const success = ScrapGoldService.transferAllToMain();
                              if (success) {
                                 alert('تم تصفية ونقل رصيد الكسر بالكامل إلى المحل الأساسي بنجاح');
                                 SyncService.sync();
                                 loadData();
                              } else {
                                 alert('فشلت عملية النقل والتصفية');
                              }
                           }
                        }}
                        className="bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold py-3 px-4 rounded-xl text-sm transition-colors whitespace-nowrap"
                     >
                        تصفية للمحل الأساسي
                     </button>
                  )}
               </div>

               {/* History Section */}
               <div className="flex-1 flex flex-col min-h-0">
                  <h4 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                     <FileText size={16} className="text-gray-400" />
                     سجل الحركات الأخيرة
                  </h4>

                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5">
                     {scrapLogs.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 text-sm bg-white/5 rounded-2xl border border-dashed border-white/5">
                           لا توجد حركات مسجلة للذهب الكسر حتى الآن
                        </div>
                     ) : (
                        scrapLogs.slice().reverse().map((log) => {
                           const isAdd = log.type === 'ADD';
                           const isTransfer = log.type === 'TRANSFER';
                           const isDeduct = log.type === 'DEDUCT';

                           let badgeBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                           let icon = <ArrowDown size={14} />;
                           let opText = 'إضافة كسر';
                           let amountSign = '+';

                           if (isDeduct) {
                              badgeBg = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                              icon = <ArrowUp size={14} />;
                              opText = 'تسديد/سحب';
                              amountSign = '-';
                           } else if (isTransfer) {
                              badgeBg = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                              icon = <ArrowLeftRight size={14} />;
                              opText = 'تحويل فروع';
                              amountSign = '';
                           }

                           return (
                              <div key={log.id} className="p-3 bg-[#0f172a]/30 border border-white/5 rounded-xl flex items-center justify-between hover:bg-white/5 transition-colors gap-3">
                                 <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${badgeBg}`}>
                                       {icon}
                                    </div>
                                    <div>
                                       <div className="text-xs font-bold text-white leading-snug">{log.details || opText}</div>
                                       <div className="text-[10px] text-gray-500 font-medium mt-1">
                                          {new Date(log.date).toLocaleString('ar-EG', {
                                             year: 'numeric',
                                             month: 'short',
                                             day: 'numeric',
                                             hour: '2-digit',
                                             minute: '2-digit'
                                          })}
                                          {log.byUser && ` • بواسطة ${log.byUser}`}
                                          {log.shop && ` • في ${log.shop}`}
                                       </div>
                                    </div>
                                 </div>
                                 <div className={`font-mono font-bold text-sm shrink-0 text-left ${isAdd ? 'text-emerald-400' : isDeduct ? 'text-rose-400' : 'text-amber-400'}`}>
                                    {amountSign}{log.weight.toFixed(2)} جم
                                 </div>
                              </div>
                           );
                        })
                     )}
                  </div>
               </div>

            </div>
         </div>
      )}

    </div>
  );
};

export default Dashboard;
