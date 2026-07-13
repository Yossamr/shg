

import { Item, Transaction, Rep, RepLog, ItemStatus, Karat, TransactionType, GoldMarketPrice, StoreProfile, AppUser, UserRole, ThemeMode, Customer, Safe, SafeTransaction, PaymentMethod, GhawayeshEntry, Expense, TIMESTAMP, GENERATE_ID, ScrapGoldLog } from '../types';
import { DbService } from './db';

const CURRENT_SOURCE: 'DESKTOP' | 'MOBILE' = 'MOBILE';

const KEYS = {
  ITEMS: 'gold_items',
  TRANSACTIONS: 'gold_transactions',
  REPS: 'gold_reps',
  REP_LOGS: 'gold_rep_logs',
  GOLD_PRICE: 'gold_market_price',
  GOLD_PRICE_HISTORY: 'gold_price_history',
  STORE_PROFILE: 'gold_store_profile',
  USERS: 'gold_users',
  THEME: 'gold_theme',
  CUSTOMERS: 'gold_customers',
  SAFES: 'gold_safes',
  SAFE_TXS: 'gold_safe_txs',
  GHAWAYESH: 'gold_ghawayesh_ledger',
  EXPENSES: 'gold_expenses',
  IS_SETUP: 'gold_app_is_setup',
  SYNC_TIMESTAMPS: 'gold_sync_meta', // Stores local timestamps of last sync
  PENDING_CHANGES: 'gold_pending_changes', // Stores keys that need to be pushed to DB
  SCRAP_LOGS: 'gold_scrap_logs'
};

// Helpers
const get = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

// Queue Helpers for Offline Support
const addToPending = (key: string) => {
    const pending = JSON.parse(localStorage.getItem(KEYS.PENDING_CHANGES) || '[]');
    if (!pending.includes(key)) {
        pending.push(key);
        localStorage.setItem(KEYS.PENDING_CHANGES, JSON.stringify(pending));
    }
};

const removeFromPending = (key: string) => {
    const pending = JSON.parse(localStorage.getItem(KEYS.PENDING_CHANGES) || '[]');
    const newPending = pending.filter((k: string) => k !== key);
    localStorage.setItem(KEYS.PENDING_CHANGES, JSON.stringify(newPending));
};

const set = (key: string, data: any, pushToDb = true) => {
  // 1. Save Locally (Always works)
  localStorage.setItem(key, JSON.stringify(data));
  
  if (pushToDb) {
      // 2. Mark as Pending initially (Optimistic UI)
      addToPending(key);

      // 3. Try to Push to DB
      DbService.pushData(key, data).then((success) => {
          if (success) {
              // 4. If success, remove from pending
              removeFromPending(key);
              
              // Update local sync timestamp to match
              const meta = JSON.parse(localStorage.getItem(KEYS.SYNC_TIMESTAMPS) || '{}');
              meta[key] = Date.now();
              localStorage.setItem(KEYS.SYNC_TIMESTAMPS, JSON.stringify(meta));
          }
          // If fails (offline), it stays in PENDING_CHANGES and will be synced later
      });
  }
};

const convertTo21 = (weight: number, karat: number) => {
    return weight * (karat / 21);
};

// ── Shop Isolation Helpers ──────────────────────────────────
const getCurrentShop = (): string =>
    localStorage.getItem('selected_shop') || 'المحل الأساسي';

const shopFilter = <T extends { shop?: string }>(arr: T[]): T[] =>
    arr.filter(i => (i.shop || 'المحل الأساسي') === getCurrentShop());
// ────────────────────────────────────────────────────────────

// --- SYNC SERVICE (Revised for Offline/Online) ---
export const SyncService = {
  // Optimized Sync: Push Pending -> Check Updates -> Pull Newer
  sync: async () => {
    if (!navigator.onLine) {
        console.log("Offline: Skipping Sync");
        return;
    }

    try {
        console.log("Starting Sync...");

        // 1. Push Pending Changes (Client -> DB)
        const pendingKeys = JSON.parse(localStorage.getItem(KEYS.PENDING_CHANGES) || '[]');
        if (pendingKeys.length > 0) {
            console.log(`Pushing ${pendingKeys.length} pending changes...`);
            for (const key of pendingKeys) {
                const localData = JSON.parse(localStorage.getItem(key) || '[]');
                const success = await DbService.pushData(key, localData);
                if (success) {
                    removeFromPending(key);
                }
            }
        }

        // 2. Get DB Timestamps (Lightweight call)
        const dbUpdates = await DbService.checkUpdates();
        const localMeta = JSON.parse(localStorage.getItem(KEYS.SYNC_TIMESTAMPS) || '{}');
        let hasChanges = false;

        // 3. Compare and Fetch (DB -> Client)
        const keysToSync = [
            KEYS.ITEMS, KEYS.TRANSACTIONS, KEYS.REPS, KEYS.REP_LOGS, 
            KEYS.CUSTOMERS, KEYS.SAFES, KEYS.SAFE_TXS, KEYS.GHAWAYESH, KEYS.EXPENSES, KEYS.STORE_PROFILE
        ];

        for (const key of keysToSync) {
            const dbTime = dbUpdates[key] || 0;
            const localTime = localMeta[key] || 0;

            // If DB is newer AND we don't have pending local changes for this key
            // (If we have pending local changes, we prioritize local to avoid overwriting work done offline)
            const isPending = JSON.parse(localStorage.getItem(KEYS.PENDING_CHANGES) || '[]').includes(key);
            
            if (dbTime > localTime && !isPending) {
                // DB is newer, fetch data
                const remoteData = await DbService.fetchData(key);
                if (remoteData) {
                    localStorage.setItem(key, JSON.stringify(remoteData));
                    localMeta[key] = dbTime;
                    hasChanges = true;
                }
            }
        }

        // 4. Sync Users specifically (Separate Table)
        try {
            const users = await DbService.getUsers();
            if (users && users.length > 0) {
                const currentLocalUsers = localStorage.getItem(KEYS.USERS);
                const newUsersJson = JSON.stringify(users);
                if (currentLocalUsers !== newUsersJson) {
                    localStorage.setItem(KEYS.USERS, newUsersJson);
                    hasChanges = true;
                }
            }
        } catch (uError) {
            console.error('User sync failed', uError);
        }

        // 5. Save updated timestamps & Notify
        if (hasChanges) {
            localStorage.setItem(KEYS.SYNC_TIMESTAMPS, JSON.stringify(localMeta));
            window.dispatchEvent(new Event('data-synced'));
            console.log("Sync Completed: Data Updated");
        } else {
            console.log("Sync Completed: No Incoming Changes");
        }

    } catch (error) {
        console.error('Sync failed:', error);
    }
  }
};

// Expense Service
export const ExpenseService = {
    getAll: (): Expense[] =>
        shopFilter(get<Expense>(KEYS.EXPENSES)).sort((a, b) => b.date - a.date),
    
    add: (expense: Expense) => {
        const expenses = get<Expense>(KEYS.EXPENSES);
        // Inject CURRENT_SOURCE + shop
        expenses.push({ ...expense, shop: expense.shop || getCurrentShop(), source: CURRENT_SOURCE, updatedAt: TIMESTAMP() });
        set(KEYS.EXPENSES, expenses);

        // Deduct from Safe
        if (expense.safeId) {
            SafeService.updateBalance(expense.safeId, -expense.amount);
            
            // Log Safe Transaction
            const tx: SafeTransaction = {
                id: Date.now().toString(),
                fromSafeId: expense.safeId,
                amount: expense.amount,
                type: 'EXPENSE',
                description: `مصروفات: ${expense.category} - ${expense.description}`,
                date: Date.now(),
                byUser: expense.byUser,
                source: CURRENT_SOURCE, // Inject Source
                updatedAt: TIMESTAMP()
            };
            const txs = get<SafeTransaction>(KEYS.SAFE_TXS);
            txs.push(tx);
            set(KEYS.SAFE_TXS, txs);
        }
    },

    delete: (id: string, user: string) => {
        const expenses = get<Expense>(KEYS.EXPENSES);
        const index = expenses.findIndex(e => e.id === id);
        if (index !== -1) {
            const expense = expenses[index];
            // Refund the safe
            SafeService.updateBalance(expense.safeId, expense.amount);
            
            // Log Refund
            const tx: SafeTransaction = {
                id: Date.now().toString(),
                toSafeId: expense.safeId,
                amount: expense.amount,
                type: 'DEPOSIT',
                description: `استرداد مصروف محذوف: ${expense.description}`,
                date: Date.now(),
                byUser: user,
                source: CURRENT_SOURCE,
                updatedAt: TIMESTAMP()
            };
            const txs = get<SafeTransaction>(KEYS.SAFE_TXS);
            txs.push(tx);
            set(KEYS.SAFE_TXS, txs);

            expenses.splice(index, 1);
            set(KEYS.EXPENSES, expenses);
        }
    }
};

