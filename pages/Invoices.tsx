
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input } from '../components/UI';
import { TransactionService, PrintService, SettingsService, CustomerService } from '../services/storage';
import { Transaction, TransactionType } from '../types';
import { Search, Printer, FileText, ArrowUp, ArrowDown, MessageCircle, RefreshCw, Filter, ChevronDown, ChevronUp, Phone, User, Calendar, Hash, Package, DollarSign } from 'lucide-react';

interface InvoiceGroup {
    invoiceId: string;
    date: number;
    customerName: string;
    customerPhone?: string;
    items: Transaction[];
    totalAmount: number;
    totalWeight: number;
    paidAmount: number;
    paymentMethod: string;
    type: 'SALE' | 'PURCHASE' | 'MIXED';
    createdBy: string;
    shop?: string;
}

const typeLabel = (t: InvoiceGroup['type']) =>
    t === 'SALE' ? 'فاتورة بيع' : t === 'PURCHASE' ? 'فاتورة شراء' : 'عملية مختلطة';

const typeColor = (t: InvoiceGroup['type']) =>
    t === 'SALE' ? 'emerald' : t === 'PURCHASE' ? 'rose' : 'gold';

const groupTransactions = (txs: Transaction[]): InvoiceGroup[] => {
    const groups: Record<string, InvoiceGroup> = {};

    txs
        .filter(tx => tx.type === TransactionType.SALE || tx.type === TransactionType.PURCHASE)
        .forEach(tx => {
            const invId = tx.invoiceId || tx.id;
            if (!groups[invId]) {
                groups[invId] = {
                    invoiceId: invId,
                    date: tx.date,
                    customerName: tx.customerName || 'عميل نقدي',
                    customerPhone: tx.customerPhone,
                    items: [],
                    totalAmount: 0,
                    totalWeight: 0,
                    paidAmount: tx.paidAmount || 0,
                    paymentMethod: tx.paymentMethod || 'CASH',
                    type: 'SALE',
                    createdBy: tx.createdBy,
                    shop: tx.shop,
                };
            }
            groups[invId].items.push(tx);
            if (tx.type === TransactionType.SALE) {
                groups[invId].totalAmount += tx.totalPrice;
            } else {
                groups[invId].totalAmount -= tx.totalPrice;
            }
            groups[invId].totalWeight += Number(tx.weight || 0);
        });

    // Determine type for each group
    Object.values(groups).forEach(g => {
        const types = [...new Set(g.items.map(i => i.type))];
        if (types.includes(TransactionType.SALE) && types.includes(TransactionType.PURCHASE)) {
            g.type = 'MIXED';
        } else if (types.includes(TransactionType.PURCHASE)) {
            g.type = 'PURCHASE';
        } else {
            g.type = 'SALE';
        }
    });

    return Object.values(groups).sort((a, b) => b.date - a.date);
};

