import React, { useState, useEffect } from 'react';
import { X, Plus, Building2, User, Check, Receipt, FileText, CreditCard, Users, ArrowRightLeft, TrendingUp, TrendingDown, Package } from 'lucide-react';
import {
  Transaction,
  EntityType,
  TransactionType,
  PaymentMethod,
  DocumentType,
  Person,
  CompanyBranch,
} from '../types/finance';
import { getStoredPersons, getStoredBranches } from '../services/storageService';
import { getBcvRate, getBcvRateForDate, convertUsdToBs, convertBsToUsd, formatVE, round2 } from '../services/currencyService';

interface ManualTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionSaved: (tx: Transaction) => void;
  defaultEntity: EntityType;
  editingTransaction?: Transaction | null;
}

const CATEGORIES = [
  'Compra Materia Prima / Insumos',
  'Alimentación & Supermercado',
  'Salud & Farmacia',
  'Suministros de Oficina',
  'Software & Infraestructura Cloud',
  'Alquiler & Oficina',
  'Servicios Básicos & Internet',
  'Equipos de Cómputo & Activos',
  'Transporte & Combustible',
  'Educación & Cursos',
  'Nómina & Honorarios',
  'Asesoría Legal & Contable',
  'Publicidad & Marketing',
  'Mantenimiento & Reparaciones',
  'Impuestos & Tasas',
  'Venta de Productos / Mercancía',
  'Venta de Servicios / Consultoría',
  'Otros Gastos',
];