// Ghawayesh Service
export const GhawayeshService = {
  getAll: (): GhawayeshEntry[] => {
    return get<GhawayeshEntry>(KEYS.GHAWAYESH).sort((a, b) => a.timestamp - b.timestamp);
  },
  
  recalculateTotals: (entries: GhawayeshEntry[]): GhawayeshEntry[] => {
    const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
    const shopCounts: Record<string, number> = {};
    const shopWeights: Record<string, number> = {};
    
    const recalculated = sorted.map(e => {
        const shop = e.shop || 'المحل الأساسي';
        if (shopCounts[shop] === undefined) {
            shopCounts[shop] = 0;
            shopWeights[shop] = 0;
        }
        shopCounts[shop] += Number(e.countChange);
        shopWeights[shop] += Number(e.weightChange);
        return {
            ...e,
            currentCount: shopCounts[shop],
            currentWeight: shopWeights[shop]
        };
    });
    return recalculated;
  },

  // NEW: Force recalculation and save to fix any data corruption
  refreshLedger: () => {
    const entries = get<GhawayeshEntry>(KEYS.GHAWAYESH);
    const finalEntries = GhawayeshService.recalculateTotals(entries);
    set(KEYS.GHAWAYESH, finalEntries);
    return finalEntries;
  },

  addEntry: (entry: GhawayeshEntry) => {
    const entries = get<GhawayeshEntry>(KEYS.GHAWAYESH);
    const currentShop = localStorage.getItem('selected_shop') || 'المحل الأساسي';
    entries.push({ ...entry, shop: entry.shop || currentShop, updatedAt: TIMESTAMP() });
    const finalEntries = GhawayeshService.recalculateTotals(entries);
    set(KEYS.GHAWAYESH, finalEntries);
  },

  deleteEntry: (id: string) => {
    const entries = get<GhawayeshEntry>(KEYS.GHAWAYESH);
    const filtered = entries.filter(e => e.id !== id);
    const finalEntries = GhawayeshService.recalculateTotals(filtered);
    set(KEYS.GHAWAYESH, finalEntries);
  },

  importData: (newEntries: GhawayeshEntry[]) => {
    const entries = get<GhawayeshEntry>(KEYS.GHAWAYESH);
    const currentShop = localStorage.getItem('selected_shop') || 'المحل الأساسي';
    const combined = [...entries, ...newEntries.map(e => ({...e, shop: e.shop || currentShop, updatedAt: TIMESTAMP()}))];
    const unique = combined.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
    const finalEntries = GhawayeshService.recalculateTotals(unique);
    set(KEYS.GHAWAYESH, finalEntries);
  },

  clearAll: () => {
    set(KEYS.GHAWAYESH, []);
  },

  getLastTotals: (): { count: number, weight: number } => {
    const entries = get<GhawayeshEntry>(KEYS.GHAWAYESH);
    const currentShop = localStorage.getItem('selected_shop') || 'المحل الأساسي';
    const filtered = entries.filter(e => (e.shop || 'المحل الأساسي') === currentShop);
    if (filtered.length === 0) return { count: 0, weight: 0 };
    const sorted = filtered.sort((a, b) => a.timestamp - b.timestamp);
    const last = sorted[sorted.length - 1];
    return { count: last.currentCount, weight: last.currentWeight };
  },

  transferBetweenShops: (count: number, weight: number, fromShop: string, toShop: string) => {
    const entries = get<GhawayeshEntry>(KEYS.GHAWAYESH);
    const timestamp = TIMESTAMP();
    
    // 1. OUT Entry for source shop
    const outEntry: GhawayeshEntry = {
        id: GENERATE_ID(),
        day: new Date().toLocaleDateString('ar-EG', {weekday: 'long'}),
        dateStr: new Date().toLocaleDateString('en-US', {month:'numeric', day:'numeric'}),
        operation: `تحويل غوايش صادر إلى: ${toShop}`,
        countChange: -count,
        currentCount: 0,
        weightChange: -weight,
        currentWeight: 0,
        type: 'OUT',
        timestamp,
        shop: fromShop
    };
    
    // 2. IN Entry for destination shop
    const inEntry: GhawayeshEntry = {
        id: GENERATE_ID(),
        day: new Date().toLocaleDateString('ar-EG', {weekday: 'long'}),
        dateStr: new Date().toLocaleDateString('en-US', {month:'numeric', day:'numeric'}),
        operation: `تحويل غوايش وارد من: ${fromShop}`,
        countChange: count,
        currentCount: 0,
        weightChange: weight,
        currentWeight: 0,
        type: 'IN',
        timestamp: timestamp + 1,
        shop: toShop
    };
    
    entries.push(outEntry, inEntry);
    const finalEntries = GhawayeshService.recalculateTotals(entries);
    set(KEYS.GHAWAYESH, finalEntries);
    return true;
  }
};

// Safe Services
export const SafeService = {
  // Return only the safes belonging to the active shop
  getAll: (): Safe[] => {
    let safes = get<Safe>(KEYS.SAFES);
    if (safes.length === 0) return [];
    const activeShop = getCurrentShop();

    // Legacy migration: assign shop to old safes if missing
    let migrated = false;
    safes = safes.map(s => {
      if (!s.shop) {
        // SAFE_1 → main shop, SAFE_2 → second shop, InstaPay per shop
        if (s.id === 'SAFE_1' || s.id === 'SAFE_INSTAPAY') {
          s.shop = 'المحل الأساسي'; migrated = true;
        } else if (s.id === 'SAFE_2') {
          s.shop = 'المحل الثاني'; migrated = true;
        }
      }
      if (s.id === 'SAFE_1' && s.name === 'الخزنة الرئيسية (Cash)') {
        s.name = 'خزنة المحل الأساسي (Cash)'; migrated = true;
      }
      if (s.id === 'SAFE_2' && s.name === 'الخزنة الفرعية (Cash)') {
        s.name = 'خزنة المحل الثاني (Cash)'; migrated = true;
      }
      return s;
    });
    if (migrated) set(KEYS.SAFES, safes, false);

    return safes.filter(s => (s.shop || 'المحل الأساسي') === activeShop);
  },

  // Return ALL safes (for internal operations like updateBalance)
  _getAllRaw: (): Safe[] => get<Safe>(KEYS.SAFES),

  initDefaults: () => {
      // Create separate safes for each shop + shared InstaPay per shop
      const existing = get<Safe>(KEYS.SAFES);
      if (existing.length > 0) return; // Already initialized
      const safes = [
        { id: 'SAFE_1',           name: 'خزنة المحل الأساسي (Cash)',       shop: 'المحل الأساسي', balance: 0, updatedAt: TIMESTAMP() },
        { id: 'SAFE_INSTAPAY_1',  name: 'انستا باي (المحل الأساسي)',        shop: 'المحل الأساسي', balance: 0, updatedAt: TIMESTAMP() },
        { id: 'SAFE_2',           name: 'خزنة المحل الثاني (Cash)',         shop: 'المحل الثاني',  balance: 0, updatedAt: TIMESTAMP() },
        { id: 'SAFE_INSTAPAY_2',  name: 'انستا باي (المحل الثاني)',         shop: 'المحل الثاني',  balance: 0, updatedAt: TIMESTAMP() },
      ];
      set(KEYS.SAFES, safes);
  },

  updateBalance: (safeId: string, amount: number) => {
    // Use _getAllRaw so cross-shop safe updates (InstaPay) work correctly
    const safes = SafeService._getAllRaw();
    const index = safes.findIndex(s => s.id === safeId);
    if (index !== -1) {
      safes[index].balance += amount;
      safes[index].updatedAt = TIMESTAMP();
      set(KEYS.SAFES, safes);
    }
  },

  transfer: (fromId: string, toId: string, amount: number, user: string) => {
    if (amount <= 0) return;
    SafeService.updateBalance(fromId, -amount);
    SafeService.updateBalance(toId, amount);

    const tx: SafeTransaction = {
      id: Date.now().toString(),
      fromSafeId: fromId,
      toSafeId: toId,
      amount,
      type: 'TRANSFER',
      description: 'تحويل بين الخزائن',
      date: Date.now(),
      byUser: user,
      source: CURRENT_SOURCE, // Inject Source
      updatedAt: TIMESTAMP()
    };
    const txs = get<SafeTransaction>(KEYS.SAFE_TXS);
    txs.push(tx);
    set(KEYS.SAFE_TXS, txs);
  },

  getTransactions: (): SafeTransaction[] => {
    return get<SafeTransaction>(KEYS.SAFE_TXS).sort((a, b) => b.date - a.date);
  }
};

// Customer Services
export const CustomerService = {
  getAll: (): Customer[] => get<Customer>(KEYS.CUSTOMERS),
  
  addOrUpdate: (customer: Customer) => {
    const customers = get<Customer>(KEYS.CUSTOMERS);
    const index = customers.findIndex(c => c.id === customer.id);
    const updatedCustomer = { ...customer, updatedAt: TIMESTAMP() };
    if (index !== -1) {
      customers[index] = updatedCustomer;
    } else {
      customers.push(updatedCustomer);
    }
    set(KEYS.CUSTOMERS, customers);
  },

  findByPhone: (phone: string): Customer | undefined => {
    const customers = get<Customer>(KEYS.CUSTOMERS);
    return customers.find(c => c.phone.trim() === phone.trim());
  },
  
  search: (query: string): Customer[] => {
    if (!query) return [];
    const q = query.toLowerCase();
    const customers = get<Customer>(KEYS.CUSTOMERS);
    return customers.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.phone.includes(q)
    ).slice(0, 10); // Limit to top 10 results
  },

  updateStats: (customerId: string, amountSpent: number) => {
    const customers = get<Customer>(KEYS.CUSTOMERS);
    const index = customers.findIndex(c => c.id === customerId);
    if (index !== -1) {
      customers[index].totalPurchases += amountSpent;
      customers[index].lastVisit = Date.now();
      customers[index].updatedAt = TIMESTAMP();
      set(KEYS.CUSTOMERS, customers);
    }
  }
};

