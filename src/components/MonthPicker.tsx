import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface MonthPickerProps {
  currentMonthKey: string;
  availableMonths: string[];
  onChangeMonth: (monthKey: string) => void;
  transactionCount: number;
}

const MONTH_NAMES = [
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

export const MonthPicker: React.FC<MonthPickerProps> = ({
  currentMonthKey,
  availableMonths,
  onChangeMonth,
  transactionCount,
}) => {
  const [yearStr, monthStr] = currentMonthKey.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);
  const currentMonthName = `${MONTH_NAMES[monthNum - 1] || 'Mes'} ${year}`;

  const handlePrev = () => {
    let newMonth = monthNum - 1;
    let newYear = year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    const newKey = `${newYear}-${String(newMonth).padStart(2, '0')}`;
    onChangeMonth(newKey);
  };

  const handleNext = () => {
    let newMonth = monthNum + 1;
    let newYear = year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    const newKey = `${newYear}-${String(newMonth).padStart(2, '0')}`;
    onChangeMonth(newKey);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
          <Calendar className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Período Contable
          </span>
          <h2 className="text-sm font-bold text-slate-900 capitalize">
            {currentMonthName}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded-xl">
          {transactionCount} {transactionCount === 1 ? 'movimiento' : 'movimientos'}
        </span>

        <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
          <button
            type="button"
            onClick={handlePrev}
            title="Mes anterior"
            className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <select
            value={currentMonthKey}
            onChange={(e) => onChangeMonth(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-800 px-2 py-1 focus:outline-none cursor-pointer"
          >
            {availableMonths.map((m) => {
              const [y, mo] = m.split('-');
              const name = `${MONTH_NAMES[parseInt(mo, 10) - 1]} ${y}`;
              return (
                <option key={m} value={m}>
                  {name}
                </option>
              );
            })}
          </select>

          <button
            type="button"
            onClick={handleNext}
            title="Mes siguiente"
            className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
