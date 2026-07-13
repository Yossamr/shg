import React, { useState, useEffect } from 'react';
import { GhawayeshService, SyncService, AuthService } from '../services/storage';
import { GhawayeshEntry, AppUser } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  History, 
  Scale, 
  ArrowRightLeft, 
  AlertCircle,
  Hash,
  Sparkles,
  RefreshCw,
  Clock
} from 'lucide-react';

const Ghawayesh = () => {
  const [entries, setEntries] = useState<GhawayeshEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [currentShop, setCurrentShop] = useState(localStorage.getItem('selected_shop') || 'المحل الأساسي');
  
  // Totals
  const [totals, setTotals] = useState({ count: 0, weight: 0 });

  // Form states
  const [isAdding, setIsAdding] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  const [newEntry, setNewEntry] = useState({
    operation: '',
    countChange: '',
    weightChange: '',
    type: 'IN' as 'IN' | 'OUT'
  });

  const [transfer, setTransfer] = useState({
    count: '',
    weight: ''
  });

  const refresh = () => {
    // Current shop's entries
    const allEntries = GhawayeshService.getAll();
    const shopEntries = allEntries.filter(e => (e.shop || 'المحل الأساسي') === currentShop);
    // Sort descending by timestamp for the list
    setEntries([...shopEntries].reverse());

    // Current shop's totals
    const t = GhawayeshService.getLastTotals();
    setTotals(t);
  };

  useEffect(() => {
    refresh();
    setCurrentUser(AuthService.getCurrentUser());
    
    const handleShopChanged = () => {
      setCurrentShop(localStorage.getItem('selected_shop') || 'المحل الأساسي');
    };
    window.addEventListener('shop-changed', handleShopChanged);
    return () => window.removeEventListener('shop-changed', handleShopChanged);
  }, [currentShop]);

  useEffect(() => {
    refresh();
  }, [currentShop]);

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const countVal = Math.abs(Number(newEntry.countChange));
    const weightVal = Math.abs(Number(newEntry.weightChange));
    
    if (countVal <= 0 || weightVal <= 0 || !newEntry.operation.trim()) return;

    // IN is positive, OUT is negative
    const signedCount = newEntry.type === 'IN' ? countVal : -countVal;
    const signedWeight = newEntry.type === 'IN' ? weightVal : -weightVal;

    const entry: GhawayeshEntry = {
      id: Math.random().toString(36).substr(2, 9),
      day: new Date().toLocaleDateString('ar-EG', { weekday: 'long' }),
      dateStr: new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
      timestamp: Date.now(),
      operation: newEntry.operation,
      countChange: signedCount,
      currentCount: 0,
      weightChange: signedWeight,
      currentWeight: 0,
      type: newEntry.type,
      shop: currentShop
    };

    GhawayeshService.addEntry(entry);
    SyncService.sync();
    refresh();
    
    setNewEntry({
      operation: '',
      countChange: '',
      weightChange: '',
      type: 'IN'
    });
    setIsAdding(false);
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const countVal = Math.abs(Number(transfer.count));
    const weightVal = Math.abs(Number(transfer.weight));

    if (countVal <= 0 || weightVal <= 0) return;
    if (countVal > totals.count || weightVal > totals.weight) {
      alert('الكمية أو الوزن المطلوب تحويله أكبر من الرصيد الحالي بالمحل!');
      return;
    }

    const otherShop = currentShop === 'المحل الأساسي' ? 'المحل الثاني' : 'المحل الأساسي';

    if (confirm(`هل أنت متأكد من تحويل عدد ${countVal} غوايش بوزن ${weightVal} جرام من ${currentShop} إلى ${otherShop}؟`)) {
      GhawayeshService.transferBetweenShops(countVal, weightVal, currentShop, otherShop);
      SyncService.sync();
      refresh();
      
      setTransfer({ count: '', weight: '' });
      setIsTransferring(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه العملية؟ سيتم إعادة حساب الأرصدة تلقائياً.')) {
      GhawayeshService.deleteEntry(id);
      SyncService.sync();
      refresh();
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-4 pb-32 space-y-6 safe-pt animate-fade-in" dir="rtl">
      
      {/* Upper Metric Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1e293b] rounded-3xl p-5 border border-white/5 shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-bl-full -mr-3 -mt-3"></div>
          <div className="flex items-center gap-2">
            <Hash size={16} className="text-amber-500" />
            <span className="text-gray-400 text-xs font-bold">العدد الحالي</span>
          </div>
          <div className="text-3xl font-black text-white tracking-tight mt-1">
            {totals.count}
          </div>
          <span className="text-[10px] text-amber-500 font-bold">قطعة غويشة</span>
        </div>

        <div className="bg-[#1e293b] rounded-3xl p-5 border border-white/5 shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/5 rounded-bl-full -mr-3 -mt-3"></div>
          <div className="flex items-center gap-2">
            <Scale size={16} className="text-yellow-500" />
            <span className="text-gray-400 text-xs font-bold">الوزن الحالي</span>
          </div>
          <div className="text-3xl font-black text-white tracking-tight mt-1">
            {totals.weight.toFixed(2)}
          </div>
          <span className="text-[10px] text-yellow-500 font-bold">جرام عيار 21</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => {
            setIsAdding(!isAdding);
            setIsTransferring(false);
          }}
          className={`rounded-2xl py-3 px-4 border flex items-center justify-center gap-2 transition-all active:scale-95 text-sm font-bold ${
            isAdding 
              ? 'bg-amber-500 border-amber-600 text-white shadow-lg' 
              : 'bg-[#1e293b] border-white/5 text-amber-400 hover:border-amber-500/30'
          }`}
        >
          <Plus size={18} />
          <span>{isAdding ? 'إلغاء الإضافة' : 'حركة غوايش جديدة'}</span>
        </button>

        <button 
          onClick={() => {
            setIsTransferring(!isTransferring);
            setIsAdding(false);
          }}
          className={`rounded-2xl py-3 px-4 border flex items-center justify-center gap-2 transition-all active:scale-95 text-sm font-bold ${
            isTransferring 
              ? 'bg-blue-500 border-blue-600 text-white shadow-lg' 
              : 'bg-[#1e293b] border-white/5 text-blue-400 hover:border-blue-500/30'
          }`}
        >
          <ArrowRightLeft size={18} />
          <span>{isTransferring ? 'إلغاء التحويل' : 'تحويل بين الفروع'}</span>
        </button>
      </div>

      {/* New Entry Form */}
      {isAdding && (
        <div className="bg-[#1e293b] border border-amber-500/30 rounded-3xl p-5 shadow-2xl animate-scale-in relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>
          <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm">
            <Sparkles size={16} className="text-amber-400" />
            <span>تسجيل حركة غوايش وارد / صادر</span>
          </h3>

          <form onSubmit={handleAddEntry} className="space-y-4">
            {/* Type Selector */}
            <div className="grid grid-cols-2 gap-2 bg-[#0f172a] p-1 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setNewEntry({ ...newEntry, type: 'IN' })}
                className={`py-2 rounded-lg font-bold text-xs transition-all ${
                  newEntry.type === 'IN' 
                    ? 'bg-emerald-500 text-white shadow' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                وارد (زيادة رصيد)
              </button>
              <button
                type="button"
                onClick={() => setNewEntry({ ...newEntry, type: 'OUT' })}
                className={`py-2 rounded-lg font-bold text-xs transition-all ${
                  newEntry.type === 'OUT' 
                    ? 'bg-rose-500 text-white shadow' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                صادر (سحب/بيع)
              </button>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-gray-400 font-bold block">العدد (قطعة)</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  placeholder="0"
                  value={newEntry.countChange}
                  onChange={e => setNewEntry({ ...newEntry, countChange: e.target.value })}
                  className="w-full bg-[#0f172a] border border-white/5 rounded-xl h-11 px-3 text-white text-sm outline-none focus:border-amber-500 transition-colors text-center font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-gray-400 font-bold block">الوزن (جرام)</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={newEntry.weightChange}
                  onChange={e => setNewEntry({ ...newEntry, weightChange: e.target.value })}
                  className="w-full bg-[#0f172a] border border-white/5 rounded-xl h-11 px-3 text-white text-sm outline-none focus:border-amber-500 transition-colors text-center font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-gray-400 font-bold block">وصف العملية</label>
              <input
                type="text"
                required
                placeholder="مثال: توريد ورشة، بيع زبون، كسر تصفية..."
                value={newEntry.operation}
                onChange={e => setNewEntry({ ...newEntry, operation: e.target.value })}
                className="w-full bg-[#0f172a] border border-white/5 rounded-xl h-11 px-4 text-white text-xs outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-[#0f172a] font-bold h-11 rounded-xl transition-all active:scale-95 text-xs shadow-lg flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              <span>إضافة الحركة للدفتر</span>
            </button>
          </form>
        </div>
      )}

      {/* Transfer Form */}
      {isTransferring && (
        <div className="bg-[#1e293b] border border-blue-500/30 rounded-3xl p-5 shadow-2xl animate-scale-in relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
          <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm">
            <ArrowRightLeft size={16} className="text-blue-400" />
            <span>تحويل غوايش إلى الفرع الآخر</span>
          </h3>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-4 text-xs text-blue-300 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              يتم تحويل الأرصدة من <strong>{currentShop}</strong> إلى <strong>{currentShop === 'المحل الأساسي' ? 'المحل الثاني' : 'المحل الأساسي'}</strong>. سيتم تسجيل قيد صادر بالفرع الحالي وقيد وارد بالفرع الآخر تلقائياً.
            </div>
          </div>

          <form onSubmit={handleTransfer} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-gray-400 font-bold block">عدد الغوايش للتحويل</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  placeholder={`أقصى حد ${totals.count}`}
                  value={transfer.count}
                  onChange={e => setTransfer({ ...transfer, count: e.target.value })}
                  className="w-full bg-[#0f172a] border border-white/5 rounded-xl h-11 px-3 text-white text-sm outline-none focus:border-blue-500 transition-colors text-center font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-gray-400 font-bold block">الوزن المراد تحويله</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  placeholder={`أقصى حد ${totals.weight.toFixed(2)}`}
                  value={transfer.weight}
                  onChange={e => setTransfer({ ...transfer, weight: e.target.value })}
                  className="w-full bg-[#0f172a] border border-white/5 rounded-xl h-11 px-3 text-white text-sm outline-none focus:border-blue-500 transition-colors text-center font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold h-11 rounded-xl transition-all active:scale-95 text-xs shadow-lg flex items-center justify-center gap-2"
            >
              <ArrowRightLeft size={16} />
              <span>إرسال الشحنة للفرع الآخر</span>
            </button>
          </form>
        </div>
      )}

      {/* Ledger History */}
      <div className="bg-[#1e293b] rounded-3xl border border-white/5 shadow-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h3 className="font-bold flex items-center gap-2 text-sm text-gray-200">
            <History size={16} className="text-amber-500" />
            <span>دفتر ميزان حركة الغوايش ({currentShop})</span>
          </h3>
          <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded border border-white/10 font-bold">
            {entries.length} حركة
          </span>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <div className="text-gray-600 inline-flex items-center justify-center w-12 h-12 bg-white/5 rounded-full mb-2">
              <Clock size={24} />
            </div>
            <p className="text-gray-400 text-xs font-medium">لا توجد حركات مسجلة بهذا الفرع بعد</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
            {entries.map((entry) => {
              const isIN = entry.type === 'IN';
              return (
                <div 
                  key={entry.id} 
                  className="bg-[#0f172a]/70 hover:bg-[#0f172a]/90 transition-all rounded-2xl p-3.5 border border-white/5 flex flex-col gap-2 relative group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2.5">
                      {/* Icon Indicator */}
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                        isIN 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}>
                        {isIN ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      </span>

                      <div>
                        <h4 className="text-xs font-black text-white leading-tight mt-0.5">{entry.operation}</h4>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-500 font-medium">
                          <span>{entry.day}</span>
                          <span>•</span>
                          <span>{entry.dateStr}</span>
                          {entry.updatedAt && (
                            <>
                              <span>•</span>
                              <span>{new Date(entry.updatedAt).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all active:scale-90 shadow"
                      title="حذف القيد"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Transaction stats row */}
                  <div className="grid grid-cols-2 gap-2 mt-1 pt-2 border-t border-white/5">
                    <div className="bg-white/5 rounded-xl px-2.5 py-1.5 flex flex-col">
                      <span className="text-[9px] text-gray-500 font-bold leading-none mb-1">الكمية</span>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-black ${isIN ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isIN ? '+' : ''}{entry.countChange}
                        </span>
                        <span className="text-[9px] text-gray-400">رصيد: {entry.currentCount}</span>
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-xl px-2.5 py-1.5 flex flex-col">
                      <span className="text-[9px] text-gray-500 font-bold leading-none mb-1">الوزن</span>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-black ${isIN ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isIN ? '+' : ''}{entry.weightChange.toFixed(2)}ج
                        </span>
                        <span className="text-[9px] text-gray-400">رصيد: {entry.currentWeight.toFixed(2)}ج</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default Ghawayesh;
