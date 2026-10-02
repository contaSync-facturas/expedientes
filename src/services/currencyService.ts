/**
 * Servicio de Conversión y Dualidad Monetaria USD / Bolívares (VES)
 * Tasa Oficial del Banco Central de Venezuela (BCV)
 * Soporte de Histórico Diario Mensual por Fecha de Emisión del Comprobante
 * Formato numérico estricto con separador de miles '.' y decimales ',' con max 2 decimales (ej. 1.200,00)
 */

const STORAGE_KEY_BCV = 'contasync_bcv_rate';
const STORAGE_PREFIX_BCV_HISTORY = 'contasync_bcv_history_';
const DEFAULT_BCV_RATE = 36.85; // Tasa de referencia inicial en Bs./USD

export function getBcvRate(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_BCV);
    if (saved) {
      const val = parseFloat(saved);
      if (!isNaN(val) && val > 0) return round2(val);
    }
  } catch (e) {
    console.error('Error cargando tasa BCV:', e);
  }
  return DEFAULT_BCV_RATE;
}

export function saveBcvRate(rate: number): void {
  try {
    const cleanRate = round2(rate);
    localStorage.setItem(STORAGE_KEY_BCV, String(cleanRate));
  } catch (e) {
    console.error('Error guardando tasa BCV:', e);
  }
}

/**
 * Obtiene el histórico diario de tasas BCV para un mes específico (ej: '2026-09')
 */
export function getBcvMonthlyHistory(monthKey: string): Record<string, number> {
  const key = `${STORAGE_PREFIX_BCV_HISTORY}${monthKey}`;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error leyendo histórico BCV:', e);
  }

  // Si no existe histórico guardado, generar el histórico por defecto para el mes
  const defaultHistory = generateDefaultMonthlyBcvHistory(monthKey, getBcvRate());
  saveBcvMonthlyHistory(monthKey, defaultHistory);
  return defaultHistory;
}

/**
 * Guarda el histórico diario de tasas BCV para un mes específico
 */
export function saveBcvMonthlyHistory(monthKey: string, history: Record<string, number>): void {
  const key = `${STORAGE_PREFIX_BCV_HISTORY}${monthKey}`;
  try {
    localStorage.setItem(key, JSON.stringify(history));
  } catch (e) {
    console.error('Error guardando histórico BCV:', e);
  }
}

/**
 * Guarda la tasa BCV de un día específico
 */
export function saveBcvRateForDate(dateStr: string, rate: number): void {
  if (!dateStr || isNaN(rate) || rate <= 0) return;
  const monthKey = dateStr.slice(0, 7);
  const history = getBcvMonthlyHistory(monthKey);
  history[dateStr] = round2(rate);
  saveBcvMonthlyHistory(monthKey, history);
}

/**
 * Genera el histórico mensual diario predeterminado para un mes (ej: '2026-09').
 * Aplica arrastre de tasa en fines de semana (Sábado y Domingo mantienen la tasa del Viernes).
 */
export function generateDefaultMonthlyBcvHistory(
  monthKey: string,
  startRate = 36.85,
  endRate = 37.10
): Record<string, number> {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10) || new Date().getFullYear();
  const month = parseInt(monthStr, 10) || (new Date().getMonth() + 1);

  // Días totales en el mes
  const daysInMonth = new Date(year, month, 0).getDate();
  const history: Record<string, number> = {};

  let currentRate = startRate;
  const dailyIncrement = daysInMonth > 1 ? (endRate - startRate) / (daysInMonth - 1) : 0;

  let lastBusinessDayRate = startRate;

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
    const d = new Date(year, month - 1, day);
    const dayOfWeek = d.getDay(); // 0 = Domingo, 6 = Sábado

    if (dayOfWeek === 6 || dayOfWeek === 0) {
      // Fines de semana: mantienen la tasa del último día hábil (Viernes)
      history[dateStr] = round2(lastBusinessDayRate);
    } else {
      // Días hábiles
      currentRate = startRate + dailyIncrement * (day - 1);
      lastBusinessDayRate = currentRate;
      history[dateStr] = round2(currentRate);
    }
  }

  return history;
}

/**
 * Obtiene la Tasa BCV exacta correspondiente al DÍA DE EMISIÓN de la factura.
 * Si es fin de semana o feriado sin cotización, arrastra la tasa del día hábil anterior.
 */
export function getBcvRateForDate(dateStr: string, fallbackRate?: number): number {
  if (!dateStr) return fallbackRate || getBcvRate();
  const cleanDate = dateStr.slice(0, 10);
  const monthKey = cleanDate.slice(0, 7);

  const history = getBcvMonthlyHistory(monthKey);

  // 1. Coincidencia exacta
  if (history[cleanDate] && history[cleanDate] > 0) {
    return round2(history[cleanDate]);
  }

  // 2. Si no tiene cotización específica, buscar hacia atrás el día hábil más reciente del mes
  const [y, m, d] = cleanDate.split('-').map(Number);
  if (!isNaN(d) && d > 1) {
    for (let prev = d - 1; prev >= 1; prev--) {
      const prevDate = `${y}-${String(m).padStart(2, '0')}-${String(prev).padStart(2, '0')}`;
      if (history[prevDate] && history[prevDate] > 0) {
        return round2(history[prevDate]);
      }
    }
  }

  // 3. Fallback a la tasa general del período o global
  return fallbackRate || getBcvRate();
}

/**
 * Redondeo matemático estricto a 2 decimales
 */
export function round2(val: number): number {
  if (isNaN(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Convierte de USD a Bolívares según la tasa BCV (redondeado a 2 decimales)
 */
export function convertUsdToBs(amountUsd: number, rate = getBcvRate()): number {
  return round2(amountUsd * rate);
}

/**
 * Convierte de Bolívares a USD según la tasa BCV (redondeado a 2 decimales)
 */
export function convertBsToUsd(amountBs: number, rate = getBcvRate()): number {
  if (!rate || rate <= 0) return 0;
  return round2(amountBs / rate);
}

/**
 * Formatea un número en formato estándar de Venezuela:
 * Separador de miles: '.'
 * Separador decimal: ','
 * Siempre 2 decimales: ej: 1.200,00
 */
export function formatVE(val: number): string {
  const safeVal = isNaN(val) ? 0 : round2(val);
  const parts = safeVal.toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimalPart = parts[1];
  return `${integerPart},${decimalPart}`;
}

export function formatBs(val: number): string {
  return `Bs. ${formatVE(val)}`;
}

export function formatUsd(val: number): string {
  return `$ ${formatVE(val)}`;
}

/**
 * Muestra ambos montos de forma dual: ej. "$ 1.200,00 • Bs. 44.220,00"
 */
export function formatDual(usd: number, bs?: number, rate = getBcvRate()): string {
  const safeUsd = round2(usd);
  const safeBs = bs !== undefined && !isNaN(bs) ? round2(bs) : convertUsdToBs(safeUsd, rate);
  return `${formatUsd(safeUsd)} • ${formatBs(safeBs)}`;
}
