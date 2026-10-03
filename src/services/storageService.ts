import {
  Transaction,
  MonthSummary,
  EntityType,
  Person,
  CompanyBranch,
  CompanyProfile,
  MonthlyBudget,
  BudgetStatus,
} from '../types/finance';
import {
  fetchTransactionsFromSupabase,
  saveTransactionToSupabase,
  deleteTransactionFromSupabase,
  saveCompanyProfileToSupabase,
  saveBranchesToSupabase,
  savePersonsToSupabase,
  getSupabaseClient,
} from './supabaseService';
import {
  getBcvRateForDate,
  getBcvRate,
  round2,
} from './currencyService';

const STORAGE_KEY_TX = 'contasync_transactions_v2';
const STORAGE_KEY_PERSONS = 'contasync_persons_v1';
const STORAGE_KEY_BRANCHES = 'contasync_company_branches_v2';
const STORAGE_KEY_COMPANY_PROFILE = 'contasync_company_profile_v1';
const STORAGE_KEY_BUDGETS = 'contasync_budgets_v1';

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  name: 'Lubricantes Asiáticos C.A.',
  taxId: 'J-31456789-0',
  address: 'Av. Principal Zona Industrial, Galpón 4-B, Valencia, Edo. Carabobo',
  phone: '0414-1234567 / 0241-8000000',
  email: 'administracion@lubricantesasiaticos.com',
  activity: 'Venta, Distribución e Importación de Lubricantes, Filtros e Insumos Automotrices e Industriales',
};

// Sedes / Sucursales predeterminadas para Formato Empresa
export const DEFAULT_BRANCHES: CompanyBranch[] = [
  {
    id: 'b-1',
    name: 'Lubricantes Asiáticos (Principal)',
    code: 'PRI',
    isMain: true,
    address: 'Sede Principal - Zona Industrial',
  },
  {
    id: 'b-2',
    name: 'Lubricantes Asiáticos (Sucursal)',
    code: 'SUC',
    isMain: false,
    address: 'Sucursal Comercial y Mostrador',
  },
];

// Personas predeterminadas para Finanzas Personales
const DEFAULT_PERSONS: Person[] = [
  { id: 'p-1', name: 'Titular Principal', relation: 'Yo', color: '#059669' },
  { id: 'p-2', name: 'Esposa / Pareja', relation: 'Pareja', color: '#9333ea' },
  { id: 'p-3', name: 'Hijos / Familiares', relation: 'Hijos', color: '#2563eb' },
];

// Presupuestos mensuales predeterminados
const DEFAULT_BUDGET: MonthlyBudget = {
  monthKey: '2026-09',
  totalBudget: 1200.0, // Presupuesto mensual estipulado en USD
  categoryBudgets: {
    'Alimentación & Supermercado': 400.0,
    'Salud & Farmacia': 150.0,
    'Servicios Básicos & Internet': 120.0,
    'Transporte & Combustible': 100.0,
    'Educación & Cursos': 150.0,
    'Entretenimiento & Restaurantes': 100.0,
    'Otros Gastos': 180.0,
  },
};