// Item Services
export const InventoryService = {
  getAll: (): Item[] => shopFilter(get<Item>(KEYS.ITEMS)),
  
  add: (item: Item) => {
    const items = get<Item>(KEYS.ITEMS);
    if (!item.quantity) item.quantity = 1;
    const currentShop = localStorage.getItem('selected_shop') || 'المحل الأساسي';
    items.push({ ...item, shop: item.shop || currentShop, updatedAt: TIMESTAMP() });
    set(KEYS.ITEMS, items);
  },

  updateStatus: (id: string, status: ItemStatus, repId?: string) => {
    const items = get<Item>(KEYS.ITEMS);
    const index = items.findIndex(i => i.id === id);
    if (index !== -1) {
      items[index].status = status;
      items[index].repId = repId;
      items[index].updatedAt = TIMESTAMP();
      set(KEYS.ITEMS, items);
    }
  },

  deductQuantity: (id: string, qtySold: number, weightSold: number) => {
    const items = get<Item>(KEYS.ITEMS);
    const index = items.findIndex(i => i.id === id);
    if (index !== -1) {
      const item = items[index];
      if (qtySold >= item.quantity) {
          item.status = ItemStatus.SOLD;
          item.quantity = 0; 
      } else {
          item.quantity -= qtySold;
          item.weight -= weightSold;
          if (item.weight < 0) item.weight = 0;
      }
      item.updatedAt = TIMESTAMP();
      set(KEYS.ITEMS, items);
    }
  },

  getByBarcode: (barcode: string): Item | undefined => {
    const items = get<Item>(KEYS.ITEMS);
    const currentShop = localStorage.getItem('selected_shop') || 'المحل الأساسي';
    return items.find(i => i.barcode === barcode && (i.shop || 'المحل الأساسي') === currentShop);
  },

  updateShop: (id: string, shop: string) => {
    const items = get<Item>(KEYS.ITEMS);
    const index = items.findIndex(i => i.id === id);
    if (index !== -1) {
      items[index].shop = shop;
      items[index].updatedAt = TIMESTAMP();
      set(KEYS.ITEMS, items);
      return true;
    }
    return false;
  }
};

// Rep Services
export const RepService = {
  getAll: (): Rep[] => shopFilter(get<Rep>(KEYS.REPS)),
  
  getLogs: (repId: string): RepLog[] => {
    const allLogs = get<RepLog>(KEYS.REP_LOGS);
    // Filter logs by repId — shop isolation handled via rep list
    return allLogs.filter(l => l.repId === repId).sort((a, b) => b.date - a.date);
  },

  add: (rep: Rep) => {
    const reps = get<Rep>(KEYS.REPS);
    reps.push({ ...rep, shop: rep.shop || getCurrentShop(), updatedAt: TIMESTAMP() });
    set(KEYS.REPS, reps);
  },

  receiveWork: (repId: string, items: Item[], totalWages: number, description: string, user: string, receiptImage?: string) => {
    const reps = get<Rep>(KEYS.REPS);
    const repIndex = reps.findIndex(r => r.id === repId);
    if (repIndex === -1) return;

    let totalWeight21 = 0;
    let totalRawWeight = 0;
    const currentShop = reps[repIndex].shop || getCurrentShop();

    const storeItems = get<Item>(KEYS.ITEMS);
    items.forEach(item => {
        if(!item.quantity) item.quantity = 1;
        storeItems.push({ ...item, shop: currentShop, updatedAt: TIMESTAMP() });
        totalRawWeight += item.weight;
        totalWeight21 += convertTo21(item.weight, item.karat);
    });
    set(KEYS.ITEMS, storeItems);

    reps[repIndex].balanceGold -= totalWeight21; 
    reps[repIndex].balanceMoney += totalWages; 
    reps[repIndex].updatedAt = TIMESTAMP();

    set(KEYS.REPS, reps);

    const log: RepLog = {
        id: Date.now().toString(),
        repId,
        type: 'WORK_IN',
        details: description || `استلام شغل (${items.length} قطع) - وزن ${totalRawWeight.toFixed(2)}جم`,
        weight: totalWeight21, 
        money: totalWages,
        date: Date.now(),
        receiptImage: receiptImage,
        updatedAt: TIMESTAMP(),
        byUser: user,
        shop: currentShop
    };
    const logs = get<RepLog>(KEYS.REP_LOGS);
    logs.push(log);
    set(KEYS.REP_LOGS, logs);
  },

  payMixed: (repId: string, weight: number, karat: Karat, cashAmount: number, description: string, user: string, receiptImage?: string, fromScrap?: boolean) => {
    const reps = get<Rep>(KEYS.REPS);
    const repIndex = reps.findIndex(r => r.id === repId);
    if (repIndex === -1) return;
    const weight21 = weight > 0 ? convertTo21(weight, karat) : 0;
    const currentShop = reps[repIndex].shop || getCurrentShop();

    if (weight21 > 0) {
      reps[repIndex].balanceGold += weight21; 
      if (fromScrap) {
        const activeShop = localStorage.getItem('selected_shop') || 'المحل الأساسي';
        const balances = ScrapGoldService.getBalances();
        balances[activeShop] = (balances[activeShop] || 0) - weight21;
        localStorage.setItem('scrap_gold_balances', JSON.stringify(balances));
        DbService.pushData('scrap_gold_balances', balances);

        ScrapGoldService.addLog({
          type: 'DEDUCT',
          shop: activeShop,
          weight: weight21,
          details: `تسديد مندوب من الذهب الكسر (${reps[repIndex].name}) - عيار ${karat}`,
          byUser: user
        });
      }
    }
    if (cashAmount > 0) reps[repIndex].balanceMoney -= cashAmount;
    reps[repIndex].updatedAt = TIMESTAMP();
    set(KEYS.REPS, reps);
    const log: RepLog = {
        id: Date.now().toString(),
        repId,
        type: 'PAYMENT',
        details: description || 'دفعة مجمعة (ذهب + نقدية)',
        weight: weight21,
        money: cashAmount,
        date: Date.now(),
        receiptImage: receiptImage,
        updatedAt: TIMESTAMP(),
        byUser: user,
        shop: currentShop
    };
    const logs = get<RepLog>(KEYS.REP_LOGS);
    logs.push(log);
    set(KEYS.REP_LOGS, logs);
    if (cashAmount > 0) {
        const tx: Transaction = {
            id: Date.now().toString(),
            type: TransactionType.PAYMENT_OUT,
            weight: 0,
            karat: 21,
            goldPricePerGram: 0,
            workmanship: 0,
            totalPrice: cashAmount,
            paidAmount: cashAmount,
            paymentMethod: PaymentMethod.CASH,
            repId: repId,
            customerName: reps[repIndex].name,
            date: Date.now(),
            createdBy: user,
            itemName: 'دفعة حساب (جزء من عملية مجمعة)',
            source: CURRENT_SOURCE, // Inject Source
            updatedAt: TIMESTAMP()
        };
        TransactionService.add(tx);
    }
  }
};

// Scrap Gold Service (21k normalized weight)
export const ScrapGoldService = {
  getBalances: (): Record<string, number> => {
    const data = localStorage.getItem('scrap_gold_balances');
    return data ? JSON.parse(data) : { 'المحل الأساسي': 0, 'المحل الثاني': 0 };
  },
  getLogs: (): ScrapGoldLog[] => {
    return get<ScrapGoldLog>(KEYS.SCRAP_LOGS);
  },
  addLog: (log: Omit<ScrapGoldLog, 'id' | 'date'>) => {
    const logs = get<ScrapGoldLog>(KEYS.SCRAP_LOGS);
    const newLog: ScrapGoldLog = {
      ...log,
      id: Date.now().toString() + Math.random().toString().slice(-4),
      date: Date.now()
    };
    logs.push(newLog);
    set(KEYS.SCRAP_LOGS, logs);
  },
  addWeight: (shop: string, weight: number, karat: Karat, details?: string, byUser?: string) => {
    const balances = ScrapGoldService.getBalances();
    // Convert to 21k equivalent
    const weight21 = weight * (karat / 21);
    balances[shop] = (balances[shop] || 0) + weight21;
    localStorage.setItem('scrap_gold_balances', JSON.stringify(balances));
    DbService.pushData('scrap_gold_balances', balances);

    ScrapGoldService.addLog({
      type: 'ADD',
      shop,
      weight: weight21,
      karat,
      details: details || `شراء ذهب كسر عيار ${karat}`,
      byUser
    });
  },
  transferAllToMain: () => {
    const balances = ScrapGoldService.getBalances();
    const secondWeight = balances['المحل الثاني'] || 0;
    if (secondWeight <= 0) return false;
    balances['المحل الأساسي'] = (balances['المحل الأساسي'] || 0) + secondWeight;
    balances['المحل الثاني'] = 0;
    localStorage.setItem('scrap_gold_balances', JSON.stringify(balances));
    DbService.pushData('scrap_gold_balances', balances);

    ScrapGoldService.addLog({
      type: 'TRANSFER',
      fromShop: 'المحل الثاني',
      toShop: 'المحل الأساسي',
      weight: secondWeight,
      details: 'تصفية وتحويل كامل الرصيد للمحل الأساسي'
    });
    return true;
  },
  transfer: (fromShop: string, toShop: string, weight21: number, byUser?: string): boolean => {
    const balances = ScrapGoldService.getBalances();
    const currentBalance = balances[fromShop] || 0;
    if (weight21 <= 0 || currentBalance < weight21) return false;
    balances[fromShop] = currentBalance - weight21;
    balances[toShop] = (balances[toShop] || 0) + weight21;
    localStorage.setItem('scrap_gold_balances', JSON.stringify(balances));
    DbService.pushData('scrap_gold_balances', balances);

    ScrapGoldService.addLog({
      type: 'TRANSFER',
      fromShop,
      toShop,
      weight: weight21,
      details: `تحويل كسر من ${fromShop} إلى ${toShop}`,
      byUser
    });
    return true;
  }
};

