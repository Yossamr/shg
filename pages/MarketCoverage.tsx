import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, TrendingUp, TrendingDown, Calendar, Layers, Info, ChevronDown, ChevronUp, Clock, Tag } from 'lucide-react';
import { MarketCoverageService, DailyCoverage, TransactionService } from '../services/storage';
import { Transaction, TransactionType } from '../types';

interface ExpandedDayState {
  [dateStr: string]: boolean;
}

export default function MarketCoverage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<DailyCoverage[]>([]);
  const [allTxs, setAllTxs] = useState<Transaction[]>([]);
  const [expandedDays, setExpandedDays] = useState<ExpandedDayState>({});
  
  const currentShop = localStorage.getItem('selected_shop') || 'المحل الأساسي';

  const loadData = () => {
    const hist = MarketCoverageService.getHistory(currentShop);
    setHistory(hist);
    setAllTxs(TransactionService.getAll());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('data-synced', loadData);
    return () => {
      window.removeEventListener('data-synced', loadData);
    };
  }, [currentShop]);

  const toggleExpand = (dateStr: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));
  };

  // Helper to format date into friendly Arabic string
  const formatArabicDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Helper to get day's transactions for the selected shop
  const getDayTransactions = (dateStr: string): Transaction[] => {
    const start = new Date(dateStr + 'T00:00:00').getTime();
    const end = new Date(dateStr + 'T23:59:59').getTime();
    
    return allTxs.filter(t => 
      t.date >= start && 
      t.date <= end && 
      (t.shop || 'المحل الأساسي') === currentShop &&
      (t.type === TransactionType.SALE || t.type === TransactionType.PURCHASE)
    ).sort((a, b) => b.date - a.date);
  };

  // Today's Date Str in local format YYYY-MM-DD
  const todayStr = new Date().toLocaleDateString('en-CA');
  const todayCoverage = history.find(h => h.dateStr === todayStr) || {
    dateStr: todayStr,
    timestamp: Date.now(),
    totalSold21: 0,
    totalBought21: 0,
    net21: 0,
    color: 'slate' as const
  };

  return (
    <div className="px-4 py-6 pb-32 space-y-6 animate-fade-in font-sans min-h-full bg-dark-bg text-white" dir="rtl">
      
      {/* Header */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 rounded-full bg-slate-800/80 border border-white/5 flex items-center justify-center text-gray-300 hover:text-white hover:bg-slate-700 active:scale-95 transition-all"
        >
          <ArrowRight size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            تغطية السوق 📊
          </h1>
          <p className="text-xs text-gray-400 font-medium">موازنة الذهب وحساب العجز والفائض للفرع: {currentShop}</p>
        </div>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-blue-300">
        <Info size={18} className="shrink-0 text-blue-400 mt-0.5" />
        <div>
          <span className="font-bold block mb-0.5">كيف يتم احتساب تغطية السوق؟</span>
          يتم تحويل أوزان جميع المبيعات والمشتريات (سبائك، كسر، مشغول) تلقائياً إلى عيار 21 المكافئ. 
          الهدف هو موازنة مبيعاتك ومشترياتك لحماية مخزون المحل من تقلبات الأسعار.
        </div>
      </div>

      {/* Today's Big Coverage Status Card */}
      <div className={`
        relative overflow-hidden rounded-[2rem] p-6 border transition-all duration-500 shadow-xl
        ${todayCoverage.net21 < 0 
          ? 'bg-rose-950/20 border-rose-500/20 shadow-rose-950/10' 
          : todayCoverage.net21 > 0 
            ? 'bg-emerald-950/20 border-emerald-500/20 shadow-emerald-950/10' 
            : 'bg-slate-900/60 border-slate-700/30'
        }
      `}>
        {/* Dynamic Glow background */}
        <div className={`
          absolute -right-16 -top-16 w-32 h-32 rounded-full blur-3xl opacity-30
          ${todayCoverage.net21 < 0 ? 'bg-rose-500' : todayCoverage.net21 > 0 ? 'bg-emerald-500' : 'bg-slate-500'}
        `} />

        <div className="relative z-10 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-full border border-white/5 text-gray-300">حالة اليوم</span>
            <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
              <Calendar size={12} />
              {formatArabicDate(todayStr)}
            </div>
          </div>

          <div className="flex justify-between items-end">
            <div>
              <p className="text-3xl font-black font-mono tracking-tight text-white">
                {Math.abs(todayCoverage.net21).toFixed(2)} <span className="text-sm font-bold text-gray-400">جم</span>
              </p>
              <p className={`text-xs font-semibold mt-1 flex items-center gap-1 
                ${todayCoverage.net21 < 0 ? 'text-rose-400' : todayCoverage.net21 > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                {todayCoverage.net21 < 0 ? (
                  <>
                    <TrendingDown size={14} /> عجز تغطية (باع أكثر من الشراء)
                  </>
                ) : todayCoverage.net21 > 0 ? (
                  <>
                    <TrendingUp size={14} /> فائض تغطية (اشترى أكثر من البيع)
                  </>
                ) : (
                  'التغطية متعادلة اليوم'
                )}
              </p>
            </div>
            
            {/* Action pill */}
            <div className={`text-[10px] font-bold px-3 py-1.5 rounded-full border shadow-sm
              ${todayCoverage.net21 < 0 
                ? 'bg-rose-500/10 border-rose-500/25 text-rose-400' 
                : todayCoverage.net21 > 0 
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' 
                  : 'bg-slate-800/80 border-slate-700/30 text-slate-400'
              }
            `}>
              {todayCoverage.net21 < 0 ? 'بحاجة لتغطية بالذهب' : todayCoverage.net21 > 0 ? 'رصيد ذهب آمن' : 'متعادل'}
            </div>
          </div>

          {/* Progress bar split */}
          <div className="pt-2">
            <div className="flex justify-between text-[10px] text-gray-400 font-bold mb-1">
              <span>إجمالي المبيعات (عيار 21): {todayCoverage.totalSold21.toFixed(2)} جم</span>
              <span>إجمالي المشتريات (عيار 21): {todayCoverage.totalBought21.toFixed(2)} جم</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden flex">
              <div 
                style={{ width: `${todayCoverage.totalSold21 || todayCoverage.totalBought21 ? (todayCoverage.totalSold21 / (todayCoverage.totalSold21 + todayCoverage.totalBought21)) * 100 : 50}%` }}
                className="bg-rose-500" 
              />
              <div 
                style={{ width: `${todayCoverage.totalSold21 || todayCoverage.totalBought21 ? (todayCoverage.totalBought21 / (todayCoverage.totalSold21 + todayCoverage.totalBought21)) * 100 : 50}%` }}
                className="bg-emerald-500" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* History Log Title */}
      <div className="px-1 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
          <Layers size={18} className="text-gold-500" />
          سجل التغطية اليومي للفرع
        </h2>
        <span className="text-[10px] font-bold bg-slate-800 text-gray-400 px-2 py-1 rounded-full">{history.length} يوم مسجل</span>
      </div>

      {/* History List */}
      <div className="space-y-3">
        {history.length === 0 ? (
          <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-8 text-center text-gray-500 text-sm font-medium">
            لا توجد حركات بيع أو شراء مسجلة بعد لهذا الفرع.
          </div>
        ) : (
          history.map(day => {
            const isExpanded = !!expandedDays[day.dateStr];
            const dayTxs = getDayTransactions(day.dateStr);
            
            return (
              <div 
                key={day.dateStr}
                className="bg-[#1e293b]/40 border border-white/5 rounded-2xl overflow-hidden transition-all duration-300"
              >
                {/* Day Header Row */}
                <div 
                  onClick={() => toggleExpand(day.dateStr)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/20 active:bg-slate-800/40 select-none transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border
                      ${day.net21 < 0 
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                        : day.net21 > 0 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }
                    `}>
                      {day.net21 < 0 ? <TrendingDown size={16} /> : day.net21 > 0 ? <TrendingUp size={16} /> : <Calendar size={16} />}
                    </div>
                    <div>
                      <span className="text-sm font-bold block text-white">{formatArabicDate(day.dateStr)}</span>
                      <span className="text-[10px] text-gray-400 font-bold block mt-0.5">
                        شراء: {day.totalBought21.toFixed(2)} جم | بيع: {day.totalSold21.toFixed(2)} جم
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Badge showing diff */}
                    <div className={`
                      text-xs font-black font-mono px-3 py-1 rounded-full border
                      ${day.net21 < 0 
                        ? 'bg-rose-950/30 border-rose-500/20 text-rose-400' 
                        : day.net21 > 0 
                          ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400' 
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }
                    `}>
                      {day.net21 < 0 ? '-' : day.net21 > 0 ? '+' : ''}{Math.abs(day.net21).toFixed(2)} جم
                    </div>
                    
                    {/* Expand Chevron */}
                    <div className="text-gray-500">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Transactions list */}
                {isExpanded && (
                  <div className="border-t border-white/5 bg-slate-950/20 px-4 py-3 space-y-2">
                    <div className="text-[10px] font-bold text-gray-500 mb-2 border-b border-white/5 pb-1">
                      حركات الذهب المسجلة في هذا اليوم ({dayTxs.length} عمليات):
                    </div>
                    
                    {dayTxs.length === 0 ? (
                      <div className="text-xs text-gray-500 py-1">لا توجد تفاصيل متاحة (حركات مالية فقط)</div>
                    ) : (
                      dayTxs.map(t => {
                        const karatVal = Number(t.karat) || 21;
                        const weightVal = Number(t.weight) || 0;
                        const weight21 = weightVal * (karatVal / 21);
                        
                        return (
                          <div 
                            key={t.id}
                            className="flex justify-between items-center bg-slate-900/30 border border-white/5 rounded-xl p-2.5 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              {/* Type flag */}
                              <span className={`
                                px-2 py-0.5 rounded text-[8px] font-extrabold
                                ${t.type === TransactionType.SALE 
                                  ? 'bg-rose-500/10 text-rose-400' 
                                  : 'bg-emerald-500/10 text-emerald-400'
                                }
                              `}>
                                {t.type === TransactionType.SALE ? 'بيع' : 'شراء'}
                              </span>
                              
                              <div>
                                <span className="font-bold text-white block">{t.itemName || 'صنف غير مسمى'}</span>
                                <span className="text-[9px] text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                                  <Clock size={10} />
                                  {new Date(t.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>

                            {/* Details values */}
                            <div className="text-left font-mono font-bold">
                              <span className="text-white block">{weightVal.toFixed(2)} جم (عيار {karatVal})</span>
                              <span className="text-gray-400 text-[9px] block">ما يعادل: {weight21.toFixed(2)} جم 21k</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
