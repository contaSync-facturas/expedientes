import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileDown,
  FileSpreadsheet,
  Send,
  Copy,
  Check,
  Building2,
  User,
  ShieldCheck,
  Calendar,
  Sparkles,
  ExternalLink,
  Image as ImageIcon,
  Share2,
  FileText,
  Loader2,
  CheckCircle2,
  Camera,
  MapPin,
  Store,
  FileCheck,
} from 'lucide-react';
import { Transaction, MonthSummary, EntityType, CompanyProfile } from '../types/finance';
import {
  generateAccountantPDF,
  generateInvoicesDossierPDF,
  sharePdfFile,
  exportToCSV,
  generateAccountantMessage,
  formatCurrency,
  BranchReportItem,
} from '../services/pdfReportService';
import { formatVE, convertUsdToBs, getBcvRate } from '../services/currencyService';
import {
  getStoredCompanyProfile,
  saveStoredCompanyProfile,
  getStoredBranches,
} from '../services/storageService';

interface AccountantPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  currentMonthKey: string;
  monthSummary: MonthSummary;
  availableMonths: string[];
  onSelectMonth: (monthKey: string) => void;
  entityFilter: EntityType | 'todas';
  onOpenCompanyProfile?: () => void;
  onOpenBranches?: () => void;
}

