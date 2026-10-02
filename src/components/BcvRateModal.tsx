import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  TrendingUp,
  Check,
  Calendar,
  Sparkles,
  ArrowRightLeft,
  Copy,
  Sliders,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  RotateCcw,
  Calculator,
} from 'lucide-react';
import { Transaction } from '../types/finance';
import {
  round2,
  formatVE,
  getBcvRate,
  saveBcvRate,
  getBcvMonthlyHistory,
  saveBcvMonthlyHistory,
  generateDefaultMonthlyBcvHistory,
  convertUsdToBs,
  convertBsToUsd,
} from '../services/currencyService';
import { revalueAllTransactionsWithBcvHistory } from '../services/storageService';

interface BcvRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRate: number;
  onRateUpdated: (newRate: number) => void;
  currentMonthKey?: string;
  availableMonths?: string[];
  transactions?: Transaction[];
  onTransactionsRevalued?: () => void;
}

const MONTH_NAMES: Record<string, string> = {
  '01': 'Enero',
  '02': 'Febrero',
  '03': 'Marzo',
  '04': 'Abril',
  '05': 'Mayo',
  '06': 'Junio',
  '07': 'Julio',
  '08': 'Agosto',
  '09': 'Septiembre',
  '10': 'Octubre',
  '11': 'Noviembre',
  '12': 'Diciembre',
};

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const BcvRateModal: React.FC<BcvRateModalProps> = ({
  isOpen,
  onClose,
  currentRate,
  onRateUpdated,
  currentMonthKey = '2026-09',
  availableMonths = ['2026-08', '2026-09', '2026-10'],
  transactions = [],
  onTransactionsRevalued,
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'calculator'>('history');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [dailyRates, setDailyRates] = useState<Record<string, number>>({});
  const [rangeStart, setRangeStart] = useState<string>('36.85');
  const [rangeEnd, setRangeEnd] = useState<string>('37.15');
  const [singleRate, setSingleRate] = useState<string>('36.85');
  const [showTools, setShowTools] = useState<boolean>(true);
  const [showPasteBox, setShowPasteBox] = useState<boolean>(false);
  const [pasteData, setPasteData] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Estados del conversor rápido
  const [calcUsd, setCalcUsd] = useState('100');
  const [calcBs, setCalcBs] = useState(String(round2(100 * currentRate)));
  const [manualRateInput, setManualRateInput] = useState(String(currentRate));

  // Cargar histórico cuando abre o cambia de mes
  useEffect(() => {
    if (isOpen) {
      setSelectedMonth(currentMonthKey);
      const loaded = getBcvMonthlyHistory(currentMonthKey);
      setDailyRates(loaded);
      setManualRateInput(String(currentRate));
    }
  }, [isOpen, currentMonthKey, currentRate]);

  useEffect(() => {
    if (selectedMonth) {
      const loaded = getBcvMonthlyHistory(selectedMonth);
      setDailyRates(loaded);

      // Extraer tasas del mes para los inputs rápidos
      const keys = Object.keys(loaded).sort();
      if (keys.length > 0) {
        setRangeStart(String(loaded[keys[0]]));
        setRangeEnd(String(loaded[keys[keys.length - 1]]));
        setSingleRate(String(loaded[keys[0]]));
      }
    }
  }, [selectedMonth]);

  if (!isOpen) return null;

  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr, 10) || 2026;
  const month = parseInt(monthStr, 10) || 9;
  const monthName = `${MONTH_NAMES[monthStr] || monthStr} ${year}`;
  const daysInMonth = new Date(year, month, 0).getDate();

  // Crear array con todos los días del mes
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
    const d = new Date(year, month - 1, day);
    const dayOfWeek = d.getDay(); // 0 = Domingo, 6 = Sábado
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dayName = DAY_NAMES[dayOfWeek];

    // Contar facturas emitidas en esta fecha
    const txCount = transactions.filter((t) => t.date === dateStr).length;
    const txTotalUsd = transactions
      .filter((t) => t.date === dateStr)
      .reduce((acc, t) => acc + (t.currency === 'USD' ? t.total : (t.totalUsd || 0)), 0);

    return {
      day,
      dayStr,
      dateStr,
      dayOfWeek,
      isWeekend,
      dayName,
      rate: dailyRates[dateStr] || currentRate,
      txCount,
      txTotalUsd,
    };
  });

  const handleRateInputChange = (dateStr: string, val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setDailyRates((prev) => ({
        ...prev,
        [dateStr]: round2(num),
      }));
    }
  };

  // Generar rango progresivo con arrastre de fin de semana
  const handleApplyRange = () => {
    const start = parseFloat(rangeStart);
    const end = parseFloat(rangeEnd);
    if (isNaN(start) || isNaN(end) || start <= 0 || end <= 0) return;

    const generated = generateDefaultMonthlyBcvHistory(selectedMonth, start, end);
    setDailyRates(generated);
    setSuccessMsg('Rango mensual generado con arrastre en fines de semana.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Aplicar tasa única a todo el mes
  const handleApplySingle = () => {
    const rateVal = parseFloat(singleRate);
    if (isNaN(rateVal) || rateVal <= 0) return;

    const newRates: Record<string, number> = {};
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
      newRates[dateStr] = round2(rateVal);
    }
    setDailyRates(newRates);
    setSuccessMsg(`Tasa de Bs. ${formatVE(rateVal)} aplicada a todos los días de ${monthName}.`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Importar desde texto pegado (formato: "01/09: 36.85" o "2026-09-01, 36.85" o lista de números)
  const handleProcessPastedData = () => {
    if (!pasteData.trim()) return;
    const lines = pasteData.split('\n');
    const newRates = { ...dailyRates };
    let matches = 0;

    lines.forEach((line, index) => {
      const clean = line.trim();
      if (!clean) return;

      // Caso 1: número directo en orden secuencial de día
      const directNum = parseFloat(clean.replace(',', '.'));
      if (!isNaN(directNum) && directNum > 1 && index < daysInMonth) {
        const dayStr = String(index + 1).padStart(2, '0');
        newRates[`${yearStr}-${monthStr}-${dayStr}`] = round2(directNum);
        matches++;
        return;
      }

      // Caso 2: fecha y número (ej. "2026-09-05, 36.88" o "05/09 36.88")
      const parts = clean.split(/[,;\t\s]+/);
      if (parts.length >= 2) {
        const datePart = parts[0].replace(/[^0-9/-]/g, '');
        const ratePart = parseFloat(parts[1].replace(',', '.'));
        if (!isNaN(ratePart) && ratePart > 0) {
          if (datePart.includes('-') && datePart.length === 10) {
            newRates[datePart] = round2(ratePart);
            matches++;
          } else if (datePart.includes('/')) {
            const [d, m] = datePart.split('/');
            const formatted = `${yearStr}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            newRates[formatted] = round2(ratePart);
            matches++;
          }
        }
      }
    });

    setDailyRates(newRates);
    setShowPasteBox(false);
    setPasteData('');
    setSuccessMsg(`¡Se procesaron y cargaron ${matches} cotizaciones exitosamente!`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Guardar todo el histórico y revalorizar las facturas
  const handleSaveAll = () => {
    saveBcvMonthlyHistory(selectedMonth, dailyRates);

    // Obtener la tasa de hoy o la más reciente para actualizar la tasa general
    const todayStr = new Date().toISOString().slice(0, 10);
    const effectiveTodayRate = dailyRates[todayStr] || dailyRates[`${yearStr}-${monthStr}-01`] || currentRate;
    saveBcvRate(effectiveTodayRate);
    onRateUpdated(effectiveTodayRate);

    // Revalorizar todas las transacciones históricas registradas en este y otros períodos
    revalueAllTransactionsWithBcvHistory();
    onTransactionsRevalued?.();

    setSuccessMsg('✓ ¡Histórico guardado! Todas las facturas y compras del mes han sido revalorizadas a la tasa de su fecha de emisión.');
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">
                  Histórico Mensual de Tasa BCV
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                  Venezuela • Cotización Diaria
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Aplica a cada factura la tasa oficial correspondiente a su <strong className="text-slate-200">fecha exacta de emisión</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 bg-slate-50/80">
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white border-slate-200 text-slate-900 shadow-2xs -mb-px'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span>Calendario Diario ({monthName})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('calculator')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'calculator'
                ? 'bg-white border-slate-200 text-slate-900 shadow-2xs -mb-px'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-blue-600" />
            <span>Tasa de Referencia & Conversor</span>
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-950 font-bold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'history' ? (
            <div className="space-y-4">
              {/* Barra superior: Selección de Período y Explicación */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50/40 border border-amber-200 rounded-2xl">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-amber-900">
                    Período Contable:
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs"
                    >
                      {availableMonths.map((m) => (
                        <option key={m} value={m}>
                          {MONTH_NAMES[m.slice(5, 7)] || m.slice(5, 7)} {m.slice(0, 4)} ({m})
                        </option>
                      ))}
                    </select>
                    <span className="text-xs font-bold text-amber-950">
                      {daysInMonth} días en este mes
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTools(!showTools)}
                    className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Sliders className="w-3.5 h-3.5 text-amber-700" />
                    <span>{showTools ? 'Ocultar Herramientas' : 'Herramientas de Carga'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPasteBox(!showPasteBox)}
                    className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Pegar Listado</span>
                  </button>
                </div>
              </div>

              {/* Herramientas de Carga Rápida */}
              {showTools && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      Carga Rápida de Tasas del Mes:
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Fines de semana arrastran automáticamente la tasa del viernes
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Generar Progresión / Rango */}
                    <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        Opción 1: Rango Inicio ➔ Cierre de Mes
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="block text-[9px] text-slate-400 font-bold">Día 01</label>
                          <input
                            type="number"
                            step="0.01"
                            value={rangeStart}
                            onChange={(e) => setRangeStart(e.target.value)}
                            placeholder="36.85"
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                          />
                        </div>
                        <span className="text-slate-400 text-xs mt-3">➔</span>
                        <div className="flex-1">
                          <label className="block text-[9px] text-slate-400 font-bold">Día {daysInMonth}</label>
                          <input
                            type="number"
                            step="0.01"
                            value={rangeEnd}
                            onChange={(e) => setRangeEnd(e.target.value)}
                            placeholder="37.15"
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleApplyRange}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold mt-3 transition-colors cursor-pointer shadow-xs shrink-0"
                        >
                          Generar Mes
                        </button>
                      </div>
                    </div>

                    {/* Fijar Tasa Única */}
                    <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        Opción 2: Tasa Unificada para Todo el Mes
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={singleRate}
                          onChange={(e) => setSingleRate(e.target.value)}
                          placeholder="36.85"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                        />
                        <button
                          type="button"
                          onClick={handleApplySingle}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs shrink-0"
                        >
                          Aplicar a Todo el Mes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cuadro para Pegar Datos en Lote */}
              {showPasteBox && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-300 rounded-2xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      Pegar Listado de Tasas (Excel o Texto Oficial del BCV)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPasteBox(false)}
                      className="text-xs text-slate-400 hover:text-slate-700"
                    >
                      Cerrar
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-900">
                    Puedes pegar una columna de Excel con las tasas del día 1 al {daysInMonth}, o líneas con formato: <code className="bg-white px-1 py-0.5 rounded text-[10px]">2026-09-01, 36.85</code>
                  </p>
                  <textarea
                    rows={4}
                    value={pasteData}
                    onChange={(e) => setPasteData(e.target.value)}
                    placeholder="36.85&#10;36.88&#10;36.92&#10;..."
                    className="w-full p-2 bg-white border border-emerald-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleProcessPastedData}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                    >
                      Procesar y Cargar
                    </button>
                  </div>
                </div>
              )}

              {/* Tabla de Días del Mes */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/90 text-slate-700 font-extrabold sticky top-0 z-10 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Día / Fecha</th>
                        <th className="py-2.5 px-3">Día Semana</th>
                        <th className="py-2.5 px-3">Tasa Oficial BCV (Bs./USD)</th>
                        <th className="py-2.5 px-3 text-right">Facturas en esta Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthDays.map((item) => (
                        <tr
                          key={item.dateStr}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            item.isWeekend ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          <td className="py-2 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                            <span className="inline-block w-6 text-slate-400 font-normal">
                              {item.dayStr}
                            </span>
                            {item.dateStr}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                item.isWeekend
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : 'text-slate-700'
                              }`}
                            >
                              {item.dayName}
                              {item.isWeekend && (
                                <span className="ml-1 text-[9px] font-normal text-amber-800">
                                  (Arrastra Viernes)
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="py-1.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-400">Bs.</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={item.rate}
                                onChange={(e) => handleRateInputChange(item.dateStr, e.target.value)}
                                className="w-24 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right whitespace-nowrap">
                            {item.txCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                                {item.txCount} {item.txCount === 1 ? 'factura' : 'facturas'} ($ {formatVE(item.txTotalUsd)})
                              </span>
                            ) : (
                              <span className="text-slate-300 text-[10px]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: CONVERSOR RÁPIDO & CALCULADORA */
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  Tasa Oficial de Referencia Actual (Bs. / USD):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={manualRateInput}
                    onChange={(e) => {
                      setManualRateInput(e.target.value);
                      const r = parseFloat(e.target.value) || 0;
                      if (r > 0) {
                        const u = parseFloat(calcUsd) || 0;
                        setCalcBs(String(round2(u * r)));
                      }
                    }}
                    placeholder="36.85"
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-lg font-black text-slate-900 font-mono focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-500">
                    Bs. / USD
                  </span>
                </div>
              </div>

              {/* Simulador Interactivo */}
              <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-amber-700" />
                  Simulador de Conversión Rápida
                </span>
                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Monto en Dólares (USD):
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">$</span>
                      <input
                        type="number"
                        step="any"
                        value={calcUsd}
                        onChange={(e) => {
                          setCalcUsd(e.target.value);
                          const u = parseFloat(e.target.value) || 0;
                          const r = parseFloat(manualRateInput) || currentRate;
                          setCalcBs(String(round2(u * r)));
                        }}
                        className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Monto en Bolívares (Bs.):
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Bs.</span>
                      <input
                        type="number"
                        step="any"
                        value={calcBs}
                        onChange={(e) => {
                          setCalcBs(e.target.value);
                          const b = parseFloat(e.target.value) || 0;
                          const r = parseFloat(manualRateInput) || currentRate;
                          if (r > 0) setCalcUsd(String(round2(b / r)));
                        }}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            ✓ Los cambios se sincronizan en los libros contables, expediente PDF y Excel.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Guardar Histórico y Revalorizar Facturas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
