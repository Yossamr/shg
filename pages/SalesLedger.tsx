import React, { useState, useEffect } from 'react';
import { TransactionService, ExpenseService, SafeService, RepService } from '../services/storage';
import { TransactionType, PaymentMethod } from '../types';
import { ArrowUpRight, ArrowDownLeft, Wallet, Tag, Filter, FileSpreadsheet, Monitor, Smartphone, User, Landmark, Scale, FileText, Calendar, Clock, Notebook } from 'lucide-react';
import { Modal } from '../components/UI';

interface LedgerEntry {
    id: string;
    date: number;
    typeLabel: string;
    category: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'NEUTRAL';
    description: string;
    amount: number;
    subLabel: string; // e.g. "الخزينة الرئيسية"
    timeStr: string;
    source?: 'DESKTOP' | 'MOBILE';
    byUser: string;
    shop: string;
    paymentMethod?: string;
    notes?: string;
    weight?: number;
    karat?: number;
    goldPricePerGram?: number;
    workmanship?: number;
    invoiceId?: string;
    rawType?: string; // 'SALE' | 'PURCHASE' | 'EXPENSE'
}

const SalesLedger = () => {
  const [groupedEntries, setGroupedEntries] = useState<{ [key: string]: LedgerEntry[] }>({});
  const [filter, setFilter] = useState<'ALL' | 'SALE' | 'PURCHASE' | 'EXPENSE'>('ALL');
  const [currentShop, setCurrentShop] = useState(localStorage.getItem('selected_shop') || 'المحل الأساسي');
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);

  useEffect(() => {
    refreshData();
    const handleShopChanged = () => {
      setCurrentShop(localStorage.getItem('selected_shop') || 'المحل الأساسي');
    };
    window.addEventListener('shop-changed', handleShopChanged);
    window.addEventListener('data-synced', refreshData);
    return () => {
      window.removeEventListener('shop-changed', handleShopChanged);
      window.removeEventListener('data-synced', refreshData);
    };
  }, [filter, currentShop]);

  const refreshData = () => {
    const allEntries: LedgerEntry[] = [];

    // 1. Transactions
    const txs = TransactionService.getAll();
    txs.forEach(tx => {
        const txShop = tx.shop || 'المحل الأساسي';
        // Filter by branch
        if (txShop !== currentShop) return;

        allEntries.push({
            id: tx.id,
            date: tx.date,
            typeLabel: tx.type === 'SALE' ? `بيع ${tx.itemName}` : `شراء ${tx.itemName}`,
            category: tx.type === 'SALE' ? 'INCOME' : 'EXPENSE',
            description: tx.customerName || 'عميل نقدي',
            amount: tx.totalPrice,
            subLabel: tx.paymentMethod === 'INSTAPAY' ? 'إنستاباي' : 'الخزينة الرئيسية',
            timeStr: new Date(tx.date).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}),
            source: tx.source,
            byUser: tx.createdBy || 'غير معروف',
            shop: txShop,
            paymentMethod: tx.paymentMethod === 'INSTAPAY' ? 'InstaPay' : tx.paymentMethod === 'CASH' ? 'كاش' : 'آجل',
            notes: tx.notes,
            weight: tx.weight,
            karat: tx.karat,
            goldPricePerGram: tx.goldPricePerGram,
            workmanship: tx.workmanship,
            invoiceId: tx.invoiceId,
            rawType: tx.type
        });
    });

    // 2. Expenses
    const expenses = ExpenseService.getAll();
    expenses.forEach(exp => {
        const expShop = exp.shop || 'المحل الأساسي';
        // Filter by branch
        if (expShop !== currentShop) return;

        allEntries.push({
            id: exp.id,
            date: exp.date,
            typeLabel: exp.description,
            category: 'EXPENSE',
            description: 'مصروفات',
            amount: exp.amount,
            subLabel: 'خزينة المصروفات',
            timeStr: new Date(exp.date).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}),
            source: exp.source,
            byUser: exp.byUser || 'غير معروف',
            shop: expShop,
            paymentMethod: 'كاش (الخزنة)',
            rawType: 'EXPENSE'
        });
    });

    // Filter Logic
    let filtered = allEntries;
    if (filter === 'SALE') filtered = allEntries.filter(e => e.category === 'INCOME');
    if (filter === 'PURCHASE') filtered = allEntries.filter(e => e.typeLabel.includes('شراء'));
    if (filter === 'EXPENSE') filtered = allEntries.filter(e => e.subLabel.includes('المصروفات'));

    // Sort Descending
    filtered.sort((a, b) => b.date - a.date);

    // Group by Day (Today, Yesterday, Date)
    const groups: { [key: string]: LedgerEntry[] } = {};
    const today = new Date().setHours(0,0,0,0);
    const yesterday = new Date(today - 86400000).setHours(0,0,0,0);

    filtered.forEach(entry => {
        const entryDate = new Date(entry.date).setHours(0,0,0,0);
        let key = new Date(entry.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
        
        if (entryDate === today) key = `اليوم - ${new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}`;
        else if (entryDate === yesterday) key = `أمس - ${new Date(yesterday).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}`;

        if (!groups[key]) groups[key] = [];
        groups[key].push(entry);
    });

    setGroupedEntries(groups);
  };

  const getIcon = (entry: LedgerEntry) => {
      if (entry.subLabel.includes('المصروفات')) 
        return <div className="p-3 rounded-xl bg-pink-950/40 border border-pink-700/30 text-pink-400"><Wallet size={20} /></div>;
      
      if (entry.category === 'INCOME')
        return <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-700/30 text-emerald-400"><ArrowUpRight size={20} /></div>;
      
      if (entry.typeLabel.includes('شراء'))
        return <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-700/30 text-rose-400"><ArrowDownLeft size={20} /></div>;

      return <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-700/30 text-blue-400"><Tag size={20} /></div>;
  };

  return (
    <div className="space-y-4 px-3 py-4">
      {/* Header & Filters */}
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">دفتر الأستاذ العام</h2>
              <span className="text-[10px] bg-gold-500/10 text-gold-400 px-2.5 py-0.5 rounded-full border border-gold-500/20 font-bold">{currentShop}</span>
          </div>
          <div className="p-2 bg-dark-card rounded-lg border border-dark-border">
             <Filter size={18} className="text-gold-400" />
          </div>
      </div>

      {/* Pill Filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          <button onClick={() => setFilter('ALL')} className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filter === 'ALL' ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/15' : 'bg-dark-card text-gray-400 border border-dark-border'}`}>الكل</button>
          <button onClick={() => setFilter('SALE')} className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filter === 'SALE' ? 'bg-dark-card border-emerald-500/50 text-emerald-400 border' : 'bg-dark-card text-gray-400 border border-dark-border'}`}>مبيعات</button>
          <button onClick={() => setFilter('PURCHASE')} className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filter === 'PURCHASE' ? 'bg-dark-card border-rose-500/50 text-rose-400 border' : 'bg-dark-card text-gray-400 border border-dark-border'}`}>مشتريات</button>
          <button onClick={() => setFilter('EXPENSE')} className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filter === 'EXPENSE' ? 'bg-dark-card border-pink-500/50 text-pink-400 border' : 'bg-dark-card text-gray-400 border border-dark-border'}`}>مصروفات</button>
      </div>

      {/* Grouped List */}
      <div className="space-y-6">
          {Object.entries(groupedEntries).map(([dateLabel, items]: [string, LedgerEntry[]]) => (
               <div key={dateLabel} className="animate-fade-in">
                  <div className="flex items-center gap-3 mb-3">
                      {dateLabel.includes('اليوم') && <span className="bg-gold-900/30 text-gold-400 border border-gold-700/50 px-2 py-0.5 rounded text-[10px] font-bold">متزامن محلياً</span>}
                      <h3 className="text-gray-400 text-xs font-bold">{dateLabel}</h3>
                  </div>
                  
                  <div className="space-y-3">
                      {items.map(item => (
                          <div 
                            key={item.id} 
                            onClick={() => setSelectedEntry(item)}
                            className="bg-dark-card/90 hover:bg-dark-card rounded-2xl p-4 border border-dark-border shadow-sm flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer hover:border-white/10"
                          >
                              {/* Left Side: Amount */}
                              <div className={`font-mono font-bold text-base dir-ltr ${
                                  item.category === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'
                              }`}>
                                  {item.category === 'INCOME' ? '+' : '-'} {item.amount.toLocaleString()} <span className="text-[10px] font-sans text-gray-500">ج.م</span>
                              </div>

                              {/* Center: Details */}
                              <div className="flex-1 text-right px-4">
                                  <div className="flex items-center justify-end gap-1.5 mb-1.5">
                                      <div className="font-bold text-white text-sm leading-tight">{item.typeLabel}</div>
                                      {/* Source Icon */}
                                      {item.source === 'DESKTOP' && <div title="من الكمبيوتر"><Monitor size={13} className="text-blue-400" /></div>}
                                      {item.source === 'MOBILE' && <div title="من الموبايل"><Smartphone size={13} className="text-gold-400" /></div>}
                                  </div>
                                  <div className="flex items-center justify-end gap-2 text-[10px] text-gray-400 flex-wrap">
                                      {/* Cashier name displayed elegantly */}
                                      <span className="flex items-center gap-1 text-gold-400/80 bg-gold-500/5 px-2 py-0.5 rounded-full border border-gold-500/10 font-medium">
                                          <User size={10} />
                                          {item.byUser}
                                      </span>
                                      <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">{item.subLabel}</span>
                                      <span className="text-gray-500 font-mono">{item.timeStr}</span>
                                  </div>
                              </div>

                              {/* Right Side: Icon */}
                              <div className="shrink-0">
                                  {getIcon(item)}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          ))}
          
          {Object.keys(groupedEntries).length === 0 && (
              <div className="text-center py-20 text-gray-600">
                  <FileSpreadsheet size={48} className="mx-auto mb-4 opacity-20" />
                  <p>لا توجد حركات مسجلة</p>
              </div>
          )}
      </div>

      {/* Detailed Entry Modal */}
      <Modal
        isOpen={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        title="تفاصيل العملية بالكامل"
      >
        {selectedEntry && (
            <div className="space-y-5 text-right font-sans" dir="rtl">
                
                {/* Header Info */}
                <div className="bg-[#0a0e1a]/60 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                        <span className="text-gray-500 text-[10px] block mb-1">نوع العملية</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-black ${
                            selectedEntry.category === 'INCOME' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                            {selectedEntry.category === 'INCOME' ? 'وارد / مبيعات' : 'صادر / مصروفات'}
                        </span>
                    </div>
                    <div className="text-left">
                        <span className="text-gray-500 text-[10px] block mb-1">القيمة الإجمالية</span>
                        <span className={`font-mono text-xl font-black ${
                            selectedEntry.category === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                            {selectedEntry.amount.toLocaleString()} ج.م
                        </span>
                    </div>
                </div>

                {/* Details Table */}
                <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-4 space-y-3.5">
                    
                    {/* Operation Title */}
                    <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2.5">
                        <span className="text-gray-400 flex items-center gap-1.5"><FileText size={14} className="text-gold-400" /> البيان</span>
                        <span className="text-white font-bold">{selectedEntry.typeLabel}</span>
                    </div>

                    {/* Invoice ID if transaction */}
                    {selectedEntry.invoiceId && (
                        <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2.5">
                            <span className="text-gray-400 flex items-center gap-1.5"><Notebook size={14} className="text-gold-400" /> رقم الفاتورة</span>
                            <span className="text-white font-mono font-black text-gold-400">{selectedEntry.invoiceId}</span>
                        </div>
                    )}

                    {/* Customer Info */}
                    {selectedEntry.rawType !== 'EXPENSE' && (
                        <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2.5">
                            <span className="text-gray-400 flex items-center gap-1.5"><User size={14} className="text-gold-400" /> العميل</span>
                            <span className="text-white font-bold">{selectedEntry.description}</span>
                        </div>
                    )}

                    {/* Weight and karat details */}
                    {selectedEntry.weight !== undefined && selectedEntry.weight > 0 && (
                        <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2.5">
                            <span className="text-gray-400 flex items-center gap-1.5"><Scale size={14} className="text-gold-400" /> تفاصيل الذهب</span>
                            <span className="text-white font-bold">
                                {selectedEntry.weight} جرام (عيار {selectedEntry.karat})
                            </span>
                        </div>
                    )}

                    {/* Gold Price */}
                    {selectedEntry.goldPricePerGram !== undefined && selectedEntry.goldPricePerGram > 0 && (
                        <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2.5">
                            <span className="text-gray-400 flex items-center gap-1.5"><Landmark size={14} className="text-gold-400" /> سعر الجرام</span>
                            <span className="text-white font-mono">{selectedEntry.goldPricePerGram.toLocaleString()} ج.م</span>
                        </div>
                    )}

                    {/* Workmanship */}
                    {selectedEntry.workmanship !== undefined && selectedEntry.workmanship > 0 && (
                        <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2.5">
                            <span className="text-gray-400 flex items-center gap-1.5"><Scale size={14} className="text-gold-400" /> مصنعية الجرام</span>
                            <span className="text-white font-mono">{selectedEntry.workmanship.toLocaleString()} ج.م</span>
                        </div>
                    )}

                    {/* Payment Method */}
                    <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2.5">
                        <span className="text-gray-400 flex items-center gap-1.5"><Wallet size={14} className="text-gold-400" /> طريقة الدفع</span>
                        <span className="text-white font-bold">{selectedEntry.paymentMethod}</span>
                    </div>

                    {/* Safe Name */}
                    <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2.5">
                        <span className="text-gray-400 flex items-center gap-1.5"><Landmark size={14} className="text-gold-400" /> الخزنة المستهدفة</span>
                        <span className="text-slate-300 font-bold">{selectedEntry.subLabel}</span>
                    </div>

                    {/* Branch Shop */}
                    <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2.5">
                        <span className="text-gray-400 flex items-center gap-1.5"><Landmark size={14} className="text-gold-400" /> الفرع / المحل</span>
                        <span className="text-gold-400 font-bold">{selectedEntry.shop}</span>
                    </div>

                    {/* Cashier Name */}
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400 flex items-center gap-1.5"><User size={14} className="text-gold-400" /> الموظف المسؤول</span>
                        <span className="text-emerald-400 font-black flex items-center gap-1 bg-emerald-500/5 px-3 py-1 rounded-full border border-emerald-500/20 text-xs">
                            <User size={12} />
                            {selectedEntry.byUser}
                        </span>
                    </div>
                </div>

                {/* Notes Block */}
                {selectedEntry.notes && (
                    <div className="bg-slate-800/20 border border-white/5 rounded-2xl p-4 space-y-2">
                        <span className="text-gray-400 text-xs block">ملاحظات إضافية</span>
                        <p className="text-white text-xs leading-relaxed font-medium bg-[#0a0e1a]/30 p-2.5 rounded-xl border border-white/5">{selectedEntry.notes}</p>
                    </div>
                )}

                {/* Meta details (Date/Time/Platform) */}
                <div className="grid grid-cols-2 gap-3 text-center text-[10px] text-gray-500 font-mono">
                    <div className="bg-[#0a0e1a]/40 p-2 rounded-xl border border-white/5 flex items-center justify-center gap-1">
                        <Calendar size={12} className="text-gold-400" />
                        <span>{new Date(selectedEntry.date).toLocaleDateString('ar-EG')}</span>
                    </div>
                    <div className="bg-[#0a0e1a]/40 p-2 rounded-xl border border-white/5 flex items-center justify-center gap-1">
                        <Clock size={12} className="text-gold-400" />
                        <span>{selectedEntry.timeStr}</span>
                    </div>
                </div>

                {/* Action button to print or close */}
                <button 
                  onClick={() => setSelectedEntry(null)} 
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

export default SalesLedger;