export const ManualTransactionModal: React.FC<ManualTransactionModalProps> = ({
  isOpen,
  onClose,
  onTransactionSaved,
  defaultEntity,
  editingTransaction,
}) => {
  const [entity, setEntity] = useState<EntityType>(
    editingTransaction?.entity || defaultEntity
  );
  const [documentType, setDocumentType] = useState<DocumentType>(
    editingTransaction?.documentType || 'factura_fiscal'
  );
  const [type, setType] = useState<TransactionType>(
    editingTransaction?.type || 'gasto'
  );
  const [date, setDate] = useState<string>(
    editingTransaction?.date || new Date().toISOString().slice(0, 10)
  );
  const [supplier, setSupplier] = useState<string>(
    editingTransaction?.supplier || ''
  );
  const [taxId, setTaxId] = useState<string>(
    editingTransaction?.taxId || ''
  );
  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    editingTransaction?.invoiceNumber || ''
  );
  const [referenceNumber, setReferenceNumber] = useState<string>(
    editingTransaction?.referenceNumber || ''
  );
  const [category, setCategory] = useState<string>(
    editingTransaction?.category || CATEGORIES[0]
  );
  const [subtotal, setSubtotal] = useState<string>(
    editingTransaction?.subtotal ? String(editingTransaction.subtotal) : ''
  );
  const [taxRate, setTaxRate] = useState<string>(
    editingTransaction?.taxRate !== undefined ? String(editingTransaction.taxRate) : '16'
  );
  const [taxAmount, setTaxAmount] = useState<string>(
    editingTransaction?.taxAmount !== undefined ? String(editingTransaction.taxAmount) : ''
  );
  const [exemptAmount, setExemptAmount] = useState<string>(
    editingTransaction?.exemptAmount !== undefined ? String(editingTransaction.exemptAmount) : '0'
  );
  const [total, setTotal] = useState<string>(
    editingTransaction?.total ? String(editingTransaction.total) : ''
  );
  const [currency, setCurrency] = useState<string>(
    editingTransaction?.currency || 'USD'
  );
  const [description, setDescription] = useState<string>(
    editingTransaction?.description || ''
  );
  const [isDeductible, setIsDeductible] = useState<boolean>(
    editingTransaction?.isDeductible !== undefined ? editingTransaction.isDeductible : true
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    editingTransaction?.paymentMethod || 'punto_venta'
  );
  const [persons, setPersons] = useState<Person[]>([]);
  const [assignedPerson, setAssignedPerson] = useState<string>(
    editingTransaction?.assignedPerson || 'Titular Principal'
  );
  const [branches, setBranches] = useState<CompanyBranch[]>([]);
  const [branch, setBranch] = useState<string>(
    editingTransaction?.branch || 'Lubricantes Asiáticos (Principal)'
  );
  const [hasBcvRate, setHasBcvRate] = useState<boolean>(
    editingTransaction ? editingTransaction.exchangeRateBcv !== undefined : true
  );
  const [bcvRateInput, setBcvRateInput] = useState<string>(
    editingTransaction?.exchangeRateBcv
      ? String(editingTransaction.exchangeRateBcv)
      : String(getBcvRate())
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        const hasRate = editingTransaction.exchangeRateBcv !== undefined;
        setHasBcvRate(hasRate);
        setBcvRateInput(hasRate ? String(editingTransaction.exchangeRateBcv) : String(getBcvRate()));
        if (editingTransaction.branch) setBranch(editingTransaction.branch);
      } else {
        setHasBcvRate(true);
        setBcvRateInput(String(getBcvRate()));
      }
      const loaded = getStoredPersons();
      setPersons(loaded);
      if (!editingTransaction && loaded.length > 0) {
        setAssignedPerson(loaded[0].name);
      }
      const loadedBranches = getStoredBranches();
      setBranches(loadedBranches);
      if (!editingTransaction?.branch && loadedBranches.length > 0) {
        setBranch(loadedBranches[0].name);
      }
    }
  }, [isOpen, editingTransaction]);

  if (!isOpen) return null;

  const handleDocumentTypeChange = (newDoc: DocumentType) => {
    setDocumentType(newDoc);
    if (newDoc === 'nota_entrega' || newDoc === 'ticket_punto_venta') {
      setTaxRate('0');
      setTaxAmount('0');
      setSubtotal('0');
      setExemptAmount('0');
      setIsDeductible(false);
    } else {
      setTaxRate('16');
      setIsDeductible(entity === 'empresa');
      recalcTaxes(subtotal, exemptAmount, '16');
    }
  };

  const recalcTaxes = (baseStr: string, exemptStr: string, rateStr: string) => {
    const base = parseFloat(baseStr) || 0;
    const exempt = parseFloat(exemptStr) || 0;
    const rate = parseFloat(rateStr) || 0;

    const calculatedTax = base * (rate / 100);
    const calculatedTotal = base + calculatedTax + exempt;

    setTaxAmount(calculatedTax > 0 ? calculatedTax.toFixed(2) : '0');
    if (calculatedTotal > 0) {
      setTotal(calculatedTotal.toFixed(2));
    }
  };

  const handleTotalChange = (val: string) => {
    setTotal(val);
    const numTotal = parseFloat(val);

    if (documentType === 'nota_entrega' || documentType === 'ticket_punto_venta') {
      setExemptAmount('0');
      setSubtotal('0');
      setTaxAmount('0');
      setIsDeductible(false);
      return;
    }

    const rate = parseFloat(taxRate) || 16;
    const exempt = parseFloat(exemptAmount) || 0;
    if (!isNaN(numTotal) && numTotal > exempt && rate > 0) {
      const taxablePortion = numTotal - exempt;
      const calculatedBase = taxablePortion / (1 + rate / 100);
      const calculatedTax = taxablePortion - calculatedBase;
      setSubtotal(calculatedBase.toFixed(2));
      setTaxAmount(calculatedTax.toFixed(2));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier || !total) {
      setError('Por favor indica proveedor/comercio y monto total');
      return;
    }

    const isFiscal = documentType === 'factura_fiscal';
    const numSubtotal = isFiscal ? round2(parseFloat(subtotal) || 0) : 0;
    const numTax = isFiscal ? round2(parseFloat(taxAmount) || 0) : 0;
    const numExempt = isFiscal ? round2(parseFloat(exemptAmount) || 0) : 0;
    const numTotal = round2(parseFloat(total) || 0);

    const parsedRate =
      hasBcvRate && parseFloat(bcvRateInput) > 0 ? round2(parseFloat(bcvRateInput)) : undefined;

    const emissionDate = date || new Date().toISOString().slice(0, 10);
    const effectiveRate = parsedRate && parsedRate > 0 ? parsedRate : getBcvRateForDate(emissionDate);

    let totalUsd = numTotal;
    let totalBs = numTotal;
    let subtotalBs = numSubtotal;
    let taxAmountBs = numTax;
    let exemptAmountBs = numExempt;

    if (currency === 'VES') {
      totalBs = numTotal;
      totalUsd = effectiveRate > 0 ? convertBsToUsd(numTotal, effectiveRate) : numTotal;
      subtotalBs = numSubtotal;
      taxAmountBs = numTax;
      exemptAmountBs = numExempt;
    } else {
      // En Dólares USD ($) -> Se valoriza en ambas monedas ($ y Bs.) con la tasa de la fecha de emisión
      totalUsd = numTotal;
      totalBs = convertUsdToBs(numTotal, effectiveRate);
      subtotalBs = isFiscal ? convertUsdToBs(numSubtotal, effectiveRate) : 0;
      taxAmountBs = isFiscal ? convertUsdToBs(numTax, effectiveRate) : 0;
      exemptAmountBs = isFiscal ? convertUsdToBs(numExempt, effectiveRate) : 0;
    }

    const tx: Transaction = {
      id: editingTransaction?.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      entity,
      type,
      documentType,
      date: emissionDate,
      supplier: supplier.trim(),
      taxId: taxId ? taxId.trim() : undefined,
      invoiceNumber: invoiceNumber ? invoiceNumber.trim() : undefined,
      referenceNumber: referenceNumber ? referenceNumber.trim() : undefined,
      category: category || 'Otros Gastos',
      subtotal: numSubtotal,
      taxRate: isFiscal ? (parseFloat(taxRate) || 16) : 0,
      taxAmount: numTax,
      exemptAmount: numExempt,
      total: numTotal,
      currency: currency || 'USD',
      exchangeRateBcv: effectiveRate,
      totalUsd,
      totalBs,
      subtotalBs,
      taxAmountBs,
      exemptAmountBs,
      description: description ? description.trim() : `${category} - ${supplier}`,
      receiptUrl: editingTransaction?.receiptUrl,
      receiptStoragePath: editingTransaction?.receiptStoragePath,
      receiptSizeKb: editingTransaction?.receiptSizeKb,
      originalSizeKb: editingTransaction?.originalSizeKb,
      isDeductible: (entity === 'empresa' && isFiscal) ? isDeductible : false,
      status: editingTransaction?.status || 'pagado',
      paymentMethod,
      assignedPerson: entity === 'personal' ? assignedPerson : undefined,
      branch: entity === 'empresa' ? (branch || 'Lubricantes Asiáticos (Principal)') : undefined,
      syncedWithSupabase: editingTransaction?.syncedWithSupabase || false,
      createdAt: editingTransaction?.createdAt || new Date().toISOString(),
    };

    onTransactionSaved(tx);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {editingTransaction ? 'Editar Registro' : 'Registrar Factura / Nota / POS Manual'}
              </h2>
              <p className="text-xs text-slate-500">
                Soporta IVA 16% Venezuela, notas de entrega y tickets de punto de venta
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Entidad Switcher */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Entidad Contable
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEntity('empresa')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  entity === 'empresa'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Empresa (Persona Jurídica)
              </button>
              <button
                type="button"
                onClick={() => setEntity('personal')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  entity === 'personal'
                    ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Finanzas Personales
              </button>
            </div>
          </div>

          {/* Sede / Sucursal si es empresa */}
          {entity === 'empresa' && (
            <div className="p-3 bg-blue-50/90 rounded-2xl border border-blue-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-700 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-blue-950 block">
                    Sede / Sucursal de la Empresa:
                  </span>
                  <span className="text-[10px] text-blue-700">
                    Discrimina ingresos y egresos para el informe consolidado por sede
                  </span>
                </div>
              </div>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="px-3 py-1.5 bg-white border border-blue-300 rounded-xl text-xs font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name} {b.isMain ? '(Sede Principal)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Persona Adherida si es personal */}
          {entity === 'personal' && (
            <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 flex items-center justify-between">
              <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-600" /> Asignar a Persona:
              </span>
              <select
                value={assignedPerson}
                onChange={(e) => setAssignedPerson(e.target.value)}
                className="px-3 py-1 bg-white border border-purple-300 rounded-xl text-xs font-bold text-purple-900"
              >
                {persons.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tipo de Operación: Ingreso vs Egreso vs Activo Fijo */}
          <div className="p-3.5 bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <label className="block text-xs font-extrabold text-slate-800">
                Tipo de Operación {entity === 'empresa' ? '(Empresa)' : '(Personal)'}:
              </label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                type === 'ingreso'
                  ? 'bg-emerald-100 text-emerald-800'
                  : type === 'compra_activo'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {type === 'ingreso' ? '🟢 INGRESO / VENTA' : type === 'compra_activo' ? '📦 COMPRA ACTIVO' : '🔴 EGRESO / GASTO'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('ingreso');
                  setDocumentType('factura_fiscal');
                  setIsDeductible(false);
                  if (category === CATEGORIES[0]) {
                    setCategory('Venta de Productos / Mercancía');
                  }
                }}
                className={`py-2 px-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  type === 'ingreso'
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs">1. Ingreso (Factura)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('gasto');
                  setIsDeductible(entity === 'empresa');
                  if (category === 'Venta de Productos / Mercancía' || category === 'Venta de Servicios / Consultoría') {
                    setCategory(entity === 'empresa' ? 'Compra Materia Prima / Insumos' : 'Alimentación & Supermercado');
                  }
                }}
                className={`py-2 px-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  type === 'gasto'
                    ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20 text-rose-950 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <TrendingDown className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="text-xs">2. Egreso (Gasto)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('compra_activo');
                  setIsDeductible(entity === 'empresa');
                  setCategory('Equipos de Cómputo & Activos');
                }}
                className={`py-2 px-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  type === 'compra_activo'
                    ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 text-blue-950 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Package className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs">3. Compra Activo</span>
              </button>
            </div>
          </div>

          {/* Tipo de Documento */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tipo de Documento {type === 'ingreso' ? 'Emitido:' : 'del Egreso:'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDocumentTypeChange('factura_fiscal')}
                className={`py-1.5 px-2 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                  documentType === 'factura_fiscal'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                {type === 'ingreso' ? 'Factura Fiscal Venta' : 'Factura Fiscal'}
              </button>
              <button
                type="button"
                onClick={() => handleDocumentTypeChange('nota_entrega')}
                className={`py-1.5 px-2 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                  documentType === 'nota_entrega'
                    ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                Nota de Entrega
              </button>
              <button
                type="button"
                onClick={() => handleDocumentTypeChange('ticket_punto_venta')}
                className={`py-1.5 px-2 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                  documentType === 'ticket_punto_venta'
                    ? 'bg-blue-50 border-blue-500 text-blue-800 ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                Recibo / Ticket POS
              </button>
            </div>
          </div>

          {/* Comercio y RIF */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {type === 'ingreso' ? 'Cliente Receptor / Razón Social *' : 'Comercio / Proveedor Emisor *'}
              </label>
              <input
                type="text"
                required
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder={type === 'ingreso' ? 'Nombre o Razón Social del Cliente' : 'Nombre del comercio o proveedor'}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {type === 'ingreso' ? 'RIF del Cliente (J-, V-, G-, E-)' : 'RIF del Proveedor / Comercio'}
              </label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="J-30123456-7"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Factura #, Referencia y Fecha */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {type === 'ingreso' ? 'Nº Factura de Venta / Control' : 'Nº Factura de Compra / Control'}
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder={type === 'ingreso' ? 'FAC-0001428' : '000182'}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {type === 'ingreso' ? 'Ref. Cobranza / Transferencia' : 'Ref. / Lote POS / Pago Móvil'}
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder={type === 'ingreso' ? 'REF-BNC-8849' : 'REF-94021'}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Método de Pago y Moneda */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Método de Pago
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="punto_venta">💳 Punto de Venta (Tarjeta)</option>
                <option value="pago_movil">📲 Pago Móvil</option>
                <option value="transferencia">🏦 Transferencia Bancaria</option>
                <option value="dolares_efectivo">💵 Dólares Efectivo (USD)</option>
                <option value="efectivo_bs">💸 Efectivo Bolívares (VES)</option>
                <option value="usdt_binance">🟡 USDT / Binance Pay</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Moneda
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="USD">USD ($ - Dólares)</option>
                <option value="VES">VES (Bs. - Bolívares)</option>
                <option value="USDT">USDT (Binance)</option>
              </select>
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Categoría
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Desglose de Montos */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
            {documentType === 'factura_fiscal' ? (
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Base Gravable
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={subtotal}
                    onChange={(e) => {
                      setSubtotal(e.target.value);
                      recalcTaxes(e.target.value, exemptAmount, taxRate);
                    }}
                    placeholder="0.00"
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Monto Exento
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={exemptAmount}
                    onChange={(e) => {
                      setExemptAmount(e.target.value);
                      recalcTaxes(subtotal, e.target.value, taxRate);
                    }}
                    placeholder="0.00"
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-blue-700 mb-1">
                    IVA ({taxRate}%)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-2 py-1 bg-white border border-blue-200 rounded-lg text-xs text-blue-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-emerald-800 mb-1">
                    Total *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={total}
                    onChange={(e) => handleTotalChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-2 py-1 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-950 font-black"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-900">
                  <span className="text-base">⚠️</span>
                  <div>
                    <span className="font-bold block text-amber-950">
                      Documento No Deducible para el SENIAT (Sin Desglose de IVA)
                    </span>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      {documentType === 'nota_entrega'
                        ? 'Las Notas de Entrega no generan crédito fiscal IVA ante el SENIAT. No se desglosa IVA ni base imponible.'
                        : 'Los Tickets o Vouchers de Punto de Venta (POS) bancario no son deducibles ni llevan desglose de IVA.'}{' '}
                      Solo se debe indicar el <strong>Monto Referencial Total en {currency === 'VES' ? 'Bolívares (Bs.)' : 'Dólares ($)'}</strong>.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Monto Referencial Total ({currency === 'VES' ? 'Bs. - Bolívares' : '$ - Dólares'}) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={total}
                      onChange={(e) => handleTotalChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-emerald-50 border-2 border-emerald-400 rounded-xl text-base text-emerald-950 font-black focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Dualidad Monetaria Inmediata */}
                  <div className="p-2 bg-white border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                      Valorización en ambas monedas:
                    </span>
                    {total && parseFloat(total) > 0 ? (
                      <div className="text-xs">
                        {currency === 'VES' ? (
                          <div className="space-y-0.5">
                            <div className="font-mono font-bold text-slate-900">
                              Bs. {formatVE(parseFloat(total))}
                            </div>
                            <div className="font-mono text-[11px] font-semibold text-emerald-700">
                              ≈ $ {hasBcvRate && parseFloat(bcvRateInput) > 0 ? formatVE(parseFloat(total) / parseFloat(bcvRateInput)) : '0.00'}{' '}
                              <span className="text-[10px] text-slate-500 font-normal">(a Tasa BCV)</span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="font-mono font-bold text-slate-900">
                              $ {formatVE(parseFloat(total))}
                            </div>
                            <div className="font-mono text-[11px] font-semibold text-emerald-700">
                              ≈ Bs. {hasBcvRate && parseFloat(bcvRateInput) > 0 ? formatVE(parseFloat(total) * parseFloat(bcvRateInput)) : '0.00'}{' '}
                              <span className="text-[10px] text-slate-500 font-normal">(a Tasa BCV)</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        Indica el monto para ver el valor en $ y Bs.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Sección de Tasa Oficial BCV Venezuela (Editable / Opcional) */}
            <div className="mt-2.5 p-3 bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-200 rounded-2xl space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🇻🇪</span>
                  <div>
                    <span className="font-bold text-amber-950 flex items-center gap-1">
                      Tasa Oficial BCV Venezuela
                      {hasBcvRate ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800">
                          Activa
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-700">
                          Sin Tasa
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white px-2 py-0.5 rounded-lg border border-amber-200 shadow-2xs hover:bg-amber-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={hasBcvRate}
                      onChange={(e) => setHasBcvRate(e.target.checked)}
                      className="w-3.5 h-3.5 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-amber-950">
                      {hasBcvRate ? 'Incluir Tasa' : 'Sin Tasa BCV'}
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setCurrency(currency === 'USD' ? 'VES' : 'USD')}
                    className="px-2 py-0.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    title="Alternar moneda principal"
                  >
                    <ArrowRightLeft className="w-3 h-3 text-amber-700" />
                    <span>Moneda: {currency === 'USD' ? 'USD ($)' : 'VES (Bs.)'}</span>
                  </button>
                </div>
              </div>

              {hasBcvRate ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-900 mb-0.5">
                      Tasa BCV de esta Factura (Bs./USD)
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="any"
                        value={bcvRateInput}
                        onChange={(e) => setBcvRateInput(e.target.value)}
                        placeholder="Ej: 36.85"
                        className="w-full px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-amber-950 font-mono focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setBcvRateInput(String(getBcvRate()))}
                        className="px-1.5 py-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[9px] font-bold whitespace-nowrap cursor-pointer transition-colors"
                        title="Usar tasa actual oficial"
                      >
                        Hoy: {formatVE(getBcvRate())}
                      </button>
                    </div>
                  </div>

                  <div className="bg-white/90 p-1.5 rounded-lg border border-amber-200/80">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                      Conversión en Vivo:
                    </span>
                    <div className="text-[11px] font-mono font-black text-amber-950">
                      {currency === 'VES' ? (
                        <span>
                          Bs. {formatVE(parseFloat(total) || 0)} ➔{' '}
                          <span className="text-emerald-700 font-bold">
                            $ {formatVE(convertBsToUsd(parseFloat(total) || 0, parseFloat(bcvRateInput) || getBcvRate()))} USD
                          </span>
                        </span>
                      ) : (
                        <span>
                          $ {formatVE(parseFloat(total) || 0)} USD ➔{' '}
                          <span className="text-emerald-700 font-bold">
                            Bs. {formatVE(convertUsdToBs(parseFloat(total) || 0, parseFloat(bcvRateInput) || getBcvRate()))}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-2 bg-white/90 border border-amber-200/70 rounded-lg flex items-center justify-between gap-2">
                  <p className="text-[10px] text-slate-600">
                    <strong>📄 Sin tasa BCV:</strong> Se registra sólo en <strong>{currency}</strong> sin conversión forzada.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setHasBcvRate(true);
                      if (!bcvRateInput || parseFloat(bcvRateInput) <= 0) {
                        setBcvRateInput(String(getBcvRate()));
                      }
                    }}
                    className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-[9px] font-bold whitespace-nowrap cursor-pointer"
                  >
                    + Añadir Tasa
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descripción / Detalle
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalle de la compra"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
