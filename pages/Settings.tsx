
import React, { useState, useEffect, useMemo } from 'react';
import { SettingsService, SyncService, TransactionService, PrintService, CustomerService, AuthService, InventoryService } from '../services/storage';
import { DbService } from '../services/db';
import { StoreProfile, AppUser, UserRole, Transaction, TransactionType } from '../types';
import { Save, Trash2, Plus, Store, Upload, Lock, FileText, Search, Printer, MessageCircle, ArrowUpRight, ArrowDownLeft, Calendar, User, Users, CheckCircle2, X, Receipt, Smartphone, Banknote, MapPin, Share, PlusSquare } from 'lucide-react';

// --- Sub Components ---
const SectionHeader = ({ title }: { title: string }) => (
  <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest px-4 mb-2 mt-8 flex items-center gap-2">
      <span className="w-1 h-3 bg-gold-500 rounded-full"></span> {title}
  </h3>
);

const SettingRow = ({ children, onClick, className = '' }: { children?: React.ReactNode, onClick?: () => void, className?: string }) => (
  <div 
    onClick={onClick}
    className={`bg-[#1e293b] p-5 flex items-center justify-between border-b border-white/5 last:border-b-0 first:rounded-t-3xl last:rounded-b-3xl cursor-pointer hover:bg-[#253248] transition-all group ${className}`}
  >
      {children}
  </div>
);

// --- Interfaces ---
interface InvoiceGroup {
    id: string;
    date: number;
    customerName: string;
    customerPhone?: string;
    items: Transaction[];
    totalAmount: number;
    paidAmount: number;
    type: 'SALE' | 'PURCHASE' | 'MIXED';
    createdBy: string;
}