// Transacciones iniciales realistas adaptadas a Venezuela (IVA 16%, Notas de Entrega, Tickets POS, Pago Móvil, USDT)
const INITIAL_TRANSACTIONS: Transaction[] = [
  // Septiembre 2026 - Empresa (Persona Jurídica)
  {
    id: 'tx-corp-001',
    entity: 'empresa',
    branch: 'Lubricantes Asiáticos (Principal)',
    type: 'ingreso',
    documentType: 'factura_fiscal',
    date: '2026-09-02',
    supplier: 'Distribuidora Global Oriente C.A.',
    taxId: 'J-31456789-0',
    invoiceNumber: '0001428',
    referenceNumber: 'REF-BNC-8849',
    category: 'Venta de Servicios / Consultoría',
    subtotal: 3500.0,
    taxRate: 16, // IVA Venezuela
    taxAmount: 560.0,
    exemptAmount: 0,
    retentionAmount: 0,
    total: 4060.0,
    currency: 'USD',
    description: 'Venta al mayor de lubricantes industriales y fluidos hidráulicos - Sede Principal',
    isDeductible: true,
    status: 'pagado',
    paymentMethod: 'transferencia',
    syncedWithSupabase: false,
    createdAt: '2026-09-02T10:00:00Z',
  },
  {
    id: 'tx-corp-002',
    entity: 'empresa',
    branch: 'Lubricantes Asiáticos (Principal)',
    type: 'gasto',
    documentType: 'factura_fiscal',
    date: '2026-09-05',
    supplier: 'Petroquímica & Refinería Solquim C.A.',
    taxId: 'J-30819284-5',
    invoiceNumber: 'FAC-00892',
    category: 'Compra Materia Prima / Insumos',
    subtotal: 1800.0,
    taxRate: 16,
    taxAmount: 288.0,
    exemptAmount: 0,
    total: 2088.0,
    currency: 'USD',
    description: 'Adquisición de tambores de aceite base sintetizado y aditivos anticorrosivos (Materia Prima)',
    receiptSizeKb: 48,
    isDeductible: true,
    status: 'pagado',
    paymentMethod: 'transferencia',
    referenceNumber: '094821',
    syncedWithSupabase: false,
    createdAt: '2026-09-05T14:30:00Z',
  },
  {
    id: 'tx-corp-003',
    entity: 'empresa',
    branch: 'Lubricantes Asiáticos (Sucursal)',
    type: 'ingreso',
    documentType: 'factura_fiscal',
    date: '2026-09-08',
    supplier: 'Taller Mecánico & Flota Occidente',
    taxId: 'J-40918273-2',
    invoiceNumber: 'FAC-SUC-0104',
    category: 'Venta de Servicios / Consultoría',
    subtotal: 950.0,
    taxRate: 16,
    taxAmount: 152.0,
    exemptAmount: 0,
    total: 1102.0,
    currency: 'USD',
    description: 'Venta al detal y cambio de aceite en mostrador - Sede Sucursal',
    receiptSizeKb: 42,
    isDeductible: true,
    status: 'pagado',
    paymentMethod: 'punto_venta',
    referenceNumber: 'POS-88912',
    syncedWithSupabase: false,
    createdAt: '2026-09-08T16:00:00Z',
  },
  {
    id: 'tx-corp-004',
    entity: 'empresa',
    branch: 'Lubricantes Asiáticos (Sucursal)',
    type: 'gasto',
    documentType: 'nota_entrega', // Nota de entrega monto único (No deducible SENIAT)
    date: '2026-09-09',
    supplier: 'Envases Plásticos & Galones Industriales C.A.',
    taxId: 'J-50284719-8',
    invoiceNumber: 'NE-4412',
    category: 'Compra Materia Prima / Insumos',
    subtotal: 0,
    taxRate: 0,
    taxAmount: 0,
    exemptAmount: 0,
    total: 350.0,
    currency: 'USD',
    description: 'Galones y envases de 1L serigrafiados para envasado (Insumos de Sucursal)',
    receiptSizeKb: 45,
    isDeductible: false,
    status: 'pagado',
    paymentMethod: 'pago_movil',
    referenceNumber: 'TXID-PAGOMOVIL-88912',
    syncedWithSupabase: false,
    createdAt: '2026-09-09T11:00:00Z',
  },
  {
    id: 'tx-corp-005',
    entity: 'empresa',
    branch: 'Lubricantes Asiáticos (Principal)',
    type: 'gasto',
    documentType: 'ticket_punto_venta', // Ticket de Punto de Venta (No deducible SENIAT)
    date: '2026-09-14',
    supplier: 'Estación de Servicios & Combustible El Paraíso',
    taxId: 'J-00123984-2',
    invoiceNumber: 'POS-TKT-3019',
    referenceNumber: 'REF-774921 / LOTE 042',
    category: 'Transporte & Combustible',
    subtotal: 0,
    taxRate: 0,
    taxAmount: 0,
    exemptAmount: 0,
    total: 45.0,
    currency: 'USD',
    description: 'Combustible para camión de distribución entre Principal y Sucursal',
    receiptSizeKb: 38,
    isDeductible: false,
    status: 'pagado',
    paymentMethod: 'punto_venta',
    syncedWithSupabase: false,
    createdAt: '2026-09-14T09:15:00Z',
  },

  // Septiembre 2026 - Finanzas Personales con Personas Adheridas
  {
    id: 'tx-pers-001',
    entity: 'personal',
    type: 'gasto',
    documentType: 'factura_fiscal',
    date: '2026-09-03',
    supplier: 'Supermercado Central de Alimentos',
    taxId: 'J-29837465-1',
    invoiceNumber: '009841',
    category: 'Alimentación & Supermercado',
    subtotal: 140.0, // Productos gravables
    taxRate: 16,
    taxAmount: 22.4,
    exemptAmount: 110.0, // Carnes, verduras, huevos (exentos)
    total: 272.4,
    currency: 'USD',
    description: 'Compra quincenal de víveres, carnes y alimentos básicos del hogar',
    receiptSizeKb: 52,
    isDeductible: false,
    status: 'pagado',
    paymentMethod: 'punto_venta',
    assignedPerson: 'Titular Principal',
    syncedWithSupabase: false,
    createdAt: '2026-09-03T18:00:00Z',
  },
  {
    id: 'tx-pers-002',
    entity: 'personal',
    type: 'gasto',
    documentType: 'ticket_punto_venta', // Boucher Punto de Venta
    date: '2026-09-07',
    supplier: 'Farmacia La Salud Vital',
    taxId: 'J-31982736-4',
    invoiceNumber: 'BOUCHER-49102',
    referenceNumber: 'REF-POS-99381',
    category: 'Salud & Farmacia',
    subtotal: 85.0,
    taxRate: 0,
    taxAmount: 0,
    exemptAmount: 85.0, // Medicinas exentas
    total: 85.0,
    currency: 'USD',
    description: 'Medicinas de tratamiento y vitaminas',
    receiptSizeKb: 41,
    isDeductible: true,
    status: 'pagado',
    paymentMethod: 'pago_movil',
    assignedPerson: 'Esposa / Pareja',
    syncedWithSupabase: false,
    createdAt: '2026-09-07T16:20:00Z',
  },
  {
    id: 'tx-pers-003',
    entity: 'personal',
    type: 'gasto',
    documentType: 'nota_entrega',
    date: '2026-09-12',
    supplier: 'Librería & Suministros Escolares San José',
    taxId: 'V-14892104-2',
    invoiceNumber: 'NOTA-1102',
    category: 'Educación & Cursos',
    subtotal: 190.0,
    taxRate: 0,
    taxAmount: 0,
    exemptAmount: 190.0,
    total: 190.0,
    currency: 'USD',
    description: 'Útiles escolares, cuadernos y textos para el inicio de clases',
    receiptSizeKb: 44,
    isDeductible: false,
    status: 'pagado',
    paymentMethod: 'dolares_efectivo',
    assignedPerson: 'Hijos / Familiares',
    syncedWithSupabase: false,
    createdAt: '2026-09-12T10:45:00Z',
  },
  {
    id: 'tx-pers-004',
    entity: 'personal',
    type: 'gasto',
    documentType: 'factura_fiscal',
    date: '2026-09-18',
    supplier: 'Hipermercado Mayorista Express',
    taxId: 'J-41029384-9',
    invoiceNumber: 'FAC-2918',
    category: 'Alimentación & Supermercado',
    subtotal: 95.0,
    taxRate: 16,
    taxAmount: 15.2,
    exemptAmount: 80.0,
    total: 190.2,
    currency: 'USD',
    description: 'Reposición de despensa mensual y aseo del hogar',
    receiptSizeKb: 49,
    isDeductible: false,
    status: 'pagado',
    paymentMethod: 'punto_venta',
    assignedPerson: 'Titular Principal',
    syncedWithSupabase: false,
    createdAt: '2026-09-18T19:00:00Z',
  },
];