// Transaction Services
export const TransactionService = {
  getAll: (): Transaction[] => shopFilter(get<Transaction>(KEYS.TRANSACTIONS)),

  add: (tx: Transaction) => {
    const txs = get<Transaction>(KEYS.TRANSACTIONS);
    const activeShop = localStorage.getItem('selected_shop') || 'المحل الأساسي';
    // Inject CURRENT_SOURCE and shop if not passed explicitly
    txs.push({ 
      ...tx, 
      shop: tx.shop || activeShop,
      source: tx.source || CURRENT_SOURCE, 
      updatedAt: TIMESTAMP() 
    });
    set(KEYS.TRANSACTIONS, txs);
    let safeId = tx.safeId;
    if (!safeId) {
      safeId = activeShop === 'المحل الثاني' ? 'SAFE_2' : 'SAFE_1';
    }
    if (tx.paymentMethod === PaymentMethod.INSTAPAY) {
      safeId = activeShop === 'المحل الثاني' ? 'SAFE_INSTAPAY_2' : 'SAFE_INSTAPAY_1';
    }

    const amount = tx.paidAmount || 0;
    if (amount > 0) {
      if (tx.type === TransactionType.SALE || tx.type === TransactionType.DEBT_PAYMENT) {
        SafeService.updateBalance(safeId, amount);
      } else {
        SafeService.updateBalance(safeId, -amount);
      }
    }

    // Auto-track scrap gold when purchase occurs (excluding bullions)
    if (tx.type === TransactionType.PURCHASE) {
      const isBullion = tx.itemName?.includes('سبيكة') || tx.itemName?.includes('سبيكه') || tx.itemName?.includes('سبائك');
      if (!isBullion) {
        ScrapGoldService.addWeight(
          activeShop, 
          tx.weight, 
          tx.karat, 
          `شراء ${tx.itemName || 'ذهب'} - فاتورة #${tx.id.slice(-6)}`,
          tx.createdBy
        );
      }
    }
  },
  
  getToday: (): Transaction[] => {
    const txs = shopFilter(get<Transaction>(KEYS.TRANSACTIONS));
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    return txs.filter(t => t.date >= startOfDay.getTime()).reverse();
  }
};

// Market Coverage Service
export interface DailyCoverage {
  dateStr: string;
  timestamp: number;
  totalSold21: number;
  totalBought21: number;
  net21: number;
  color: 'red' | 'green' | 'slate';
}

export const MarketCoverageService = {
  getCoverageForDate: (date: Date = new Date(), shopName?: string): { sold21: number, bought21: number, net21: number } => {
    const txs = TransactionService.getAll();
    const activeShop = shopName || localStorage.getItem('selected_shop') || 'المحل الأساسي';
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23,59,59,999);
    
    const dayTxs = txs.filter(t => 
      t.date >= startOfDay.getTime() && 
      t.date <= endOfDay.getTime() &&
      (t.shop || 'المحل الأساسي') === activeShop
    );
    
    let sold21 = 0;
    let bought21 = 0;
    
    dayTxs.forEach(t => {
      const karatVal = Number(t.karat) || 21;
      const weightVal = Number(t.weight) || 0;
      const weight21 = weightVal * (karatVal / 21);
      
      if (t.type === TransactionType.SALE) {
        sold21 += weight21;
      } else if (t.type === TransactionType.PURCHASE) {
        bought21 += weight21;
      }
    });
    
    return {
      sold21,
      bought21,
      net21: bought21 - sold21
    };
  },
  
  getHistory: (shopName?: string): DailyCoverage[] => {
    const txs = TransactionService.getAll();
    const activeShop = shopName || localStorage.getItem('selected_shop') || 'المحل الأساسي';
    
    const shopTxs = txs.filter(t => (t.shop || 'المحل الأساسي') === activeShop);
    
    const groups: Record<string, Transaction[]> = {};
    shopTxs.forEach(t => {
      const d = new Date(t.date);
      const dateStr = d.toLocaleDateString('en-CA');
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(t);
    });
    
    const history: DailyCoverage[] = [];
    Object.entries(groups).forEach(([dateStr, dayTxs]) => {
      let sold21 = 0;
      let bought21 = 0;
      
      dayTxs.forEach(t => {
        const karatVal = Number(t.karat) || 21;
        const weightVal = Number(t.weight) || 0;
        const weight21 = weightVal * (karatVal / 21);
        
        if (t.type === TransactionType.SALE) {
          sold21 += weight21;
        } else if (t.type === TransactionType.PURCHASE) {
          bought21 += weight21;
        }
      });
      
      const net21 = bought21 - sold21;
      const color = net21 > 0 ? 'green' : net21 < 0 ? 'red' : 'slate';
      
      const timestamp = new Date(dateStr + 'T12:00:00').getTime();
      
      history.push({
        dateStr,
        timestamp,
        totalSold21: sold21,
        totalBought21: bought21,
        net21,
        color
      });
    });
    
    return history.sort((a, b) => b.timestamp - a.timestamp);
  }
};