export const AccountantPortalModal: React.FC<AccountantPortalModalProps> = ({
  isOpen,
  onClose,
  transactions,
  currentMonthKey,
  monthSummary,
  availableMonths,
  onSelectMonth,
  entityFilter,
  onOpenCompanyProfile,
  onOpenBranches,
}) => {
  const [selectedEntity, setSelectedEntity] = useState<EntityType | 'todas'>(
    entityFilter === 'todas' ? 'empresa' : entityFilter
  );
  const [selectedBranch, setSelectedBranch] = useState<string>('todas');
  const [selectedOperationType, setSelectedOperationType] = useState<'todos' | 'egresos' | 'ingresos'>('todos');
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(getStoredCompanyProfile());
  const [companyName, setCompanyName] = useState(getStoredCompanyProfile().name);
  const [companyTaxId, setCompanyTaxId] = useState(getStoredCompanyProfile().taxId);
  const [companyAddress, setCompanyAddress] = useState(getStoredCompanyProfile().address);
  const [copied, setCopied] = useState(false);
  const [isGeneratingDossier, setIsGeneratingDossier] = useState(false);
  const [isSharingDossier, setIsSharingDossier] = useState(false);
  const [dossierSuccess, setDossierSuccess] = useState<string | null>(null);

  useEffect(() => {
    const refreshProfile = () => {
      const p = getStoredCompanyProfile();
      setCompanyProfile(p);
      setCompanyName(p.name);
      setCompanyTaxId(p.taxId);
      setCompanyAddress(p.address);
    };

    if (isOpen) {
      refreshProfile();
    }

    window.addEventListener('contasync_company_profile_updated', refreshProfile);
    return () => {
      window.removeEventListener('contasync_company_profile_updated', refreshProfile);
    };
  }, [isOpen]);

  // Lista de sedes disponibles
  const availableBranches = useMemo(() => {
    const set = new Set<string>();
    const stored = getStoredBranches();
    stored.forEach((b) => set.add(b.name));
    transactions.forEach((t) => {
      if (t.entity === 'empresa' && t.branch) set.add(t.branch);
    });
    if (set.size === 0) {
      set.add('Sede Principal');
    }
    return Array.from(set);
  }, [transactions]);

  // Desglose de ingresos y egresos por sede para este mes
  const branchBreakdown: BranchReportItem[] = useMemo(() => {
    const monthEmpresaTx = transactions.filter(
      (t) => t.date.startsWith(currentMonthKey) && t.entity === 'empresa'
    );

    return availableBranches.map((bName) => {
      const bTx = monthEmpresaTx.filter(
        (t) => (t.branch || 'Lubricantes Asiáticos (Principal)') === bName
      );
      let income = 0;
      let expenses = 0;
      let vat = 0;
      bTx.forEach((t) => {
        if (t.type === 'ingreso') {
          income += t.total;
        } else {
          expenses += t.total;
          if (t.isDeductible && (t.documentType === 'factura_fiscal' || !t.documentType)) {
            vat += t.taxAmount;
          }
        }
      });
      return {
        branchName: bName,
        income,
        expenses,
        net: income - expenses,
        vat,
        count: bTx.length,
      };
    });
  }, [availableBranches, transactions, currentMonthKey]);

  // Transacciones filtradas por mes, entidad, sede y tipo de operación (compras/ventas)
  const filteredTx = useMemo(() => {
    return transactions.filter((t) => {
      const matchMonth = t.date.startsWith(currentMonthKey);
      const matchEntity = selectedEntity === 'todas' || t.entity === selectedEntity;
      const matchBranch =
        selectedEntity !== 'empresa' ||
        selectedBranch === 'todas' ||
        (t.branch || 'Lubricantes Asiáticos (Principal)') === selectedBranch;
      const matchOp =
        selectedOperationType === 'todos'
          ? true
          : selectedOperationType === 'ingresos'
          ? t.type === 'ingreso'
          : (t.type === 'gasto' || t.type === 'compra_activo');
      return matchMonth && matchEntity && matchBranch && matchOp;
    });
  }, [transactions, currentMonthKey, selectedEntity, selectedBranch, selectedOperationType]);

  // Resumen calculado dinámico para la selección
  const effectiveSummary: MonthSummary = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalPurchases = 0;
    let totalTaxDeductible = 0;
    let totalExemptAmount = 0;
    let receiptCount = 0;
    let totalStorageKb = 0;
    let pendingCount = 0;

    filteredTx.forEach((t) => {
      const isFiscal = t.documentType === 'factura_fiscal' || (!t.documentType && t.taxAmount > 0);
      if (t.type === 'ingreso') {
        totalIncome += t.total;
      } else if (t.type === 'compra_activo') {
        totalPurchases += t.total;
        if (t.isDeductible && isFiscal) totalTaxDeductible += t.taxAmount;
      } else {
        totalExpenses += t.total;
        if (t.isDeductible && isFiscal) totalTaxDeductible += t.taxAmount;
      }

      if (isFiscal && t.exemptAmount) totalExemptAmount += t.exemptAmount;

      if (t.receiptUrl || t.receiptSizeKb) {
        receiptCount++;
        totalStorageKb += t.receiptSizeKb || 45;
      }

      if (t.status === 'pendiente') pendingCount++;
    });

    return {
      monthKey: currentMonthKey,
      monthName: monthSummary.monthName,
      totalIncome,
      totalExpenses,
      totalPurchases,
      netBalance: totalIncome - (totalExpenses + totalPurchases),
      totalTaxDeductible,
      totalExemptAmount,
      receiptCount,
      totalStorageKb: Math.round(totalStorageKb),
      pendingCount,
    };
  }, [filteredTx, currentMonthKey, monthSummary.monthName]);

  if (!isOpen) return null;

  const bcvRate = getBcvRate();
  const messageText = generateAccountantMessage(
    effectiveSummary,
    selectedEntity,
    companyName,
    selectedEntity === 'empresa' && selectedBranch === 'todas' ? branchBreakdown : undefined
  );

  const handleUpdateProfile = (name: string, taxId: string, address: string) => {
    setCompanyName(name);
    setCompanyTaxId(taxId);
    setCompanyAddress(address);
    const updated: CompanyProfile = {
      ...companyProfile,
      name,
      taxId,
      address,
    };
    setCompanyProfile(updated);
    saveStoredCompanyProfile(updated);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPDF = () => {
    generateAccountantPDF(
      filteredTx,
      effectiveSummary,
      selectedEntity,
      companyName,
      selectedBranch,
      selectedEntity === 'empresa' && selectedBranch === 'todas' ? branchBreakdown : undefined
    );
  };

  const handleDownloadDossier = async () => {
    setIsGeneratingDossier(true);
    setDossierSuccess(null);
    try {
      await generateInvoicesDossierPDF(
        filteredTx,
        effectiveSummary,
        selectedEntity,
        companyName,
        true,
        selectedBranch,
        selectedEntity === 'empresa' && selectedBranch === 'todas' ? branchBreakdown : undefined
      );
      setDossierSuccess('¡Expediente PDF con fotos descargado con éxito!');
      setTimeout(() => setDossierSuccess(null), 4500);
    } catch (err) {
      console.error('Error generando dossier PDF:', err);
    } finally {
      setIsGeneratingDossier(false);
    }
  };

  const handleShareDossier = async () => {
    setIsSharingDossier(true);
    setDossierSuccess(null);
    try {
      const res = await generateInvoicesDossierPDF(
        filteredTx,
        effectiveSummary,
        selectedEntity,
        companyName,
        false,
        selectedBranch,
        selectedEntity === 'empresa' && selectedBranch === 'todas' ? branchBreakdown : undefined
      );
      const shared = await sharePdfFile(
        res.blob,
        res.filename,
        `Expediente de Facturas con Fotos - ${effectiveSummary.monthName}`,
        messageText
      );

      if (shared) {
        setDossierSuccess('¡Expediente compartido con éxito!');
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(res.blob);
        a.download = res.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);

        const encoded = encodeURIComponent(
          `${messageText}\n\n📌 *Archivo Adjunto:* Te he descargado el documento "${res.filename}" con el reporte y la foto completa de cada comprobante.`
        );
        const waLink = document.createElement('a');
        waLink.href = `https://wa.me/?text=${encoded}`;
        waLink.target = '_blank';
        waLink.rel = 'noopener noreferrer';
        document.body.appendChild(waLink);
        waLink.click();
        document.body.removeChild(waLink);
        setDossierSuccess('PDF con fotos descargado y WhatsApp abierto para adjuntarlo.');
      }
      setTimeout(() => setDossierSuccess(null), 5000);
    } catch (err) {
      console.error('Error compartiendo expediente PDF:', err);
    } finally {
      setIsSharingDossier(false);
    }
  };

  const handleExportCSV = () => {
    exportToCSV(filteredTx, currentMonthKey, selectedEntity);
  };

  const handleSendWhatsApp = () => {
    const encoded = encodeURIComponent(messageText);
    const waLink = document.createElement('a');
    waLink.href = `https://wa.me/?text=${encoded}`;
    waLink.target = '_blank';
    waLink.rel = 'noopener noreferrer';
    document.body.appendChild(waLink);
    waLink.click();
    document.body.removeChild(waLink);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Portal de Enlace para el Contador
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Cierre Fiscal Mes a Mes
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Genera el informe oficial en PDF, exporta libros en Excel o envía el paquete por enlace/WhatsApp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Controles de Selección: Mes y Entidad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Mes del Ejercicio Contable:
              </label>
              <select
                value={currentMonthKey}
                onChange={(e) => onSelectMonth(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {m} ({m === '2026-09' ? 'Septiembre 2026' : m === '2026-08' ? 'Agosto 2026' : m})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                Entidad a Reportar:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedEntity('empresa')}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all ${
                    selectedEntity === 'empresa'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  🏢 Empresa
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEntity('personal')}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all ${
                    selectedEntity === 'personal'
                      ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  👤 Personal
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEntity('todas')}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all ${
                    selectedEntity === 'todas'
                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  📊 Ambas
                </button>
              </div>
            </div>

            {selectedEntity === 'empresa' && (
              <div className="md:col-span-2 pt-3 border-t border-slate-200 space-y-3">
                {/* Razón Social, RIF y Domicilio Fiscal */}
                <div className="p-3 bg-white border border-blue-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <Building2 className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-blue-950">
                          {companyName || 'Lubricantes Asiáticos C.A.'}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-900 border border-blue-200">
                          RIF: {companyTaxId || 'J-31456789-0'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{companyAddress || 'Av. Principal Zona Industrial, Galpón 4-B, Valencia'}</span>
                      </p>
                    </div>
                  </div>

                  {onOpenCompanyProfile && (
                    <button
                      type="button"
                      onClick={onOpenCompanyProfile}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                      title="Editar Razón Social, RIF, Domicilio y datos de contacto de la empresa"
                    >
                      Modificar RIF y Domicilio
                    </button>
                  )}
                </div>

                {/* Selector de Sede para el Reporte */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs">
                  <span className="font-bold text-blue-950 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-blue-700" />
                    Filtrar Informe por Sede / Sucursal:
                  </span>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="px-3 py-1 bg-white border border-blue-300 rounded-xl font-bold text-xs text-blue-900 cursor-pointer shadow-2xs"
                  >
                    <option value="todas">🏢 Todas las Sedes (Consolidado Principal + Sucursal)</option>
                    {availableBranches.map((bName) => (
                      <option key={bName} value={bName}>
                        🏢 {bName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Filtro de Tipo de Movimiento: Ambos / Solo Egresos (Compras) / Solo Ingresos (Ventas) */}
            <div className="md:col-span-2 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                Comprobantes a Incluir en el Expediente / Reporte:
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedOperationType('todos')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedOperationType === 'todos'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  📊 Ambos (Consolidado)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOperationType('egresos')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedOperationType === 'egresos'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Expediente solo con facturas de compras, gastos y notas (Libro de Compras SENIAT)"
                >
                  🔴 Solo Egresos / Compras
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOperationType('ingresos')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedOperationType === 'ingresos'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Expediente solo con facturas de ventas emitidas (Libro de Ventas SENIAT)"
                >
                  🟢 Solo Ingresos / Ventas
                </button>
              </div>
            </div>
          </div>

          {/* Resumen de Cifras del Mes (Dinámico según Sede seleccionada) */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                Cifras para Declaración Mensual ({effectiveSummary.monthName})
                {selectedEntity === 'empresa' && selectedBranch !== 'todas' && (
                  <span className="ml-2 font-normal text-emerald-800 lowercase">
                    — solo {selectedBranch}
                  </span>
                )}
              </h3>
              <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                {selectedEntity === 'empresa' ? (selectedBranch === 'todas' ? 'Consolidado Todas las Sedes' : selectedBranch) : 'Personal'}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Ingresos Facturados</span>
                <span className="text-sm font-bold text-emerald-700">
                  {formatCurrency(effectiveSummary.totalIncome)}
                </span>
                <span className="text-[10px] text-slate-400 block font-mono">
                  Bs. {formatVE(convertUsdToBs(effectiveSummary.totalIncome, bcvRate))}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Gastos & Compras</span>
                <span className="text-sm font-bold text-red-600">
                  {formatCurrency(effectiveSummary.totalExpenses + effectiveSummary.totalPurchases)}
                </span>
                <span className="text-[10px] text-slate-400 block font-mono">
                  Bs. {formatVE(convertUsdToBs(effectiveSummary.totalExpenses + effectiveSummary.totalPurchases, bcvRate))}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-xs">
                <span className="text-[10px] text-blue-600 font-bold uppercase block">IVA Crédito Deducible</span>
                <span className="text-sm font-bold text-blue-700">
                  {formatCurrency(effectiveSummary.totalTaxDeductible)}
                </span>
                <span className="text-[10px] text-slate-400 block font-mono">
                  Bs. {formatVE(convertUsdToBs(effectiveSummary.totalTaxDeductible, bcvRate))}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Comprobantes Digitales</span>
                <span className="text-sm font-bold text-slate-800">
                  {filteredTx.length} items (~{effectiveSummary.totalStorageKb} KB)
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold block">
                  Neto: ${formatVE(effectiveSummary.netBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* TABLA DE BALANCE DE INGRESOS Y EGRESOS POR SEDES (SOLO EMPRESA) */}
          {selectedEntity === 'empresa' && branchBreakdown.length > 0 && (
            <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <Store className="w-3.5 h-3.5 text-blue-600" />
                  Estado de Ingresos y Egresos por Sede (Mes en Curso)
                </h4>
                {onOpenBranches && (
                  <button
                    type="button"
                    onClick={onOpenBranches}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    + Sedes / Sucursales
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-2 px-3">Sede / Sucursal</th>
                      <th className="py-2 px-3 text-right">Ingresos</th>
                      <th className="py-2 px-3 text-right">Egresos & Insumos</th>
                      <th className="py-2 px-3 text-right">IVA Crédito</th>
                      <th className="py-2 px-3 text-right">Balance Neto</th>
                      <th className="py-2 px-3 text-center">Items</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {branchBreakdown.map((b) => (
                      <tr key={b.branchName} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                          <span>🏢</span>
                          <span>{b.branchName}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                          ${formatVE(b.income)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-red-600">
                          ${formatVE(b.expenses)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                          ${formatVE(b.vat)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          <span className={b.net >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                            ${formatVE(b.net)}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-600">
                          {b.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Alerta de éxito */}
          {dossierSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{dossierSuccess}</span>
            </div>
          )}

          {/* TARJETA DESTACADA: EXPEDIENTE FOTOGRÁFICO EN PDF CON TODAS LAS FOTOS */}
          <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl shadow-xl border border-slate-700/60 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950">
                  ★ Función Principal
                </span>
                <span className="text-[10px] font-bold text-slate-300">
                  {filteredTx.length} Comprobantes Listos
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                Tasa BCV: Bs. {formatVE(bcvRate)}
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold flex items-center gap-2 tracking-tight">
                <Camera className="w-5 h-5 text-emerald-400" />
                Expediente PDF con Fotos de Facturas y Comprobantes
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Genera y comparte un único documento PDF con el resumen contable, el índice general y <strong>la foto en alta resolución de cada factura escaneada</strong>, con su desglose del 16% de IVA y RIF para auditoría inmediata.
              </p>
            </div>

            {/* Botones Principales de Acción */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                disabled={isGeneratingDossier || isSharingDossier}
                onClick={handleDownloadDossier}
                className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-slate-950 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                {isGeneratingDossier ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Compilando Fotos en PDF...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4 text-slate-950" />
                    <span>Descargar PDF con Todas las Fotos</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isGeneratingDossier || isSharingDossier}
                onClick={handleShareDossier}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 disabled:opacity-50 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                title="Compartir directo a WhatsApp o aplicaciones compatibles"
              >
                {isSharingDossier ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Preparando para Enviar...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-emerald-400" />
                    <span>Compartir PDF (WhatsApp / Correo)</span>
                  </>
                )}
              </button>
            </div>

            {/* Miniatura / Lista de Comprobantes incluidos */}
            <div className="pt-2 border-t border-slate-700/60">
              <div className="text-[11px] font-bold text-slate-300 mb-2 flex items-center justify-between">
                <span>Comprobantes que se incluirán en el expediente:</span>
                <span className="text-[10px] text-emerald-400">{filteredTx.length} facturas indexadas</span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {filteredTx.map((tx, idx) => (
                  <div
                    key={tx.id}
                    className="p-2 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-white block flex items-center gap-1.5">
                          {tx.supplier}
                          {tx.documentType === 'nota_entrega' && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold">
                              Nota Entrega (No Deduc.)
                            </span>
                          )}
                          {tx.documentType === 'ticket_punto_venta' && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 font-semibold">
                              Ticket POS (No Deduc.)
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {tx.date} • {tx.taxId ? `RIF: ${tx.taxId}` : 'S/R'} • {tx.invoiceNumber ? `#${tx.invoiceNumber}` : tx.referenceNumber ? `Ref: ${tx.referenceNumber}` : 'S/N'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-emerald-400">
                        $ {formatVE(tx.totalUsd || tx.total)}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Bs. {formatVE(tx.totalBs || convertUsdToBs(tx.total, bcvRate))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Opciones Secundarias: Resumen Tabular y CSV */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="p-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl shadow-xs text-left transition-all group flex items-start gap-3 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900">Informe Tabular Resumido (PDF)</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Libro diario compacto en tabla sin imágenes embebidas, ideal para imprimir rápido.
                </p>
                <span className="inline-block mt-2 text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                  Descargar Resumen PDF
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="p-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl shadow-xs text-left transition-all group flex items-start gap-3 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900">Exportar Libro en Excel (CSV)</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Compatible con software contable (Contpaqi, Siigo, Alegra, QuickBooks, Excel).
                </p>
                <span className="inline-block mt-2 text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                  Descargar CSV (.csv)
                </span>
              </div>
            </button>
          </div>

          {/* Redacción de Mensaje / Enlace para Enviar al Contador */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-600" />
                Mensaje de Cierre Mensual para el Contador
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-xs transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copiar Texto
                  </>
                )}
              </button>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-mono whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto select-all">
              {messageText}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Enviar por WhatsApp al Contador
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