// --- Gestión de Personas Adheridas ---

export function getStoredPersons(): Person[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PERSONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error cargando personas:', e);
  }
  return DEFAULT_PERSONS;
}

export function saveStoredPersons(persons: Person[], syncToCloud = true): void {
  try {
    localStorage.setItem(STORAGE_KEY_PERSONS, JSON.stringify(persons));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('contasync_persons_updated', { detail: persons }));
    }
    if (syncToCloud && getSupabaseClient()) {
      savePersonsToSupabase(persons);
    }
  } catch (e) {
    console.error('Error guardando personas:', e);
  }
}

export function addStoredPerson(name: string, relation = 'Familiar'): Person {
  const current = getStoredPersons();
  const colors = ['#059669', '#9333ea', '#2563eb', '#d97706', '#dc2626', '#0891b2'];
  const newPerson: Person = {
    id: `p-${Date.now()}`,
    name: name.trim(),
    relation,
    color: colors[current.length % colors.length],
  };
  const updated = [...current, newPerson];
  saveStoredPersons(updated);
  return newPerson;
}

export function deleteStoredPerson(id: string): void {
  const current = getStoredPersons();
  const filtered = current.filter((p) => p.id !== id);
  saveStoredPersons(filtered.length > 0 ? filtered : DEFAULT_PERSONS);
}

