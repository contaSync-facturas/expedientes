import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Camera,
  Sparkles,
  Zap,
  Check,
  AlertCircle,
  Building2,
  User,
  Shield,
  FileCheck,
  PlusCircle,
  FolderTree,
  CreditCard,
  Smartphone,
  Receipt,
  FileText,
  DollarSign,
  Users,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  Package,
} from 'lucide-react';
import { compressReceiptImage, CompressionResult } from '../services/imageCompression';
import { uploadReceiptToSupabase } from '../services/supabaseService';
import { getStoredPersons, getStoredBranches } from '../services/storageService';
import { getBcvRate, getBcvRateForDate, convertUsdToBs, convertBsToUsd, formatVE, round2 } from '../services/currencyService';
import {
  Transaction,
  EntityType,
  TransactionType,
  PaymentMethod,
  DocumentType,
  Person,
  CompanyBranch,
} from '../types/finance';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionSaved: (tx: Transaction) => void;
  defaultEntity: EntityType;
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

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  onTransactionSaved,
  defaultEntity,
}) => {
  // Entidad obligatoria: Empresa o Personal
  const [entity, setEntity] = useState<EntityType>(defaultEntity);

  // Tipo de documento: Factura Fiscal, Nota de Entrega o Ticket POS
  const [documentType, setDocumentType] = useState<DocumentType>('factura_fiscal');

  // Modo de escaneo: con IA o directo
  const [useAiOcr, setUseAiOcr] = useState<boolean>(true);

  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<CompressionResult | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  // Personas adheridas (para Finanzas Personales)
  const [persons, setPersons] = useState<Person[]>([]);
  const [assignedPerson, setAssignedPerson] = useState<string>('Titular Principal');

  // Sedes / Sucursales de la Empresa (solo para Formato Empresa)
  const [branches, setBranches] = useState<CompanyBranch[]>([]);
  const [branch, setBranch] = useState<string>('Lubricantes Asiáticos (Principal)');

  // Form fields
  const [type, setType] = useState<TransactionType>('gasto');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [supplier, setSupplier] = useState<string>('');
  const [taxId, setTaxId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);

  // Desglose fiscal (IVA Venezuela 16% o Monto Único / Exento)
  const [subtotal, setSubtotal] = useState<string>(''); // Base imponible
  const [taxRate, setTaxRate] = useState<string>('16'); // 16% en Venezuela
  const [taxAmount, setTaxAmount] = useState<string>('');
  const [exemptAmount, setExemptAmount] = useState<string>('0'); // Monto exento
  const [total, setTotal] = useState<string>('');
  const [currency, setCurrency] = useState<string>('USD');
  const [hasBcvRate, setHasBcvRate] = useState<boolean>(true);
  const [bcvRateInput, setBcvRateInput] = useState<string>(String(getBcvRate()));
  const [description, setDescription] = useState<string>('');
  const [isDeductible, setIsDeductible] = useState<boolean>(defaultEntity === 'empresa');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('punto_venta');
  const [hasScanned, setHasScanned] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const defaultRate = getBcvRate();
      setBcvRateInput(String(defaultRate));
      setHasBcvRate(true);
      setEntity(defaultEntity);
      setIsDeductible(defaultEntity === 'empresa');
      const loadedPersons = getStoredPersons();
      setPersons(loadedPersons);
      if (loadedPersons.length > 0) {
        setAssignedPerson(loadedPersons[0].name);
      }
      const loadedBranches = getStoredBranches();
      setBranches(loadedBranches);
      if (loadedBranches.length > 0) {
        setBranch(loadedBranches[0].name);
      }
    }
  }, [isOpen, defaultEntity]);

  if (!isOpen) return null;

  const handleEntityChange = (newEntity: EntityType) => {
    setEntity(newEntity);
    setIsDeductible(newEntity === 'empresa');
  };

  const handleDocumentTypeChange = (newDocType: DocumentType) => {
    setDocumentType(newDocType);
    if (newDocType === 'nota_entrega' || newDocType === 'ticket_punto_venta') {
      // Monto único sin desglose de IVA (No deducible SENIAT)
      setTaxRate('0');
      setTaxAmount('0');
      setSubtotal('0');
      setExemptAmount('0');
      setIsDeductible(false);
      if (newDocType === 'ticket_punto_venta') {
        setPaymentMethod('punto_venta');
      }
    } else {
      // Factura fiscal normal con IVA 16%
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
      // Monto referencial único sin IVA
      setSubtotal('0');
      setTaxAmount('0');
      setExemptAmount('0');
      setIsDeductible(false);
      return;
    }

    // Si es factura fiscal y no hay monto exento, sugerir base + 16%
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

  const handleFileProcess = async (selectedFile: File) => {
    setError(null);
    setAiNotice(null);
    setFile(selectedFile);
    setIsCompressing(true);

    try {
      // Compresión client-side a WebP ultraliviano
      const compressed = await compressReceiptImage(selectedFile, 1280, 1280, 0.78);
      setCompressionInfo(compressed);
      setImagePreview(compressed.dataUrl);
      setIsCompressing(false);

      if (useAiOcr) {
        await runGeminiOCR(compressed.dataUrl, compressed.mimeType);
      }
    } catch (err: any) {
      console.error('Error procesando imagen:', err);
      setIsCompressing(false);
      setError('No se pudo procesar la imagen: ' + (err.message || 'Error desconocido'));
    }
  };

  const runGeminiOCR = async (base64Data: string, mime: string) => {
    setIsScanning(true);
    setError(null);
    setAiNotice(null);

    try {
      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: mime,
          targetEntity: entity,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.warn('Fallo OCR con Gemini:', result.error);
        setAiNotice('Lectura automática con IA no disponible. Puedes completar los datos y guardar normalmente.');
        return;
      }

      const { data } = result;

      if (data.supplier) setSupplier(data.supplier);
      if (data.taxId) setTaxId(data.taxId);
      if (data.invoiceNumber) setInvoiceNumber(data.invoiceNumber);
      if (data.referenceNumber) setReferenceNumber(data.referenceNumber);
      if (data.date) setDate(data.date);
      if (data.currency) setCurrency(data.currency);

      if (data.exchangeRateBcv !== undefined && data.exchangeRateBcv !== null && Number(data.exchangeRateBcv) > 0) {
        setBcvRateInput(String(data.exchangeRateBcv));
        setHasBcvRate(true);
      } else {
        // Tasa BCV del día de emisión de la factura
        const emissionDate = data.date || date || new Date().toISOString().slice(0, 10);
        const rateForDate = getBcvRateForDate(emissionDate);
        setBcvRateInput(String(rateForDate));
        setHasBcvRate(true);
      }

      if (data.documentType === 'nota_entrega' || data.documentType === 'ticket_punto_venta') {
        setDocumentType(data.documentType);
        setSubtotal('0');
        setTaxRate('0');
        setTaxAmount('0');
        setExemptAmount('0');
        setIsDeductible(false);
      } else {
        if (data.documentType === 'factura_fiscal') {
          setDocumentType('factura_fiscal');
        }
        if (data.exemptAmount !== undefined && data.exemptAmount > 0) {
          setExemptAmount(String(data.exemptAmount));
        }
        if (data.subtotal !== undefined && data.subtotal > 0) {
          setSubtotal(String(data.subtotal));
        }
        if (data.taxRate !== undefined) {
          setTaxRate(String(data.taxRate));
        } else {
          setTaxRate('16');
        }
        if (data.taxAmount !== undefined && data.taxAmount > 0) {
          setTaxAmount(String(data.taxAmount));
        }
      }

      if (data.paymentMethod) {
        setPaymentMethod(data.paymentMethod as PaymentMethod);
      }

      if (data.total !== undefined && data.total > 0) {
        setTotal(String(data.total));
      }

      if (data.description) setDescription(data.description);

      if (data.category) {
        const matched = CATEGORIES.find((c) =>
          c.toLowerCase().includes(data.category.toLowerCase()) ||
          data.category.toLowerCase().includes(c.toLowerCase())
        );
        if (matched) setCategory(matched);
      }

      if (data.type === 'ingreso' || data.type === 'compra_activo' || data.type === 'gasto') {
        setType(data.type);
      }

      if (data.branch && branches.length > 0) {
        const branchLower = data.branch.toLowerCase();
        const matchedBranch = branches.find((b) =>
          b.name.toLowerCase().includes(branchLower) || branchLower.includes(b.name.toLowerCase()) ||
          (b.code && branchLower.includes(b.code.toLowerCase()))
        );
        if (matchedBranch) {
          setBranch(matchedBranch.name);
        }
      }

      setHasScanned(true);
    } catch (err: any) {
      console.warn('Error en escaneo con Gemini:', err);
      setAiNotice('Nota: No se pudo conectar con la API de IA. Los datos se pueden ingresar manualmente.');
    } finally {
      setIsScanning(false);
    }
  };

  const resetFormForNext = () => {
    setFile(null);
    setImagePreview(null);
    setCompressionInfo(null);
    setSupplier('');
    setTaxId('');
    setInvoiceNumber('');
    setReferenceNumber('');
    setSubtotal('');
    setTaxAmount('');
    setExemptAmount('0');
    setTotal('');
    setDescription('');
    const defaultRate = getBcvRate();
    setBcvRateInput(String(defaultRate));
    setHasBcvRate(true);
    setHasScanned(false);
    setError(null);
    setAiNotice(null);
  };

  const handleSaveInvoice = async (scanAnother = false) => {
    if (!supplier.trim() || !total) {
      setError('Por favor indica al menos el nombre del comercio/proveedor y el monto total.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      let receiptUrl = imagePreview || undefined;
      let receiptStoragePath: string | undefined = undefined;

      // Subir imagen ultraliviana a Supabase Storage
      if (compressionInfo?.blob) {
        const cleanName = `${date}_${invoiceNumber || referenceNumber || Date.now()}.${compressionInfo.mimeType.includes('webp') ? 'webp' : 'jpg'}`;
        const uploadRes = await uploadReceiptToSupabase(compressionInfo.blob, cleanName, entity, date);
        if (uploadRes) {
          receiptUrl = uploadRes.url;
          receiptStoragePath = uploadRes.path;
        }
      }

      const isFiscalDoc = documentType === 'factura_fiscal';
      const numSubtotal = isFiscalDoc ? round2(parseFloat(subtotal) || 0) : 0;
      const numTax = isFiscalDoc ? round2(parseFloat(taxAmount) || 0) : 0;
      const numExempt = isFiscalDoc ? round2(parseFloat(exemptAmount) || 0) : 0;
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
        subtotalBs = isFiscalDoc ? convertUsdToBs(numSubtotal, effectiveRate) : 0;
        taxAmountBs = isFiscalDoc ? convertUsdToBs(numTax, effectiveRate) : 0;
        exemptAmountBs = isFiscalDoc ? convertUsdToBs(numExempt, effectiveRate) : 0;
      }

      const newTx: Transaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
        taxRate: isFiscalDoc ? (parseFloat(taxRate) || 16) : 0,
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
        receiptUrl,
        receiptStoragePath,
        receiptSizeKb: compressionInfo?.compressedSizeKb,
        originalSizeKb: compressionInfo?.originalSizeKb,
        isDeductible: (entity === 'empresa' && isFiscalDoc) ? isDeductible : false,
        status: 'pagado',
        paymentMethod,
        assignedPerson: entity === 'personal' ? assignedPerson : undefined,
        branch: entity === 'empresa' ? branch : undefined,
        syncedWithSupabase: false,
        createdAt: new Date().toISOString(),
      };

      onTransactionSaved(newTx);

      if (scanAnother) {
        resetFormForNext();
        setIsSaving(false);
      } else {
        setIsSaving(false);
        onClose();
      }
    } catch (err: any) {
      console.error('Error guardando factura:', err);
      setError('No se pudo guardar la factura: ' + err.message);
      setIsSaving(false);
    }
  };

  const [yearStr, monthStr] = (date || new Date().toISOString().slice(0, 10)).split('-');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Escanear y Guardar Comprobante
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  IVA 16% • Notas • POS
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Almacena el comprobante en Supabase y deduce del presupuesto mensual
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

        {/* PASO 1: SELECCIÓN OBLIGATORIA DE ENTIDAD */}
        <div className="px-6 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-extrabold text-xs flex items-center justify-center">
              1
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              ¿A quién corresponde este comprobante?
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleEntityChange('empresa')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                entity === 'empresa'
                  ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300'
                  : 'bg-slate-700/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>EMPRESA (Persona Jurídica)</span>
              {entity === 'empresa' && <Check className="w-3.5 h-3.5 ml-1" />}
            </button>

            <button
              type="button"
              onClick={() => handleEntityChange('personal')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                entity === 'personal'
                  ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-300'
                  : 'bg-slate-700/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <User className="w-4 h-4" />
              <span>FINANZAS PERSONALES</span>
              {entity === 'personal' && <Check className="w-3.5 h-3.5 ml-1" />}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {aiNotice && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>{aiNotice}</span>
            </div>
          )}

          {/* SELECTOR DE TIPO DE OPERACIÓN: INGRESO vs EGRESO vs ACTIVO */}
          <div className="p-3.5 bg-gradient-to-r from-slate-50 to-slate-100/90 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <label className="block text-xs font-extrabold text-slate-800">
                Tipo de Operación {entity === 'empresa' ? '(Empresa)' : '(Finanzas Personales)'}:
              </label>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                type === 'ingreso'
                  ? 'bg-emerald-100 text-emerald-800'
                  : type === 'compra_activo'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {type === 'ingreso'
                  ? '🟢 INGRESO: Factura emitida a cliente'
                  : type === 'compra_activo'
                  ? '📦 ACTIVO: Compra de bienes duraderos'
                  : '🔴 EGRESO: Factura, Nota o Recibo/Ticket'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  type === 'ingreso'
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-xs text-slate-900">1. INGRESO (Factura)</h4>
                  <p className="text-[11px] text-slate-500">
                    {entity === 'empresa'
                      ? 'Factura emitida a cliente por ventas o servicios'
                      : 'Sueldo, honorarios o ingresos cobrados'}
                  </p>
                </div>
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
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  type === 'gasto'
                    ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <TrendingDown className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-xs text-slate-900">2. EGRESO (Gasto/Compra)</h4>
                  <p className="text-[11px] text-slate-500">
                    Facturas de compras, notas de entrega o tickets
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('compra_activo');
                  setIsDeductible(entity === 'empresa');
                  setCategory('Equipos de Cómputo & Activos');
                }}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  type === 'compra_activo'
                    ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Package className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-xs text-slate-900">3. COMPRA DE ACTIVO</h4>
                  <p className="text-[11px] text-slate-500">
                    Maquinarias, equipos, herramientas o vehículos
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Selector de Tipo de Comprobante: Factura Fiscal vs Nota de Entrega vs Ticket POS */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold text-slate-800">
                Tipo de Comprobante {type === 'ingreso' ? 'del Ingreso:' : 'del Egreso:'}
              </label>
              <span className="text-[10px] text-slate-500">
                {type === 'ingreso'
                  ? 'Factura con RIF y control fiscal emitida por tu empresa'
                  : 'Soporta facturas fiscales SENIAT 16%, notas de entrega y tickets POS'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDocumentTypeChange('factura_fiscal')}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  documentType === 'factura_fiscal'
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Receipt className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-xs text-slate-900">
                    {type === 'ingreso' ? 'Factura Fiscal de Venta' : 'Factura Fiscal de Proveedor'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {type === 'ingreso'
                      ? 'Con RIF, IVA 16% facturado y/o exentos'
                      : 'Con RIF, IVA 16% deducible y/o exentos'}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDocumentTypeChange('nota_entrega')}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  documentType === 'nota_entrega'
                    ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Nota de Entrega</h4>
                  <p className="text-[11px] text-slate-500">
                    Monto total único sin desglose de IVA
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDocumentTypeChange('ticket_punto_venta')}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  documentType === 'ticket_punto_venta'
                    ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Recibo / Ticket POS</h4>
                  <p className="text-[11px] text-slate-500">
                    Voucher de punto de venta, lote y referencia
                  </p>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Columna Izquierda: Carga / Foto / Previsualización */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              {/* Selector de Modo: Con IA vs Solo Foto Directa */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <Sparkles className={`w-4 h-4 ${useAiOcr ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Modo de Procesamiento:</span>
                    <span className="text-[10px] text-slate-500">
                      {useAiOcr ? 'IA activa (extrae RIF, IVA y montos)' : 'Directo (guarda foto en Supabase sin IA)'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUseAiOcr(!useAiOcr)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    useAiOcr
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-800 text-white'
                  }`}
                  title={useAiOcr ? 'Cambiar a modo solo foto sin IA' : 'Activar lectura con IA'}
                >
                  {useAiOcr ? '✨ Con IA' : '📷 Solo Foto'}
                </button>
              </div>

              {!imagePreview ? (
                <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all bg-slate-50 hover:bg-emerald-50/20 group min-h-[260px]">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileProcess(e.target.files[0]);
                    }}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileProcess(e.target.files[0]);
                    }}
                  />

                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-xs">
                    <Upload className="w-6 h-6" />
                  </div>

                  <p className="font-bold text-slate-800 text-sm mb-1">
                    Cargar o Fotografiar Comprobante
                  </p>
                  <p className="text-xs text-slate-500 max-w-[260px] mb-4">
                    La Inteligencia Artificial extrae automáticamente el nombre, RIF, número, fecha, IVA 16% y total sin que tengas que escribirlos
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                    >
                      Buscar Archivo
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Tomar Foto
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-xs max-h-[300px] flex items-center justify-center">
                    <img
                      src={imagePreview}
                      alt="Comprobante"
                      className="w-full h-auto max-h-[300px] object-contain"
                    />

                    {(isCompressing || isScanning) && (
                      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 text-center">
                        <div className="w-9 h-9 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin mb-2"></div>
                        <p className="font-semibold text-xs">
                          {isCompressing ? 'Comprimiendo a WebP ultraliviano...' : 'Leyendo datos del comprobante...'}
                        </p>
                      </div>
                    )}
                  </div>

                  {compressionInfo && (
                    <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-950 font-bold">
                        <Zap className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Ultraliviano: {compressionInfo.compressedSizeKb} KB</span>
                      </div>
                      <span className="text-[11px] text-emerald-700 font-semibold">
                        Ahorro: -{compressionInfo.reductionPercentage}%
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setFile(null);
                        setCompressionInfo(null);
                      }}
                      className="underline hover:text-slate-800 cursor-pointer"
                    >
                      Cambiar foto
                    </button>
                    {hasScanned && (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <FileCheck className="w-3.5 h-3.5" /> Extraído con IA
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Columna Derecha: Formulario */}
            <div className="lg:col-span-7 space-y-3.5">
              {hasScanned && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between gap-2 text-xs text-emerald-950 font-bold animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>¡Datos extraídos automáticamente con IA! Revisa la información y presiona Guardar.</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full shrink-0">
                    Auto-llenado
                  </span>
                </div>
              )}
              {/* Asignación a Sede / Sucursal (Solo en Formato Empresa) */}
              {entity === 'empresa' && (
                <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-700 shrink-0" />
                    <div>
                      <label className="block text-xs font-bold text-blue-950">
                        Sede / Sucursal de la Empresa:
                      </label>
                      <p className="text-[11px] text-blue-800">
                        Discrimina ingresos y egresos para el informe consolidado por sede
                      </p>
                    </div>
                  </div>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-blue-300 rounded-xl text-xs font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name} {b.isMain ? '(Sede Principal)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Asignación a Persona (En Finanzas Personales) */}
              {entity === 'personal' && (
                <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    <div>
                      <label className="block text-xs font-bold text-purple-950">
                        Asignar Gasto a Persona:
                      </label>
                      <p className="text-[11px] text-purple-800">
                        Resta del presupuesto y se registra a nombre de este miembro
                      </p>
                    </div>
                  </div>
                  <select
                    value={assignedPerson}
                    onChange={(e) => setAssignedPerson(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-purple-300 rounded-xl text-xs font-bold text-purple-900 focus:outline-none"
                  >
                    {persons.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name} ({p.relation || 'Familiar'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Proveedor / Comercio o Cliente y RIF */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {type === 'ingreso' ? 'Cliente Receptor / Razón Social *' : 'Comercio / Proveedor Emisor *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder={
                      type === 'ingreso'
                        ? 'Ej: Distribuidora Global Oriente C.A.'
                        : 'Ej: Automercado, Farmatodo, Refinería Solquim, etc.'
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {type === 'ingreso' ? 'RIF del Cliente (J-, V-, G-, E-)' : 'RIF del Proveedor / Comercio'}
                  </label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="Ej: J-30123456-7 ó V-18..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Factura / Folio, Referencia y Fecha */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {type === 'ingreso' ? 'Nº Factura de Venta / Control' : 'Nº Factura de Compra / Control'}
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder={type === 'ingreso' ? 'FAC-0001428' : '0001892'}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {type === 'ingreso' ? 'Ref. Cobranza / Transferencia' : 'Ref. / Lote POS / Pago Móvil'}
                  </label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder={type === 'ingreso' ? 'REF-BNC-8849' : 'Ej: 094821 / Lote 04'}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fecha de Emisión
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

              {/* Moneda y Método de Pago Habitual en Venezuela */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Método de Pago Utilizado:
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="punto_venta">💳 Punto de Venta (Tarjeta)</option>
                    <option value="pago_movil">📲 Pago Móvil</option>
                    <option value="transferencia">🏦 Transferencia Bancaria</option>
                    <option value="dolares_efectivo">💵 Dólares Efectivo (USD)</option>
                    <option value="efectivo_bs">💸 Efectivo Bolívares (VES)</option>
                    <option value="usdt_binance">🟡 USDT / Binance Pay</option>
                    <option value="otro">Otro Método</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Moneda de la Operación:
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="USD">USD ($ - Dólares)</option>
                    <option value="VES">VES (Bs. - Bolívares)</option>
                    <option value="USDT">USDT (Tether / Binance)</option>
                  </select>
                </div>
              </div>

              {/* Categoría Contable */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Categoría Contable / Presupuestaria:
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

              {/* DESGLOSE FISCAL VENEZOLANO (Factura Fiscal vs Monto Único Nota / POS) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                {documentType === 'factura_fiscal' ? (
                  <>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                      <span>Desglose Fiscal (IVA Venezuela 16% + Exentos)</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
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
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
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
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-blue-700 mb-1">
                          IVA (16%)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={taxAmount}
                          onChange={(e) => setTaxAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-2 py-1.5 bg-white border border-blue-200 rounded-xl text-xs text-blue-900 font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-emerald-800 mb-1">
                          Total Factura *
                        </label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={total}
                          onChange={(e) => handleTotalChange(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-2 py-1.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 font-black focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-slate-800">
                        {documentType === 'nota_entrega'
                          ? 'Monto Único (Nota de Entrega Sin Desglose de IVA)'
                          : 'Monto Total Cobrado (Ticket / Voucher POS)'}
                      </span>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                      <span className="text-base">⚠️</span>
                      <div>
                        <span className="font-bold block text-amber-950">
                          Documento No Deducible para el SENIAT (Sin Desglose de IVA)
                        </span>
                        <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                          {documentType === 'nota_entrega'
                            ? 'Las Notas de Entrega no son deducibles ante el SENIAT ni generan crédito fiscal. No se desglosa IVA.'
                            : 'Los Tickets / Vouchers de Punto de Venta (POS) bancario no son deducibles ni llevan IVA.'}{' '}
                          Solo se debe indicar el <strong>Monto Referencial Total</strong> en Bolívares (Bs.) o en Dólares ($).
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
                          className="w-full px-3 py-2.5 bg-emerald-50 border-2 border-emerald-400 rounded-xl text-base text-emerald-950 font-black focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      {/* Conversión Dual Referencial Inmediata */}
                      <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
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
                            Ingresa el monto para ver el valor referencial en ambas monedas ($ y Bs.)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sección de Tasa Oficial BCV Venezuela (Editable / Opcional) */}
                <div className="p-3.5 bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-200 rounded-2xl space-y-2.5 text-xs">
                  {/* Fila Superior: Encabezado y Selector Activar/Desactivar Tasa BCV */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🇻🇪</span>
                      <div>
                        <span className="font-bold text-amber-950 flex items-center gap-1.5">
                          Tasa Oficial BCV Venezuela
                          {hasBcvRate ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800">
                              Activa
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-700">
                              No aplica
                            </span>
                          )}
                        </span>
                        <p className="text-[10px] text-amber-800/80">
                          {hasBcvRate
                            ? 'La tasa cambia diariamente. Puedes añadirla o ajustarla manualmente.'
                            : 'Factura física sin tasa BCV. No se guardará ni forzará tasa de cambio.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white px-2.5 py-1 rounded-xl border border-amber-200 shadow-2xs hover:bg-amber-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={hasBcvRate}
                          onChange={(e) => setHasBcvRate(e.target.checked)}
                          className="w-3.5 h-3.5 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-amber-950">
                          {hasBcvRate ? 'Incluir Tasa BCV' : 'Sin Tasa BCV'}
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={() => setCurrency(currency === 'USD' ? 'VES' : 'USD')}
                        className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                        title="Alternar moneda principal"
                      >
                        <ArrowRightLeft className="w-3 h-3 text-amber-700" />
                        <span>Moneda: {currency === 'USD' ? 'USD ($)' : 'VES (Bs.)'}</span>
                      </button>
                    </div>
                  </div>

                  {hasBcvRate ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-900 mb-1">
                            Tasa BCV de esta Factura (Bs. / USD) *
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              step="any"
                              value={bcvRateInput}
                              onChange={(e) => setBcvRateInput(e.target.value)}
                              placeholder="Ej: 36.85"
                              className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-950 font-mono focus:ring-2 focus:ring-amber-500"
                            />
                            <button
                              type="button"
                              onClick={() => setBcvRateInput(String(getBcvRate()))}
                              className="px-2 py-1.5 bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-[10px] font-bold whitespace-nowrap cursor-pointer transition-colors"
                              title="Cargar tasa oficial de referencia actual"
                            >
                              Hoy: {formatVE(getBcvRate())}
                            </button>
                          </div>
                        </div>

                        {/* Conversión en Tiempo Real */}
                        <div className="bg-white/90 p-2 rounded-xl border border-amber-200/80">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                            Equivalencia al Cambio:
                          </span>
                          <div className="text-xs font-mono font-black text-amber-950">
                            {currency === 'VES' ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>Bs. {formatVE(parseFloat(total) || 0)}</span>
                                <span className="text-slate-400">➔</span>
                                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                  $ {formatVE(convertBsToUsd(parseFloat(total) || 0, parseFloat(bcvRateInput) || getBcvRate()))} USD
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>$ {formatVE(parseFloat(total) || 0)} USD</span>
                                <span className="text-slate-400">➔</span>
                                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                  Bs. {formatVE(convertUsdToBs(parseFloat(total) || 0, parseFloat(bcvRateInput) || getBcvRate()))}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Mensaje cuando la factura física no tiene tasa BCV */
                    <div className="p-2.5 bg-white/90 border border-amber-200/70 rounded-xl flex items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-600">
                        <strong className="text-slate-900">📄 Sin tasa BCV en el documento físico:</strong>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Este comprobante se registrará estrictamente en <strong>{currency === 'USD' ? 'Dólares ($)' : 'Bolívares (Bs.)'}</strong> sin registrar tasa de cambio BCV ni forzar conversiones inexactas.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setHasBcvRate(true);
                          if (!bcvRateInput || parseFloat(bcvRateInput) <= 0) {
                            setBcvRateInput(String(getBcvRate()));
                          }
                        }}
                        className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors cursor-pointer"
                      >
                        + Añadir Tasa Manual
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de Guardado */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSaving || isCompressing}
                    onClick={() => handleSaveInvoice(true)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    title="Guarda esta factura y prepara la ventana para escanear la siguiente"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Guardar y Escanear Otra
                  </button>

                  <button
                    type="button"
                    disabled={isSaving || isCompressing}
                    onClick={() => handleSaveInvoice(false)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Guardar Comprobante
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