const Settings = () => {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'USERS' | 'INVOICES'>('GENERAL');
  
  // Data States
  const [profile, setProfile] = useState<StoreProfile>(SettingsService.getStoreProfile());
  const [users, setUsers] = useState<AppUser[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [barcodePrintCount, setBarcodePrintCount] = useState(10);
  
  // UI States
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: UserRole.CASHIER, pin: '' });
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceGroup | null>(null);

  // PWA states
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsPWAInstalled(!!isStandalone);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    // Check if install prompt is already deferred globally
    if ((window as any).deferredInstallPrompt) {
      setCanInstall(true);
    }

    // Listen to prompt available event
    const handlePromptAvailable = () => {
      setCanInstall(true);
    };
    window.addEventListener('pwa-install-prompt-available', handlePromptAvailable);

    return () => {
      window.removeEventListener('pwa-install-prompt-available', handlePromptAvailable);
    };
  }, []);

  const handleInstallPWA = async () => {
    const promptEvent = (window as any).deferredInstallPrompt;
    if (!promptEvent) {
      alert("يرجى استخدام خيارات المتصفح للفرع والضغط على 'إضافة إلى الشاشة الرئيسية' أو 'تثبيت التطبيق'.");
      return;
    }
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      (window as any).deferredInstallPrompt = null;
      setCanInstall(false);
      setIsPWAInstalled(true);
    }
  };

  const handlePrintEmptyBarcodes = () => {
      const activeShop = localStorage.getItem('selected_shop') || 'المحل الأساسي';
      const prefix = activeShop === 'المحل الثاني' ? 'GMS' : 'GMM';
      const barcodes: string[] = [];
      const printedLog = SettingsService.getPrintedBarcodes();
      const allItems = InventoryService.getAll();
      
      let attempts = 0;
      while (barcodes.length < barcodePrintCount && attempts < 20000) {
          attempts++;
          const suffix = Math.floor(10000000 + Math.random() * 90000000).toString();
          const candidate = `${prefix}${suffix}`;
          
          // Prevent duplicates
          const existsInItems = allItems.some(i => i.barcode.toLowerCase() === candidate.toLowerCase());
          const existsInPrinted = printedLog.some(b => b.toLowerCase() === candidate.toLowerCase());
          const existsInCurrentBatch = barcodes.some(b => b.toLowerCase() === candidate.toLowerCase());
          
          if (!existsInItems && !existsInPrinted && !existsInCurrentBatch) {
              barcodes.push(candidate);
          }
      }
      
      if (barcodes.length > 0) {
          SettingsService.savePrintedBarcodes(barcodes);
          PrintService.printBarcodeTickets(barcodes);
      } else {
          alert('خطأ في توليد أكواد باركود فريدة. يرجى المحاولة لاحقاً.');
      }
  };

  useEffect(() => {
    fetchUsers();
    setTransactions(TransactionService.getAll());
  }, [activeTab]);

  const fetchUsers = async () => {
      const u = await DbService.getUsers();
      setUsers(u);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (SettingsService.saveStoreProfile(profile)) {
        SyncService.sync();
        alert('تم حفظ البيانات بنجاح');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoBase64' | 'stampBase64') => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
              setProfile(prev => ({...prev, [field]: evt.target?.result as string}));
          };
          reader.readAsDataURL(file);
      }
  };

  // --- Invoice Logic ---
  const invoices = useMemo(() => {
      const groups: { [key: string]: InvoiceGroup } = {};
      
      transactions.forEach(tx => {
          const invId = tx.invoiceId || 'UNKNOWN';
          if (!groups[invId]) {
              groups[invId] = {
                  id: invId,
                  date: tx.date,
                  customerName: tx.customerName || 'عميل نقدي',
                  customerPhone: tx.customerPhone,
                  items: [],
                  totalAmount: 0,
                  paidAmount: 0,
                  type: tx.type === TransactionType.SALE ? 'SALE' : 'PURCHASE',
                  createdBy: tx.createdBy
              };
          }
          
          groups[invId].items.push(tx);
          
          if (tx.type === TransactionType.SALE) {
              groups[invId].totalAmount += tx.totalPrice;
          } else if (tx.type === TransactionType.PURCHASE) {
              groups[invId].totalAmount -= tx.totalPrice; // Negative for purchases visual
              groups[invId].type = 'PURCHASE';
          }
          
          groups[invId].paidAmount += (tx.paidAmount || 0);
      });

      // Convert to array and sort by date desc
      let list = Object.values(groups).sort((a, b) => b.date - a.date);

      // Filter
      if (invoiceSearch) {
          const q = invoiceSearch.toLowerCase();
          list = list.filter(inv => 
              inv.id.toLowerCase().includes(q) || 
              inv.customerName.toLowerCase().includes(q)
          );
      }
      return list;
  }, [transactions, invoiceSearch]);

  const handlePrintInvoice = (inv: InvoiceGroup, e?: React.MouseEvent) => {
      if(e) e.stopPropagation();
      PrintService.printReceipt(
          inv.items,
          Math.abs(inv.totalAmount),
          inv.customerName,
          inv.createdBy,
          inv.id,
          inv.type === 'SALE' ? 'فاتورة بيع' : 'فاتورة شراء'
      );
  };

  const handleWhatsAppInvoice = (inv: InvoiceGroup, e?: React.MouseEvent) => {
    if(e) e.stopPropagation();
    
    // Attempt to find phone number
    let phone = inv.customerPhone;
    if (!phone) {
        // Try looking up customer in DB
        const c = CustomerService.getAll().find(cust => cust.name === inv.customerName);
        if (c) phone = c.phone;
    }

    if (!phone || phone.length < 5) {
        const manual = prompt('رقم الهاتف غير مسجل، أدخل الرقم للإرسال:');
        if (!manual) return;
        phone = manual;
    }

    const store = SettingsService.getStoreProfile();
    let msg = `*مرحباً ${inv.customerName} 👋*\n`;
    msg += `من: *${store.name}* للمجوهرات 💎\n\n`;
    msg += `📄 *فاتورة رقم:* ${inv.id}\n`;
    msg += `📅 *التاريخ:* ${new Date(inv.date).toLocaleDateString('ar-EG')}\n`;
    msg += `-------------------\n`;
    
    inv.items.forEach(item => {
        msg += `${item.type === 'SALE' ? '💍' : '📥'} ${item.itemName} (${item.weight}g) - ${item.totalPrice.toLocaleString()}\n`;
    });
    
    msg += `-------------------\n`;
    msg += `💰 *الإجمالي:* ${Math.abs(inv.totalAmount).toLocaleString()} ج.م\n`;
    if (inv.paidAmount < Math.abs(inv.totalAmount)) {
        msg += `⚠️ *المتبقي:* ${(Math.abs(inv.totalAmount) - inv.paidAmount).toLocaleString()} ج.م\n`;
    }
    msg += `\nنسعد بخدمتكم دائماً! ✨`;

    const link = `https://wa.me/20${phone.replace(/^0+/, '')}?text=${encodeURIComponent(msg)}`;
    window.open(link, '_blank');
  };

  // --- User Logic ---
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.pin || !newUser.email) return;
    const user: AppUser = {
      id: Math.random().toString(36).substring(2, 9),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role as UserRole,
      pin: newUser.pin,
      active: true
    };
    await DbService.registerUser(user);
    SyncService.sync(); 
    fetchUsers();
    setShowAddUser(false);
    setNewUser({ name: '', email: '', role: UserRole.CASHIER, pin: '' });
  };
  
  const deleteUser = async (id: string, role: string) => {
    if (role === UserRole.OWNER) return alert("لا يمكن حذف المالك!");
    if (confirm('حذف المستخدم؟')) {
      await DbService.deleteUser(id);
      SyncService.sync(); 
      fetchUsers();
    }
  };

  // --- Render Details Modal ---
  const renderInvoiceDetails = () => {
      if (!selectedInvoice) return null;
      const debt = Math.abs(selectedInvoice.totalAmount) - selectedInvoice.paidAmount;
      const isSale = selectedInvoice.type === 'SALE';

      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedInvoice(null)}>
              {/* Added 'm-4' and 'max-h' constraints to prevent full screen eating on mobile */}
              <div 
                className="bg-[#1e293b] w-full max-w-sm md:max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 relative flex flex-col max-h-[85vh] animate-scale-in" 
                onClick={e => e.stopPropagation()}
              >
                  
                  {/* Header Pass Style */}
                  <div className={`p-6 text-center relative ${isSale ? 'bg-gradient-to-br from-emerald-600 to-emerald-900' : 'bg-gradient-to-br from-rose-600 to-rose-900'}`}>
                      <button onClick={() => setSelectedInvoice(null)} className="absolute top-4 left-4 p-2 bg-black/20 rounded-full text-white/80 hover:bg-black/40 transition-colors">
                          <X size={20} />
                      </button>
                      
                      <div className="w-14 h-14 bg-white/10 rounded-2xl mx-auto flex items-center justify-center mb-3 backdrop-blur-md border border-white/20 shadow-lg">
                          <Receipt size={28} className="text-white" />
                      </div>
                      
                      <h2 className="text-3xl font-black text-white tracking-tight mb-1">
                          {Math.abs(selectedInvoice.totalAmount).toLocaleString()} <span className="text-sm font-medium opacity-80">EGP</span>
                      </h2>
                      <div className="inline-flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full text-xs font-bold text-white/90 backdrop-blur-sm">
                          <span>{isSale ? 'فاتورة بيع' : 'فاتورة شراء'}</span>
                          <span>•</span>
                          <span className="font-mono">#{selectedInvoice.id}</span>
                      </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                      
                      {/* Customer Info */}
                      <div className="flex items-center justify-between p-3 bg-[#0f172a] rounded-2xl border border-white/5">
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#1e293b] flex items-center justify-center text-gray-400">
                                  <User size={20} />
                              </div>
                              <div>
                                  <div className="font-bold text-white text-sm">{selectedInvoice.customerName}</div>
                                  <div className="text-xs text-gray-500 font-mono">{selectedInvoice.customerPhone || 'غير مسجل'}</div>
                              </div>
                          </div>
                          <div className="text-right">
                              <div className="text-xs text-gray-500 mb-1">التاريخ</div>
                              <div className="font-bold text-white text-xs">{new Date(selectedInvoice.date).toLocaleDateString('ar-EG')}</div>
                          </div>
                      </div>

                      {/* Items List */}
                      <div>
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                              <FileText size={14}/> تفاصيل الأصناف
                          </h4>
                          <div className="space-y-2">
                              {selectedInvoice.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-[#0f172a]/50 border border-white/5 hover:bg-[#0f172a] transition-colors">
                                      <div className="flex items-center gap-3">
                                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${isSale ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                              {item.karat}
                                          </div>
                                          <div>
                                              <div className="font-bold text-white text-sm">{item.itemName}</div>
                                              <div className="text-[10px] text-gray-500 font-mono">{item.weight}g</div>
                                          </div>
                                      </div>
                                      <div className="font-mono font-bold text-gray-300">
                                          {item.totalPrice.toLocaleString()}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* Payment Summary */}
                      <div className="bg-[#0f172a] rounded-2xl p-4 border border-white/5 space-y-3">
                          <div className="flex justify-between items-center">
                              <span className="text-gray-500 text-xs">إجمالي الفاتورة</span>
                              <span className="font-bold text-white font-mono">{Math.abs(selectedInvoice.totalAmount).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center text-emerald-500">
                              <span className="text-xs flex items-center gap-1"><CheckCircle2 size={12}/> المدفوع</span>
                              <span className="font-bold font-mono">{selectedInvoice.paidAmount.toLocaleString()}</span>
                          </div>
                          {debt > 1 && (
                              <div className="flex justify-between items-center text-rose-500 pt-2 border-t border-white/5">
                                  <span className="text-xs font-bold">المتبقي (آجل)</span>
                                  <span className="font-bold font-mono">{debt.toLocaleString()}</span>
                              </div>
                          )}
                      </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="p-4 bg-[#0f172a] border-t border-white/10 flex gap-3">
                      <button 
                          onClick={(e) => handleWhatsAppInvoice(selectedInvoice, e)}
                          className="flex-1 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#1da851] text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 active:scale-[0.98] transition-all text-sm"
                      >
                          <MessageCircle size={18} /> واتساب
                      </button>
                      <button 
                          onClick={(e) => handlePrintInvoice(selectedInvoice, e)}
                          className="flex-1 py-3.5 rounded-xl bg-white text-black hover:bg-gray-200 font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all text-sm"
                      >
                          <Printer size={18} /> طباعة
                      </button>
                  </div>
              </div>
          </div>
      );
  };


  return (
    <div className="max-w-4xl mx-auto p-4 pb-32 animate-fade-in safe-pt">
        
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-6 px-2">
            <div>
                <h1 className="text-3xl font-bold text-white mb-1">لوحة التحكم</h1>
                <p className="text-gray-500 text-sm">إدارة المتجر، المستخدمين، والفواتير</p>
            </div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-[#1e293b] p-1.5 rounded-2xl flex border border-white/5 mb-8 shadow-lg relative overflow-hidden">
            {/* Animated Background could go here */}
            <button onClick={() => setActiveTab('GENERAL')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'GENERAL' ? 'bg-[#f4c025] text-black shadow-md' : 'text-gray-400 hover:text-white'}`}>
                <Store size={18} /> إعدادات المتجر
            </button>
            <button onClick={() => setActiveTab('USERS')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'USERS' ? 'bg-[#f4c025] text-black shadow-md' : 'text-gray-400 hover:text-white'}`}>
                <Users size={18} /> المستخدمين
            </button>
            <button onClick={() => setActiveTab('INVOICES')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'INVOICES' ? 'bg-[#f4c025] text-black shadow-md' : 'text-gray-400 hover:text-white'}`}>
                <FileText size={18} /> سجل الفواتير
            </button>
        </div>

        {/* --- GENERAL TAB --- */}
        {activeTab === 'GENERAL' && (
            <form onSubmit={handleSaveProfile} className="animate-slide-up">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <SectionHeader title="هوية العلامة التجارية" />
                        <div className="bg-[#1e293b] rounded-3xl overflow-hidden border border-white/5 shadow-xl">
                            <div className="p-6 border-b border-white/5 flex items-center gap-6">
                                <div className="w-24 h-24 bg-[#0f172a] rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden relative group transition-all hover:border-gold-500">
                                    {profile.logoBase64 ? <img src={profile.logoBase64} className="w-full h-full object-cover" /> : <Store className="text-gray-600" size={32} />}
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Upload className="text-white" size={20} />
                                    </div>
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'logoBase64')} />
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <label className="text-[10px] uppercase text-gray-500 font-bold">اسم المتجر</label>
                                        <input 
                                            className="w-full bg-transparent text-white font-bold text-2xl outline-none placeholder-gray-700 focus:border-b border-gold-500/50"
                                            value={profile.name}
                                            onChange={e => setProfile({...profile, name: e.target.value})}
                                            placeholder="Gold Master"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase text-gray-500 font-bold">الشعار اللفظي (Slogan)</label>
                                        <input 
                                            className="w-full bg-transparent text-gray-300 text-sm outline-none placeholder-gray-600 focus:border-b border-gold-500/50"
                                            value={profile.slogan}
                                            onChange={e => setProfile({...profile, slogan: e.target.value})}
                                            placeholder="Since 1990..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <SectionHeader title="بيانات التواصل والفروع" />
                        <div className="bg-[#1e293b] rounded-3xl overflow-hidden border border-white/5 shadow-xl">
                            <SettingRow>
                                <div className="flex-1">
                                    <label className="block text-[10px] text-gray-500 font-bold mb-1">العنوان الرئيسي</label>
                                    <input className="bg-transparent w-full text-white font-medium outline-none placeholder-gray-600" value={profile.address1} onChange={e => setProfile({...profile, address1: e.target.value})} placeholder="المدينة، الشارع..." />
                                </div>
                            </SettingRow>
                            <SettingRow>
                                <div className="flex-1">
                                    <label className="block text-[10px] text-gray-500 font-bold mb-1">رقم الهاتف الأساسي</label>
                                    <input className="bg-transparent w-full text-white font-medium outline-none placeholder-gray-600 font-mono" value={profile.phonePrimary} onChange={e => setProfile({...profile, phonePrimary: e.target.value})} placeholder="01xxxxxxxxx" />
                                </div>
                            </SettingRow>
                        </div>
                    </div>

                    <div>
                        <SectionHeader title="التوثيق والطباعة" />
                        <div className="bg-[#1e293b] rounded-3xl overflow-hidden border border-white/5 shadow-xl">
                            <SettingRow className="gap-4">
                                <div className="w-16 h-16 bg-[#0f172a] rounded-xl border border-dashed border-white/20 flex items-center justify-center relative overflow-hidden group">
                                    {profile.stampBase64 ? <img src={profile.stampBase64} className="w-full h-full object-contain" /> : <CheckCircle2 size={24} className="text-gray-600" />}
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'stampBase64')} />
                                </div>
                                <div>
                                    <div className="text-white font-bold">الختم الرقمي</div>
                                    <div className="text-gray-500 text-xs mt-1">يظهر أسفل الفواتير</div>
                                </div>
                            </SettingRow>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <SectionHeader title="طباعة باركود فارغ للمطبوعات" />
                        <div className="bg-[#1e293b] rounded-3xl overflow-hidden border border-white/5 p-6 shadow-xl space-y-4">
                            <p className="text-xs text-gray-400">
                                توليد تيكتات باركود فارغة للمطبوعات للفرع الحالي لمسحها لاحقاً بالهاتف وإضافتها كمنتج جديد.
                            </p>
                            <div className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-400 mb-1.5">عدد التيكتات المراد طباعتها</label>
                                    <input 
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={barcodePrintCount}
                                        onChange={e => setBarcodePrintCount(Number(e.target.value))}
                                        className="w-full bg-[#0f172a] border border-white/10 rounded-xl h-11 px-4 text-white focus:border-gold-500 outline-none font-mono"
                                    />
                                </div>
                                <button 
                                    type="button"
                                    onClick={handlePrintEmptyBarcodes}
                                    className="bg-gold-500 hover:bg-gold-600 text-black font-black h-11 px-6 rounded-xl flex items-center gap-2 active:scale-[0.98] transition-transform"
                                >
                                    <Printer size={18} /> طباعة الباركودات
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Invoice Color Customization */}
                    <div className="md:col-span-2">
                        <SectionHeader title="ألوان الفاتورة" />
                        <div className="bg-[#1e293b] rounded-3xl overflow-hidden border border-white/5 shadow-xl p-6">
                            <p className="text-xs text-gray-400 mb-4">
                                خصّص ألوان فواتير البيع والشراء لتعكس هوية متجرك. اللون الأساسي للرأس والجداول، واللون المميز للإجمالي.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-2">🎨 اللون الأساسي (رأس الفاتورة)</label>
                                    <div className="flex items-center gap-3 bg-[#0f172a] border border-white/10 rounded-xl px-4 py-3">
                                        <input
                                            type="color"
                                            value={profile.invoicePrimaryColor || '#0f4c75'}
                                            onChange={e => setProfile({...profile, invoicePrimaryColor: e.target.value})}
                                            className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                                        />
                                        <span className="text-white font-mono text-sm">{profile.invoicePrimaryColor || '#0f4c75'}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-2">✨ لون الإبراز / الذهبي</label>
                                    <div className="flex items-center gap-3 bg-[#0f172a] border border-white/10 rounded-xl px-4 py-3">
                                        <input
                                            type="color"
                                            value={profile.invoiceSecondaryColor || '#c9a84c'}
                                            onChange={e => setProfile({...profile, invoiceSecondaryColor: e.target.value})}
                                            className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                                        />
                                        <span className="text-white font-mono text-sm">{profile.invoiceSecondaryColor || '#c9a84c'}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-2">🔤 لون النص على الرأس</label>
                                    <div className="flex items-center gap-3 bg-[#0f172a] border border-white/10 rounded-xl px-4 py-3">
                                        <input
                                            type="color"
                                            value={profile.invoiceFontColor || '#ffffff'}
                                            onChange={e => setProfile({...profile, invoiceFontColor: e.target.value})}
                                            className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                                        />
                                        <span className="text-white font-mono text-sm">{profile.invoiceFontColor || '#ffffff'}</span>
                                    </div>
                                </div>
                            </div>
                            {/* Preview strip */}
                            <div className="mt-4 rounded-xl overflow-hidden border border-white/10">
                                <div 
                                    style={{background: `linear-gradient(135deg, ${profile.invoicePrimaryColor || '#0f4c75'}, #000)`, color: profile.invoiceFontColor || '#fff'}}
                                    className="px-4 py-3 flex items-center justify-between"
                                >
                                    <span className="font-bold text-sm">{profile.name || 'اسم المتجر'}</span>
                                    <span 
                                        style={{background: profile.invoiceSecondaryColor || '#c9a84c', color: '#1a1a1a'}}
                                        className="px-3 py-1 rounded-full text-xs font-black"
                                    >فاتورة بيع</span>
                                </div>
                                <div className="bg-white px-4 py-2 text-xs text-gray-600">معاينة مبسّطة لشكل رأس الفاتورة</div>
                            </div>
                        </div>
                    </div>

                    {/* Web App (PWA) Install Section */}
                    <div className="md:col-span-2">
                        <SectionHeader title="تثبيت التطبيق على الهاتف والكمبيوتر (Web App)" />
                        <div className="bg-[#1e293b] rounded-3xl overflow-hidden border border-white/5 shadow-xl p-6">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
                                    <Smartphone size={24} />
                                </div>
                                <div>
                                    <h4 className="text-white font-bold text-base">تنزيل التطبيق كأيقونة على الشاشة الرئيسية</h4>
                                    <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                                        يمكنك تثبيت تطبيق Gold Master وتنزيله كأيقونة على شاشة هاتفك أو جهاز الكمبيوتر للوصول السريع والعمل بكامل الشاشة وبأداء أسرع ومستقر.
                                    </p>
                                </div>
                            </div>

                            {isPWAInstalled ? (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl flex items-center gap-2.5 text-sm font-bold">
                                    <CheckCircle2 size={18} />
                                    <span>التطبيق مثبت بالفعل ويعمل حالياً كتطبيق مستقل (Web App) ✅</span>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {isIOS ? (
                                        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-xs text-gray-300 leading-relaxed space-y-2">
                                            <div className="font-bold text-amber-400 text-sm mb-1">تعليمات التثبيت لأجهزة الآيفون (iOS/Safari):</div>
                                            <div className="flex items-center gap-2">
                                                <span>1. اضغط على زر المشاركة </span>
                                                <span className="bg-white/10 px-2 py-0.5 rounded text-white font-bold inline-flex items-center gap-1">
                                                    مشاركة <Share className="inline text-blue-400" size={14} />
                                                </span>
                                                <span> في أسفل المتصفح.</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span>2. اختر </span>
                                                <span className="bg-white/10 px-2 py-0.5 rounded text-white font-bold inline-flex items-center gap-1">
                                                    إضافة إلى الشاشة الرئيسية <PlusSquare className="inline text-amber-400" size={14} />
                                                </span>
                                                <span> (Add to Home Screen).</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {canInstall ? (
                                                <button
                                                    type="button"
                                                    onClick={handleInstallPWA}
                                                    className="w-full bg-amber-500 hover:bg-amber-600 text-black font-black py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
                                                >
                                                    <Smartphone size={16} />
                                                    تثبيت التطبيق على الهاتف والكمبيوتر الآن
                                                </button>
                                            ) : (
                                                <div className="bg-[#0f172a] p-4 rounded-2xl border border-white/5 space-y-2 text-xs text-gray-400 leading-relaxed">
                                                    <div className="font-bold text-white text-sm mb-1">كيفية التثبيت اليدوي:</div>
                                                    <p>
                                                        إذا لم تظهر لك نافذة التثبيت التلقائية، يمكنك تثبيته بسهولة بالضغط على زر القائمة (ثلاث نقاط بالمتصفح) ثم اختيار 
                                                        <span className="text-white font-bold"> "تثبيت التطبيق" (Install App) </span> 
                                                        أو 
                                                        <span className="text-white font-bold"> "إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</span>.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>


                </div>{/* end grid */}

                <button type="submit" className="w-full mt-8 mb-24 bg-gradient-to-r from-gold-600 to-gold-500 text-black font-black py-4 rounded-2xl shadow-xl shadow-gold-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                    <Save size={20} /> حفظ إعدادات المتجر
                </button>
            </form>
        )}

        {/* --- USERS TAB --- */}
        {activeTab === 'USERS' && (
            <div className="animate-slide-up">
                 <SectionHeader title="صلاحيات الوصول" />
                 <div className="bg-[#1e293b] rounded-3xl overflow-hidden border border-white/5 shadow-xl mb-4">
                    {users.map(u => (
                        <div key={u.id} className="p-4 border-b border-white/5 last:border-0 flex items-center justify-between hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${u.role === UserRole.OWNER ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                    {u.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="text-white font-bold">{u.name}</div>
                                    <div className="text-gray-500 text-xs flex items-center gap-1">
                                        {u.role === UserRole.OWNER ? <Lock size={10} /> : <User size={10} />}
                                        {u.role}
                                    </div>
                                </div>
                            </div>
                            {u.role !== UserRole.OWNER && (
                                <button onClick={() => deleteUser(u.id, u.role)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                                    <Trash2 size={18}/>
                                </button>
                            )}
                        </div>
                    ))}
                 </div>
                 
                 <button onClick={() => setShowAddUser(true)} className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-700 text-gray-400 font-bold hover:border-gold-500 hover:text-gold-500 transition-all flex items-center justify-center gap-2">
                     <Plus size={20} /> إضافة مستخدم جديد
                 </button>

                 {/* Add User Modal Inline */}
                 {showAddUser && (
                     <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                         <div className="bg-[#1e293b] rounded-3xl p-6 w-full max-w-sm border border-white/10">
                             <h3 className="text-white font-bold text-lg mb-4 text-center">بيانات المستخدم</h3>
                             <form onSubmit={handleAddUser} className="space-y-3">
                                 <input className="w-full bg-[#0f172a] rounded-xl p-3 text-white outline-none border border-white/5" placeholder="الاسم" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
                                 <input className="w-full bg-[#0f172a] rounded-xl p-3 text-white outline-none border border-white/5" placeholder="البريد الإلكتروني" type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
                                 <input className="w-full bg-[#0f172a] rounded-xl p-3 text-white outline-none border border-white/5" placeholder="PIN Code" type="password" value={newUser.pin} onChange={e => setNewUser({...newUser, pin: e.target.value})} required maxLength={4} />
                                 <select className="w-full bg-[#0f172a] rounded-xl p-3 text-white outline-none border border-white/5" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                                     <option value="CASHIER">بائع</option>
                                     <option value="MANAGER">مدير</option>
                                 </select>
                                 <div className="flex gap-2 mt-4">
                                     <button type="button" onClick={() => setShowAddUser(false)} className="flex-1 py-3 rounded-xl bg-gray-700 text-white font-bold">إلغاء</button>
                                     <button type="submit" className="flex-1 py-3 rounded-xl bg-[#f4c025] text-black font-bold">حفظ</button>
                                 </div>
                             </form>
                         </div>
                     </div>
                )}
            </div>
        )}

        {/* --- INVOICES TAB (NEW REPLACEMENT) --- */}
        {activeTab === 'INVOICES' && (
            <div className="animate-slide-up space-y-4">
                
                {/* Search Bar */}
                <div className="relative group">
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                        <Search size={20} className="text-gray-500 group-focus-within:text-gold-500 transition-colors" />
                    </div>
                    <input 
                        className="w-full bg-[#1e293b] border border-white/10 rounded-2xl h-14 pr-12 pl-4 text-white font-bold outline-none focus:border-gold-500/50 transition-all shadow-lg"
                        placeholder="بحث برقم الفاتورة أو اسم العميل..."
                        value={invoiceSearch}
                        onChange={e => setInvoiceSearch(e.target.value)}
                    />
                </div>

                {/* Invoices List */}
                <div className="grid grid-cols-1 gap-4">
                    {invoices.map((inv) => (
                        <div 
                            key={inv.id} 
                            onClick={() => setSelectedInvoice(inv)}
                            className="bg-[#1e293b] rounded-[1.5rem] p-5 border border-white/5 shadow-md hover:border-white/10 transition-all group relative overflow-hidden cursor-pointer active:scale-[0.98]"
                        >
                            {/* Accent Line */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${inv.type === 'SALE' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>

                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pl-2">
                                {/* Left: Info */}
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${inv.type === 'SALE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                            {inv.type === 'SALE' ? 'بيع Sale' : 'شراء Buy'}
                                        </span>
                                        <span className="text-gray-500 text-xs font-mono">{new Date(inv.date).toLocaleDateString('ar-EG')}</span>
                                        <span className="text-gray-600 text-[10px]">•</span>
                                        <span className="text-gray-500 text-xs font-mono">#{inv.id}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white group-hover:text-gold-500 transition-colors">
                                        {inv.customerName}
                                    </h3>
                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                        <User size={10} /> بواسطة: {inv.createdBy}
                                    </p>
                                </div>

                                {/* Right: Totals & Actions */}
                                <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                                    <div className="text-right">
                                        <div className={`text-2xl font-black font-mono leading-none ${inv.type === 'SALE' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {Math.abs(inv.totalAmount).toLocaleString()} <span className="text-xs font-sans text-gray-500">ج.م</span>
                                        </div>
                                        {inv.items.length > 0 && (
                                            <div className="text-[10px] text-gray-500 mt-1">
                                                {inv.items.length} صنف ({inv.items[0].itemName}...)
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex gap-2 w-full md:w-auto">
                                        <button 
                                            onClick={(e) => handleWhatsAppInvoice(inv, e)}
                                            className="flex-1 md:flex-none py-2 px-4 rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-black font-bold text-xs flex items-center justify-center gap-2 transition-all"
                                        >
                                            <MessageCircle size={16} /> واتساب
                                        </button>
                                        <button 
                                            onClick={(e) => handlePrintInvoice(inv, e)}
                                            className="flex-1 md:flex-none py-2 px-4 rounded-xl bg-white/5 text-gray-300 hover:bg-white hover:text-black font-bold text-xs flex items-center justify-center gap-2 transition-all"
                                        >
                                            <Printer size={16} /> طباعة
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {invoices.length === 0 && (
                        <div className="text-center py-20 opacity-50">
                            <FileText size={48} className="mx-auto mb-4 text-gray-600" />
                            <p className="text-gray-400 font-bold">لا توجد فواتير مطابقة</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* --- INVOICE DETAIL MODAL --- */}
        {renderInvoiceDetails()}

    </div>
  );
};

export default Settings;
