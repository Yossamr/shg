
import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../components/UI';
import { InventoryService, GoldPriceService } from '../services/storage';
import { Item, ItemStatus, Karat } from '../types';
// Added CheckCircle to imports
import { Heart, Scale, Coins, AlertCircle, ArrowRight, Printer, Calculator, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Zakat = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [market, setMarket] = useState(GoldPriceService.getStoredPrice());

  useEffect(() => {
    setItems(InventoryService.getAll().filter(i => i.status === ItemStatus.IN_STORE));
  }, []);

  // Calculation Logic
  const weightByKarat = {
    18: items.filter(i => i.karat === 18).reduce((acc, i) => acc + i.weight, 0),
    21: items.filter(i => i.karat === 21).reduce((acc, i) => acc + i.weight, 0),
    24: items.filter(i => i.karat === 24).reduce((acc, i) => acc + i.weight, 0),
  };

  const weight24kEquivalent = 
    (weightByKarat[18] * (18 / 24)) + 
    (weightByKarat[21] * (21 / 24)) + 
    weightByKarat[24];

  const nisabThreshold = 85; // 85g of pure gold
  const reachesNisab = weight24kEquivalent >= nisabThreshold;
  const zakatPercentage = 0.025; // 2.5%
  const zakatWeight = reachesNisab ? (weight24kEquivalent * zakatPercentage) : 0;
  
  const price24k = GoldPriceService.calculatePrice(Karat.K24, market.base21);
  const zakatValueMoney = zakatWeight * price24k;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between no-print">
         <div className="flex items-center gap-4">
            <Button variant="secondary" onClick={() => navigate('/')}><ArrowRight size={18} /> العودة</Button>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">حاسبة زكاة المال والذهب</h1>
         </div>
         <Button variant="secondary" onClick={handlePrint}><Printer size={18} /> طباعة التقرير</Button>
      </div>

      <Card className="overflow-hidden border-t-4 border-t-gold-500">
         <div className="p-6 space-y-8">
            <div className="text-center space-y-2">
               <Heart className="mx-auto text-red-500 animate-pulse" size={48} />
               <h2 className="text-2xl font-bold text-gray-800 dark:text-white">تقرير الزكاة السنوي</h2>
               <p className="text-gray-500 dark:text-dark-muted">بناءً على مخزون الذهب الحالي بالمحل ( {items.length} قطعة )</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                  <h3 className="font-bold text-gray-700 dark:text-dark-muted border-b pb-2">تفاصيل المخزون</h3>
                  <div className="space-y-2">
                     <div className="flex justify-between items-center">
                        <span className="text-gray-600">وزن عيار 18:</span>
                        <span className="font-mono font-bold">{weightByKarat[18].toFixed(2)} جم</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-gray-600">وزن عيار 21:</span>
                        <span className="font-mono font-bold">{weightByKarat[21].toFixed(2)} جم</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-gray-600">وزن عيار 24:</span>
                        <span className="font-mono font-bold">{weightByKarat[24].toFixed(2)} جم</span>
                     </div>
                     <div className="border-t pt-2 flex justify-between items-center text-lg font-bold text-gold-700 dark:text-gold-400">
                        <span>الوزن المكافئ (عيار 24 صافي):</span>
                        <span>{weight24kEquivalent.toFixed(2)} جم</span>
                     </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <h3 className="font-bold text-gray-700 dark:text-dark-muted border-b pb-2">نتيجة الحساب الشرعي</h3>
                  <div className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center text-center gap-2 ${reachesNisab ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20' : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20'}`}>
                     {reachesNisab ? (
                        <>
                           <CheckCircle size={32} />
                           <p className="font-bold">المخزون بلغ النصاب (أكثر من 85جم عيار 24)</p>
                           <p className="text-sm opacity-80">يجب إخراج زكاة بنسبة 2.5% على إجمالي الذهب الصافي.</p>
                        </>
                     ) : (
                        <>
                           <AlertCircle size={32} />
                           <p className="font-bold">المخزون لم يبلغ النصاب الشرعي</p>
                           <p className="text-sm opacity-80">لا تجب الزكاة في هذا المخزون حالياً (أقل من 85جم عيار 24).</p>
                        </>
                     )}
                  </div>
               </div>
            </div>

            {reachesNisab && (
               <div className="mt-8 bg-gray-900 text-white p-8 rounded-2xl shadow-2xl relative overflow-hidden">
                  <div className="absolute -right-10 -bottom-10 opacity-10">
                     <Calculator size={200} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                     <div className="flex flex-col items-center justify-center border-r border-gray-800">
                        <span className="text-gold-400 text-sm font-bold uppercase tracking-widest mb-2">وزن الزكاة المستحقة</span>
                        <div className="text-5xl font-black font-mono">{zakatWeight.toFixed(3)}</div>
                        <span className="text-gray-400">جرام ذهب عيار 24</span>
                     </div>
                     <div className="flex flex-col items-center justify-center">
                        <span className="text-gold-400 text-sm font-bold uppercase tracking-widest mb-2">القيمة المالية التقريبية</span>
                        <div className="text-5xl font-black font-mono">{zakatValueMoney.toLocaleString()}</div>
                        <span className="text-gray-400">جنيه مصري</span>
                     </div>
                  </div>
                  <p className="text-center mt-8 text-[10px] text-gray-500 italic">ملاحظة: تم الحساب بناءً على سعر جرام عيار 24 الحالي ({price24k} ج.م)</p>
               </div>
            )}
         </div>
      </Card>
      
      <div className="bg-white dark:bg-dark-card p-6 rounded-xl border border-gray-100 dark:border-dark-border text-sm text-gray-600 dark:text-dark-muted no-print">
         <h4 className="font-bold mb-2 flex items-center gap-2"><AlertCircle size={16} className="text-gold-600"/> تنبيهات شرعية:</h4>
         <ul className="list-disc list-inside space-y-1">
            <li>نصاب الزكاة في الذهب هو 85 جراماً من الذهب الخالص (عيار 24).</li>
            <li>يجب أن يحول الحول (مرور سنة قمرية كاملة) على ملكية النصاب.</li>
            <li>النسبة الواجب إخراجها هي ربع العشر (2.5%).</li>
            <li>تُحسب الزكاة على سعر الذهب يوم وجوب الزكاة وليس يوم الشراء.</li>
         </ul>
      </div>
    </div>
  );
};

export default Zakat;