// Gold Price Service
export const GoldPriceService = {
  getStoredPrice: (): GoldMarketPrice => {
    const data = localStorage.getItem(KEYS.GOLD_PRICE);
    return data ? JSON.parse(data) : { base21: 3750, ouncePriceUsd: 2650.50, lastUpdated: Date.now(), manualOverride: false };
  },
  getHistory: (): {date: number, price: number}[] => {
      const history = localStorage.getItem(KEYS.GOLD_PRICE_HISTORY);
      return history ? JSON.parse(history) : [];
  },
  recordHistory: (price: number) => {
      const history = GoldPriceService.getHistory();
      const today = new Date().setHours(0,0,0,0);
      const existingIndex = history.findIndex(h => new Date(h.date).setHours(0,0,0,0) === today);
      if (existingIndex >= 0) { history[existingIndex] = { date: Date.now(), price }; } 
      else { history.push({ date: Date.now(), price }); }
      if (history.length > 30) history.shift();
      localStorage.setItem(KEYS.GOLD_PRICE_HISTORY, JSON.stringify(history));
  },
  setPrice: (base21: number) => {
    const current = GoldPriceService.getStoredPrice();
    const price: GoldMarketPrice = { ...current, base21, lastUpdated: Date.now(), manualOverride: true };
    localStorage.setItem(KEYS.GOLD_PRICE, JSON.stringify(price));
    GoldPriceService.recordHistory(base21);
    window.dispatchEvent(new Event('gold-price-updated'));
  },
  fetchLivePrice: async (): Promise<{base21: number, ounce: number}> => {
    const current = GoldPriceService.getStoredPrice();
    if (!navigator.onLine) {
        return { base21: current.base21, ounce: current.ouncePriceUsd };
    }
    
    try {
      const ts = Date.now();
      
      // Fetch local price (edahabapp) via proxy
      let newBase21 = 0;
      try {
        const resLocal = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent('https://edahabapp.com/')}&timestamp=${ts}`).then(r => r.json());
        if (resLocal && resLocal.contents) {
          const match21 = resLocal.contents.match(/عيار\s*21.*?(\d{4})/s);
          if (match21 && match21[1]) { 
            const val = parseInt(match21[1].replace(/,/g, ''), 10); 
            if (val > 3000) newBase21 = val; 
          }
        }
      } catch (e) {
        console.error("Local price fetch failed", e);
      }

      // Fetch official international Ounce price from multiple reliable sources
      let newOunce = 0;
      
      // Source A: Direct Call to Gold-API (Correct Endpoint: /price/XAU)
      try {
        const resA = await fetch(`https://api.gold-api.com/price/XAU?ts=${ts}`).then(r => r.json());
        if (resA && typeof resA.price === 'number' && resA.price > 1000) {
          newOunce = resA.price;
        }
      } catch (e) {
        console.warn("Gold-API fetch failed, trying Source B...", e);
      }

      // Source B: Investing.com Arabic (sa.investing.com) via CORS proxy
      if (newOunce === 0) {
        try {
          const urlTarget = encodeURIComponent('https://sa.investing.com/currencies/xau-usd');
          const resB = await fetch(`https://corsproxy.io/?url=${urlTarget}&ts=${ts}`).then(r => r.text());
          if (resB) {
            const match = resB.match(/data-test="instrument-price-last"[^>]*>\s*([\d,]+(?:\.\d+)?)/);
            if (match && match[1]) {
              const val = parseFloat(match[1].replace(/,/g, ''));
              if (val > 1000) newOunce = val;
            }
          }
        } catch (e) {
          console.warn("Investing.com Arabic fetch failed, trying Source C...", e);
        }
      }

      // Source C: Investing.com English (www.investing.com) via CORS proxy
      if (newOunce === 0) {
        try {
          const urlTarget = encodeURIComponent('https://www.investing.com/currencies/xau-usd');
          const resC = await fetch(`https://corsproxy.io/?url=${urlTarget}&ts=${ts}`).then(r => r.text());
          if (resC) {
            const match = resC.match(/data-test="instrument-price-last"[^>]*>\s*([\d,]+(?:\.\d+)?)/);
            if (match && match[1]) {
              const val = parseFloat(match[1].replace(/,/g, ''));
              if (val > 1000) newOunce = val;
            }
          }
        } catch (e) {
          console.warn("Investing.com English fetch failed, trying Source D...", e);
        }
      }

      // Source D: CoinGecko PAX Gold Peg (Direct Call, CORS-friendly)
      if (newOunce === 0) {
        try {
          const resD = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd&ts=${ts}`).then(r => r.json());
          if (resD && resD['pax-gold'] && typeof resD['pax-gold'].usd === 'number' && resD['pax-gold'].usd > 1000) {
            newOunce = resD['pax-gold'].usd;
          }
        } catch (e) {
          console.error("CoinGecko PAXG fetch failed", e);
        }
      }

      const final21 = newBase21 > 0 ? newBase21 : current.base21;
      const finalOunce = newOunce > 0 ? newOunce : current.ouncePriceUsd;

      if (final21 !== current.base21 || finalOunce !== current.ouncePriceUsd) {
          const result: GoldMarketPrice = { base21: final21, ouncePriceUsd: finalOunce, lastUpdated: Date.now(), manualOverride: false };
          localStorage.setItem(KEYS.GOLD_PRICE, JSON.stringify(result));
          GoldPriceService.recordHistory(final21);
          window.dispatchEvent(new Event('gold-price-updated'));
      }
      return { base21: final21, ounce: finalOunce };
    } catch (error) { 
      return { base21: current.base21, ounce: current.ouncePriceUsd }; 
    }
  },
  calculatePrice: (karat: Karat, base21: number): number => {
    switch (karat) { case Karat.K24: return Math.floor(base21 * (24/21)); case Karat.K18: return Math.floor(base21 * (18/21)); default: return base21; }
  }
};

// Settings & User Service (Using DB)
export const SettingsService = {
  isAppInitialized: async (): Promise<boolean> => {
     return await DbService.hasOwner();
  },
  initializeSystem: async (storeName: string, slogan: string, ownerName: string, pin: string, email: string) => {
      // 1. Save Profile Locally
      const profile: StoreProfile = { name: storeName, slogan: slogan || '', address1: '', address2: '', phonePrimary: '', phoneSecondary: '', contacts: [] };
      set(KEYS.STORE_PROFILE, profile);
      
      // 2. Register Owner in DB
      const owner: AppUser = { id: 'OWNER_1', name: ownerName, email, role: UserRole.OWNER, pin: pin, active: true };
      await DbService.registerUser(owner);

      // 3. Init Safes
      SafeService.initDefaults();
      localStorage.setItem(KEYS.IS_SETUP, 'true');
  },
  getStoreProfile: (): StoreProfile => {
    const data = localStorage.getItem(KEYS.STORE_PROFILE);
    if (data) return JSON.parse(data);
    return { name: "", slogan: "", address1: "", address2: "", phonePrimary: "", phoneSecondary: "", contacts: [] };
  },
  saveStoreProfile: (profile: StoreProfile): boolean => {
    try {
      set(KEYS.STORE_PROFILE, profile);
      window.dispatchEvent(new Event('store-profile-updated'));
      return true;
    } catch (e) { return false; }
  },
  getUsers: (): AppUser[] => {
    return get<AppUser>(KEYS.USERS);
  },
  getTheme: (): ThemeMode => (localStorage.getItem(KEYS.THEME) as ThemeMode) || 'light',
  setTheme: (theme: ThemeMode) => {
    localStorage.setItem(KEYS.THEME, theme);
    window.dispatchEvent(new Event('theme-change'));
  },
  getPrintedBarcodes: (): string[] => {
    const data = localStorage.getItem('printed_barcodes_log');
    return data ? JSON.parse(data) : [];
  },
  savePrintedBarcodes: (barcodes: string[]) => {
    const existing = SettingsService.getPrintedBarcodes();
    const updated = Array.from(new Set([...existing, ...barcodes]));
    localStorage.setItem('printed_barcodes_log', JSON.stringify(updated));
    DbService.pushData('printed_barcodes_log', updated);
  }
};

export const AuthService = {
  login: async (email: string, pin: string) => {
     const user = await DbService.login(email, pin);
     if (user) {
         localStorage.setItem('current_user', JSON.stringify(user));
         localStorage.setItem('user_role', user.role);
         return user;
     }
     return null;
  },
  logout: () => {
      localStorage.removeItem('current_user');
      localStorage.removeItem('user_role'); // Force clean role as well
      localStorage.removeItem('selected_shop');
      window.location.reload();
  },
  getCurrentUser: (): AppUser | null => {
    const u = localStorage.getItem('current_user');
    return u ? JSON.parse(u) : null;
  },
  getCurrentRole: (): string => localStorage.getItem('user_role') || 'CASHIER',
};

// Print Service
export const PrintService = {
  printReceipt: (items: any[], total: number, customerName: string, cashierName: string, invoiceId: string, typeLabel: string, paidAmount?: number) => {
    const store = SettingsService.getStoreProfile();
    const now = new Date();
    const date = now.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const time = now.toLocaleTimeString('ar-EG');
    const fullTimestamp = now.toISOString();

    const isSale = typeLabel.includes('بيع');
    const primaryColor = store.invoicePrimaryColor || (isSale ? '#0f4c75' : '#7b2d00');
    const accentColor  = store.invoiceSecondaryColor || '#c9a84c';
    const fontColor    = store.invoiceFontColor || '#ffffff';

    // Unique invoice serial (e.g. INV83915800-20260113-1430)
    const serial = `${invoiceId.toUpperCase()}-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;

    // Anti-forgery hash (CRC-like checksum)
    const hashInput = `${invoiceId}|${customerName}|${total}|${fullTimestamp}`;
    let hashVal = 0;
    for (let i = 0; i < hashInput.length; i++) {
      hashVal = ((hashVal << 5) - hashVal + hashInput.charCodeAt(i)) & 0xffffffff;
    }
    const verifyCode = Math.abs(hashVal).toString(16).toUpperCase().padStart(8, '0');

    // Build items HTML with optional per-item barcode
    const barcodeItems: string[] = [];
    const itemsHtml = items.map((item, idx) => {
      const hasBarcode = item.barcode && String(item.barcode).length > 2;
      const bcId = `bc_item_${idx}`;
      if (hasBarcode) barcodeItems.push(`{id:"${bcId}",val:"${String(item.barcode)}"}`);
      return `
        <tr class="item-row">
          <td class="item-name-cell">
            <div class="item-name">${item.itemName || item.name || '-'}</div>
            <div class="item-sub">${item.karat ? 'عيار ' + item.karat : ''}${item.karat && item.weight ? ' • ' : ''}${item.weight ? Number(item.weight).toFixed(2) + ' جم' : ''}</div>
            ${hasBarcode ? `<div class="item-barcode-area"><canvas id="${bcId}" width="130" height="22" class="item-bc-canvas"></canvas><div class="item-bc-text">${item.barcode}</div></div>` : ''}
          </td>
          <td class="item-price-cell">${(item.totalPrice || 0).toLocaleString('ar-EG')} ج.م</td>
        </tr>
      `;
    }).join('');

    const remaining = total - (paidAmount || 0);
    const paidHtml = paidAmount !== undefined ? `
      <div class="summary-row">
        <span class="summary-label">المدفوع</span>
        <span class="summary-val paid-val">${paidAmount.toLocaleString('ar-EG')} ج.م</span>
      </div>
      ${remaining > 0 ? `<div class="summary-row"><span class="summary-label">المتبقي</span><span class="summary-val debt-val">${remaining.toLocaleString('ar-EG')} ج.م</span></div>` : ''}
    ` : '';

    // A5 at 96dpi: 148mm=559px, 210mm=794px
    const printWindow = window.open('', '_blank', 'width=580,height=820,scrollbars=no,resizable=no');
    if (!printWindow) { console.error('Popup blocked'); return; }

    printWindow.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<title>فاتورة ${serial}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');

/* ══════════════════════════════════════════════════
   HALF A4 INVOICE — A5 SIZE (148mm × 210mm)
   ══════════════════════════════════════════════════ */
*{
  box-sizing:border-box;
  margin:0;
  padding:0;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  color-adjust: exact !important;
}

/* Page size = exactly A5 = نص ورقة A4 */
@page {
  size: 148mm 210mm;
  margin: 0mm;
}

/* Body = zero padding, صفحة بيضاء فارغة */
html, body{
  width: 148mm;
  height: 210mm;
  margin: 0;
  padding: 0;
  background: #ffffff;
  font-family:'Cairo','Tahoma',Arial,sans-serif;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

/* الفاتورة تملأ الصفحة بالكامل */
.invoice-page{
  width: 148mm;
  min-height: 210mm;
  background: #ffffff !important;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.invoice-page::before{
  content:'';
  position:absolute;
  inset:0;
  background-image:
    repeating-linear-gradient(45deg,rgba(0,0,0,.015) 0,rgba(0,0,0,.015) 1px,transparent 0,transparent 50%),
    repeating-linear-gradient(-45deg,rgba(0,0,0,.015) 0,rgba(0,0,0,.015) 1px,transparent 0,transparent 50%);
  background-size:12px 12px;
  pointer-events:none;
  z-index:0;
}

/* ── Security Strips ── */
.sec-strip-top{
  width:100%;
  height:5px;
  background:repeating-linear-gradient(90deg,${primaryColor} 0,${primaryColor} 8px,${accentColor} 8px,${accentColor} 16px) !important;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
.sec-strip-bot{
  width:100%;
  height:5px;
  background:repeating-linear-gradient(90deg,${accentColor} 0,${accentColor} 8px,${primaryColor} 8px,${primaryColor} 16px) !important;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

/* ── Header ── */
.inv-header{
  background:linear-gradient(135deg,${primaryColor},#000) !important;
  color:${fontColor} !important;
  padding:14px 16px 18px;
  position:relative;
  z-index:1;
  display:flex;
  align-items:center;
  gap:10px;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
.inv-header::after{
  content:'';
  position:absolute;
  bottom:-10px;right:0;left:0;
  height:10px;
  background:linear-gradient(135deg,${primaryColor} 0 50%,transparent 50%),linear-gradient(225deg,${primaryColor} 0 50%,transparent 50%) !important;
  background-size:20px 10px;
  background-position:0 0,10px 0;
  background-repeat:repeat-x;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
.hdr-logo{width:52px;height:52px;border-radius:10px;object-fit:contain;background:rgba(255,255,255,.15) !important;padding:4px;flex-shrink:0}
.hdr-logo-ph{width:52px;height:52px;border-radius:10px;background:rgba(255,255,255,.15) !important;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
.hdr-text{flex:1}
.store-name{font-size:17px;font-weight:900;line-height:1.2;color:${fontColor} !important}
.store-slogan{font-size:9px;opacity:.85;margin-top:2px;color:${fontColor} !important}
.store-contact{font-size:8.5px;opacity:.8;margin-top:2px;color:${fontColor} !important}

.inv-type-badge{
  background:${accentColor} !important;
  color:#1a1a1a !important;
  font-weight:900;
  font-size:11px;
  padding:5px 10px;
  border-radius:20px;
  flex-shrink:0;
  white-space:nowrap;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

/* ── Meta Band ── */
.inv-meta-band{
  background:#f5f5f5 !important;
  border-bottom:1px solid #ddd;
  padding:12px 14px 10px;
  margin-top:12px;
  z-index:1;
  position:relative;
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:6px 10px;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
.meta-item{display:flex;flex-direction:column;gap:1px}
.meta-label{font-size:7.5px;color:#999 !important;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
.meta-value{font-size:10px;font-weight:700;color:#1a1a1a !important}
.meta-value.serial{font-family:monospace;font-size:7.5px;color:${primaryColor} !important;word-break:break-all}

/* ── Items Section ── */
.items-section{flex:1;padding:10px 14px;position:relative;z-index:1}
.items-sec-title{
  font-size:9px;font-weight:700;color:#666 !important;
  text-transform:uppercase;letter-spacing:1px;
  margin-bottom:6px;padding-bottom:4px;
  border-bottom:2px solid ${accentColor} !important;
  display:flex;align-items:center;gap:5px;
}
.items-sec-title::before{
  content:'';
  width:10px;height:3px;
  background:${primaryColor} !important;
  border-radius:2px;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

table.items-table{width:100%;border-collapse:collapse}
.items-table thead th{
  background:${primaryColor} !important;
  color:${fontColor} !important;
  font-size:9px;font-weight:700;padding:5px 6px;text-align:right;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
.items-table thead th:last-child{text-align:left}
.item-row td{vertical-align:top;border-bottom:1px solid #eee}
.item-name-cell{padding:6px}
.item-name{font-size:10.5px;font-weight:700;color:#1a1a1a !important}
.item-sub{font-size:8px;color:#888 !important;margin-top:1px}
.item-barcode-area{margin-top:4px}
.item-bc-canvas{display:block}
.item-bc-text{font-size:6.5px;font-family:monospace;color:#555 !important;margin-top:1px;letter-spacing:.5px}
.item-price-cell{padding:6px;text-align:left;font-size:10.5px;font-weight:700;color:${primaryColor} !important;white-space:nowrap}

/* ── Summary ── */
.summary-section{
  margin:0 14px 10px;
  border:1px solid #ddd;
  border-radius:8px;
  overflow:hidden;
  position:relative;
  z-index:1;
}
.summary-row{
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:7px 10px;
  border-bottom:1px solid #eee;
  font-size:10px;
}
.summary-row:last-child{border-bottom:none}
.summary-label{color:#666 !important;font-weight:600}
.summary-val{font-weight:700;color:#1a1a1a !important}

.summary-row.total-row{
  background:${primaryColor} !important;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
.summary-row.total-row .summary-label{
  color:${fontColor} !important;
  font-size:12px;font-weight:900;
}
.summary-row.total-row .summary-val{
  color:${accentColor} !important;
  font-size:14px;font-weight:900;
}
.paid-val{color:#15803d !important}
.debt-val{color:#dc2626 !important}

/* ── Security Footer ── */
.security-footer{
  margin:0 14px 8px;
  background:#f5f5f5 !important;
  border:1px solid #ddd;
  border-radius:8px;
  padding:7px 10px;
  display:flex;
  align-items:center;
  gap:8px;
  position:relative;
  z-index:1;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
.security-text{flex:1}
.security-title{font-size:7px;font-weight:700;color:#555 !important;text-transform:uppercase;letter-spacing:.5px}
.verify-code{font-family:monospace;font-size:9px;font-weight:900;color:${primaryColor} !important;letter-spacing:2px;margin-top:2px}
.security-notice{font-size:6.5px;color:#999 !important;margin-top:3px;line-height:1.4}

.stamp-area{text-align:center;margin:0 14px 8px;position:relative;z-index:1}
.stamp-img{max-width:70px;max-height:70px;opacity:.85}

.inv-footer{text-align:center;padding:7px;font-size:7.5px;color:#aaa !important;position:relative;z-index:1}
.inv-footer strong{color:#666 !important}

/* الـ body هو A5 بالفعل، هذا فقط لضمان الطباعة الصحيحة */
@media print{
  @page {
    size: 148mm 210mm;
    margin: 0mm;
  }
  html, body {
    width: 148mm !important;
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .invoice-page {
    width: 148mm !important;
    box-shadow: none !important;
    margin: 0 !important;
  }
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
}
</style>
</head>
<body>
<div class="invoice-page">
<div class="sec-strip-top"></div>
<div class="inv-header">
${store.logoBase64 ? `<img src="${store.logoBase64}" class="hdr-logo"/>` : `<div class="hdr-logo-ph">💍</div>`}
<div class="hdr-text">
<div class="store-name">${store.name || 'محل الذهب'}</div>
${store.slogan ? `<div class="store-slogan">${store.slogan}</div>` : ''}
${store.address1 ? `<div class="store-contact">📍 ${store.address1}</div>` : ''}
${store.phonePrimary ? `<div class="store-contact">📞 ${store.phonePrimary}</div>` : ''}
</div>
<div class="inv-type-badge">${typeLabel}</div>
</div>
<div class="inv-meta-band">
<div class="meta-item"><span class="meta-label">العميل</span><span class="meta-value">${customerName}</span></div>
<div class="meta-item"><span class="meta-label">الكاشير</span><span class="meta-value">${cashierName}</span></div>
<div class="meta-item"><span class="meta-label">التاريخ والوقت</span><span class="meta-value">${date} — ${time}</span></div>
<div class="meta-item"><span class="meta-label">رقم الفاتورة</span><span class="meta-value serial">${serial}</span></div>
</div>
<div class="items-section">
<div class="items-sec-title">تفاصيل الأصناف</div>
<table class="items-table">
<thead><tr><th>الصنف والتفاصيل</th><th style="text-align:left">القيمة (ج.م)</th></tr></thead>
<tbody>${itemsHtml}</tbody>
</table>
</div>
<div class="summary-section">
${paidHtml}
<div class="summary-row total-row"><span class="summary-label">الإجمالي</span><span class="summary-val">${total.toLocaleString('ar-EG')} ج.م</span></div>
</div>
<div class="security-footer">
<div><canvas id="qr_canvas" width="48" height="48"></canvas></div>
<div class="security-text">
<div class="security-title">🔒 رمز التحقق من الفاتورة</div>
<div class="verify-code">${verifyCode}</div>
<div class="security-notice">هذه الفاتورة محمية بكود تحقق فريد. أي تعديل يُبطل الكود.<br/>Gold Master Egypt — ${fullTimestamp}</div>
</div>
</div>
${store.stampBase64 ? `<div class="stamp-area"><img src="${store.stampBase64}" class="stamp-img"/></div>` : ''}
<div class="inv-footer"><strong>${store.name}</strong> — شكراً لثقتكم بنا 💛 | Gold Master System &copy; ${now.getFullYear()}</div>
<div class="sec-strip-bot"></div>
</div>
<script>
function drawCode128(el,text){
  if(!el||!text)return;
  var ctx=el.getContext('2d');
  var P=["212222","222122","222221","121223","121322","131222","122213","122312","132212","221213","221312","231212","112232","122132","122231","113222","123122","123221","223211","221132","221231","213212","223112","312131","311222","321122","321221","312212","322112","322211","212123","212321","232121","111323","131123","131321","112313","132113","132311","211313","231113","231311","112133","112331","132131","113123","113321","133112","312113","312311","332111","314111","311411","311141","111143","111341","131141","114113","114311","411113","411311","113141","114131","311122","411121","211132","221123","221321","213211","211133","211331","231131","213113","213311","213131","311113","311311","331111","312113","312311","332111","314111","311411","311141","111143","111341","131141","114113","114311","411113","411311","113141","114131","311122","411121","211132","221123","221321","213211","211133","211331","231131","213113","213311","213131","311113","311311"];
  var s="211214",cs=104;
  for(var i=0;i<text.length;i++){var v=text.charCodeAt(i)-32;if(v>=0&&v<=95){cs+=v*(i+1);s+=P[v];}}
  s+=P[cs%103]+"2331112";
  var w=el.width,h=el.height,tot=0;
  for(var i=0;i<s.length;i++)tot+=parseInt(s[i]);
  var mw=w/(tot+6),x=mw*3;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#000';
  for(var i=0;i<s.length;i++){var bw=parseInt(s[i])*mw;if(i%2===0)ctx.fillRect(x,0,bw,h);x+=bw;}
}
function drawSecurityGrid(el,code){
  if(!el)return;
  var ctx=el.getContext('2d'),sz=el.width,cell=4,cols=Math.floor(sz/cell),rows=Math.floor(sz/cell);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,sz,sz);
  for(var r=0;r<rows;r++){for(var c=0;c<cols;c++){var v=code.charCodeAt((r*cols+c)%code.length);if((v+r+c)%3!==0){ctx.fillStyle=(v*(r+1)+c)%2===0?'#1a1a1a':'#e0e0e0';ctx.fillRect(c*cell,r*cell,cell,cell);}}}
  [[0,0],[0,cols-7],[rows-7,0]].forEach(function(p){var sr=p[0],sc=p[1];ctx.fillStyle='#000';ctx.fillRect(sc*cell,sr*cell,7*cell,7*cell);ctx.fillStyle='#fff';ctx.fillRect((sc+1)*cell,(sr+1)*cell,5*cell,5*cell);ctx.fillStyle='#000';ctx.fillRect((sc+2)*cell,(sr+2)*cell,3*cell,3*cell);});
}
window.onload=function(){
  var items=[${barcodeItems.join(',')}];
  items.forEach(function(b){var el=document.getElementById(b.id);if(el)drawCode128(el,b.val);});
  drawSecurityGrid(document.getElementById('qr_canvas'),'${verifyCode}${serial}');
  setTimeout(function(){window.print();},900);
};
</script>
</body>
</html>`);
    printWindow.document.close();
  },

  printReport: (title: string, headers: string[], data: any[][]) => {
     const store = SettingsService.getStoreProfile();
     const date = new Date().toLocaleDateString('ar-EG');
     
     const printWindow = window.open('', '_blank', 'width=1000,height=800');
     if (!printWindow) return;

     const headersHtml = headers.map(h => `<th>${h}</th>`).join('');
     const rowsHtml = data.map(row => `
        <tr>
            ${row.map(cell => `<td>${cell !== undefined && cell !== null ? cell : '-'}</td>`).join('')}
        </tr>
     `).join('');

     printWindow.document.write(`
       <html dir="rtl">
         <head>
           <title>${title}</title>
           <style>
             body { font-family: 'Tahoma', sans-serif; padding: 20px; color: #333; }
             .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #ddd; padding-bottom: 20px; }
             .store-info h1 { margin: 0; color: #d4af37; }
             .report-title { text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0; }
             table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
             th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
             th { background-color: #f9f9f9; font-weight: bold; }
             tr:nth-child(even) { background-color: #f9f9f9; }
             .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #777; border-top: 1px solid #eee; padding-top: 10px; }
             @media print { .no-print { display: none; } th { background-color: #eee !important; -webkit-print-color-adjust: exact; } }
           </style>
         </head>
         <body>
            <div class="header">
                <div class="store-info">
                    <h1>${store.name}</h1>
                    <p>${store.address1 || ''} | ${store.phonePrimary || ''}</p>
                </div>
            </div>

            <div class="report-title">${title}</div>
            <div style="text-align: left; font-size: 12px;">تاريخ التقرير: ${date}</div>

            <table>
                <thead>
                    <tr>${headersHtml}</tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <div class="footer">
                تم استخراج هذا التقرير من نظام Gold Master Egypt في ${new Date().toLocaleString('ar-EG')}
            </div>
            
            <script>
                window.onload = function() { setTimeout(function(){ window.print(); }, 500); }
            </script>
         </body>
       </html>
     `);
     printWindow.document.close();
  },

  printBarcodeTickets: (tickets: (string | Item)[]) => {
     const printWindow = window.open('', '_blank', 'width=950,height=600');
     if (!printWindow) return;
     
     const store = SettingsService.getStoreProfile();
     const storeName = store.name || 'شحاته عبد الهادي';
     
     // Group into pairs
     const pairs: [string | Item, string | Item | null][] = [];
     for (let i = 0; i < tickets.length; i += 2) {
         pairs.push([tickets[i], tickets[i + 1] || null]);
     }
     
     const blocksHtml = pairs.map(([t1, t2]) => {
         // Helper to extract values
         const getTicketData = (t: string | Item | null) => {
             if (!t) return null;
             
             const logoHtml = store.logoBase64 
                ? `<div class="logo-container"><img class="shop-logo-img" src="${store.logoBase64}" /></div>` 
                : '';
                
             if (typeof t === 'string') {
                 return {
                     barcode: t,
                     logoHtml: logoHtml,
                     title: storeName,
                     line1: '',
                     line2: '',
                     line3: ''
                 };
             } else {
                 return {
                     barcode: t.barcode,
                     logoHtml: logoHtml,
                     title: t.name,
                     line1: `الوزن: ${t.weight.toFixed(2)} جم`,
                     line2: `العيار: ${t.karat}`,
                     line3: t.workmanship ? `مصنعية: ${t.workmanship}` : ''
                 };
             }
         };
         
         const data1 = getTicketData(t1);
         const data2 = getTicketData(t2);
         
         return `
            <div class="ticket-block">
                <!-- ================== TAG 1 (Normal Orientation, bottom-left) ================== -->
                ${data1 ? `
                <div class="tag-wrapper normal-tag">
                    <div class="wing left-wing">
                        <!-- Top Half (Barcode drawn locally on canvas) -->
                        <div class="wing-half top-half">
                            <div class="app-logo">GOLD MASTER SYSTEM</div>
                            <canvas id="canvas_${data1.barcode}" class="barcode-canvas" width="130" height="28"></canvas>
                            <div class="code-text">${data1.barcode}</div>
                        </div>
                        
                        <!-- Fold Line -->
                        <div class="fold-line"></div>
                        
                        <!-- Bottom Half (Text Details + Logo) -->
                        <div class="wing-half bottom-half">
                            ${data1.logoHtml}
                            ${data1.title ? `<div class="tag-title">${data1.title}</div>` : ''}
                            ${data1.line1 ? `<div class="tag-row font-bold">${data1.line1}</div>` : ''}
                            ${data1.line2 ? `<div class="tag-row font-bold">${data1.line2} ${data1.line3 ? `| ${data1.line3}` : ''}</div>` : ''}
                        </div>
                    </div>
                    
                    <!-- Tail (extends to the right at the bottom) -->
                    <div class="tail normal-tail"></div>
                </div>
                ` : ''}
                
                <!-- ================== TAG 2 (Interleaved, Rotated 180 Degrees, top-right) ================== -->
                ${data2 ? `
                <div class="tag-wrapper rotated-tag rotated-180">
                    <div class="wing left-wing wing-tag2">
                        <!-- Top Half (Barcode drawn locally on canvas) -->
                        <div class="wing-half top-half">
                            <div class="app-logo">GOLD MASTER SYSTEM</div>
                            <canvas id="canvas_${data2.barcode}" class="barcode-canvas" width="110" height="28"></canvas>
                            <div class="code-text">${data2.barcode}</div>
                        </div>
                        
                        <!-- Fold Line -->
                        <div class="fold-line"></div>
                        
                        <!-- Bottom Half (Text Details + Logo) -->
                        <div class="wing-half bottom-half">
                            ${data2.logoHtml}
                            ${data2.title ? `<div class="tag-title">${data2.title}</div>` : ''}
                            ${data2.line1 ? `<div class="tag-row font-bold">${data2.line1}</div>` : ''}
                            ${data2.line2 ? `<div class="tag-row font-bold">${data2.line2} ${data2.line3 ? `| ${data2.line3}` : ''}</div>` : ''}
                        </div>
                    </div>
                    
                    <!-- Tail (extends to the right in local space, rotates to left at top in final space) -->
                    <div class="tail normal-tail tail-tag2"></div>
                </div>
                ` : ''}
            </div>
         `;
     }).join('');
     
     printWindow.document.write(`
       <html>
         <head>
           <title>طباعة تيكتات الذهب المتداخلة</title>
           <style>
             body { 
                 margin: 0; 
                 padding: 20px; 
                 font-family: Arial, sans-serif; 
                 background-color: #f1f5f9; 
                 direction: rtl;
             }
             
             /* Stacked vertically in 1 column like a scroll feed */
             .print-grid {
                 display: flex;
                 flex-direction: column;
                 align-items: center;
                 gap: 5px; /* Visual spacing on screen */
             }
             
             /* Interleaved Block containing 2 tags */
             .ticket-block {
                 width: 8.2cm;
                 height: 3.7cm;
                 position: relative;
                 background-color: #fff;
                 border: 1px dotted #cbd5e1;
                 box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                 page-break-inside: avoid;
                 box-sizing: border-box;
             }
             
             /* Sub tag wrapper containers */
             .tag-wrapper {
                 position: absolute;
                 inset: 0;
             }
             
             .rotated-180 {
                 transform: rotate(180deg);
                 transform-origin: center center;
             }
             
             /* Physical Wing shape & styling */
             .wing {
                 height: 2.5cm;
                 position: absolute;
                 bottom: 0;
                 left: 0;
                 display: flex;
                 flex-direction: column;
                 box-sizing: border-box;
                 background-color: #dfd3c3; /* Light gold/beige color for screen previews */
                 border: 1px solid #c2b5a3;
                 border-radius: 6px;
                 overflow: hidden;
                 z-index: 10;
             }
             
             /* Tag 1 wing width */
             .normal-tag .left-wing {
                 width: 2.5cm;
             }
             
             /* Tag 2 wing width */
             .rotated-tag .wing-tag2 {
                 width: 2.0cm;
             }
             
             /* Horizontally split halves */
             .wing-half {
                 height: 1.25cm;
                 display: flex;
                 flex-direction: column;
                 align-items: center;
                 justify-content: center;
                 box-sizing: border-box;
                 padding: 2px;
                 overflow: hidden;
             }
             
             .top-half {
                 justify-content: flex-end;
                 padding-bottom: 3px;
             }
             
             .bottom-half {
                 justify-content: flex-start;
                 padding-top: 3px;
             }
             
             /* Dash Fold line in the middle */
             .fold-line {
                 width: 100%;
                 border-top: 1px dashed rgba(0, 0, 0, 0.2);
                 z-index: 15;
             }
             
             /* Tails styling */
             .tail {
                 position: absolute;
                 height: 0.2cm;
                 background-color: #dfd3c3;
                 border: 1px solid #c2b5a3;
                 box-sizing: border-box;
                 z-index: 5;
             }
             
             /* Normal tail goes from left wing to the right edge (Swapped: Now at bottom) */
             .normal-tag .normal-tail {
                 top: 3.0cm;
                 left: 2.5cm;
                 width: 5.7cm;
                 border-radius: 0 4px 4px 0;
                 border-left: none;
             }
             
             /* Rotated Tag 2 tail goes from left wing to right edge (Swapped: Now at bottom locally, rotates to top) */
             .rotated-tag .tail-tag2 {
                 top: 3.0cm;
                 left: 2.0cm;
                 width: 6.2cm;
                 border-radius: 0 4px 4px 0;
                 border-left: none;
             }
             
             /* Typography & details inside wings */
             .app-logo {
                 font-size: 5px;
                 font-weight: 800;
                 color: #92400e;
                 margin-bottom: 2px;
                 letter-spacing: 0.3px;
                 text-align: center;
             }
             
             /* Logo container and image */
             .logo-container {
                 width: 100%;
                 display: flex;
                 justify-content: center;
                 align-items: center;
                 margin-bottom: 0px;
             }
             
             .shop-logo-img {
                 max-height: 0.75cm;
                 max-width: 95%;
                 object-fit: contain;
             }
             
             .barcode-canvas {
                 max-width: 90%;
                 max-height: 0.6cm;
             }
             
             .code-text {
                 font-size: 7px;
                 font-family: monospace;
                 color: #0f172a;
                 font-weight: bold;
                 margin-top: 1px;
             }
             
             .tag-title {
                  font-weight: 900;
                  font-size: 11px;
                  line-height: 1.1;
                  width: 100%;
                  text-align: center;
                  color: #000;
                  margin-bottom: 2px;
                 white-space: nowrap;
                 overflow: hidden;
                 text-overflow: ellipsis;
             }
             
             .tag-row {
                  margin: 0px;
                  font-size: 6px;
                  line-height: 1.1;
                 color: #334155;
                 white-space: nowrap;
             }
             
             @media print {
                 body { 
                     padding: 0; 
                     margin: 0;
                     background-color: transparent !important;
                 }
                 .print-grid {
                     gap: 0 !important;
                 }
                 .ticket-block { 
                     border: none !important; 
                     box-shadow: none !important;
                     background-color: transparent !important;
                     margin: 0 !important;
                 }
                 /* Keep outline borders in print */
                 .wing {
                     background-color: transparent !important;
                     border: 1px solid #000000 !important;
                 }
                 .tail {
                     background-color: transparent !important;
                     border: 1px solid #000000 !important;
                     border-left: none !important;
                 }
                 .fold-line {
                     border-top: 1px dashed #000000 !important;
                 }
             }
           </style>
           
           <script>
             // 100% Offline Code 128 Canvas Drawing Engine
             function drawBarcode(canvasId, text) {
               const canvas = document.getElementById(canvasId);
               if (!canvas) return;
               const ctx = canvas.getContext('2d');
               
               const patterns = [
                 "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
                 "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
                 "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
                 "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
                 "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133112", "312113", "312311",
                 "332111", "314111", "311411", "311141", "111143", "111341", "131141", "114113", "114311", "411113",
                 "411311", "113141", "114131", "311122", "411121", "211132", "221123", "221321", "213211", "211133",
                 "211331", "231131", "213113", "213311", "213131", "311113", "311311", "331111", "312113", "312311",
                 "332111", "314111", "311411", "311141", "111143", "111341", "131141", "114113", "114311", "411113",
                 "411311", "113141", "114131", "311122", "411121", "211132", "221123", "221321", "213211", "211133",
                 "211331", "231131", "213113", "213311", "213131", "311113", "311311"
               ];
               
               const START_B = "211214";
               const STOP = "2331112";
               
               let codeStr = START_B;
               let checksum = 104;
               
               for (let i = 0; i < text.length; i++) {
                 const charCode = text.charCodeAt(i);
                 const val = charCode - 32;
                 if (val >= 0 && val <= 95) {
                   checksum += val * (i + 1);
                   codeStr += patterns[val];
                 }
               }
               
               checksum = checksum % 103;
               codeStr += patterns[checksum];
               codeStr += STOP;
               
               const w = canvas.width;
               const h = canvas.height;
               ctx.fillStyle = "#ffffff";
               ctx.fillRect(0, 0, w, h);
               
               let totalModules = 0;
               for (let i = 0; i < codeStr.length; i++) {
                 totalModules += parseInt(codeStr[i], 10);
               }
               
               const moduleWidth = w / (totalModules + 6);
               let currentX = moduleWidth * 3;
               
               ctx.fillStyle = "#000000";
               for (let i = 0; i < codeStr.length; i++) {
                 const barModules = parseInt(codeStr[i], 10);
                 const barWidth = barModules * moduleWidth;
                 
                 if (i % 2 === 0) {
                   ctx.fillRect(currentX, 0, barWidth, h);
                 }
                 currentX += barWidth;
               }
             }
           </script>
         </head>
         <body>
             <div class="print-grid">
                 ${blocksHtml}
             </div>
             <script>
                 window.onload = function() {
                     // Draw all barcodes locally
                     const canvases = document.querySelectorAll('canvas.barcode-canvas');
                     canvases.forEach(canvas => {
                         const barcodeText = canvas.getAttribute('id').replace('canvas_', '');
                         drawBarcode(canvas.getAttribute('id'), barcodeText);
                     });
                     
                     // Trigger printer print
                     setTimeout(function(){ window.print(); }, 800);
                 }
             </script>
         </body>
       </html>
     `);
     printWindow.document.close();
  }
};