// --- Gestión de Sedes y Sucursales de la Empresa ---

export function getStoredBranches(): CompanyBranch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BRANCHES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error cargando sedes de la empresa:', e);
  }
  return DEFAULT_BRANCHES;
}

export function saveStoredBranches(branches: CompanyBranch[], syncToCloud = true): void {
  try {
    localStorage.setItem(STORAGE_KEY_BRANCHES, JSON.stringify(branches));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('contasync_branches_updated', { detail: branches }));
    }
    if (syncToCloud && getSupabaseClient()) {
      saveBranchesToSupabase(branches);
    }
  } catch (e) {
    console.error('Error guardando sedes de la empresa:', e);
  }
}

export function addStoredBranch(name: string, code?: string, address?: string): CompanyBranch {
  const current = getStoredBranches();
  const cleanCode = code ? code.trim().toUpperCase() : `SUC-${current.length + 1}`;
  const newBranch: CompanyBranch = {
    id: `branch-${Date.now()}`,
    name: name.trim(),
    code: cleanCode,
    address: address?.trim() || '',
    isMain: current.length === 0,
  };
  const updated = [...current, newBranch];
  saveStoredBranches(updated);
  return newBranch;
}

export function deleteStoredBranch(id: string): void {
  const current = getStoredBranches();
  const filtered = current.filter((b) => b.id !== id);
  saveStoredBranches(filtered.length > 0 ? filtered : DEFAULT_BRANCHES);
}

// --- Gestión de Datos Fiscales de la Empresa (Razón Social, RIF, Domicilio Fiscal) ---

export function getStoredCompanyProfile(): CompanyProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COMPANY_PROFILE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.name && parsed.taxId) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error cargando perfil de la empresa:', e);
  }
  return DEFAULT_COMPANY_PROFILE;
}

export function saveStoredCompanyProfile(profile: CompanyProfile, syncToCloud = true): void {
  try {
    localStorage.setItem(STORAGE_KEY_COMPANY_PROFILE, JSON.stringify(profile));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('contasync_company_profile_updated', { detail: profile }));
    }
    if (syncToCloud && getSupabaseClient()) {
      saveCompanyProfileToSupabase(profile);
    }
  } catch (e) {
    console.error('Error guardando perfil de la empresa:', e);
  }
}