const InvoiceCard = ({ inv, onPrint, onWhatsApp }: { inv: InvoiceGroup; onPrint: () => void; onWhatsApp: () => void }) => {
    const [expanded, setExpanded] = useState(false);
    const color = typeColor(inv.type);
    const borderColor = color === 'emerald' ? '#10b981' : color === 'rose' ? '#f43f5e' : '#f59e0b';
    const badgeBg   = color === 'emerald' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : color === 'rose'    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    :                      'bg-gold-500/15 text-gold-400 border-gold-500/30';

    return (
        <div
            className="rounded-2xl border border-white/10 overflow-hidden animate-scale-in transition-all duration-300 shadow-lg"
            style={{ background: 'rgba(22, 33, 54, 0.95)', borderRight: `4px solid ${borderColor}` }}
        >
            {/* Header */}
            <button
                className="w-full text-right p-4 flex items-start justify-between gap-3 active:bg-white/3 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex-1 min-w-0">
                    {/* Invoice ID + type badge */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg border ${badgeBg}`}>
                            {typeLabel(inv.type)}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono bg-white/5 px-2 py-0.5 rounded-md">
                            #{inv.invoiceId}
                        </span>
                        {inv.shop && (
                            <span className="text-[10px] text-blue-400/70 font-bold">
                                {inv.shop}
                            </span>
                        )}
                    </div>

                    {/* Customer */}
                    <div className="flex items-center gap-2 mb-1">
                        <User size={13} className="text-gray-500 shrink-0" />
                        <span className="text-white font-bold text-sm truncate">{inv.customerName}</span>
                    </div>

                    {/* Date + cashier */}
                    <div className="flex items-center gap-3 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(inv.date).toLocaleDateString('ar-EG')}
                        </span>
                        <span>{new Date(inv.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>• {inv.createdBy}</span>
                    </div>
                </div>

                {/* Total amount */}
                <div className="text-right shrink-0">
                    <div className={`text-xl font-black ${inv.totalAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {Math.abs(inv.totalAmount).toLocaleString()}
                        <span className="text-xs font-bold text-gray-500 mr-1">ج.م</span>
                    </div>
                    <div className="text-[10px] text-gray-500">
                        {inv.items.length} صنف • {inv.totalWeight.toFixed(2)} جم
                    </div>
                    <div className="mt-1">
                        {expanded ? <ChevronUp size={16} className="text-gray-500 mr-auto" /> : <ChevronDown size={16} className="text-gray-500 mr-auto" />}
                    </div>
                </div>
            </button>

            {/* Expanded items */}
            {expanded && (
                <div className="border-t border-white/8">
                    {/* Items list */}
                    <div className="px-4 py-3 space-y-2">
                        {inv.items.map(item => (
                            <div key={item.id} className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${item.type === TransactionType.SALE ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                                        {item.type === TransactionType.SALE ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-white font-bold text-sm truncate">{item.itemName || 'صنف'}</p>
                                        <p className="text-[11px] text-gray-500">
                                            عيار {item.karat} • {Number(item.weight).toFixed(2)} جم
                                        </p>
                                    </div>
                                </div>
                                <span className={`font-black text-sm font-mono shrink-0 ${item.type === TransactionType.SALE ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {item.totalPrice.toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Summary row */}
                    <div className="px-4 py-3 bg-white/3 flex items-center justify-between">
                        <div className="text-xs text-gray-400 space-y-0.5">
                            <p>المدفوع: <span className="text-white font-bold">{(inv.paidAmount || Math.abs(inv.totalAmount)).toLocaleString()} ج.م</span></p>
                            <p>الدفع: <span className="text-white font-bold">{inv.paymentMethod === 'INSTAPAY' ? 'InstaPay' : 'كاش'}</span></p>
                        </div>
                        <div className="font-black text-lg text-white">
                            {Math.abs(inv.totalAmount).toLocaleString()}
                            <span className="text-xs text-gray-500 mr-1">ج.م</span>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="px-4 pb-4 pt-2 flex gap-2">
                        {/* WhatsApp */}
                        {(inv.customerPhone || inv.customerName !== 'عميل نقدي') && (
                            <button
                                onClick={onWhatsApp}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/30 text-sm font-bold active:scale-95 transition-all hover:bg-[#25D366]/25"
                            >
                                <MessageCircle size={16} /> واتساب
                            </button>
                        )}
                        {/* Print */}
                        <button
                            onClick={onPrint}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 text-sm font-bold active:scale-95 transition-all hover:bg-blue-500/25"
                        >
                            <Printer size={16} /> طباعة
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const Invoices = () => {
    const [searchTerm, setSearchTerm]   = useState('');
    const [filterType, setFilterType]   = useState<'ALL' | 'SALE' | 'PURCHASE'>('ALL');
    const [allInvoices, setAllInvoices] = useState<InvoiceGroup[]>([]);
    const [displayed, setDisplayed]     = useState<InvoiceGroup[]>([]);

    const loadInvoices = useCallback(() => {
        const txs    = TransactionService.getAll();
        const groups = groupTransactions(txs);
        setAllInvoices(groups);
        setDisplayed(groups);
    }, []);

    useEffect(() => { loadInvoices(); }, [loadInvoices]);

    // Filter & search
    useEffect(() => {
        let result = allInvoices;
        if (filterType !== 'ALL') {
            result = result.filter(inv => inv.type === filterType);
        }
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            result = result.filter(inv =>
                inv.invoiceId.toLowerCase().includes(q) ||
                inv.customerName.toLowerCase().includes(q) ||
                (inv.customerPhone || '').includes(q) ||
                inv.items.some(i => (i.itemName || '').toLowerCase().includes(q))
            );
        }
        setDisplayed(result);
    }, [searchTerm, filterType, allInvoices]);

    const handlePrint = (inv: InvoiceGroup) => {
        PrintService.printReceipt(
            inv.items,
            Math.abs(inv.totalAmount),
            inv.customerName,
            inv.createdBy,
            inv.invoiceId,
            typeLabel(inv.type)
        );
    };

    const handleWhatsApp = (inv: InvoiceGroup) => {
        let phone = inv.customerPhone;
        if (!phone && inv.customerName && inv.customerName !== 'عميل نقدي') {
            const c = CustomerService.getAll().find(c => c.name === inv.customerName);
            if (c) phone = c.phone;
        }
        if (!phone || phone.length < 5) {
            const manual = prompt('رقم الهاتف غير مسجل. أدخل الرقم:');
            if (!manual) return;
            phone = manual;
        }

        const store = SettingsService.getStoreProfile();
        let msg = `*مرحباً ${inv.customerName} 👋*\n`;
        msg += `نشكركم لزيارتكم *${store.name}* 💎\n\n`;
        msg += `🧾 *${typeLabel(inv.type)} رقم:* ${inv.invoiceId}\n`;
        msg += `📅 *التاريخ:* ${new Date(inv.date).toLocaleDateString('ar-EG')} ${new Date(inv.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}\n`;
        msg += `─────────────────\n`;

        inv.items.forEach(item => {
            const icon = item.type === TransactionType.SALE ? '💍' : '♻️';
            const label = item.type === TransactionType.SALE ? 'بيع' : 'شراء';
            msg += `${icon} *${item.itemName}* (${label})\n`;
            msg += `   ⚖️ ${Number(item.weight).toFixed(2)} جم • عيار ${item.karat}\n`;
            msg += `   💰 ${item.totalPrice.toLocaleString()} ج.م\n`;
        });

        msg += `─────────────────\n`;
        msg += `💰 *الإجمالي:* ${Math.abs(inv.totalAmount).toLocaleString()} ج.م\n`;
        msg += `✅ *المدفوع:* ${(inv.paidAmount || Math.abs(inv.totalAmount)).toLocaleString()} ج.م\n`;

        const debt = Math.abs(inv.totalAmount) - (inv.paidAmount || Math.abs(inv.totalAmount));
        if (debt > 0) {
            msg += `🔴 *المتبقي (آجل):* ${debt.toLocaleString()} ج.م\n`;
        }

        msg += `\nنسعد بخدمتكم دائماً! ✨\n_${store.name}_`;

        const cleanPhone = phone.startsWith('0') ? '20' + phone.substring(1) : phone.replace(/\s/g, '');
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const salesCount    = allInvoices.filter(i => i.type === 'SALE').length;
    const purchaseCount = allInvoices.filter(i => i.type === 'PURCHASE').length;
    const totalRevenue  = allInvoices.filter(i => i.type === 'SALE').reduce((s, i) => s + i.totalAmount, 0);

    return (
        <div className="space-y-4 p-4 animate-fade-in" dir="rtl">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gold-500/15 border border-gold-500/30 flex items-center justify-center">
                        <FileText size={20} className="text-gold-400" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-white">سجل الفواتير</h1>
                        <p className="text-[11px] text-gray-500">{allInvoices.length} فاتورة</p>
                    </div>
                </div>
                <button onClick={loadInvoices} className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 active:scale-90 transition-all hover:text-gold-400">
                    <RefreshCw size={18} />
                </button>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl p-3 text-center" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <p className="text-[10px] text-emerald-400/70 font-bold mb-1">مبيعات</p>
                    <p className="text-xl font-black text-emerald-400">{salesCount}</p>
                </div>
                <div className="rounded-2xl p-3 text-center" style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
                    <p className="text-[10px] text-rose-400/70 font-bold mb-1">مشتريات</p>
                    <p className="text-xl font-black text-rose-400">{purchaseCount}</p>
                </div>
                <div className="rounded-2xl p-3 text-center" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                    <p className="text-[10px] text-gold-400/70 font-bold mb-1">إجمالي البيع</p>
                    <p className="text-sm font-black text-gold-400">{(totalRevenue/1000).toFixed(0)}K</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input
                    placeholder="بحث برقم الفاتورة أو العميل أو اسم الصنف..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{
                        background: 'rgba(30,41,59,0.9)', border: '1.5px solid rgba(255,255,255,0.1)',
                        borderRadius: '16px', color: '#fff', padding: '13px 48px 13px 16px',
                        width: '100%', fontSize: '14px', fontWeight: '600', outline: 'none'
                    }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(251,191,36,0.45)'; }}
                    onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                />
                {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                        <span className="text-lg">×</span>
                    </button>
                )}
            </div>

            {/* Type filter */}
            <div className="flex gap-2">
                {(['ALL', 'SALE', 'PURCHASE'] as const).map(f => (
                    <button key={f}
                        onClick={() => setFilterType(f)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                            filterType === f
                                ? f === 'SALE'     ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : f === 'PURCHASE' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                :                    'bg-gold-500/20 text-gold-300 border-gold-500/40'
                                : 'bg-white/5 text-gray-500 border-white/10'
                        }`}
                    >
                        {f === 'ALL' ? 'الكل' : f === 'SALE' ? '↑ مبيعات' : '↓ مشتريات'}
                    </button>
                ))}
            </div>

            {/* Results count */}
            {(searchTerm || filterType !== 'ALL') && (
                <p className="text-xs text-gray-500 font-bold pr-1">
                    {displayed.length} نتيجة
                </p>
            )}

            {/* Invoice list */}
            <div className="space-y-3 pb-4">
                {displayed.map(inv => (
                    <InvoiceCard
                        key={inv.invoiceId}
                        inv={inv}
                        onPrint={() => handlePrint(inv)}
                        onWhatsApp={() => handleWhatsApp(inv)}
                    />
                ))}

                {displayed.length === 0 && (
                    <div className="text-center py-16 opacity-30 flex flex-col items-center gap-3">
                        <FileText size={52} />
                        <p className="font-bold text-sm">
                            {searchTerm || filterType !== 'ALL' ? 'لا توجد فواتير مطابقة' : 'لا توجد فواتير حتى الآن'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Invoices;
