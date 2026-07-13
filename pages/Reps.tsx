
import React, { useState, useEffect } from 'react';
import { Modal } from '../components/UI';
import { RepService, SyncService, AuthService, PrintService, ScrapGoldService } from '../services/storage';
import { Rep, Item, ItemStatus, GENERATE_ID, Karat, AppUser, TIMESTAMP, RepLog } from '../types';
import { Briefcase, Plus, CheckCircle2, Upload, Image as ImageIcon, Download, ArrowRight, Save, Coins, ArrowUpRight, ArrowDownLeft, Wallet, Printer, Scale, Banknote, User, X } from 'lucide-react';

const Reps = () => {
  const [reps, setReps] = useState<Rep[]>([]);
  const [selectedRepId, setSelectedRepId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'WORK_IN' | 'PAYMENT' | 'HISTORY'>('WORK_IN');
  const [showAddRep, setShowAddRep] = useState(false);
  const [newRepName, setNewRepName] = useState('');
  const [logs, setLogs] = useState<RepLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<RepLog | null>(null);
  
  // Work In State
  const [workForm, setWorkForm] = useState<{ description: string, weight: number | string, totalWages: number | string }>({ 
      description: '', weight: '', totalWages: '' 
  });
  const [workReceiptImage, setWorkReceiptImage] = useState<string | undefined>(undefined); 
  
  // Payment State
  const [paymentForm, setPaymentForm] = useState<{ weight: number | string, karat: Karat, cashAmount: number | string, description: string }>({ 
      weight: '', karat: 21 as Karat, cashAmount: '', description: '' 
  });
  const [receiptImage, setReceiptImage] = useState<string | undefined>(undefined); 
  const [payFromScrap, setPayFromScrap] = useState(false); 
  
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);

  const [currentShop, setCurrentShop] = useState(localStorage.getItem('selected_shop') || 'المحل الأساسي');

  const refresh = () => {
    setReps(RepService.getAll());
    if (selectedRepId) {
        setLogs(RepService.getLogs(selectedRepId));
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
  }, [selectedRepId, currentShop]);

  const handleAddRep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepName) return;
    RepService.add({
      id: GENERATE_ID(),
      name: newRepName,
      phone: '',
      balanceGold: 0,
      balanceMoney: 0
    });
    refresh();
    setShowAddRep(false);
    setNewRepName('');
  };

  const selectedRep = reps.find(r => r.id === selectedRepId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (s: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target && typeof event.target.result === 'string') {
                setter(event.target.result);
            }
        };
        reader.readAsDataURL(file);
    }
  };

  const submitWorkIn = () => {
     if (!selectedRepId) return;
     const weightVal = Number(workForm.weight);
     const wagesVal = Number(workForm.totalWages);
     const description = workForm.description || 'شغل متنوع';

     if (weightVal <= 0 && wagesVal <= 0) {
         alert('يرجى إدخال الوزن أو الأجرة');
         return;
     }

     const itemToAdd: Item = {
        id: GENERATE_ID(),
        name: description,
        weight: weightVal,
        quantity: 1,
        karat: 21 as Karat,
        type: 'وارد ورشة',
        workmanship: weightVal > 0 ? (wagesVal / weightVal) : 0, 
        status: ItemStatus.IN_STORE,
        barcode: Math.floor(10000000 + Math.random() * 90000000).toString(),
        createdAt: TIMESTAMP()
     };

     const responsibleUser = currentUser?.name || 'غير معروف';
     RepService.receiveWork(
         selectedRepId, 
         [itemToAdd], 
         wagesVal, 
         `استلام شغل (${description})`, 
         responsibleUser, 
         workReceiptImage
     );

     SyncService.sync(); 
     setWorkForm({ description: '', weight: '', totalWages: '' });
     setWorkReceiptImage(undefined); 
     refresh();
     alert('تم الاستلام بنجاح');
  };


  const submitPayment = () => {
       if (!selectedRepId) return;
       const weightVal = Number(paymentForm.weight);
       const cashVal = Number(paymentForm.cashAmount);
       const responsibleUser = currentUser?.name || 'غير معروف';
       
       const weight21 = weightVal > 0 ? (weightVal * (Number(paymentForm.karat) / 21)) : 0;
       
       if (payFromScrap && weight21 > 0) {
           const activeShop = localStorage.getItem('selected_shop') || 'المحل الأساسي';
           const scrapBalance = ScrapGoldService.getBalances()[activeShop] || 0;
           if (weight21 > scrapBalance) {
               alert(`رصيد الذهب الكسر في ${activeShop} غير كافٍ. الرصيد الحالي: ${scrapBalance.toFixed(2)} جم عيار 21.`);
               return;
           }
       }

       let desc = paymentForm.description;
       
       if (!desc) {
           const parts = [];
           if(weightVal > 0) {
               parts.push(`${weightVal}جم عيار ${paymentForm.karat}`);
               if (payFromScrap) parts.push('(من الكسر)');
           }
           if(cashVal > 0) parts.push(`${cashVal} ج.م`);
           desc = `دفعة: ${parts.join(' + ')}`;
       } else if (payFromScrap && weightVal > 0) {
           desc = `${desc} (من الكسر)`;
       }
       
       RepService.payMixed(selectedRepId, weightVal, paymentForm.karat, cashVal, desc, responsibleUser, receiptImage, payFromScrap);
       SyncService.sync(); 
       setPaymentForm({ weight: '', karat: 21 as Karat, cashAmount: '', description: '' });
       setPayFromScrap(false);
       setReceiptImage(undefined); 
       refresh();
       alert('تم التسجيل بنجاح');
   };

  // --- RENDER ---
  return (
    <div className="flex flex-col h-full bg-[#0f172a] text-white font-sans safe-pt">
        
        {/* Modal for viewing images */}
        <Modal isOpen={!!viewImage} onClose={() => setViewImage(null)} title="صورة الإيصال">
             <div className="flex flex-col gap-4 items-center">
                 {viewImage && (
                     <>
                        <img src={viewImage} alt="Receipt" className="max-w-full rounded-xl" />
                        <a href={viewImage} download className="w-full bg-[#f4c025] text-black py-3 rounded-xl font-bold flex justify-center gap-2">
                            <Download size={20} /> تحميل
                        </a>
                     </>
                 )}
             </div>
        </Modal>

        {/* --- Add Rep Modal --- */}
        {showAddRep && (
             <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                 <div className="bg-[#1e293b] border border-white/10 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative">
                      <button onClick={() => setShowAddRep(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20}/></button>
                      <div className="w-16 h-16 bg-[#f4c025]/20 rounded-full flex items-center justify-center text-[#f4c025] mb-4 mx-auto">
                          <Briefcase size={32} />
                      </div>
                      <h3 className="font-bold text-xl text-center mb-6 text-white">إضافة ورشة جديدة</h3>
                      <form onSubmit={handleAddRep} className="space-y-4">
                          <input 
                            autoFocus 
                            className="w-full bg-[#0f172a] border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-[#f4c025] text-center text-lg"
                            placeholder="اسم الورشة / المندوب"
                            value={newRepName} 
                            onChange={e => setNewRepName(e.target.value)} 
                            required 
                          />
                          <button type="submit" className="w-full bg-[#f4c025] text-black font-bold py-4 rounded-2xl text-lg hover:bg-[#d9aa20] transition-colors">حفظ وإضافة</button>
                      </form>
                 </div>
             </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row pb-20">
            
            {/* 1. SIDEBAR LIST */}
            <div className={`md:w-80 lg:w-96 border-l border-white/5 flex flex-col bg-[#0f172a] ${selectedRepId ? 'hidden md:flex' : 'flex-1'} custom-scrollbar`}>
                <div className="p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center gap-2">الورش والمصنعية</h2>
                    <button onClick={() => setShowAddRep(true)} className="w-10 h-10 rounded-full bg-[#1e293b] border border-white/10 flex items-center justify-center text-[#f4c025] hover:bg-[#f4c025] hover:text-black transition-all">
                        <Plus size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-2 space-y-2 pb-20">
                    {reps.map(rep => (
                        <div 
                            key={rep.id}
                            onClick={() => setSelectedRepId(rep.id)}
                            className={`p-4 rounded-3xl border transition-all cursor-pointer group relative overflow-hidden ${selectedRepId === rep.id 
                                ? 'bg-[#f4c025] border-[#f4c025] text-black shadow-lg shadow-[#f4c025]/20' 
                                : 'bg-[#1e293b] border-white/5 hover:bg-[#283548] text-white'}`}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${selectedRepId === rep.id ? 'bg-black/20 text-black' : 'bg-gray-700 text-gray-300'}`}>
                                    {rep.name.charAt(0)}
                                </div>
                                <div className="font-bold text-lg leading-none">{rep.name}</div>
                            </div>
                            
                            <div className="flex gap-2">
                                <div className={`flex-1 px-3 py-2 rounded-2xl flex flex-col items-center ${selectedRepId === rep.id ? 'bg-black/10' : 'bg-[#0f172a]'}`}>
                                    <span className="text-[10px] opacity-70 mb-0.5">رصيد ذهب</span>
                                    <span className="font-mono font-bold">{Math.abs(rep.balanceGold).toFixed(2)}g</span>
                                </div>
                                <div className={`flex-1 px-3 py-2 rounded-2xl flex flex-col items-center ${selectedRepId === rep.id ? 'bg-black/10' : 'bg-[#0f172a]'}`}>
                                    <span className="text-[10px] opacity-70 mb-0.5">رصيد نقدية</span>
                                    <span className="font-mono font-bold">{Math.abs(rep.balanceMoney).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 2. MAIN DETAIL AREA */}
            {selectedRepId && selectedRep ? (
                <div className="flex-1 flex flex-col bg-[#0f172a] h-full absolute inset-0 md:static z-30 overflow-hidden">
                     
                     {/* Sticky Glass Header */}
                     <div className="bg-[#1e293b]/80 backdrop-blur-md border-b border-white/5 p-4 flex flex-col gap-4 shrink-0 safe-pt shadow-xl z-20">
                         <div className="flex items-center gap-3">
                             <button onClick={() => setSelectedRepId('')} className="md:hidden p-2 rounded-full bg-white/10 text-white hover:bg-white/20">
                                 <ArrowRight size={20} />
                             </button>
                             <h2 className="font-black text-2xl text-white tracking-tight">{selectedRep.name}</h2>
                         </div>

                         {/* Toggle Tabs */}
                         <div className="flex bg-[#0f172a] p-1 rounded-2xl border border-white/5">
                             {[
                                 { id: 'WORK_IN', label: 'استلام شغل', icon: <Briefcase size={18}/> },
                                 { id: 'PAYMENT', label: 'دفعات', icon: <Coins size={18}/> },
                                 { id: 'HISTORY', label: 'السجل', icon: <Wallet size={18}/> },
                             ].map(tab => (
                                 <button 
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)} 
                                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-[#f4c025] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                 >
                                    {tab.icon} {tab.label}
                                 </button>
                             ))}
                         </div>
                     </div>

                     <div className="flex-1 overflow-y-auto p-4 pb-32 md:pb-4 custom-scrollbar">
                        
                        {/* VIEW 1: WORK IN */}
                        {activeTab === 'WORK_IN' && (
                            <div className="max-w-lg mx-auto space-y-4 pt-4 animate-slide-up">
                                <div className="bg-[#1e293b] rounded-[2.5rem] p-6 border border-[#f4c025]/20 shadow-[0_0_40px_rgba(244,192,37,0.05)]">
                                    <h3 className="text-center text-[#f4c025] font-bold text-lg mb-6 flex items-center justify-center gap-2">
                                        <ArrowDownLeft /> استلام وارد جديد
                                    </h3>
                                    
                                    <div className="space-y-4">
                                        <div className="bg-[#0f172a] rounded-2xl p-4 border border-white/5">
                                            <label className="text-xs text-gray-500 font-bold block mb-2">بيان الأصناف</label>
                                            <input 
                                                className="w-full bg-transparent text-white outline-none font-bold text-lg placeholder-gray-700"
                                                value={workForm.description}
                                                onChange={e => setWorkForm({...workForm, description: e.target.value})}
                                                placeholder="غوايش + خواتم..."
                                            />
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="flex-1 bg-[#0f172a] rounded-2xl p-4 border border-white/5">
                                                <label className="text-xs text-[#f4c025] font-bold block mb-1">الوزن (21)</label>
                                                <input 
                                                    type="number"
                                                    className="w-full bg-transparent text-white outline-none font-bold text-2xl placeholder-gray-700"
                                                    value={workForm.weight}
                                                    onChange={e => setWorkForm({...workForm, weight: e.target.value})}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div className="flex-1 bg-[#0f172a] rounded-2xl p-4 border border-white/5">
                                                <label className="text-xs text-blue-400 font-bold block mb-1">الأجرة</label>
                                                <input 
                                                    type="number"
                                                    className="w-full bg-transparent text-white outline-none font-bold text-2xl placeholder-gray-700"
                                                    value={workForm.totalWages}
                                                    onChange={e => setWorkForm({...workForm, totalWages: e.target.value})}
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        <label className={`block w-full p-4 rounded-2xl border border-dashed text-center cursor-pointer transition-all ${workReceiptImage ? 'border-green-500 text-green-500 bg-green-500/10' : 'border-white/10 text-gray-500 hover:border-[#f4c025]'}`}>
                                            <input type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, setWorkReceiptImage)} />
                                            {workReceiptImage ? 'تم إرفاق الصورة' : 'إرفاق صورة الإيصال'}
                                        </label>

                                        <button onClick={submitWorkIn} className="w-full py-5 bg-[#f4c025] hover:bg-[#d9aa20] text-black font-black rounded-2xl text-xl shadow-lg active:scale-[0.98] transition-transform">
                                            حفظ الاستلام
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* VIEW 2: PAYMENTS */}
                        {activeTab === 'PAYMENT' && (
                             <div className="max-w-lg mx-auto space-y-4 pt-4 animate-slide-up">
                                 <div className="bg-[#1e293b] rounded-[2.5rem] p-6 border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.05)]">
                                    <h3 className="text-center text-emerald-500 font-bold text-lg mb-6 flex items-center justify-center gap-2">
                                        <ArrowUpRight /> تسجيل دفعة
                                    </h3>

                                    <div className="space-y-4">
                                        {/* Gold Payment */}
                                        <div className="bg-[#0f172a] rounded-2xl p-2 border border-white/5 flex items-center">
                                            <select 
                                                value={paymentForm.karat} 
                                                onChange={e => setPaymentForm({...paymentForm, karat: Number(e.target.value) as Karat})}
                                                className="bg-[#1e293b] text-white px-2 py-1 rounded-xl outline-none font-bold text-sm border border-white/5 cursor-pointer ml-2 focus:border-emerald-500"
                                            >
                                                <option value="21">عيار 21</option>
                                                <option value="18">عيار 18</option>
                                                <option value="24">عيار 24</option>
                                            </select>
                                            <input 
                                                type="number"
                                                className="flex-1 bg-transparent text-white px-4 outline-none font-bold text-xl placeholder-gray-700 text-center"
                                                value={paymentForm.weight}
                                                onChange={e => setPaymentForm({...paymentForm, weight: e.target.value})}
                                                placeholder="وزن (كسر)"
                                            />
                                            <span className="text-gray-500 text-xs font-bold pr-4">جرام</span>
                                        </div>

                                        {/* Pay From Scrap Checkbox */}
                                        <label className="flex items-center gap-2 p-3 bg-[#0f172a] rounded-2xl border border-white/5 cursor-pointer select-none">
                                            <input 
                                                type="checkbox" 
                                                checked={payFromScrap} 
                                                onChange={e => setPayFromScrap(e.target.checked)}
                                                className="w-5 h-5 rounded-md border-gray-300 text-emerald-500 focus:ring-emerald-500 bg-[#1e293b] accent-emerald-500"
                                            />
                                            <span className="text-sm font-bold text-gray-300">تسديد من الذهب الكسر بالمحل</span>
                                        </label>

                                        {/* Cash Payment */}
                                        <div className="bg-[#0f172a] rounded-2xl p-2 border border-white/5 flex items-center">
                                            <div className="w-12 h-12 bg-[#1e293b] rounded-xl flex items-center justify-center text-green-500">
                                                <Banknote size={20} />
                                            </div>
                                            <input 
                                                type="number"
                                                className="flex-1 bg-transparent text-white px-4 outline-none font-bold text-xl placeholder-gray-700 text-center"
                                                value={paymentForm.cashAmount}
                                                onChange={e => setPaymentForm({...paymentForm, cashAmount: e.target.value})}
                                                placeholder="نقدية"
                                            />
                                            <span className="text-gray-500 text-xs font-bold pr-4">ج.م</span>
                                        </div>

                                        <input 
                                            className="w-full bg-[#0f172a] border border-white/5 rounded-2xl h-14 px-4 text-white placeholder-gray-600 outline-none focus:border-emerald-500 transition-colors"
                                            value={paymentForm.description}
                                            onChange={e => setPaymentForm({...paymentForm, description: e.target.value})}
                                            placeholder="ملاحظات..."
                                        />

                                        <button onClick={submitPayment} className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl text-xl shadow-lg active:scale-[0.98] transition-transform">
                                            تسجيل العملية
                                        </button>
                                    </div>
                                 </div>
                             </div>
                        )}

                        {/* VIEW 3: HISTORY */}
                        {activeTab === 'HISTORY' && (
                            <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
                                {logs.length === 0 && <div className="text-center py-20 text-gray-500">لا يوجد سجل</div>}
                                {logs.map((log, idx) => (
                                    <div key={log.id} className="flex gap-4 group">
                                        {/* Timeline Line */}
                                        <div className="flex flex-col items-center">
                                            <div className={`w-3 h-3 rounded-full mt-6 ${log.type === 'WORK_IN' ? 'bg-[#f4c025]' : 'bg-emerald-500'}`}></div>
                                            {idx !== logs.length - 1 && <div className="w-0.5 flex-1 bg-white/5 my-1"></div>}
                                        </div>
                                        
                                        {/* Card */}
                                        <div className="flex-1 bg-[#1e293b] rounded-3xl p-5 border border-white/5 group-hover:border-white/10 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-bold text-white text-base">{log.details}</h4>
                                                    <p className="text-xs text-gray-500">{new Date(log.date).toLocaleString('ar-EG')}</p>
                                                </div>
                                                {log.receiptImage && (
                                                    <button onClick={() => setViewImage(log.receiptImage || null)} className="p-2 bg-black/20 rounded-full text-blue-400 hover:text-white transition-colors">
                                                        <ImageIcon size={16} />
                                                    </button>
                                                )}
                                            </div>
                                            
                                            <div className="flex gap-2 mt-2">
                                                {log.weight > 0 && (
                                                    <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold ${log.type === 'WORK_IN' ? 'bg-rose-500/10 text-rose-500' : 'bg-green-500/10 text-green-500'}`}>
                                                        {log.type === 'WORK_IN' ? '-' : '+'}{log.weight.toFixed(2)}g
                                                    </span>
                                                )}
                                                {log.money > 0 && (
                                                    <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold ${log.type === 'WORK_IN' ? 'bg-green-500/10 text-green-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                        {log.type === 'WORK_IN' ? '+' : '-'}{log.money.toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                     </div>
                </div>
            ) : (
                <div className="hidden md:flex flex-1 items-center justify-center bg-[#0f172a] text-gray-600 flex-col gap-4">
                    <div className="w-24 h-24 bg-[#1e293b] rounded-full flex items-center justify-center border border-white/5">
                        <Briefcase size={40} className="opacity-30" />
                    </div>
                    <p className="font-bold">اختر ورشة للبدء</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default Reps;
