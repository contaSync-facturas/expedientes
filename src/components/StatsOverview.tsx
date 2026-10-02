import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Receipt,
  Zap,
  Info,
  Building2,
  User,
} from 'lucide-react';
import { MonthSummary, EntityType } from '../types/finance';
import { formatCurrency } from '../services/pdfReportService';
import { getBcvRate, convertUsdToBs, formatVE } from '../services/currencyService';

interface StatsOverviewProps {
  summary: MonthSummary;
  entityFilter: EntityType | 'todas';
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  summary,
  entityFilter,
}) => {
  const isPositive = summary.netBalance >= 0;
  const bcvRate = getBcvRate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Ingresos */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Ingresos Totales
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight font-mono">
            $ {formatVE(summary.totalIncome)}
          </h3>
          <p className="text-[11px] font-mono font-bold text-slate-500 mt-0.5">
            Bs. {formatVE(convertUsdToBs(summary.totalIncome, bcvRate))}
          </p>
          <p className="text-[10px] text-emerald-600 font-medium mt-1">
            {entityFilter === 'empresa' ? 'Ventas / Servicios facturados' : 'Ingresos percibidos'}
          </p>
        </div>
      </div>

      {/* 2. Gastos & Compras */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Gastos & Compras
          </span>
          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <h3 className="text-xl font-bold text-rose-600 tracking-tight font-mono">
            $ {formatVE(summary.totalExpenses + summary.totalPurchases)}
          </h3>
          <p className="text-[11px] font-mono font-bold text-slate-500 mt-0.5">
            Bs. {formatVE(convertUsdToBs(summary.totalExpenses + summary.totalPurchases, bcvRate))}
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">
            Op: $ {formatVE(summary.totalExpenses)} • Act: $ {formatVE(summary.totalPurchases)}
          </p>
        </div>
      </div>

      {/* 3. Balance Neto */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Balance Neto Mes
          </span>
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}
          >
            <Scale className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <h3
            className={`text-xl font-bold tracking-tight font-mono ${
              isPositive ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {isPositive ? '' : '-'}$ {formatVE(Math.abs(summary.netBalance))}
          </h3>
          <p className="text-[11px] font-mono font-bold text-slate-500 mt-0.5">
            {isPositive ? '' : '-'}Bs. {formatVE(convertUsdToBs(Math.abs(summary.netBalance), bcvRate))}
          </p>
          <p className="text-[10px] font-semibold mt-1 text-slate-500">
            {isPositive ? '✓ Superávit del período' : '⚠️ Déficit del período'}
          </p>
        </div>
      </div>

      {/* 4. IVA Crédito Fiscal Deducible */}
      <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/50 p-4 rounded-2xl border border-blue-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs font-bold text-blue-900 uppercase tracking-wider">
            <span>IVA Deducible 16%</span>
            <span title="Crédito fiscal generado por facturas fiscales válidas con RIF ante el SENIAT">
              <Info className="w-3.5 h-3.5 text-blue-500 cursor-help" />
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
            <Receipt className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <h3 className="text-xl font-bold text-blue-800 tracking-tight font-mono">
            $ {formatVE(summary.totalTaxDeductible)}
          </h3>
          <p className="text-[11px] font-mono font-bold text-slate-500 mt-0.5">
            Bs. {formatVE(convertUsdToBs(summary.totalTaxDeductible, bcvRate))}
          </p>
          <p className="text-[10px] text-blue-600 font-medium mt-1">
            Crédito fiscal a favor (SENIAT 16%)
          </p>
        </div>
      </div>

      {/* 5. Comprobantes Ultralivianos en Supabase */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-4 rounded-2xl border border-emerald-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            Recibos Ultralivianos
          </span>
          <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full">
            Nube
          </span>
        </div>
        <div className="mt-2">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            {summary.receiptCount} digitalizados
          </h3>
          <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
            Peso total: ~{summary.totalStorageKb} KB (97% ahorro)
          </p>
        </div>
      </div>
    </div>
  );
};
