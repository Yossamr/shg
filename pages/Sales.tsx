
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TransactionService, CustomerService, SettingsService, AuthService, SyncService, InventoryService, GoldPriceService } from '../services/storage';
import { useNavigate } from 'react-router-dom';
import { Transaction, TransactionType, PaymentMethod, Karat, GENERATE_ID, TIMESTAMP, Customer, Item, ItemStatus } from '../types';
import { UserPlus, Search, X, Plus, Save, ArrowDown, ArrowUp, Trash2, Smartphone, Banknote, ShoppingCart, Scale, Coins, User, QrCode, Package, AlertTriangle } from 'lucide-react';
import { Modal, Input, Button } from '../components/UI';

interface CartItem {
  tempId: string;
  itemId: string;
  itemName: string;
  weight: string | number;
  karat: Karat;
  totalPrice: string | number;
  type: TransactionType;
  linkedItemId?: string;
}

const BarcodeScanner = ({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [status, setStatus] = useState<'loading' | 'scanning' | 'error'>('loading');
  const [errMsg, setErrMsg] = useState('');

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!('BarcodeDetector' in window)) {
          setErrMsg('متصفحك لا يدعم سكانر الباركود. استخدم Chrome على Android.');
          setStatus('error'); return;
        }
        const detector = new (window as any).BarcodeDetector({ formats: ['code_128','ean_13','ean_8','qr_code','data_matrix'] });
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        setStatus('scanning');
        const scan = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) { rafRef.current = requestAnimationFrame(scan); return; }
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) { stop(); onDetected(codes[0].rawValue); return; }
          } catch (_) {}
          rafRef.current = requestAnimationFrame(scan);
        };
        rafRef.current = requestAnimationFrame(scan);
      } catch (err: any) {
        setErrMsg(err.message?.includes('Permission') ? 'الرجاء السماح بالوصول للكاميرا' : 'تعذر فتح الكاميرا');
        setStatus('error');
      }
    })();
    return stop;
  }, [onDetected, stop]);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col" dir="rtl">
      <div className="flex items-center justify-between p-4 bg-black/80">
        <button onClick={() => { stop(); onClose(); }} className="p-2 rounded-full bg-white/10 text-white active:scale-95"><X size={22} /></button>
        <span className="text-white font-bold">سكانر الباركود</span>
        <div className="w-10" />
      </div>
      <div className="flex-1 relative overflow-hidden">
        {status === 'loading' && (<div className="absolute inset-0 flex flex-col items-center justify-center gap-3"><div className="w-12 h-12 border-4 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" /><p className="text-white/60 text-sm">جاري تشغيل الكاميرا...</p></div>)}
        {status === 'error' && (<div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8"><AlertTriangle size={48} className="text-rose-400" /><p className="text-white text-center font-bold">{errMsg}</p><button onClick={() => { stop(); onClose(); }} className="px-6 py-3 rounded-2xl bg-gold-500 text-black font-bold">رجوع</button></div>)}
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        {status === 'scanning' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-64 h-48">
              {['top-0 right-0 border-t-4 border-r-4','top-0 left-0 border-t-4 border-l-4','bottom-0 right-0 border-b-4 border-r-4','bottom-0 left-0 border-b-4 border-l-4'].map((cls, i) => (<div key={i} className={`absolute w-8 h-8 ${cls} border-gold-400 rounded-sm`} />))}
              <div className="absolute inset-x-0 h-0.5 bg-gold-400" style={{ top: '50%', animation: 'liquidLoad 1.8s ease-in-out infinite', boxShadow: '0 0 8px rgba(251,191,36,0.8)' }} />
              <p className="absolute -bottom-8 inset-x-0 text-center text-white/70 text-sm font-bold">وجّه الكاميرا نحو الباركود</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ProductSearchPanel = ({ onSelect, onClose, currentShop }: { onSelect: (item: Item) => void; onClose: () => void; currentShop: string }) => {
  const [query, setQuery] = useState('');
  const [mode, setMode]   = useState<'name' | 'weight'>('name');
  const [results, setResults] = useState<Item[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 150); }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const stock = InventoryService.getAll().filter(i => (i.shop || 'المحل الأساسي') === currentShop && i.status === ItemStatus.IN_STORE && i.quantity > 0);
    if (mode === 'name') {
      const q = query.toLowerCase();
      setResults(stock.filter(i => i.name.toLowerCase().includes(q) || i.type.toLowerCase().includes(q)).slice(0, 12));
    } else {
      const target = parseFloat(query);
      if (isNaN(target)) { setResults([]); return; }
      setResults(stock.map(i => ({ i, d: Math.abs(i.weight - target) })).sort((a, b) => a.d - b.d).slice(0, 12).map(x => x.i));
    }
  }, [query, mode, currentShop]);

  return (
    <div className="fixed inset-0 z-[150] bg-[#080f1e]/96 backdrop-blur-xl flex flex-col" dir="rtl">
      <div className="p-4 border-b border-white/10 flex items-center gap-3 shrink-0">
        <button onClick={onClose} className="p-2 rounded-full bg-white/10 text-white shrink-0 active:scale-95"><X size={20}/></button>
        <span className="text-white font-bold flex-1">بحث في المخزون</span>
        <div className="flex bg-[#1e293b] rounded-xl p-1 gap-1">
          {(['name','weight'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setQuery(''); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode===m ? 'bg-gold-500 text-black' : 'text-gray-400'}`}>
              {m==='name' ? 'بالاسم' : 'بالوزن'}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 py-3 shrink-0">
        <div className="relative">
          <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input ref={inputRef} type={mode==='weight'?'number':'text'} step="0.01" value={query} onChange={e => setQuery(e.target.value)}
            placeholder={mode==='name' ? 'اكتب اسم الصنف...' : 'اكتب الوزن (مثال: 4.50 جم)'}
            style={{ background:'rgba(30,41,59,0.9)', border:'2px solid rgba(251,191,36,0.3)', borderRadius:'16px', color:'#fff', padding:'13px 48px 13px 16px', width:'100%', fontSize:'16px', fontWeight:'700', outline:'none' }} />
        </div>
        {mode==='weight' && query && <p className="text-[11px] text-gold-400/70 mt-2 pr-1">مرتبة من الأقرب للوزن: <strong>{query} جم</strong></p>}
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-3 custom-scrollbar">
        {results.length === 0 && (
          <div className="text-center py-16 opacity-30 flex flex-col items-center gap-3">
            <Package size={48} />
            <p className="font-bold text-sm">{query ? 'لا توجد نتائج' : mode==='name' ? 'ابدأ الكتابة للبحث' : 'أدخل وزنًا للبحث'}</p>
          </div>
        )}
        {results.map((item, i) => {
          const diff = mode==='weight' && query ? Math.abs(item.weight - parseFloat(query)) : null;
          return (
            <button key={item.id} onClick={() => onSelect(item)}
              className="w-full text-right p-4 rounded-2xl border border-white/10 flex items-center gap-4 active:scale-[0.98] transition-all animate-scale-in"
              style={{ background:'rgba(30,41,59,0.9)', animationDelay:`${i*40}ms` }}>
              <div className="w-12 h-12 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center shrink-0 text-gold-500"><Package size={22}/></div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-white text-sm truncate">{item.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.type} • عيار {item.karat} • {item.weight.toFixed(2)} جم</p>
                {diff !== null && (
                  <span className={`text-[10px] font-bold mt-1 inline-block px-2 py-0.5 rounded-full ${diff<0.01?'bg-emerald-500/20 text-emerald-400':diff<2?'bg-gold-500/20 text-gold-400':'bg-white/5 text-gray-500'}`}>
                    {diff<0.01 ? 'تطابق تام ✓' : `فرق: ${diff.toFixed(2)} جم`}
                  </span>
                )}
              </div>
              <div className="text-left shrink-0">
                <span className="text-[10px] text-gray-500 block">الكمية</span>
                <span className="font-black text-white text-lg">{item.quantity}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const Sales = () => {
  const navigate    = useNavigate();
  const currentShop = localStorage.getItem('selected_shop') || 'المحل الأساسي';
  const [mode, setMode] = useState<TransactionType>(TransactionType.SALE);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerSearch, setCustomerSearch]         = useState('');
  const [searchResults, setSearchResults]           = useState<Customer[]>([]);
  const [showDropdown, setShowDropdown]             = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isAddCustomerOpen, setIsAddCustomerOpen]   = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen]   = useState(false);
  const [newCustomerForm, setNewCustomerForm]       = useState({ name: '', phone: '' });
  const [showScanner, setShowScanner]               = useState(false);
  const [showProductSearch, setShowProductSearch]   = useState(false);
  const [paymentMethod, setPaymentMethod]           = useState<PaymentMethod>(PaymentMethod.CASH);
  const [paidAmount, setPaidAmount]                 = useState<string>('');
  const [isPaidManuallySet, setIsPaidManuallySet]   = useState(false);
  const [currentUser, setCurrentUser]               = useState('');
  const [currentInvoiceId, setCurrentInvoiceId]     = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const u = AuthService.getCurrentUser();
    if (u) setCurrentUser(u.name);
    setCurrentInvoiceId(Date.now().toString().slice(-8));
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const recalcTotal = (c: CartItem[]) => c.reduce((s, it) => { const v = Number(it.totalPrice||0); return s + (it.type===TransactionType.SALE?v:-v); }, 0);
  const totalAmount = recalcTotal(cart);
  const totalWeight = cart.reduce((s, it) => s + Number(it.weight||0), 0);
  const isDebt      = Number(paidAmount) < Math.abs(totalAmount) && totalAmount !== 0;

  // Auto-sync paidAmount when totalAmount changes if not set manually by the user
  useEffect(() => {
    if (!isPaidManuallySet) {
      setPaidAmount(Math.abs(totalAmount).toString());
    }
  }, [totalAmount, isPaidManuallySet]);

  const updateItem = (id: string, field: keyof CartItem, value: any) => {
    const newCart = cart.map(it => it.tempId===id ? {...it,[field]:value} : it);
    setCart(newCart);
  };

  const removeItem = (id: string) => {
    const newCart = cart.filter(it => it.tempId!==id);
    setCart(newCart);
  };

  const addManualItem = () => {
    setCart([{ tempId:GENERATE_ID(), itemId:GENERATE_ID(), itemName:'', weight:'', karat:Karat.K21, totalPrice:'', type:mode }, ...cart]);
  };

  const addFromInventory = (inv: Item) => {
    setCart([{ tempId:GENERATE_ID(), itemId:inv.id, itemName:inv.name, weight:inv.weight, karat:inv.karat, totalPrice:'', type:mode, linkedItemId:inv.id }, ...cart]);
    setShowProductSearch(false); setShowScanner(false);
  };

  const handleBarcodeDetected = (code: string) => {
    setShowScanner(false);
    const found = InventoryService.getByBarcode(code);
    if (found) addFromInventory(found);
    else alert(`⚠️ الباركود: ${code}\nلم يتم العثور على صنف مطابق في مخزون هذا الفرع.`);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setCustomerSearch(v); setSearchResults(v ? CustomerService.search(v) : []); setShowDropdown(!!v);
    if (selectedCustomerId) setSelectedCustomerId(null);
  };
  const selectCustomer = (c: Customer) => { setCustomerSearch(c.name); setSelectedCustomerId(c.id); setShowDropdown(false); };

  const handleAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.name || !newCustomerForm.phone) return;
    const nc: Customer = { id:GENERATE_ID(), name:newCustomerForm.name, phone:newCustomerForm.phone, totalPurchases:0, lastVisit:TIMESTAMP() };
    CustomerService.addOrUpdate(nc); SyncService.sync(); selectCustomer(nc);
    setIsAddCustomerOpen(false); setNewCustomerForm({ name:'', phone:'' });
  };

  const handleExit = () => {
    if (cart.length > 0) {
      setIsExitConfirmOpen(true);
    } else {
      navigate('/dashboard');
    }
  };

  const handleSave = () => {
    if (cart.length===0) return;
    if (cart.some(i => Number(i.weight)<=0 || Number(i.totalPrice)<=0)) { alert('يرجى إدخال الوزن والسعر لجميع الأصناف'); return; }
    const paid = Number(paidAmount); const absTotal = Math.abs(totalAmount);
    if (paid < absTotal && !selectedCustomerId && !customerSearch.match(/^\d{10,}$/)) { alert('⚠️ يوجد مبلغ آجل. يجب اختيار عميل مسجل.'); return; }
    const invoiceId    = `GMM${currentInvoiceId}`;
    const goldPrice    = GoldPriceService.getStoredPrice().base21;
    cart.forEach(ci => {
      const instapayId = currentShop === 'المحل الثاني' ? 'SAFE_INSTAPAY_2' : 'SAFE_INSTAPAY_1';
      const cashId     = currentShop === 'المحل الثاني' ? 'SAFE_2' : 'SAFE_1';
      const tx: Transaction = {
        id:GENERATE_ID(), invoiceId, type:ci.type, itemId:ci.itemId, itemName:ci.itemName,
        weight:Number(ci.weight), qty:1, karat:ci.karat, goldPricePerGram:goldPrice, workmanship:0,
        totalPrice:Number(ci.totalPrice), paidAmount:paid, paymentMethod, customerName:customerSearch||undefined,
        customerId:selectedCustomerId||undefined, date:Date.now(), createdBy:currentUser, source:'MOBILE', shop:currentShop,
        safeId:paymentMethod===PaymentMethod.INSTAPAY ? instapayId : cashId, updatedAt:TIMESTAMP()
      };
      TransactionService.add(tx);
      if (ci.linkedItemId) InventoryService.deductQuantity(ci.linkedItemId, 1, Number(ci.weight));
    });
    if (selectedCustomerId) CustomerService.updateStats(selectedCustomerId, absTotal);
    SyncService.sync();
    alert('✅ تم حفظ العملية بنجاح');
    setCart([]); setCustomerSearch(''); setSelectedCustomerId(null);
    setPaymentMethod(PaymentMethod.CASH); setPaidAmount('');
    setIsPaidManuallySet(false);
    setCurrentInvoiceId(Date.now().toString().slice(-8));
  };

  return (
    <div className="flex flex-col h-full bg-[#0f172a] text-white font-sans" dir="rtl">
      {showScanner && <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setShowScanner(false)} />}
      {showProductSearch && <ProductSearchPanel onSelect={addFromInventory} onClose={() => setShowProductSearch(false)} currentShop={currentShop} />}

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#0f172a]/96 backdrop-blur-xl border-b border-white/5 p-3 shadow-2xl shrink-0">
        <div className="flex justify-between items-center mb-2">
          <button onClick={handleExit} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold active:scale-95 transition-all">
            <X size={14}/> إلغاء وخروج
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              {currentShop}
            </span>
            <span className="text-[10px] text-gray-400 font-mono bg-white/5 px-2.5 py-1 rounded-xl border border-white/5">فاتورة #{currentInvoiceId}</span>
          </div>
        </div>
        <div className="bg-[#1e293b] p-1 rounded-xl flex border border-white/5 mb-2 relative overflow-hidden">
          <div className={`absolute inset-y-1 rounded-lg transition-all duration-300 shadow-lg ${mode===TransactionType.SALE?'bg-emerald-500 left-1/2 right-1':'bg-rose-500 left-1 right-1/2'}`}/>
          <button onClick={() => setMode(TransactionType.SALE)} className={`relative z-10 flex-1 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all ${mode===TransactionType.SALE?'text-white':'text-gray-400'}`}>
            <ArrowUp size={15} strokeWidth={3}/> بيع (Sale)
          </button>
          <button onClick={() => setMode(TransactionType.PURCHASE)} className={`relative z-10 flex-1 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all ${mode===TransactionType.PURCHASE?'text-white':'text-gray-400'}`}>
            <ArrowDown size={15} strokeWidth={3}/> شراء (Buy)
          </button>
        </div>
        <div className="flex gap-1.5 relative" ref={searchRef}>
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none">
              <Search size={15} className={`transition-colors ${selectedCustomerId?'text-emerald-400':'text-gray-500 group-focus-within:text-gold-500'}`}/>
            </div>
            <input className={`w-full bg-[#1e293b] border rounded-xl pr-9 pl-3 h-11 text-xs font-bold text-white placeholder:text-gray-600 outline-none transition-all ${selectedCustomerId?'border-emerald-500/50':'border-white/5 focus:border-gold-500/40'}`}
              placeholder="ابحث عن عميل (اسم / موبايل)..." value={customerSearch} onChange={handleSearchChange}
              onFocus={() => { if(customerSearch) setShowDropdown(true); }}/>
            {showDropdown && searchResults.length>0 && (
              <div className="absolute top-full mt-1.5 inset-x-0 bg-[#1e293b] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 max-h-52 overflow-y-auto">
                {searchResults.map(c => (
                  <button key={c.id} onClick={() => selectCustomer(c)} className="w-full text-right px-3.5 py-2.5 hover:bg-white/5 flex items-center gap-2.5 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-gold-500/20 text-gold-500 flex items-center justify-center shrink-0"><User size={12}/></div>
                    <div><p className="font-bold text-xs text-white">{c.name}</p><p className="text-[10px] text-gray-500 font-mono">{c.phone}</p></div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setIsAddCustomerOpen(true)} className="w-11 h-11 rounded-xl bg-[#1e293b] border border-white/5 flex items-center justify-center text-gray-400 hover:text-gold-400 hover:border-gold-500/30 transition-all active:scale-90 shrink-0">
            <UserPlus size={16}/>
          </button>
        </div>
      </header>

      {/* CART */}
      <main className="flex-1 overflow-y-auto px-3 pt-2 pb-3 custom-scrollbar">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 flex items-center gap-1.5 text-xs text-gray-500 font-bold">
            <ShoppingCart size={13}/><span>السلة ({cart.length})</span>
            {cart.length>0 && <span className="text-gold-400">• {totalWeight.toFixed(2)} جم</span>}
          </div>
          <button onClick={() => setShowScanner(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-bold active:scale-95 transition-all shrink-0">
            <QrCode size={12}/> سكان
          </button>
          <button onClick={() => setShowProductSearch(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[11px] font-bold active:scale-95 transition-all shrink-0">
            <Package size={12}/> بحث
          </button>
          <button onClick={addManualItem} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gold-500 text-black text-[11px] font-black active:scale-95 transition-all shadow-lg shadow-gold-900/20 shrink-0">
            <Plus size={12} strokeWidth={3}/> إضافة
          </button>
        </div>

        {cart.length===0 && (
          <div className="text-center py-10 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/3 border border-white/5 flex items-center justify-center opacity-25"><ShoppingCart size={22}/></div>
            <p className="text-gray-500 font-bold text-xs">السلة فارغة</p>
            <div className="flex gap-2.5 mt-1">
              <button onClick={() => setShowScanner(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/12 text-blue-400 border border-blue-500/20 text-xs font-bold active:scale-95">
                <QrCode size={13}/> سكان الباركود
              </button>
              <button onClick={() => setShowProductSearch(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/12 text-purple-400 border border-purple-500/20 text-xs font-bold active:scale-95">
                <Search size={13}/> البحث
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {cart.map((item, idx) => (
            <div key={item.tempId} className="rounded-2xl border border-white/10 overflow-hidden animate-scale-in" style={{ animationDelay:`${idx*55}ms`, background:'rgba(30,41,59,0.95)' }}>
              <div className="p-3 pb-2">
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => updateItem(item.tempId,'type', item.type===TransactionType.SALE?TransactionType.PURCHASE:TransactionType.SALE)}
                    className={`shrink-0 px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${item.type===TransactionType.SALE?'bg-emerald-500/15 text-emerald-400 border-emerald-500/30':'bg-rose-500/15 text-rose-400 border-rose-500/30'}`}>
                    {item.type===TransactionType.SALE?'↑ بيع':'↓ شراء'}
                  </button>
                  <input value={item.itemName} onChange={e => updateItem(item.tempId,'itemName',e.target.value)}
                    style={{ background:'rgba(15,23,42,0.85)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'#fff', padding:'6px 10px', flex:'1', fontSize:'13px', fontWeight:'700', outline:'none' }}
                    placeholder="اسم الصنف (مثال: خاتم)"
                    onFocus={e=>{e.target.style.borderColor='rgba(251,191,36,0.5)';e.target.style.boxShadow='0 0 0 3px rgba(251,191,36,0.1)';}}
                    onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,0.1)';e.target.style.boxShadow='none';}}/>
                  <button onClick={() => removeItem(item.tempId)} className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all active:scale-90 shrink-0">
                    <Trash2 size={13}/>
                  </button>
                </div>
                <div>
                  <label className="text-[9px] text-gray-500 font-bold mb-1 block">العيار</label>
                  <div className="flex bg-[#0f172a] rounded-lg border border-white/10 p-0.5 h-8">
                    {[18,21,24].map(k => (
                      <button key={k} onClick={() => updateItem(item.tempId,'karat',k)}
                        className={`flex-1 text-[11px] font-bold rounded-md transition-all ${item.karat===k?'bg-gold-500 text-black shadow':'text-gray-500 hover:text-white'}`}>
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="h-px bg-white/5 mx-3"/>
              <div className="grid grid-cols-2 gap-2 p-3 pt-2">
                <div>
                  <label className="text-[9px] text-gray-500 font-bold mb-1 flex items-center gap-1"><Scale size={8}/> الوزن (جم)</label>
                  <input type="number" step="0.01" value={item.weight} onChange={e => updateItem(item.tempId,'weight',e.target.value)}
                    style={{ background:'rgba(15,23,42,0.85)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'#fff', padding:'6px 10px', width:'100%', fontSize:'15px', fontWeight:'900', outline:'none', fontFamily:'monospace' }}
                    placeholder="0.00"
                    onFocus={e=>{e.target.style.borderColor='rgba(251,191,36,0.5)';e.target.style.boxShadow='0 0 0 3px rgba(251,191,36,0.1)';}}
                    onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,0.1)';e.target.style.boxShadow='none';}}/>
                </div>
                <div>
                  <label className="text-[9px] text-gray-500 font-bold mb-1 flex items-center gap-1"><Coins size={8}/> السعر الإجمالي</label>
                  <input type="number" value={item.totalPrice} onChange={e => updateItem(item.tempId,'totalPrice',e.target.value)}
                    style={{ background:'rgba(15,23,42,0.85)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:item.type===TransactionType.SALE?'#34d399':'#f87171', padding:'6px 10px', width:'100%', fontSize:'15px', fontWeight:'900', outline:'none', fontFamily:'monospace' }}
                    placeholder="0"
                    onFocus={e=>{e.target.style.borderColor='rgba(251,191,36,0.5)';e.target.style.boxShadow='0 0 0 3px rgba(251,191,36,0.1)';}}
                    onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,0.1)';e.target.style.boxShadow='none';}}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="shrink-0 bg-[#0b1120] border-t border-white/10 p-3 pb-safe shadow-[0_-8px_32px_rgba(0,0,0,0.5)]">
        <div className="space-y-2.5">
          <div className="flex gap-2.5">
            <div className="flex bg-[#1e293b] p-0.5 rounded-xl border border-white/5 w-1/3 h-[50px]">
              <button onClick={() => setPaymentMethod(PaymentMethod.CASH)}
                className={`flex-1 py-0.5 rounded-lg font-bold text-[10px] flex flex-col items-center justify-center gap-0.5 transition-all ${paymentMethod===PaymentMethod.CASH?'bg-white text-black shadow':'text-gray-400'}`}>
                <Banknote size={12}/> كاش
              </button>
              <button onClick={() => setPaymentMethod(PaymentMethod.INSTAPAY)}
                className={`flex-1 py-0.5 rounded-lg font-bold text-[10px] flex flex-col items-center justify-center gap-0.5 transition-all ${paymentMethod===PaymentMethod.INSTAPAY?'bg-purple-600 text-white shadow':'text-gray-400'}`}>
                <Smartphone size={12}/> InstaPay
              </button>
            </div>
            <div className={`flex-1 bg-[#1e293b] border rounded-xl h-[50px] px-2.5 py-1 flex flex-col justify-between transition-colors ${isDebt?'border-rose-500/40':'border-white/5 focus-within:border-emerald-500/40'}`}>
              <span className="text-[8px] text-gray-400 font-bold leading-none">المدفوع</span>
              <input type="number" value={paidAmount} onChange={e => { setPaidAmount(e.target.value); setIsPaidManuallySet(true); }}
                className={`w-full bg-transparent font-black text-base text-center outline-none ${isDebt?'text-rose-400':'text-white'}`} placeholder="0"/>
            </div>
            <div className="w-1/3 bg-[#1e293b] rounded-xl border border-white/5 flex flex-col items-center justify-center px-1.5 relative overflow-hidden h-[50px]">
              <div className={`absolute inset-0 opacity-10 ${totalAmount>=0?'bg-emerald-500':'bg-rose-500'}`}/>
              <span className="text-[8px] text-gray-400 font-bold z-10 leading-none">الإجمالي</span>
              <span className={`text-base font-black z-10 mt-1 ${totalAmount>=0?'text-gold-400':'text-rose-400'}`}>{Math.abs(totalAmount).toLocaleString()}</span>
            </div>
          </div>
          {isDebt && (
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-rose-400 bg-rose-900/20 py-1 rounded-lg border border-rose-500/20">
              ⚠️ متبقي (آجل): {(Math.abs(totalAmount)-Number(paidAmount)).toLocaleString()} ج.م
            </div>
          )}
          <button onClick={handleSave} disabled={cart.length===0}
            className="w-full bg-gradient-to-r from-gold-600 to-gold-500 text-black font-black py-3 rounded-xl flex items-center justify-center gap-2 text-base shadow-[0_0_15px_rgba(234,179,8,0.2)] active:scale-[0.98] transition-all disabled:opacity-40 disabled:grayscale">
            <Save size={16}/><span>حفظ وإنهاء العملية</span>
          </button>
        </div>
      </footer>

      <Modal isOpen={isAddCustomerOpen} onClose={() => setIsAddCustomerOpen(false)} title="إضافة عميل جديد">
        <form onSubmit={handleAddCustomerSubmit} className="space-y-4">
          <div className="p-4 bg-blue-900/20 border border-blue-500/20 rounded-2xl text-sm text-blue-200 flex items-start gap-3">
            <div className="bg-blue-500/20 p-2 rounded-full shrink-0"><User size={18} className="text-blue-400"/></div>
            <div>يجب إدخال اسم العميل ورقم الهاتف لتسجيل المبيعات الآجلة في دفتر الديون.</div>
          </div>
          <Input label="اسم العميل" value={newCustomerForm.name} onChange={e => setNewCustomerForm({...newCustomerForm,name:e.target.value})} required autoFocus className="h-14 text-lg"/>
          <Input label="رقم الهاتف" type="tel" value={newCustomerForm.phone} onChange={e => setNewCustomerForm({...newCustomerForm,phone:e.target.value})} required className="h-14 text-lg font-mono"/>
          <button type="submit" className="w-full bg-gold-500 text-black font-bold py-4 rounded-xl text-lg shadow-lg">حفظ واختيار</button>
        </form>
      </Modal>

      <Modal isOpen={isExitConfirmOpen} onClose={() => setIsExitConfirmOpen(false)} title="تأكيد الخروج">
        <div className="space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
            <AlertTriangle size={32} />
          </div>
          <div>
            <h3 className="text-base font-black text-white">هل أنت متأكد من الخروج وإلغاء الفاتورة؟</h3>
            <p className="text-xs text-gray-400 mt-2 font-medium">سيتم فقدان جميع العناصر المضافة في السلة.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="danger" className="flex-1 text-xs py-3" onClick={() => { setIsExitConfirmOpen(false); navigate('/dashboard'); }}>
              نعم، إلغاء وخروج
            </Button>
            <Button variant="secondary" className="flex-1 text-xs py-3" onClick={() => setIsExitConfirmOpen(false)}>
              رجوع وإكمال الفاتورة
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Sales;
