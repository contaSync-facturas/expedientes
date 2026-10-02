import React, { useState } from 'react';
import {
  Search,
  Filter,
  FileText,
  Download,
  Trash2,
  Edit2,
  Building2,
  User,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  Sparkles,
  Zap,
  CreditCard,
  Smartphone,
  Receipt,
  Users,
  FileDown,
  Share2,
  Camera,
} from 'lucide-react';
import { Transaction, EntityType, TransactionType, DocumentType } from '../types/finance';
import { formatCurrency, generateSingleInvoicePDF } from '../services/pdfReportService';
import { getBcvRate, getBcvRateForDate, convertUsdToBs, convertBsToUsd, formatVE } from '../services/currencyService';

interface TransactionListProps {
  transactions: Transaction[];
  currentMonthKey: string;
  entityFilter: EntityType | 'todas';
  onViewReceipt: (tx: Transaction) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onOpenScanner: () => void;
  onOpenManual: () => void;
  onOpenAccountantPortal?: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  currentMonthKey,
  entityFilter,
  onViewReceipt,
  onEditTransaction,
  onDeleteTransaction,
  onOpenScanner,
  onOpenManual,
  onOpenAccountantPortal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'todos' | TransactionType>('todos');
  const [docFilter, setDocFilter] = useState<'todos' | DocumentType>('todos');
  const [branchFilter, setBranchFilter] = useState<string>('todas');
  const [onlyWithReceipt, setOnlyWithReceipt] = useState(false);
  const [onlyDeductible, setOnlyDeductible] = useState(false);

  // Extraer lista única de sedes de las transacciones de empresa
  const availableBranches = React.useMemo(() => {
    const set = new Set<string>();
    set.add('Lubricantes Asiáticos (Principal)');
    set.add('Lubricantes Asiáticos (Sucursal)');
    transactions.forEach((t) => {
      if (t.entity === 'empresa' && t.branch) {
        set.add(t.branch);
      }
    });
    return Array.from(set);
  }, [transactions]);

