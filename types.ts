

export enum Karat {
  K18 = 18,
  K21 = 21,
  K24 = 24,
}

export enum ItemStatus {
  IN_STORE = 'IN_STORE',
  WITH_REP = 'WITH_REP',
  SOLD = 'SOLD',
}

export enum TransactionType {
  SALE = 'SALE',
  PURCHASE = 'PURCHASE',
  PAYMENT_OUT = 'PAYMENT_OUT',
  DEBT_PAYMENT = 'DEBT_PAYMENT',
}

export enum PaymentMethod {
  CASH = 'CASH',
  INSTAPAY = 'INSTAPAY',
  DEFERRED = 'DEFERRED',
}

export enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
}

export enum ExpenseCategory {
  RENT = 'RENT',
  ELECTRICITY = 'ELECTRICITY',
  SALARIES = 'SALARIES',
  HOSPITALITY = 'HOSPITALITY',
  MAINTENANCE = 'MAINTENANCE',
  OTHER = 'OTHER'
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: number;
  safeId: string;
  byUser: string;
  shop?: string;
  source?: 'DESKTOP' | 'MOBILE';
  updatedAt?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  totalPurchases: number;
  lastVisit: number;
  updatedAt?: number;
}

export interface Safe {
  id: string;
  name: string;
  balance: number;
  shop?: string;
  updatedAt?: number;
}

export interface SafeTransaction {
  id: string;
  fromSafeId?: string;
  toSafeId?: string;
  amount: number;
  type: 'TRANSFER' | 'DEPOSIT' | 'WITHDRAW' | 'SALE_DEPOSIT' | 'PURCHASE_WITHDRAW' | 'EXPENSE' | 'DEBT_COLLECTION';
  description: string;
  date: number;
  byUser: string;
  source?: 'DESKTOP' | 'MOBILE';
  updatedAt?: number;
}

export interface Item {
  id: string;
  name: string;
  weight: number;
  quantity: number;
  karat: Karat;
  type: string;
  workmanship: number;
  priceAtEntry?: number;
  status: ItemStatus;
  barcode: string;
  repId?: string;
  createdAt: number;
  updatedAt?: number;
  shop?: string;
}

export interface Transaction {
  id: string;
  invoiceId?: string;
  type: TransactionType;
  itemId?: string;
  itemName?: string;
  weight: number;
  qty?: number;
  karat: Karat;
  goldPricePerGram: number;
  workmanship: number;
  totalPrice: number;
  paidAmount?: number;
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerPhone?: string;
  customerId?: string;
  repId?: string;
  safeId?: string;
  date: number;
  notes?: string;
  createdBy: string;
  source?: 'DESKTOP' | 'MOBILE';
  updatedAt?: number;
  shop?: string;
}

export interface GhawayeshEntry {
  id: string;
  day: string;
  dateStr: string;
  timestamp: number;
  operation: string;
  countChange: number;
  currentCount: number;
  weightChange: number;
  currentWeight: number;
  type: 'IN' | 'OUT';
  updatedAt?: number;
  shop?: string;
}

export interface ScrapGoldLog {
  id: string;
  type: 'ADD' | 'TRANSFER' | 'DEDUCT';
  fromShop?: string;
  toShop?: string;
  shop?: string;
  weight: number;
  karat?: Karat;
  date: number;
  details?: string;
  byUser?: string;
}

export interface Rep {
  id: string;
  name: string;
  phone: string;
  balanceGold: number;
  balanceMoney: number;
  shop?: string;
  updatedAt?: number;
}

export interface RepLog {
  id: string;
  repId: string;
  type: 'WORK_IN' | 'GOLD_OUT' | 'CASH_OUT' | 'PAYMENT'; 
  details: string;
  weight: number;
  money: number;
  date: number;
  receiptImage?: string; 
  updatedAt?: number;
  byUser?: string;
  shop?: string;
}

export interface GoldMarketPrice {
  base21: number;
  ouncePriceUsd: number;
  lastUpdated: number;
  manualOverride: boolean;
}

export interface StoreProfile {
  name: string;
  slogan: string;
  address1: string;
  address2: string;
  phonePrimary: string;
  phoneSecondary: string;
  contacts: { name: string, phone: string }[];
  logoBase64?: string;
  stampBase64?: string;
  enableAutoPrint?: boolean;
  invoicePrimaryColor?: string;   // e.g. "#1a4a7a" - main header/accent color
  invoiceSecondaryColor?: string; // e.g. "#d4af37" - gold accent color
  invoiceFontColor?: string;      // e.g. "#ffffff" - text color on header
}

export interface AppUser {
  id: string;
  name: string;
  email?: string; 
  role: UserRole;
  pin: string;
  active: boolean;
}

export type ThemeMode = 'light' | 'dark';

export const GENERATE_ID = () => Math.random().toString(36).substring(2, 9);
export const TIMESTAMP = () => Date.now();
