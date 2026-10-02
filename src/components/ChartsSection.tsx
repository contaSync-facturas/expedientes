import React from 'react';
import { PieChart, BarChart3, ArrowUpRight } from 'lucide-react';
import { Transaction, EntityType } from '../types/finance';
import { formatCurrency } from '../services/pdfReportService';

interface ChartsSectionProps {
  transactions: Transaction[];
  currentMonthKey: string;
  entityFilter: EntityType | 'todas';
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({
  transactions,
  currentMonthKey,
  entityFilter,
}) => {
  // Transacciones del mes activo
  const monthTx = transactions.filter((t) => {
    const matchMonth = t.date.startsWith(currentMonthKey);
    const matchEntity = entityFilter === 'todas' || t.entity === entityFilter;
    return matchMonth && matchEntity;
  });

  // Agrupar gastos por categoría
  const categoryTotals: Record<string, number> = {};
  let totalExpenses = 0;

  monthTx.forEach((tx) => {
    if (tx.type === 'gasto' || tx.type === 'compra_activo') {
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.total;
      totalExpenses += tx.total;
    }
  });

  const sortedCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Totales Empresa vs Personal
  let empresaTotal = 0;
  let personalTotal = 0;
  monthTx.forEach((tx) => {
    if (tx.type === 'gasto' || tx.type === 'compra_activo') {
      if (tx.entity === 'empresa') empresaTotal += tx.total;
      else personalTotal += tx.total;
    }
  });

  const combinedTotal = empresaTotal + personalTotal;
  const empresaPct = combinedTotal > 0 ? Math.round((empresaTotal / combinedTotal) * 100) : 50;
  const personalPct = combinedTotal > 0 ? Math.round((personalTotal / combinedTotal) * 100) : 50;

  if (monthTx.length === 0) {
    return null;
  }

  const COLORS = ['bg-emerald-500', 'bg-blue-500', 'bg-indigo-500', 'bg-amber-500', 'bg-rose-500'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 1. Categorías Principales de Gasto */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <PieChart className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">
                Top Gastos por Categoría
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500 font-mono">
              {formatCurrency(totalExpenses)}
            </span>
          </div>

          <div className="space-y-3">
            {sortedCategories.map(([cat, amount], idx) => {
              const pct = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 truncate max-w-[200px]">
                      {cat}
                    </span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {formatCurrency(amount)} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${COLORS[idx % COLORS.length]}`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Distribución Jurídica (Empresa) vs Personal */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">
                Separación Contable: Empresa vs Personal
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full">
              Control Fiscal
            </span>
          </div>

          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-blue-900 uppercase block">
                  🏢 Empresa (Jurídica)
                </span>
                <span className="text-base font-bold text-slate-900 font-mono">
                  {formatCurrency(empresaTotal)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-blue-700 font-mono">{empresaPct}%</span>
                <span className="text-[10px] text-slate-400 block">Deducible</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-purple-900 uppercase block">
                  👤 Finanzas Personales
                </span>
                <span className="text-base font-bold text-slate-900 font-mono">
                  {formatCurrency(personalTotal)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-purple-700 font-mono">{personalPct}%</span>
                <span className="text-[10px] text-slate-400 block">Particular</span>
              </div>
            </div>

            {/* Barra bicolor */}
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
              <div className="bg-blue-600 h-full" style={{ width: `${empresaPct}%` }}></div>
              <div className="bg-purple-600 h-full" style={{ width: `${personalPct}%` }}></div>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 mt-4">
          ✓ Mantener los gastos corporativos estrictamente separados previene contingencias tributarias y facilita la conciliación de tu contador.
        </p>
      </div>
    </div>
  );
};
