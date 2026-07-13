
import React, { useState, useEffect } from 'react';
import { TransactionService, CustomerService, SyncService, AuthService, SafeService, PrintService } from '../services/storage';
import { Transaction, Customer, TransactionType, PaymentMethod, GENERATE_ID, TIMESTAMP } from '../types';
import { Card, Button, Input } from '../components/UI';
import { Users, AlertCircle, ArrowRight, CheckCircle2, Banknote, Search, Clock, X, HandCoins, Wallet, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DebtRecord {
    customerId: string;
    customerName: string;
    customerPhone: string;
    totalDebt: number;
    lastTransactionDate: number;
}

const Debts = () => {
  const navigate = useNavigate();
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Payment Modal
  const [selectedCustomer, setSelectedCustomer] = useState<DebtRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);

  useEffect(() => {
    refreshDebts();
  }, []);

  const refreshDebts = () => {
    setLoading(true);
    const allTxs = TransactionService.getAll();
    const customers = CustomerService.getAll();
    
    const debtMap: { [key: string]: DebtRecord } = {};

    allTxs.forEach(tx => {
        if (!tx.customerId) return;
        
        // Ensure customer exists in map
        if (!debtMap[tx.customerId]) {
            const customer = customers.find(c => c.id === tx.customerId);
            debtMap[tx.customerId] = {
                customerId: tx.customerId,
                customerName: tx.customerName || customer?.name || 'Unknown',
                customerPhone: tx.customerPhone || customer?.phone || '',
                totalDebt: 0,
                lastTransactionDate: 0
            };
        }

        // Calculation Logic
        // Sale: Debt increases by (Total - Paid)
        if (tx.type === TransactionType.SALE) {
            const unpaid = tx.totalPrice - (tx.paidAmount || 0);
            if (unpaid > 0) {
                debtMap[tx.customerId].totalDebt += unpaid;
            }
        }
        
        // Debt Payment: Debt decreases
        if (tx.type === TransactionType.DEBT_PAYMENT) {
            debtMap[tx.customerId].totalDebt -= tx.paidAmount || 0;
        }

        if (tx.date > debtMap[tx.customerId].lastTransactionDate) {
            debtMap[tx.customerId].lastTransactionDate = tx.date;
        }
    });

    // Filter only those with positive debt ( > 1 to ignore float errors)
    const list = Object.values(debtMap).filter(d => d.totalDebt > 1).sort((a, b) => b.totalDebt - a.totalDebt);
    setDebts(list);
    setLoading(false);
  };

  const handlePayDebt = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedCustomer) return;
      const amount = Number(paymentAmount);
      if (amount <= 0) return;
      if (amount > selectedCustomer.totalDebt + 10) { // Allow slight overpayment for rounding
          alert('المبلغ المدخل أكبر من قيمة الدين المستحق!');
          return;
      }

      const tx: Transaction = {
          id: GENERATE_ID(),
          type: TransactionType.DEBT_PAYMENT,
          weight: 0,
          karat: 21, // Dummy
          goldPricePerGram: 0,
          workmanship: 0,
          totalPrice: 0,
          paidAmount: amount, // This is the payment amount
          paymentMethod: paymentMethod, // Use selected method
          customerName: selectedCustomer.customerName,
          customerId: selectedCustomer.customerId,
          date: TIMESTAMP(),
          createdBy: AuthService.getCurrentUser()?.name || 'Admin',
          itemName: `سداد دفعة من حساب آجل`,
          notes: paymentNotes
      };

      TransactionService.add(tx);
      SyncService.sync();
      
      // Print Receipt
      if (confirm('هل تريد طباعة إيصال استلام نقدية؟')) {
          PrintService.printReceipt(
              [{ itemName: 'سداد دفعة آجل', weight: 0, totalPrice: amount, karat: '' }],
              amount,
              selectedCustomer.customerName,
              tx.createdBy,
              tx.id,
              'إيصال استلام نقدية'
          );
      }

      refreshDebts();
      setSelectedCustomer(null);
      setPaymentAmount('');
      setPaymentNotes('');
      setPaymentMethod(PaymentMethod.CASH);
  };

  const filteredDebts = debts.filter(d => d.customerName.includes(search) || d.customerPhone.includes(search));
  const totalOutstanding = debts.reduce((sum, d) => sum + d.totalDebt, 0);

  return (
    <div className="p-4 space-y-6 animate-fade-in pb-24 safe-pt">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Button variant="secondary" onClick={() => navigate('/')} className="px-3"><ArrowRight size={18}/></Button>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                    <Clock size={24} className="text-red-500" /> الديون والآجل
                </h1>
            </div>
        </div>

        {/* Stats */}
        <div className="bg-[#1a1f2e] border border-red-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-bl-full -mr-4 -mt-4"></div>
            <div className="relative z-10">
                <div className="text-red-400 text-xs font-bold uppercase tracking-wider mb-1">إجمالي الديون المستحقة</div>
                <div className="text-3xl font-black text-white">{totalOutstanding.toLocaleString()} <span className="text-sm font-normal text-gray-400">ج.م</span></div>
                <div className="text-xs text-gray-500 mt-2">{debts.length} عملاء عليهم مبالغ متبقية</div>
            </div>
        </div>

        {/* Search */}
        <div className="relative">
            <Search className="absolute right-4 top-3.5 text-gray-500" size={18} />
            <input 
                className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl h-12 pr-12 pl-4 text-white placeholder-gray-500 focus:border-red-500 outline-none transition-all"
                placeholder="بحث باسم العميل..."
                value={search}
                onChange={e => setSearch(e.target.value)}
            />
        </div>

        {/* List */}
        <div className="space-y-3">
            {filteredDebts.map(debt => (
                <div key={debt.customerId} className="bg-[#1a1f2e] border border-white/5 rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm group hover:border-red-500/30 transition-all">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="w-12 h-12 rounded-full bg-red-900/20 text-red-500 flex items-center justify-center font-bold text-lg">
                            {debt.customerName.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">{debt.customerName}</h3>
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                                <span>{debt.customerPhone}</span>
                                <span>•</span>
                                <span>آخر حركة: {new Date(debt.lastTransactionDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between w-full md:w-auto gap-6 bg-[#0a0e1a] md:bg-transparent p-3 md:p-0 rounded-xl">
                        <div className="text-right">
                            <div className="text-[10px] text-gray-500 font-bold uppercase">المبلغ المتبقي</div>
                            <div className="text-xl font-black text-red-500">{debt.totalDebt.toLocaleString()}</div>
                        </div>
                        
                        {/* THE NEW BUTTON STYLE AS REQUESTED */}
                        <button 
                            onClick={() => { setSelectedCustomer(debt); setPaymentMethod(PaymentMethod.CASH); }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
                        >
                            <HandCoins size={20} /> 
                            <span>سداد دين</span>
                        </button>
                    </div>
                </div>
            ))}

            {filteredDebts.length === 0 && (
                <div className="text-center py-20 text-gray-600">
                    <CheckCircle2 size={48} className="mx-auto mb-4 opacity-20 text-green-500" />
                    <p>لا توجد ديون مستحقة</p>
                </div>
            )}
        </div>

        {/* Payment Modal */}
        {selectedCustomer && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in">
                <div className="bg-[#1a1f2e] border border-white/10 w-full max-w-md md:rounded-2xl rounded-t-2xl p-6 shadow-2xl transform transition-all">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-xl text-white flex items-center gap-2">
                             <HandCoins className="text-green-500" /> سداد دفعة
                        </h3>
                        <button onClick={() => setSelectedCustomer(null)} className="text-gray-500 hover:text-white"><X size={24}/></button>
                    </div>
                    
                    <div className="bg-[#0a0e1a] p-4 rounded-xl mb-6 border border-white/5 flex justify-between items-center">
                        <div>
                            <div className="text-gray-400 text-xs mb-1">العميل</div>
                            <div className="text-white font-bold text-lg">{selectedCustomer.customerName}</div>
                        </div>
                        <div className="text-right">
                             <div className="text-gray-400 text-xs mb-1">عليه</div>
                             <div className="text-red-500 font-black text-xl">{selectedCustomer.totalDebt.toLocaleString()}</div>
                        </div>
                    </div>

                    <form onSubmit={handlePayDebt} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">طريقة الدفع (تذهب للخزنة المحددة)</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod(PaymentMethod.CASH)}
                                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === PaymentMethod.CASH ? 'bg-white text-black border-white shadow-lg' : 'bg-[#0a0e1a] text-gray-400 border-white/10 hover:border-white/30'}`}
                                >
                                    <Wallet size={24} />
                                    <span className="text-xs font-bold">كاش (الخزنة)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod(PaymentMethod.INSTAPAY)}
                                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === PaymentMethod.INSTAPAY ? 'bg-purple-600 text-white border-purple-500 shadow-lg' : 'bg-[#0a0e1a] text-gray-400 border-white/10 hover:border-white/30'}`}
                                >
                                    <Smartphone size={24} />
                                    <span className="text-xs font-bold">InstaPay</span>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">المبلغ المدفوع</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    autoFocus
                                    className="w-full bg-[#0a0e1a] border border-white/10 rounded-xl h-14 px-4 text-white text-center font-bold text-3xl focus:border-green-500 outline-none"
                                    value={paymentAmount} 
                                    onChange={e => setPaymentAmount(e.target.value)} 
                                    placeholder="0"
                                    required
                                />
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">ج.م</span>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">ملاحظات (اختياري)</label>
                            <input 
                                className="w-full bg-[#0a0e1a] border border-white/10 rounded-xl h-12 px-4 text-white text-sm focus:border-green-500 outline-none"
                                value={paymentNotes} 
                                onChange={e => setPaymentNotes(e.target.value)} 
                                placeholder="تفاصيل السداد..."
                            />
                        </div>

                        <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl text-lg mt-2 shadow-lg shadow-green-900/20 active:scale-[0.98] transition-transform">
                            تأكيد واستلام النقدية
                        </button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default Debts;
