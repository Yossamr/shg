import React, { useState, useEffect } from 'react';
import { SafeService, SyncService, AuthService, ExpenseService } from '../services/storage';
import { Safe, AppUser, Expense, ExpenseCategory } from '../types';
import { TrendingDown, ClipboardList, Plus, Check, Trash2, User, Calendar, Clock, Landmark, FileText } from 'lucide-react';
import { Modal } from '../components/UI';

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [safes, setSafes] = useState<Safe[]>([]);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  
  const [newExpense, setNewExpense] = useState({
      amount: '',
      description: '',
      category: ExpenseCategory.OTHER,
      safeId: ''
  });

  const [currentShop, setCurrentShop] = useState(localStorage.getItem('selected_shop') || 'المحل الأساسي');

  const refresh = () => {
    const allSafes = SafeService.getAll().filter(s => (s.shop || 'المحل الأساسي') === currentShop);
    setSafes(allSafes);

    const allExpenses = ExpenseService.getAll().filter(e => (e.shop || 'المحل الأساسي') === currentShop);
    setExpenses(allExpenses);

    if (allSafes.length > 0 && (!newExpense.safeId || !allSafes.some(s => s.id === newExpense.safeId))) {
        setNewExpense(prev => ({ ...prev, safeId: allSafes[0].id }));
    }
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

  const handleAddExpense = (e: React.FormEvent) => {
      e.preventDefault();
      const amountVal = Number(newExpense.amount);
      if (amountVal <= 0) return;

      ExpenseService.add({
          id: '',
          category: newExpense.category,
          amount: amountVal,
          description: newExpense.description,
          safeId: newExpense.safeId,
          date: Date.now(),
          byUser: currentUser?.name || 'غير معروف',
          shop: currentShop
      });

      SyncService.sync();
      refresh();
      setNewExpense({ ...newExpense, amount: '', description: '' });
      setIsAdding(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm('حذف المصروف؟')) {
          ExpenseService.delete(id, currentUser?.name || 'مستخدم');
          SyncService.sync();
          refresh();
      }
  };

  const currentMonth = new Date().getMonth();
  const thisMonthExpenses = expenses.filter(e => new Date(e.date).getMonth() === currentMonth);
  const totalThisMonth = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const getCategoryLabel = (category: string) => {
      switch (category) {
          case 'RENT': return 'إيجار';
          case 'ELECTRICITY': return 'كهرباء';
          case 'SALARIES': return 'مرتبات';
          case 'HOSPITALITY': return 'ضيافة';
          case 'MAINTENANCE': return 'صيانة';
          default: return 'نثريات / أخرى';
      }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-4 pb-32 space-y-6 safe-pt animate-fade-in">
        
        <div className="grid grid-cols-2 gap-4">
             <div className="bg-[#1e293b] rounded-3xl p-6 border border-white/5 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/10 rounded-bl-full -mr-5 -mt-5"></div>
                  <div className="flex items-center gap-2 mb-1">
                      <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">إجمالي الشهر</div>
                      <span className="text-[9px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20 font-bold">{currentShop}</span>
                  </div>
                  <div className="text-3xl font-black text-white tracking-tight">{totalThisMonth.toLocaleString()}</div>
                  <div className="text-xs text-rose-500 font-bold mt-1">جنيه مصري</div>
             </div>
             
             <button 
                onClick={() => setIsAdding(!isAdding)}
                className={`rounded-3xl p-6 border flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${isAdding ? 'bg-rose-500 border-rose-600 text-white shadow-lg shadow-rose-900/30' : 'bg-[#1e293b] border-white/5 text-rose-500 hover:border-rose-500/30'}`}
             >
                  {isAdding ? <Check size={32} /> : <Plus size={32} />}
                  <span className="font-bold text-sm">{isAdding ? 'إلغاء' : 'تسجيل مصروف'}</span>
             </button>
        </div>

        {isAdding && (
            <div className="bg-[#1e293b] border border-rose-500/30 rounded-[2rem] p-6 shadow-2xl animate-scale-in relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent"></div>
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">بيانات المصروف الجديد</h3>
                
                <form onSubmit={handleAddExpense} className="space-y-4">
                    <div className="bg-[#0f172a] rounded-2xl p-4 border border-white/5 flex items-center gap-3">
                        <span className="text-rose-500 font-bold text-lg">LE</span>
                        <input 
                            type="number" 
                            value={newExpense.amount} 
                            onChange={e => setNewExpense({...newExpense, amount: e.target.value})} 
                            required 
                            placeholder="0.00"
                            className="flex-1 bg-transparent text-white font-bold text-3xl outline-none placeholder:text-gray-700 text-center"
                            autoFocus
                        />
                    </div>
                    
                    <input 
                        value={newExpense.description} 
                        onChange={e => setNewExpense({...newExpense, description: e.target.value})} 
                        placeholder="سبب المصروف (مثال: كهرباء، ضيافة...)"
                        className="w-full bg-[#0f172a] border border-white/5 rounded-2xl h-14 px-5 text-white outline-none focus:border-rose-500 transition-colors"
                        required
                    />

                    <select 
                        className="w-full bg-[#0f172a] border border-white/5 rounded-2xl h-14 px-5 text-white outline-none appearance-none"
                        value={newExpense.category} 
                        onChange={e => setNewExpense({...newExpense, category: e.target.value as any})}
                    >
                        <option value={ExpenseCategory.OTHER}>التصنيف: نثريات / أخرى</option>
                        <option value={ExpenseCategory.RENT}>التصنيف: إيجار</option>
                        <option value={ExpenseCategory.ELECTRICITY}>التصنيف: كهرباء</option>
                        <option value={ExpenseCategory.SALARIES}>التصنيف: مرتبات</option>
                        <option value={ExpenseCategory.HOSPITALITY}>التصنيف: ضيافة</option>
                        <option value={ExpenseCategory.MAINTENANCE}>التصنيف: صيانة</option>
                    </select>

                    <select 
                        className="w-full bg-[#0f172a] border border-white/5 rounded-2xl h-14 px-5 text-white outline-none appearance-none"
                        value={newExpense.safeId} 
                        onChange={e => setNewExpense({...newExpense, safeId: e.target.value})}
                    >
                        {safes.map(s => (
                            <option key={s.id} value={s.id} className="bg-[#0f172a]">خصم من: {s.name}</option>
                        ))}
                    </select>

                    <button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-4 rounded-2xl text-lg shadow-lg active:scale-[0.98] transition-transform">
                        تأكيد الحفظ
                    </button>
                </form>
            </div>
        )}

        <div className="space-y-3">
             <div className="text-gray-500 text-xs font-bold px-2 uppercase tracking-widest">أحدث العمليات للمصروفات</div>
             {expenses.map(exp => (
                 <div 
                   key={exp.id} 
                   onClick={() => setSelectedExpense(exp)}
                   className="group bg-[#1e293b]/70 hover:bg-[#1e293b] rounded-2xl p-4 border border-white/5 flex items-center justify-between hover:border-rose-500/20 active:scale-[0.98] transition-all cursor-pointer"
                 >
                     <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                             <TrendingDown size={20} />
                         </div>
                         <div className="text-right">
                             <h4 className="font-bold text-white text-base leading-snug">{exp.description}</h4>
                             <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
                                 <span className="flex items-center gap-0.5 text-rose-400 bg-rose-500/5 px-2 py-0.5 rounded-full border border-rose-500/10 font-bold">
                                     <User size={10} />
                                     {exp.byUser || 'غير معروف'}
                                 </span>
                                 <span>•</span>
                                 <span>{safes.find(s=>s.id===exp.safeId)?.name || 'الخزنة'}</span>
                                 <span>•</span>
                                 <span>{new Date(exp.date).toLocaleDateString('ar-EG')}</span>
                             </div>
                         </div>
                     </div>
                     
                     <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className="font-mono font-bold text-rose-400 text-lg">-{exp.amount.toLocaleString()}</span>
                          <button 
                            onClick={(e) => handleDelete(exp.id, e)} 
                            className="p-1.5 text-gray-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          >
                              <Trash2 size={16} />
                          </button>
                     </div>
                 </div>
             ))}
             {expenses.length === 0 && (
                 <div className="text-center py-20 text-gray-600">
                     <ClipboardList size={48} className="mx-auto mb-4 opacity-20" />
                     <p>لا توجد مصروفات مسجلة للفرع الحالي</p>
                 </div>
             )}
        </div>

        <Modal
          isOpen={!!selectedExpense}
          onClose={() => setSelectedExpense(null)}
          title="تفاصيل المصروف بالكامل"
        >
          {selectedExpense && (
              <div className="space-y-5 text-right font-sans" dir="rtl">
                  
                  <div className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-2xl flex items-center justify-between">
                      <div>
                          <span className="text-gray-500 text-[10px] block mb-1">نوع المصروف</span>
                          <span className="bg-rose-500/10 text-rose-400 px-3 py-1 rounded-full text-xs font-black border border-rose-500/20">
                              {getCategoryLabel(selectedExpense.category)}
                          </span>
                      </div>
                      <div className="text-left">
                          <span className="text-gray-500 text-[10px] block mb-1">القيمة المصروفة</span>
                          <span className="font-mono text-xl font-black text-rose-400">
                              {selectedExpense.amount.toLocaleString()} ج.م
                          </span>
                      </div>
                  </div>

                  <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-4 space-y-3.5">
                      
                      <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2.5">
                          <span className="text-gray-400 flex items-center gap-1.5"><FileText size={14} className="text-rose-400" /> البيان والسبب</span>
                          <span className="text-white font-bold">{selectedExpense.description}</span>
                      </div>

                      <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2.5">
                          <span className="text-gray-400 flex items-center gap-1.5"><Landmark size={14} className="text-rose-400" /> مخصوم من الخزنة</span>
                          <span className="text-slate-300 font-bold">{SafeService.getAll().find(s=>s.id===selectedExpense.safeId)?.name || selectedExpense.safeId}</span>
                      </div>

                      <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2.5">
                          <span className="text-gray-400 flex items-center gap-1.5"><Landmark size={14} className="text-rose-400" /> الفرع / المحل</span>
                          <span className="text-rose-400 font-bold">{selectedExpense.shop || 'المحل الأساسي'}</span>
                      </div>

                      <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400 flex items-center gap-1.5"><User size={14} className="text-rose-400" /> الموظف المسؤول</span>
                          <span className="text-rose-400 font-black flex items-center gap-1 bg-rose-500/5 px-3 py-1 rounded-full border border-rose-500/20 text-xs">
                              <User size={12} />
                              {selectedExpense.byUser || 'غير معروف'}
                          </span>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center text-[10px] text-gray-500 font-mono">
                      <div className="bg-[#0a0e1a]/40 p-2 rounded-xl border border-white/5 flex items-center justify-center gap-1">
                          <Calendar size={12} className="text-rose-400" />
                          <span>{new Date(selectedExpense.date).toLocaleDateString('ar-EG')}</span>
                      </div>
                      <div className="bg-[#0a0e1a]/40 p-2 rounded-xl border border-white/5 flex items-center justify-center gap-1">
                          <Clock size={12} className="text-rose-400" />
                          <span>{new Date(selectedExpense.date).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                      </div>
                  </div>

                  <button 
                    onClick={() => setSelectedExpense(null)} 
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

export default Expenses;
