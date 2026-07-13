
import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Input } from '../components/UI';
import { InventoryService } from '../services/storage';
import { Item, ItemStatus } from '../types';
import { Scan, ClipboardCheck, Trash2, CheckCircle, XCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Audit = () => {
  const navigate = useNavigate();
  const [itemsToAudit, setItemsToAudit] = useState<Item[]>([]);
  const [foundIds, setFoundIds] = useState<Set<string>>(new Set());
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isAuditActive, setIsAuditActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuditActive) {
      inputRef.current?.focus();
    }
  }, [isAuditActive]);

  const startAudit = () => {
    const inStore = InventoryService.getAll().filter(i => i.status === ItemStatus.IN_STORE);
    setItemsToAudit(inStore);
    setFoundIds(new Set());
    setIsAuditActive(true);
  };

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput) return;

    const item = itemsToAudit.find(i => i.barcode === barcodeInput);
    if (item) {
      setFoundIds(prev => new Set(prev).add(item.id));
      setBarcodeInput('');
    } else {
      // Could be an item that is sold or with rep or just not in the store list
      alert(`هذا الباركود (${barcodeInput}) غير موجود في قائمة المحل الحالية.`);
      setBarcodeInput('');
    }
  };

  const finishAudit = () => {
    if (confirm('هل أنت متأكد من إنهاء الجرد؟')) {
      setIsAuditActive(false);
    }
  };

  const foundCount = foundIds.size;
  const missingCount = itemsToAudit.length - foundCount;
  const missingItems = itemsToAudit.filter(i => !foundIds.has(i.id));

  if (!isAuditActive) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
           <Button variant="secondary" onClick={() => navigate('/')}><ArrowRight size={18} /> العودة</Button>
           <h1 className="text-2xl font-bold text-gray-800 dark:text-white">نظام الجرد الذكي</h1>
        </div>

        <Card title="بدء جرد جديد">
          <div className="text-center py-10 space-y-6">
             <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto text-blue-600">
                <ClipboardCheck size={48} />
             </div>
             <div className="max-w-md mx-auto">
               <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">تأكد من مطابقة الذهب الفعلي بالمحل مع النظام</h2>
               <p className="text-gray-500 dark:text-dark-muted text-sm">سيقوم النظام بحصر جميع القطع المسجلة "بالمحل" حالياً ويطلب منك مسحها بالباركود للتأكد من وجودها.</p>
             </div>
             <Button onClick={startAudit} className="px-10 py-3 text-lg">بدء عملية الجرد الآن</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">جاري الجرد...</h1>
          <p className="text-sm text-gray-500">امسح القطع الموجودة أمامك واحدة تلو الأخرى</p>
        </div>
        <Button variant="danger" onClick={finishAudit}>إنهاء الجرد وعرض التقرير</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 h-fit sticky top-6">
           <form onSubmit={handleScan} className="space-y-4">
              <Input 
                ref={inputRef}
                label="مسح الباركود" 
                placeholder="امسح هنا..." 
                value={barcodeInput} 
                onChange={e => setBarcodeInput(e.target.value)} 
                autoFocus
              />
              <Button type="submit" className="w-full h-12"><Scan size={20} /> مسح يدوي</Button>
           </form>

           <div className="mt-8 space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-dark-surface rounded-lg">
                <span className="text-gray-600 dark:text-dark-muted">إجمالي القطع المطلوبة</span>
                <span className="font-bold text-xl">{itemsToAudit.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg">
                <span className="flex items-center gap-2"><CheckCircle size={18} /> تم العثور عليها</span>
                <span className="font-bold text-xl">{foundCount}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
                <span className="flex items-center gap-2"><AlertCircle size={18} /> مفقودة / لم تمسح</span>
                <span className="font-bold text-xl">{missingCount}</span>
              </div>
           </div>
        </Card>

        <Card title="قائمة القطع المفقودة (لم يتم مسحها بعد)" className="md:col-span-2">
           <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-sm text-right">
                <thead className="bg-gray-100 dark:bg-dark-surface text-gray-600 dark:text-dark-muted sticky top-0">
                   <tr>
                     <th className="p-3">الباركود</th>
                     <th className="p-3">الصنف</th>
                     <th className="p-3">الوزن</th>
                     <th className="p-3">العيار</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                   {missingItems.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-dark-surface/50">
                         <td className="p-3 font-mono text-gray-500">{item.barcode}</td>
                         <td className="p-3 font-bold">{item.name}</td>
                         <td className="p-3">{item.weight} جم</td>
                         <td className="p-3 text-orange-600 font-bold">{item.karat}</td>
                      </tr>
                   ))}
                   {missingItems.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-10 text-center">
                           <div className="flex flex-col items-center gap-2 text-green-600">
                              <CheckCircle size={48} />
                              <p className="font-bold text-lg">ممتاز! تم العثور على جميع القطع.</p>
                           </div>
                        </td>
                      </tr>
                   )}
                </tbody>
              </table>
           </div>
        </Card>
      </div>
    </div>
  );
};

export default Audit;
