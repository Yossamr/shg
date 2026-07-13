import React, { useState, useEffect } from 'react';
import { InventoryService, SyncService } from '../services/storage';
import { Item, Karat, ItemStatus, GENERATE_ID, TIMESTAMP } from '../types';
import { Search, Printer, Box, ArrowRightLeft, Plus } from 'lucide-react';
import { Modal, Input, Select } from '../components/UI';

const Inventory = () => {
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [filterText, setFilterText] = useState('');
  const [karatFilter, setKaratFilter] = useState<number | 'ALL'>('ALL');
  const [selectedItemForTransfer, setSelectedItemForTransfer] = useState<Item | null>(null);
  
  // Quick Add Modal State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({
      name: '',
      weight: '',
      karat: 21 as Karat,
      workmanship: '',
      barcode: ''
  });

  const [currentShop, setCurrentShop] = useState(localStorage.getItem('selected_shop') || 'المحل الأساسي');

  const loadItems = () => {
    setAllItems(InventoryService.getAll());
  };

  useEffect(() => {
    loadItems();
    const handleShopChanged = () => {
      setCurrentShop(localStorage.getItem('selected_shop') || 'المحل الأساسي');
      loadItems();
    };
    window.addEventListener('shop-changed', handleShopChanged);
    return () => window.removeEventListener('shop-changed', handleShopChanged);
  }, []);

  const filteredItems = allItems.filter(i => {
      const matchesShop = (i.shop || 'المحل الأساسي') === currentShop;
      const matchesText = i.name.toLowerCase().includes(filterText.toLowerCase()) || 
                          i.barcode.toLowerCase().includes(filterText.toLowerCase());
      const matchesKarat = karatFilter === 'ALL' || i.karat === karatFilter;
      return matchesShop && matchesText && matchesKarat;
  });

  // Check if search query matches exactly no items, but looks like a barcode
  const isBarcodeNotFound = filterText.length >= 6 && 
                            filteredItems.length === 0 && 
                            !allItems.some(i => i.barcode.toLowerCase() === filterText.toLowerCase());

  const handleTransferClick = (item: Item, e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedItemForTransfer(item);
  };

  const executeTransfer = () => {
      if (!selectedItemForTransfer) return;
      const otherShop = currentShop === 'المحل الأساسي' ? 'المحل الثاني' : 'المحل الأساسي';
      InventoryService.updateShop(selectedItemForTransfer.id, otherShop);
      SyncService.sync();
      loadItems();
      setSelectedItemForTransfer(null);
      alert('تم تحويل الصنف بنجاح!');
  };

  const openQuickAdd = () => {
      setQuickAddForm({
          name: '',
          weight: '',
          karat: 21,
          workmanship: '',
          barcode: filterText
      });
      setIsQuickAddOpen(true);
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!quickAddForm.name || !quickAddForm.weight || !quickAddForm.barcode) {
          alert('يرجى ملء جميع الحقول المطلوبة');
          return;
      }
      
      const newItem: Item = {
          id: GENERATE_ID(),
          name: quickAddForm.name,
          weight: Number(quickAddForm.weight),
          quantity: 1,
          karat: Number(quickAddForm.karat) as Karat,
          type: 'تسجيل سريع بالباركود',
          workmanship: Number(quickAddForm.workmanship || 0),
          status: ItemStatus.IN_STORE,
          barcode: quickAddForm.barcode,
          createdAt: TIMESTAMP(),
          shop: currentShop
      };

      InventoryService.add(newItem);
      SyncService.sync();
      loadItems();
      setIsQuickAddOpen(false);
      setFilterText('');
      alert('تم تسجيل المنتج بنجاح في المخزن!');
  };

  return (
    <div className="px-4 py-4 space-y-4 font-sans" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-500">
                  <Box size={20} />
              </div>
              <h1 className="text-xl font-bold text-white">مخزن الذهب ({currentShop})</h1>
          </div>
          <button className="p-2 bg-dark-card rounded-lg text-gray-400 hover:text-white border border-dark-border">
              <Printer size={20} />
          </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
          <Search className="absolute right-4 top-3.5 text-gray-500" size={18} />
          <input 
            className="w-full bg-dark-card border border-dark-border rounded-xl h-12 pr-12 pl-4 text-white placeholder-gray-500 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none transition-all font-mono"
            placeholder="البحث عن الباركود أو اسم الصنف..."
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
          />
      </div>

      {/* Barcode Not Found - Quick Registration Trigger */}
      {isBarcodeNotFound && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-3 animate-fade-in">
              <div className="text-right">
                  <p className="text-sm font-bold text-yellow-500">هذا الباركود غير مسجل في النظام: <span className="font-mono text-white bg-black/30 px-2 py-0.5 rounded">{filterText}</span></p>
                  <p className="text-xs text-gray-400 mt-1">هل ترغب في تسجيل هذا الباركود كمنتج جديد وتوصيف بياناته الآن؟</p>
              </div>
              <button 
                onClick={openQuickAdd}
                className="bg-gold-500 hover:bg-gold-600 text-black text-xs font-black px-4 py-2.5 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center gap-1.5 shrink-0"
              >
                  <Plus size={14} strokeWidth={3} /> تسجيل كمنتج جديد
              </button>
          </div>
      )}

      {/* Karat Filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
              { label: 'الكل', val: 'ALL' },
              { label: 'عيار 24', val: 24 },
              { label: 'عيار 21', val: 21 },
              { label: 'عيار 18', val: 18 }
          ].map((f) => (
              <button 
                key={f.label} 
                onClick={() => setKaratFilter(f.val as any)}
                className={`px-6 py-2.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${karatFilter === f.val 
                    ? 'bg-gold-500 border-gold-500 text-black' 
                    : 'bg-dark-card border-dark-border text-gray-400'}`}
              >
                  {f.label}
              </button>
          ))}
      </div>

      {/* Items List */}
      <div className="space-y-3 pb-20">
          {filteredItems.map(item => (
              <div key={item.id} className="bg-dark-card border border-dark-border rounded-2xl p-3 flex gap-3 shadow-lg relative overflow-hidden">
                  <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                          <div className="flex justify-between items-start">
                              <h3 className="font-bold text-white text-base">{item.name}</h3>
                              <span className="text-[10px] bg-dark-bg text-gray-400 px-2 py-0.5 rounded border border-dark-border font-mono">{item.barcode}</span>
                          </div>
                          <div className="text-xs text-gold-500 mt-1 font-bold">
                              عيار {item.karat} <span className="text-gray-600 mx-1">|</span> SKU: {item.id.substring(0, 6).toUpperCase()}
                          </div>
                      </div>

                      <div className="flex items-end justify-between mt-3 gap-2">
                          <div className="bg-emerald-900/20 px-3 py-1 rounded-lg border border-emerald-500/20 shrink-0">
                              <span className="text-[10px] text-emerald-500 block">المتوفر:</span>
                              <span className="text-sm font-bold text-emerald-400">{item.quantity} قطع</span>
                          </div>

                          <button 
                            onClick={(e) => handleTransferClick(item, e)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gold-500/10 text-gold-500 hover:bg-gold-50 hover:text-black border border-gold-500/30 transition-all text-xs font-bold active:scale-95 shrink-0"
                          >
                              <ArrowRightLeft size={12} /> تحويل فرع
                          </button>
                          
                          <div className="text-left flex-1">
                              <span className="text-[10px] text-gray-500 block">الوزن (جم)</span>
                              <span className="text-xl font-black text-white font-mono">{item.weight.toFixed(2)}</span>
                          </div>
                      </div>
                  </div>

                  <div className="w-24 h-24 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700 flex items-center justify-center shrink-0 shadow-inner">
                      <div className="text-center">
                          <img 
                            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23fbbf24' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='8'/%3E%3Cpath d='M12 16v-4'/%3E%3Cpath d='M12 8h.01'/%3E%3C/svg%3E" 
                            className="w-12 h-12 mx-auto opacity-50 mb-1" 
                            alt="Gold"
                          />
                      </div>
                  </div>
              </div>
          ))}
          
          {filteredItems.length === 0 && (
              <div className="text-center py-20 text-gray-500">
                  <Box size={40} className="mx-auto mb-2 opacity-20" />
                  <p>لا توجد نتائج</p>
              </div>
          )}
      </div>

      {/* Gold Transfer Modal */}
      <Modal 
        isOpen={!!selectedItemForTransfer} 
        onClose={() => setSelectedItemForTransfer(null)} 
        title="تحويل الصنف للفرع الآخر"
      >
        {selectedItemForTransfer && (
          <div className="space-y-4 text-right" dir="rtl">
            <p className="text-sm text-gray-400">
              أنت على وشك تحويل الصنف التالي بين الفروع:
            </p>
            <div className="bg-dark-bg p-4 rounded-xl border border-dark-border">
              <div className="font-bold text-white text-base">{selectedItemForTransfer.name}</div>
              <div className="text-xs text-gold-500 mt-1 font-bold">عيار {selectedItemForTransfer.karat}</div>
              <div className="text-sm font-bold text-gray-300 mt-2">الوزن: {selectedItemForTransfer.weight.toFixed(2)} جرام</div>
            </div>
            
            <p className="text-sm text-amber-500 font-bold">
              سيتم تحويل هذا الصنف من ({currentShop}) إلى ({currentShop === 'المحل الأساسي' ? 'المحل الثاني' : 'المحل الأساسي'}).
            </p>
            
            <div className="flex gap-3 mt-6">
              <button 
                onClick={executeTransfer}
                className="flex-1 py-3 bg-gold-500 hover:bg-gold-600 text-black font-bold rounded-xl active:scale-95 transition-transform"
              >
                تأكيد التحويل
              </button>
              <button 
                onClick={() => setSelectedItemForTransfer(null)}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl active:scale-95 transition-transform"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Quick Add Barcode Modal */}
      <Modal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        title="تسجيل باركود جديد بالمخزن"
      >
        <form onSubmit={handleQuickAddSubmit} className="space-y-4 text-right" dir="rtl">
            <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">الباركود المسحوب (الرمز)</label>
                <Input 
                    value={quickAddForm.barcode}
                    disabled
                    className="font-mono text-center bg-gray-800 border-gray-700 text-gray-400 font-bold"
                />
            </div>
            <div>
                <Input 
                    label="اسم الصنف (مثال: خاتم لازوردي)"
                    required
                    value={quickAddForm.name}
                    onChange={e => setQuickAddForm({...quickAddForm, name: e.target.value})}
                    placeholder="خاتم، سلسلة، إلخ..."
                />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Input 
                        label="الوزن بالجرام"
                        type="number"
                        step="0.01"
                        required
                        value={quickAddForm.weight}
                        onChange={e => setQuickAddForm({...quickAddForm, weight: e.target.value})}
                        placeholder="0.00"
                    />
                </div>
                <div>
                    <Select 
                        label="العيار"
                        value={quickAddForm.karat}
                        onChange={e => setQuickAddForm({...quickAddForm, karat: Number(e.target.value) as any})}
                    >
                        <option value={24}>24</option>
                        <option value={21}>21</option>
                        <option value={18}>18</option>
                    </Select>
                </div>
            </div>
            <div>
                <Input 
                    label="المصنعية للجرام الواحد (اختياري)"
                    type="number"
                    value={quickAddForm.workmanship}
                    onChange={e => setQuickAddForm({...quickAddForm, workmanship: e.target.value})}
                    placeholder="0"
                />
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                type="submit"
                className="flex-1 py-3 bg-gold-500 hover:bg-gold-600 text-black font-bold rounded-xl active:scale-95 transition-transform"
              >
                تسجيل وحفظ الصنف
              </button>
              <button 
                type="button" 
                onClick={() => setIsQuickAddOpen(false)}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl active:scale-95 transition-transform"
              >
                إلغاء
              </button>
            </div>
        </form>
      </Modal>
    </div>
  );
};

export default Inventory;