  // Filtrado de transacciones
  const filtered = transactions.filter((tx) => {
    // Mes
    const matchMonth = tx.date.startsWith(currentMonthKey);
    if (!matchMonth) return false;

    // Entidad
    if (entityFilter !== 'todas' && tx.entity !== entityFilter) return false;

    // Sede (solo para formato empresa)
    if (branchFilter !== 'todas' && tx.entity === 'empresa') {
      const txBranch = tx.branch || 'Lubricantes Asiáticos (Principal)';
      if (txBranch !== branchFilter) return false;
    }

    // Tipo
    if (typeFilter !== 'todos' && tx.type !== typeFilter) return false;

    // Tipo de Documento
    if (docFilter !== 'todos' && tx.documentType !== docFilter) return false;

    // Con comprobante
    if (onlyWithReceipt && !tx.receiptUrl && !tx.receiptSizeKb) return false;

    // Deducibles
    if (onlyDeductible && !tx.isDeductible) return false;

    // Búsqueda de texto
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchSupplier = tx.supplier.toLowerCase().includes(q);
      const matchInvoice = (tx.invoiceNumber || '').toLowerCase().includes(q);
      const matchTaxId = (tx.taxId || '').toLowerCase().includes(q);
      const matchRef = (tx.referenceNumber || '').toLowerCase().includes(q);
      const matchCategory = tx.category.toLowerCase().includes(q);
      const matchPerson = (tx.assignedPerson || '').toLowerCase().includes(q);
      const matchBranch = (tx.branch || '').toLowerCase().includes(q);
      const matchDesc = (tx.description || '').toLowerCase().includes(q);
      if (
        !matchSupplier &&
        !matchInvoice &&
        !matchTaxId &&
        !matchRef &&
        !matchCategory &&
        !matchPerson &&
        !matchBranch &&
        !matchDesc
      ) {
        return false;
      }
    }

    return true;
  });

  const getDocTypeBadge = (docType?: DocumentType) => {
    switch (docType) {
      case 'nota_entrega':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200" title="Documento no deducible para el SENIAT">
            Nota Entrega (No Deduc.)
          </span>
        );
      case 'ticket_punto_venta':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200" title="Documento no deducible para el SENIAT">
            Ticket POS (No Deduc.)
          </span>
        );
      case 'factura_fiscal':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
            Factura Fiscal
          </span>
        );
    }
  };

  const getPaymentMethodLabel = (pm: string) => {
    switch (pm) {
      case 'punto_venta':
        return 'Punto de Venta';
      case 'pago_movil':
        return 'Pago Móvil';
      case 'transferencia':
        return 'Transferencia';
      case 'dolares_efectivo':
        return 'Dólares Efectivo';
      case 'efectivo_bs':
        return 'Efectivo Bs.';
      case 'usdt_binance':
        return 'USDT Binance';
      default:
        return pm;
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Search & Filter Toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Buscar por comercio, factura #, RIF, ref. POS o persona..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs text-slate-800 bg-transparent focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Tipo de Movimiento */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setTypeFilter('todos')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                typeFilter === 'todos'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('gasto')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                typeFilter === 'gasto'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gastos
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('ingreso')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                typeFilter === 'ingreso'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ingresos
            </button>
          </div>

          {/* Filtro Sede de la Empresa (solo visible en formato empresa o vista combinada) */}
          {entityFilter !== 'personal' && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-blue-50/80 border border-blue-200 text-blue-950 rounded-xl font-bold text-xs cursor-pointer shadow-2xs hover:bg-blue-100/60 transition-colors"
              title="Filtrar facturas por Sede / Sucursal"
            >
              <option value="todas">🏢 Todas las Sedes (Consolidado)</option>
              {availableBranches.map((bName) => (
                <option key={bName} value={bName}>
                  🏢 {bName}
                </option>
              ))}
            </select>
          )}

          {/* Filtro Tipo de Documento */}
          <select
            value={docFilter}
            onChange={(e) => setDocFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 cursor-pointer"
          >
            <option value="todos">Todos los comprobantes</option>
            <option value="factura_fiscal">Solo Facturas Fiscales (16%)</option>
            <option value="nota_entrega">Solo Notas de Entrega</option>
            <option value="ticket_punto_venta">Solo Tickets / Vouchers POS</option>
          </select>

          {/* Filtro Recibos */}
          <button
            type="button"
            onClick={() => setOnlyWithReceipt(!onlyWithReceipt)}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-medium transition-all cursor-pointer ${
              onlyWithReceipt
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            Con Comprobante
          </button>

          {/* Botón Destacado: Compartir Expediente PDF con Fotos */}
          {onOpenAccountantPortal && (
            <button
              type="button"
              onClick={onOpenAccountantPortal}
              className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 flex items-center gap-1.5 font-bold transition-all cursor-pointer shadow-2xs"
              title="Generar y compartir el expediente PDF con todas las fotos de facturas"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-700" />
              <span>Expediente PDF con Fotos</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Fecha</th>
              <th className="py-3 px-4">Entidad / Persona</th>
              <th className="py-3 px-4">Comprobante & Comercio</th>
              <th className="py-3 px-4">Categoría & Pago</th>
              <th className="py-3 px-4 text-right">Base / Exento</th>
              <th className="py-3 px-4 text-right">IVA (16%)</th>
              <th className="py-3 px-4 text-right">Total</th>
              <th className="py-3 px-4 text-center">Foto</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-600 text-sm">
                    No se encontraron movimientos registrados en este período
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Escanea una factura fiscal, nota de entrega o voucher POS para descontar del presupuesto mensual.
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button
                      onClick={onOpenScanner}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Escanear Comprobante
                    </button>
                    <button
                      onClick={onOpenManual}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Registrar Manual
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((tx) => {
                const isIncome = tx.type === 'ingreso';
                const isAsset = tx.type === 'compra_activo';

                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Fecha */}
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {tx.date}
                    </td>

                    {/* Entidad y Persona */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {tx.entity === 'empresa' ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 w-fit">
                            <Building2 className="w-2.5 h-2.5" />
                            Empresa
                          </span>
                          <span
                            className="text-[11px] font-bold text-slate-800 flex items-center gap-1"
                            title={`Sede: ${tx.branch || 'Lubricantes Asiáticos (Principal)'}`}
                          >
                            🏢 {tx.branch || 'Lubricantes Asiáticos (Principal)'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 w-fit">
                            <User className="w-2.5 h-2.5" />
                            Personal
                          </span>
                          {tx.assignedPerson && (
                            <span className="text-[11px] font-bold text-slate-700">
                              👤 {tx.assignedPerson}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Comprobante & Comercio */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getDocTypeBadge(tx.documentType)}
                        <span className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {tx.supplier}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                        {tx.invoiceNumber && (
                          <span className="font-mono text-slate-600 font-medium">
                            #{tx.invoiceNumber}
                          </span>
                        )}
                        {tx.taxId && <span>RIF: {tx.taxId}</span>}
                        {tx.referenceNumber && (
                          <span className="bg-slate-100 px-1.5 py-0.2 rounded text-[10px] text-slate-600 font-mono">
                            Ref: {tx.referenceNumber}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Categoría & Método de Pago */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{tx.category}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {getPaymentMethodLabel(tx.paymentMethod)}
                      </div>
                    </td>

                    {/* Base Imponible / Monto Exento */}
                    <td className="py-3 px-4 text-right font-mono text-slate-600 whitespace-nowrap">
                      {tx.documentType && tx.documentType !== 'factura_fiscal' ? (
                        <span className="text-[10px] text-amber-800 font-sans font-medium px-1.5 py-0.5 bg-amber-50 rounded border border-amber-200/60" title="Documento no deducible para el SENIAT">
                          No Deducible
                        </span>
                      ) : (
                        <>
                          {tx.subtotal > 0 && (
                            <div>Base: {formatCurrency(tx.subtotal, tx.currency)}</div>
                          )}
                          {tx.exemptAmount !== undefined && tx.exemptAmount > 0 && (
                            <div className="text-[10px] text-slate-400">
                              Exento: {formatCurrency(tx.exemptAmount, tx.currency)}
                            </div>
                          )}
                          {tx.subtotal === 0 && (!tx.exemptAmount || tx.exemptAmount === 0) && (
                            <span>-</span>
                          )}
                        </>
                      )}
                    </td>

                    {/* IVA 16% */}
                    <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                      {tx.documentType && tx.documentType !== 'factura_fiscal' ? (
                        <span className="text-slate-400 font-sans text-[11px] italic" title="No lleva IVA ni genera crédito fiscal">
                          Sin IVA
                        </span>
                      ) : tx.taxAmount > 0 ? (
                        <span className="text-blue-700 font-medium">{formatCurrency(tx.taxAmount, tx.currency)}</span>
                      ) : (
                        <span className="text-slate-300 text-[11px]">0%</span>
                      )}
                    </td>

                    {/* Total con Dualidad Monetaria */}
                    <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                      <div>
                        <span
                          className={`text-sm font-black ${
                            isIncome
                              ? 'text-emerald-600'
                              : isAsset
                              ? 'text-amber-700'
                              : 'text-slate-900'
                          }`}
                        >
                          {isIncome ? '+' : '-'} {tx.currency === 'VES' ? `Bs. ${formatVE(tx.total)}` : `$ ${formatVE(tx.total)}`}
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                        {(() => {
                          const effectiveRate = tx.exchangeRateBcv && tx.exchangeRateBcv > 0
                            ? tx.exchangeRateBcv
                            : getBcvRateForDate(tx.date);
                          const dayLabel = tx.date ? `${tx.date.slice(8, 10)}/${tx.date.slice(5, 7)}` : '';

                          return tx.currency === 'VES' ? (
                            <span className="text-emerald-700 font-bold">
                              ≈ $ {formatVE(tx.totalUsd !== undefined ? tx.totalUsd : convertBsToUsd(tx.total, effectiveRate))} USD
                              <span className="text-[9px] text-slate-400 font-normal ml-1">
                                (BCV {dayLabel}: {formatVE(effectiveRate)})
                              </span>
                            </span>
                          ) : (
                            <span className="text-amber-800 font-bold">
                              ≈ Bs. {formatVE(tx.totalBs !== undefined ? tx.totalBs : convertUsdToBs(tx.total, effectiveRate))}
                              <span className="text-[9px] text-slate-400 font-normal ml-1">
                                (BCV {dayLabel}: {formatVE(effectiveRate)})
                              </span>
                            </span>
                          );
                        })()}
                      </div>
                    </td>

                    {/* Comprobante Digital */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {tx.receiptUrl || tx.receiptSizeKb ? (
                        <button
                          type="button"
                          onClick={() => onViewReceipt(tx)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold border border-emerald-200 transition-all cursor-pointer shadow-2xs"
                          title="Ver imagen y compartir PDF del comprobante"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{tx.receiptSizeKb ? `${tx.receiptSizeKb} KB` : 'Ver'}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-300 italic">
                          Sin foto
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {/* Ver y Compartir PDF del Comprobante */}
                        <button
                          type="button"
                          onClick={() => onViewReceipt(tx)}
                          title="Ver comprobante y opciones de Compartir PDF"
                          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                        {/* Descargar PDF Directo */}
                        <button
                          type="button"
                          onClick={() => generateSingleInvoicePDF(tx, 'Distribuidora & Servicios Tecnológicos C.A.', true)}
                          title="Descargar PDF de esta factura"
                          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <FileDown className="w-3.5 h-3.5 text-slate-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditTransaction(tx)}
                          title="Editar"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`¿Eliminar el comprobante de ${tx.supplier}?`)) {
                              onDeleteTransaction(tx.id);
                            }
                          }}
                          title="Eliminar"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Mostrando {filtered.length} comprobantes</span>
        <span className="text-[11px]">
          Facturas fiscales con IVA 16%, Notas de Entrega y Tickets POS respaldados en Supabase.
        </span>
      </div>
    </div>
  );
};
