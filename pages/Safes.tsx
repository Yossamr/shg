import React, { useState, useEffect } from 'react';
import { SafeService, SettingsService, SyncService, AuthService } from '../services/storage';
import { Safe, AppUser, SafeTransaction } from '../types';
import { Wallet, ArrowDown, Smartphone, Landmark, ArrowRightLeft, History, TrendingUp, TrendingDown, Send, User, Calendar, Clock, FileText } from 'lucide-react';
import { Modal } from '../components/UI';

const Safes = () => {
  const [safes, setSafes] = useState<Safe[]>([]);
  const [transactions, setTransactions] = useState<SafeTransaction[]>([]);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TRANSFER'>('OVERVIEW');
  const [selectedTx, setSelectedTx] = useState<SafeTransaction | null>(null);
  
  // Transfer State
  const [transferData, setTransferData] = useState({ from: '', to: '', amount: '' });

  const [currentShop, setCurrentShop] = useState(localStorage.getItem('selected_shop') || 'المحل الأساسي');

  useEffect(() => {
    refresh();
    setCurrentUser(AuthService.getCurrentUser());
    const handleShopChanged = () => {
      setCurrentShop(localStorage.getItem('selected_shop') || 'المحل الأساسي');
    };
    window.addEventListener('shop-changed', handleShopChanged);
    return () => window.removeEventListener('shop-changed', handleShopChanged);
  }, [currentShop]);

  const refresh = () => {
      // Filter safes for this shop only
      const allSafes = SafeService.getAll();
      const shopSafes = allSafes.filter(s => (s.shop || 'المحل الأساسي') === currentShop);
      setSafes(shopSafes);

      // Auto-set transfer defaults if empty
      if (shopSafes.length >= 2 && (!transferData.from || !transferData.to)) {
          setTransferData({
              from: shopSafes[0].id,
              to: shopSafes[1].id,
              amount: ''
          });
      }

      // Filter transactions related to these shop safes
      const shopSafeIds = new Set(shopSafes.map(s => s.id));
      const allTxs = SafeService.getTransactions();
      const shopTxs = allTxs.filter(tx => 
          (tx.fromSafeId && shopSafeIds.has(tx.fromSafeId)) || 
          (tx.toSafeId && shopSafeIds.has(tx.toSafeId))
      );
      setTransactions(shopTxs);
  };

  // Re-run refresh when currentShop changes
  useEffect(() => {
      refresh();
  }, [currentShop]);

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = Number(transferData.amount);
    if (amountVal <= 0) return;
    
    if (transferData.from === transferData.to) {
        alert('لا يمكن التحويل لنفس الخزنة');
        return;
    }

    const sourceSafe = safes.find(s => s.id === transferData.from);
    if (sourceSafe && sourceSafe.balance < amountVal) {
        if (!confirm('المبلغ المراد تحويله أكبر من الرصيد الحالي. هل تريد المتابعة؟')) return;
    }

    const responsibleUser = currentUser?.name || 'غير معروف';
    SafeService.transfer(transferData.from, transferData.to, amountVal, responsibleUser);
    SyncService.sync();
    refresh();
    setTransferData({ ...transferData, amount: '' });
    setActiveTab('OVERVIEW');
    alert('تم التحويل بنجاح');
  };

  const getTotalBalance = () => safes.reduce((acc, curr) => acc + curr.balance, 0);

  const getSafeGradient = (id: string) => {
    if (id.includes('INSTAPAY')) return 'bg-gradient-to-br from-purple-500/20 to-purple-900/40 border-purple-500/30 text-purple-400'; // InstaPay
    if (id.includes('SAFE_1') || id.includes('SAFE_2')) return 'bg-gradient-to-br from-amber-500/20 to-amber-900/40 border-amber-500/30 text-amber-500'; // Main
    return 'bg-gradient-to-br from-slate-700/30 to-slate-900/40 border-slate-600/30 text-slate-400'; // Others
  };

  const getSafeIcon = (id: string) => {
    if (id.includes('INSTAPAY')) return <Smartphone size={24} />;
    if (id.includes('SAFE_1') || id.includes('SAFE_2')) return <Landmark size={24} />;
    return <Wallet size={24} />;
  };

  const getTxTypeLabel = (type: string) => {
      switch (type) {
          case 'TRANSFER': return 'تحويل داخلي';
          case 'DEPOSIT': return 'إيداع';
          case 'WITHDRAW': return 'سحب';
          case 'SALE_DEPOSIT': return 'إيداع مبيعات';
          case 'PURCHASE_WITHDRAW': return 'سحب مشتريات';
          case 'EXPENSE': return 'سحب مصروفات';
          case 'DEBT_COLLECTION': return 'تحصيل ديون';
          default: return 'حركة خزنة';
      }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-4 pb-32 space-y-6 safe-pt animate-fade-in">
      
      {/* Header & Total Balance Hero */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-[#1e293b] border border-white/5 p-8 text-center shadow-2xl">
          <div className="absolute inset-0 bg-amber-500/5 blur-3xl"></div>
          <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 mb-2">
                  <h2 className="text-gray-400 text-sm font-bold uppercase tracking-widest">إجمالي السيولة النقدية</h2>
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/20 font-bold">{currentShop}</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                  <span className="text-5xl md:text-6xl font-black text-white tracking-tighter drop-shadow-lg">
                    {getTotalBalance().toLocaleString()}
                  </span>
                  <span className="text-xl text-amber-500 font-bold mt-4">ج.م</span>
              </div>
          </div>
      </div>

      {/* Tabs / Controls */}
      <div className="flex p-1 bg-[#1e293b]/50 backdrop-blur rounded-2xl border border-white/5">
          <button 
             onClick={() => setActiveTab('OVERVIEW')} 
             className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'OVERVIEW' ? 'bg-[#f4c025] text-black shadow-lg shadow-amber-500/10' : 'text-gray-400 hover:text-white'}`}
          >
             <Wallet size={18} /> أرصدة الخزائن
          </button>
          <button 
             onClick={() => setActiveTab('TRANSFER')} 
             disabled={safes.length < 2}
             className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${safes.length < 2 ? 'opacity-40 cursor-not-allowed' : ''} ${activeTab === 'TRANSFER' ? 'bg-[#f4c025] text-black shadow-lg shadow-amber-500/10' : 'text-gray-400 hover:text-white'}`}
          >
             <ArrowRightLeft size={18} /> تحويل رصيد
          </button>
      </div>

      {/* VIEW: Safe Cards Grid */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
            {safes.map(safe => (
                <div key={safe.id} className={`relative overflow-hidden rounded-3xl p-6 border transition-all hover:scale-[1.02] active:scale-[0.98] cursor-default ${getSafeGradient(safe.id)}`}>
                    <div className="absolute inset-0 bg-amber-500/5 blur-3xl"></div>
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="p-3 bg-black/20 rounded-2xl backdrop-blur-md">
                            {getSafeIcon(safe.id)}
                        </div>
                        {safe.id.includes('SAFE_1') || safe.id.includes('SAFE_2') ? (
                            <span className="bg-amber-500 text-black text-[10px] font-black px-2.5 py-1 rounded-full">رئيسي</span>
                        ) : (
                            <span className="bg-purple-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full">بنكي</span>
                        )}
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-sm font-bold opacity-80 mb-1">{safe.name}</h3>
                        <div className="text-3xl font-black tracking-tight">{safe.balance.toLocaleString()} <span className="text-xs opacity-60">ج.م</span></div>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* VIEW: Transfer Interface */}
      {activeTab === 'TRANSFER' && safes.length >= 2 && (
          <div className="bg-[#1e293b] border border-white/5 rounded-[2rem] p-6 shadow-xl animate-scale-in">
              <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3 text-amber-500">
                      <ArrowRightLeft size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-white">تحويل داخلي</h3>
                  <p className="text-sm text-gray-500">نقل السيولة بين الخزائن وحسابات البنك</p>
              </div>
              
              <form onSubmit={handleTransfer} className="space-y-4">
                 <div className="relative bg-[#0f172a] rounded-3xl p-2 border border-white/5">
                     {/* From */}
                     <div className="p-4 text-right">
                          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 mr-1">من (المصدر)</label>
                          <select 
                             value={transferData.from} 
                             onChange={e => setTransferData({...transferData, from: e.target.value})}
                             className="w-full bg-transparent text-white font-bold text-lg outline-none appearance-none text-right"
                          >
                             {safes.map(s => <option key={s.id} value={s.id} className="bg-[#1e293b] text-gray-300">{s.name} ({s.balance.toLocaleString()})</option>)}
                          </select>
                     </div>

                     {/* Divider Icon */}
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-[#f4c025] rounded-full flex items-center justify-center border-4 border-[#0f172a] z-10 text-black">
                          <ArrowDown size={18} strokeWidth={3} />
                     </div>

                     <div className="h-px bg-white/5 w-full"></div>

                     {/* To */}
                     <div className="p-4 pt-6 text-right">
                          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 mr-1">إلى (المستلم)</label>
                          <select 
                             value={transferData.to} 
                             onChange={e => setTransferData({...transferData, to: e.target.value})}
                             className="w-full bg-transparent text-white font-bold text-lg outline-none appearance-none text-right"
                          >
                             {safes.map(s => <option key={s.id} value={s.id} className="bg-[#1e293b] text-gray-300">{s.name} ({s.balance.toLocaleString()})</option>)}
                          </select>
                     </div>
                 </div>
                 
                 <div className="bg-[#0f172a] rounded-3xl p-5 border border-white/5 flex items-center gap-4">
                     <span className="text-gray-500 font-bold">$</span>
                     <input 
                        type="number" 
                        value={transferData.amount} 
                        onChange={e => setTransferData({...transferData, amount: e.target.value})} 
                        required 
                        placeholder="0.00"
                        className="w-full bg-transparent text-3xl font-black text-white outline-none placeholder:text-gray-700 text-center"
                     />
                     <span className="text-sm font-bold text-amber-500">EGP</span>
                 </div>

                 <button type="submit" className="w-full bg-[#f4c025] hover:bg-[#d9aa20] text-black font-black py-5 rounded-2xl text-lg shadow-lg shadow-amber-900/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
                     <Send size={20} /> تأكيد التحويل
                 </button>
              </form>
          </div>
      )}

      {/* Transaction History Feed */}
      <div className="pt-4">
         <div className="flex items-center gap-2 mb-4 px-2">
             <History size={18} className="text-gray-400" />
             <h3 className="text-gray-400 font-bold text-sm">سجل العمليات الأخير للخزن</h3>
         </div>
         
         <div className="space-y-3">
             {transactions.slice(0, 15).map(tx => {
                 const isExpense = tx.type.includes('WITHDRAW') || tx.type === 'EXPENSE' || tx.type === 'PURCHASE_WITHDRAW';
                 return (
                    <div 
                      key={tx.id} 
                      onClick={() => setSelectedTx(tx)}
                      className="bg-[#1e293b]/60 hover:bg-[#1e293b]/85 backdrop-blur rounded-2xl p-4 border border-white/5 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer hover:border-white/10"
                    >
                        {/* Amount */}
                        <div className={`font-mono font-bold text-base ${isExpense ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {isExpense ? '-' : '+'}{tx.amount.toLocaleString()} <span className="text-[10px] font-sans text-gray-500">ج.م</span>
                        </div>

                        {/* Details */}
                        <div className="flex-1 text-right px-4">
                            <div className="font-bold text-white text-sm mb-1">{tx.type === 'TRANSFER' ? 'تحويل رصيد داخلي' : tx.description}</div>
                            <div className="flex items-center justify-end gap-2 text-[10px] text-gray-400 flex-wrap">
                                {/* Cashier Name displayed elegantly */}
                                <span className="flex items-center gap-1 text-amber-400/80 bg-amber-500/5 px-2 py-0.5 rounded-full border border-amber-500/10 font-medium">
                                    <User size={10} />
                                    {tx.byUser}
                                </span>
                                <span className="text-gray-500 font-mono">{new Date(tx.date).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                            </div>
                        </div>

                        {/* Icon */}
                        <div className="shrink-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isExpense ? 'bg-rose-950/40 border border-rose-700/30 text-rose-400' : 'bg-emerald-950/40 border border-emerald-700/30 text-emerald-400'}`}>
                                {isExpense ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
                            </div>
                        </div>
                    </div>
                 );
             })}
             {transactions.length === 0 && (
                 <div className="text-center py-10 text-gray-600">
                     <p>لا توجد عمليات مسجلة للفرع الحالي</p>
                 </div>
             )}
         </div>
      </div>

      {/* Detailed Transaction Modal */}
      <Modal
        isOpen={!!selectedTx}
        onClose={() => setSelectedTx(null)}
        title="تفاصيل حركة الخزنة"
      >
        {selectedTx && (
            <div className="space-y-5 text-right font-sans" dir="rtl">
                
                {/* Header Info */}
                <div className="bg-[#0a0e1a]/60 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                        <span className="text-gray-500 text-[10px] block mb-1">نوع الحركة</span>
                        <span className="text-white font-bold">{getTxTypeLabel(selectedTx.type)}</span>
                    </div>
                    <div className="text-left">
                        <span className="text-gray-500 text-[10px] block mb-1">القيمة</span>
                        <span className="font-mono text-xl font-black text-amber-400">
                            {selectedTx.amount.toLocaleString()} ج.م
                        </span>
                    </div>
                </div>

                {/* Details Card */}
                <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-4 space-y-3.5">
                    
                    {/* Description */}
                    <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2.5">
                        <span className="text-gray-400 flex items-center gap-1.5"><FileText size={14} className="text-amber-400" /> البيان</span>
                        <span className="text-white font-bold">{selectedTx.description}</span>
                    </div>

                    {/* From Safe */}
                    {selectedTx.fromSafeId && (
                        <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2.5">
                            <span className="text-gray-400 flex items-center gap-1.5"><Landmark size={14} className="text-amber-400" /> من الخزنة</span>
                            <span className="text-rose-400 font-bold">{SafeService.getAll().find(s=>s.id===selectedTx.fromSafeId)?.name || selectedTx.fromSafeId}</span>
                        </div>
                    )}

                    {/* To Safe */}
                    {selectedTx.toSafeId && (
                        <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2.5">
                            <span className="text-gray-400 flex items-center gap-1.5"><Landmark size={14} className="text-amber-400" /> إلى الخزنة</span>
                            <span className="text-emerald-400 font-bold">{SafeService.getAll().find(s=>s.id===selectedTx.toSafeId)?.name || selectedTx.toSafeId}</span>
                        </div>
                    )}

                    {/* Cashier Name */}
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400 flex items-center gap-1.5"><User size={14} className="text-amber-400" /> الموظف المسؤول</span>
                        <span className="text-emerald-400 font-black flex items-center gap-1 bg-emerald-500/5 px-3 py-1 rounded-full border border-emerald-500/20 text-xs">
                            <User size={12} />
                            {selectedTx.byUser}
                        </span>
                    </div>
                </div>

                {/* Date/Time info */}
                <div className="grid grid-cols-2 gap-3 text-center text-[10px] text-gray-500 font-mono">
                    <div className="bg-[#0a0e1a]/40 p-2 rounded-xl border border-white/5 flex items-center justify-center gap-1">
                        <Calendar size={12} className="text-amber-400" />
                        <span>{new Date(selectedTx.date).toLocaleDateString('ar-EG')}</span>
                    </div>
                    <div className="bg-[#0a0e1a]/40 p-2 rounded-xl border border-white/5 flex items-center justify-center gap-1">
                        <Clock size={12} className="text-amber-400" />
                        <span>{new Date(selectedTx.date).toLocaleTimeString('ar-EG')}</span>
                    </div>
                </div>

                {/* Close Button */}
                <button 
                  onClick={() => setSelectedTx(null)} 
                  className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-black transition-all active:scale-[0.98] border border-white/5"
                >
                    إغلاق التفاصيل
                </button>
            </div>
        )}
      </Modal>
    </div>
  );
};

export default Safes;
