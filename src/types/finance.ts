export type EntityType = 'empresa' | 'personal';

export type TransactionType = 'gasto' | 'ingreso' | 'compra_activo';

export type TransactionStatus = 'pagado' | 'pendiente' | 'conciliado';

export type DocumentType = 'factura_fiscal' | 'nota_entrega' | 'ticket_punto_venta';

export type PaymentMethod =
  | 'punto_venta'
  | 'pago_movil'
  | 'transferencia'
  | 'dolares_efectivo'
  | 'efectivo_bs'
  | 'usdt_binance'
  | 'otro';

export interface Person {
  id: string;
  name: string;
  relation?: string;
  color?: string;
}

export interface CompanyBranch {
  id: string;
  name: string; // ej. 'Lubricantes Asiáticos (Principal)', 'Lubricantes Asiáticos (Sucursal)'
  code?: string; // ej. 'PRI', 'SUC'
  address?: string;
  isMain?: boolean;
}

export interface CompanyProfile {
  name: string; // Razón Social: ej. 'Lubricantes Asiáticos C.A.'
  taxId: string; // RIF: ej. 'J-31456789-0'
  address: string; // Domicilio fiscal: ej. 'Av. Principal Zona Industrial, Galpón 4-B, Valencia, Edo. Carabobo'
  phone?: string; // Teléfono: ej. '0414-1234567 / 0241-8000000'
  email?: string; // Correo: ej. 'administracion@lubricantesasiaticos.com'
  activity?: string; // Actividad económica / Objeto social
}

export interface LineItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
}

export interface Transaction {
  id: string;
  entity: EntityType; // 'empresa' (Persona Jurídica) o 'personal'
  type: TransactionType; // 'gasto' | 'ingreso' | 'compra_activo'
  documentType?: DocumentType; // 'factura_fiscal' | 'nota_entrega' | 'ticket_punto_venta'
  date: string; // YYYY-MM-DD
  supplier: string; // Nombre del proveedor, comercio o cliente
  taxId?: string; // RIF (J- / V- / E- / G-) o identificación fiscal
  invoiceNumber?: string; // Folio / Nº de factura, nota o voucher
  referenceNumber?: string; // Referencia de Pago Móvil o Punto de Venta
  category: string;
  subtotal: number; // Base imponible gravable
  taxRate?: number; // % IVA (16% en Venezuela, o 0% si exento)
  taxAmount: number; // Monto de IVA calculado
  exemptAmount?: number; // Monto exento (productos sin IVA en factura fiscal o nota)
  retentionAmount?: number; // Retenciones de IVA o ISLR si aplican
  total: number;
  currency: string; // 'USD' | 'VES'
  exchangeRateBcv?: number; // Tasa oficial BCV en Bs./USD
  totalUsd?: number; // Monto en USD (con 2 decimales)
  totalBs?: number; // Monto en Bolívares al cambio BCV (con 2 decimales)
  subtotalBs?: number;
  taxAmountBs?: number;
  exemptAmountBs?: number;
  description: string;
  receiptUrl?: string; // URL en Supabase Storage o data URL
  receiptStoragePath?: string;
  receiptSizeKb?: number; // Peso ultraliviano en KB
  originalSizeKb?: number;
  isDeductible: boolean;
  status: TransactionStatus;
  paymentMethod: PaymentMethod;
  assignedPerson?: string; // Nombre de la persona asignada (para gastos personales)
  branch?: string; // Sede / Sucursal para empresa (ej. 'Lubricantes Asiáticos (Principal)', 'Lubricantes Asiáticos (Sucursal)')
  lineItems?: LineItem[];
  syncedWithSupabase?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface MonthlyBudget {
  monthKey: string; // "2026-09"
  totalBudget: number; // Presupuesto estipulado general mensual
  categoryBudgets: Record<string, number>; // Presupuesto por categoría específica
  personBudgets?: Record<string, number>; // Presupuesto por persona
}

export interface BudgetStatus {
  totalBudget: number;
  spent: number;
  remaining: number;
  isOverBudget: boolean;
  overspentAmount: number;
  overspentCategories: Array<{
    category: string;
    spent: number;
    budget: number;
    exceeded: number;
  }>;
  personSpending: Record<string, number>;
}

export interface MonthSummary {
  monthKey: string; // "2026-09"
  monthName: string; // "Septiembre 2026"
  totalIncome: number;
  totalExpenses: number;
  totalPurchases: number;
  netBalance: number;
  totalTaxDeductible: number; // IVA soportado 16% deducible
  totalExemptAmount: number; // Total exento
  receiptCount: number;
  totalStorageKb: number;
  pendingCount: number;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  bucketName: string;
  isConnected: boolean;
  lastChecked: string | null;
}

export interface ScanResult {
  supplier: string;
  taxId?: string;
  invoiceNumber?: string;
  referenceNumber?: string;
  documentType?: DocumentType;
  date: string;
  currency: string;
  subtotal: number;
  taxRate?: number;
  taxAmount: number;
  exemptAmount?: number;
  retentionAmount?: number;
  total: number;
  category: string;
  type: TransactionType;
  entity: EntityType;
  paymentMethod?: PaymentMethod;
  description: string;
  confidence?: number;
  lineItems?: LineItem[];
}