// --- Gestión de Presupuesto Mensual y Control de Sobregiro (Números Rojos) ---

export function getStoredBudget(monthKey: string): MonthlyBudget {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_BUDGETS}_${monthKey}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error cargando presupuesto:', e);
  }
  return { ...DEFAULT_BUDGET, monthKey };
}

export function saveStoredBudget(budget: MonthlyBudget): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_BUDGETS}_${budget.monthKey}`, JSON.stringify(budget));
  } catch (e) {
    console.error('Error guardando presupuesto:', e);
  }
}

/**
 * Calcula el estado del presupuesto personal para el mes:
 * - Resta cada factura ingresada del monto estipulado
 * - Si se excede, marca `isOverBudget = true`, calcula el monto excedido en números rojos
 * - Detecta exactamente en qué categorías y personas se produjo el sobregiro
 */
export function calculateBudgetStatus(
  transactions: Transaction[],
  monthKey: string,
  budget: MonthlyBudget
): BudgetStatus {
  // Filtrar solo gastos personales del mes
  const personalExpenses = transactions.filter(
    (t) => t.entity === 'personal' && (t.type === 'gasto' || t.type === 'compra_activo') && t.date.startsWith(monthKey)
  );

  let totalSpent = 0;
  const categorySpending: Record<string, number> = {};
  const personSpending: Record<string, number> = {};

  personalExpenses.forEach((t) => {
    totalSpent += t.total;
    categorySpending[t.category] = (categorySpending[t.category] || 0) + t.total;

    const person = t.assignedPerson || 'Sin asignar';
    personSpending[person] = (personSpending[person] || 0) + t.total;
  });

  const remaining = budget.totalBudget - totalSpent;
  const isOverBudget = remaining < 0;
  const overspentAmount = isOverBudget ? Math.abs(remaining) : 0;

  // Detectar qué categorías han sobrepasado su presupuesto estipulado
  const overspentCategories: Array<{
    category: string;
    spent: number;
    budget: number;
    exceeded: number;
  }> = [];

  Object.entries(categorySpending).forEach(([cat, spent]) => {
    const catBudget = budget.categoryBudgets[cat] || (budget.totalBudget * 0.2); // Asignación estimada si no se fijó
    if (spent > catBudget) {
      overspentCategories.push({
        category: cat,
        spent,
        budget: catBudget,
        exceeded: spent - catBudget,
      });
    }
  });

  // Ordenar categorías excedidas de mayor a menor exceso
  overspentCategories.sort((a, b) => b.exceeded - a.exceeded);

  return {
    totalBudget: budget.totalBudget,
    spent: totalSpent,
    remaining,
    isOverBudget,
    overspentAmount,
    overspentCategories,
    personSpending,
  };
}

// --- Gestión de Transacciones ---

/**
 * Normaliza una transacción asegurando que tenga valorización dual ($ y Bs.)
 * y que la tasa BCV aplicada corresponda exactamente al DÍA DE EMISIÓN de la factura
 * (no la fecha de carga), salvo que la factura física ya traiga una tasa impresa explícita.
 */
export function normalizeTransactionDualCurrency(tx: Transaction): Transaction {
  const txDate = tx.date ? tx.date.slice(0, 10) : new Date().toISOString().slice(0, 10);

  // La tasa debe ser la del DÍA DE EMISIÓN si no vino impresa en el documento físico
  const rateForDate = tx.exchangeRateBcv && tx.exchangeRateBcv > 0
    ? round2(tx.exchangeRateBcv)
    : getBcvRateForDate(txDate);

  const appliedRate = rateForDate > 0 ? rateForDate : getBcvRate();

  const isNonFiscal = tx.documentType === 'nota_entrega' || tx.documentType === 'ticket_punto_venta';

  const total = round2(tx.total);
  const subtotal = isNonFiscal ? 0 : round2(tx.subtotal);
  const taxAmount = isNonFiscal ? 0 : round2(tx.taxAmount);
  const taxRate = isNonFiscal ? 0 : (tx.taxRate || 16);
  const exemptAmount = isNonFiscal ? 0 : round2(tx.exemptAmount || 0);
  const isDeductible = isNonFiscal ? false : Boolean(tx.isDeductible);

  let totalUsd: number;
  let totalBs: number;
  let subtotalBs: number;
  let taxAmountBs: number;
  let exemptAmountBs: number;

  if (tx.currency === 'USD') {
    totalUsd = total;
    totalBs = round2(total * appliedRate);
    subtotalBs = round2(subtotal * appliedRate);
    taxAmountBs = round2(taxAmount * appliedRate);
    exemptAmountBs = round2(exemptAmount * appliedRate);
  } else {
    // Si el comprobante está expresado en Bolívares
    totalBs = total;
    totalUsd = appliedRate > 0 ? round2(total / appliedRate) : total;
    subtotalBs = subtotal;
    taxAmountBs = taxAmount;
    exemptAmountBs = exemptAmount;
  }

  return {
    ...tx,
    date: txDate,
    subtotal,
    taxRate,
    taxAmount,
    exemptAmount,
    isDeductible,
    exchangeRateBcv: appliedRate,
    totalUsd,
    totalBs,
    subtotalBs,
    taxAmountBs,
    exemptAmountBs,
  };
}

/**
 * Re-evalúa todas las transacciones históricas aplicando el calendario de tasas BCV actualizado
 */
export function revalueAllTransactionsWithBcvHistory(): Transaction[] {
  const current = getStoredTransactions();
  const updated = current.map((tx) => normalizeTransactionDualCurrency(tx));
  saveStoredTransactions(updated);
  return updated;
}

export function getStoredTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TX);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .filter((t) => !t.id?.startsWith('__config_') && t.category !== '__CONFIG__')
          .map((t) => normalizeTransactionDualCurrency(t));
      }
    }
  } catch (err) {
    console.error('Error leyendo transacciones de localStorage:', err);
  }

  const initialNormalized = INITIAL_TRANSACTIONS.map((t) => normalizeTransactionDualCurrency(t));
  try {
    localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(initialNormalized));
  } catch (e) {
    console.warn('No se pudo guardar transacciones iniciales en localStorage:', e);
  }
  return initialNormalized;
}

export function saveStoredTransactions(transactions: Transaction[]): void {
  try {
    const cleanList = transactions.filter(
      (t) => !t.id?.startsWith('__config_') && t.category !== '__CONFIG__'
    );
    localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(cleanList));
  } catch (err) {
    console.error('Error guardando en localStorage:', err);
  }
}

export async function addTransaction(transaction: Transaction): Promise<Transaction> {
  const normalized = normalizeTransactionDualCurrency(transaction);
  const current = getStoredTransactions();
  const updated = [normalized, ...current];
  saveStoredTransactions(updated);

  if (getSupabaseClient()) {
    saveTransactionToSupabase(normalized).then((ok) => {
      if (ok) {
        normalized.syncedWithSupabase = true;
        saveStoredTransactions([normalized, ...current.filter((t) => t.id !== normalized.id)]);
      }
    });
  }

  return normalized;
}

export async function updateTransaction(transaction: Transaction): Promise<void> {
  const normalized = normalizeTransactionDualCurrency(transaction);
  const current = getStoredTransactions();
  const index = current.findIndex((t) => t.id === normalized.id);
  if (index !== -1) {
    current[index] = { ...normalized, updatedAt: new Date().toISOString() };
    saveStoredTransactions(current);

    if (getSupabaseClient()) {
      saveTransactionToSupabase(normalized);
    }
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  const current = getStoredTransactions();
  const filtered = current.filter((t) => t.id !== id);
  saveStoredTransactions(filtered);

  if (getSupabaseClient()) {
    deleteTransactionFromSupabase(id);
  }
}

export function calculateMonthSummary(
  transactions: Transaction[],
  monthKey: string,
  entityFilter: EntityType | 'todas' = 'todas'
): MonthSummary {
  const [yearStr, monthStr] = monthKey.split('-');
  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  const monthIndex = parseInt(monthStr, 10) - 1;
  const monthName = `${monthNames[monthIndex] || 'Mes'} ${yearStr}`;

  let totalIncome = 0;
  let totalExpenses = 0;
  let totalPurchases = 0;
  let totalTaxDeductible = 0;
  let totalExemptAmount = 0;
  let receiptCount = 0;
  let totalStorageKb = 0;
  let pendingCount = 0;

  const filtered = transactions.filter((t) => {
    const matchesMonth = t.date.startsWith(monthKey);
    const matchesEntity = entityFilter === 'todas' || t.entity === entityFilter;
    return matchesMonth && matchesEntity;
  });

  filtered.forEach((t) => {
    if (t.type === 'ingreso') {
      totalIncome += t.total;
    } else if (t.type === 'compra_activo') {
      totalPurchases += t.total;
      if (t.isDeductible) {
        totalTaxDeductible += t.taxAmount;
      }
    } else {
      totalExpenses += t.total;
      if (t.isDeductible) {
        totalTaxDeductible += t.taxAmount;
      }
    }

    if (t.exemptAmount) {
      totalExemptAmount += t.exemptAmount;
    }

    if (t.receiptUrl || t.receiptSizeKb) {
      receiptCount++;
      totalStorageKb += t.receiptSizeKb || 45;
    }

    if (t.status === 'pendiente') {
      pendingCount++;
    }
  });

  const netBalance = totalIncome - (totalExpenses + totalPurchases);

  return {
    monthKey,
    monthName,
    totalIncome,
    totalExpenses,
    totalPurchases,
    netBalance,
    totalTaxDeductible,
    totalExemptAmount,
    receiptCount,
    totalStorageKb: Math.round(totalStorageKb),
    pendingCount,
  };
}

export function getAvailableMonths(transactions: Transaction[]): string[] {
  const monthSet = new Set<string>();
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  monthSet.add(currentMonthKey);
  monthSet.add('2026-09');
  monthSet.add('2026-08');

  transactions.forEach((t) => {
    if (t.date && t.date.length >= 7) {
      monthSet.add(t.date.substring(0, 7));
    }
  });

  return Array.from(monthSet).sort().reverse();
}

export async function syncWithSupabase(): Promise<{ syncedCount: number; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { syncedCount: 0, message: 'Supabase no está conectado todavía.' };
  }

  try {
    // 1. Sincronizar datos de la empresa, sedes y personas con la nube
    const localProfile = getStoredCompanyProfile();
    if (localProfile) {
      saveCompanyProfileToSupabase(localProfile);
    }
    const localBranches = getStoredBranches();
    if (localBranches && localBranches.length > 0) {
      saveBranchesToSupabase(localBranches);
    }
    const localPersons = getStoredPersons();
    if (localPersons && localPersons.length > 0) {
      savePersonsToSupabase(localPersons);
    }

    // 2. Sincronizar transacciones contables
    const remote = await fetchTransactionsFromSupabase();
    const local = getStoredTransactions();

    if (remote && remote.length > 0) {
      const map = new Map<string, Transaction>();
      local.forEach((t) => map.set(t.id, t));
      remote.forEach((t) => map.set(t.id, { ...t, syncedWithSupabase: true }));

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      saveStoredTransactions(merged);
      return { syncedCount: merged.length, message: `Sincronizados ${merged.length} registros y datos de empresa con Supabase.` };
    } else {
      let count = 0;
      for (const t of local) {
        const ok = await saveTransactionToSupabase(t);
        if (ok) count++;
      }
      return { syncedCount: count, message: `${count} transacciones respaldadas exitosamente en Supabase.` };
    }
  } catch (err: any) {
    return { syncedCount: 0, message: `Error en la sincronización: ${err.message}` };
  }
}
