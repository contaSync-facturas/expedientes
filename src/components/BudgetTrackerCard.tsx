import React, { useState } from 'react';
import {
  Wallet,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Edit3,
  Users,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { MonthlyBudget, BudgetStatus } from '../types/finance';
import { formatCurrency } from '../services/pdfReportService';
import { getBcvRate, convertUsdToBs, formatVE } from '../services/currencyService';

interface BudgetTrackerCardProps {
  budget: MonthlyBudget;
  budgetStatus: BudgetStatus;
  onUpdateBudget: (newBudget: MonthlyBudget) => void;
  onOpenPersonsModal: () => void;
  monthName: string;
}

export const BudgetTrackerCard: React.FC<BudgetTrackerCardProps> = ({
  budget,
  budgetStatus,
  onUpdateBudget,
  onOpenPersonsModal,
  monthName,
}) => {
  const [isEditingTotal, setIsEditingTotal] = useState(false);
  const [tempTotal, setTempTotal] = useState(String(budget.totalBudget));
  const [inputCurrency, setInputCurrency] = useState<'USD' | 'VES'>('USD');
  const [showCategoryDetails, setShowCategoryDetails] = useState(false);

  const bcvRate = getBcvRate();
  const percentSpent = budget.totalBudget > 0
    ? Math.round((budgetStatus.spent / budget.totalBudget) * 100)
    : 0;

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(tempTotal);
    if (!isNaN(val) && val > 0) {
      const finalUsd = inputCurrency === 'VES' ? val / bcvRate : val;
      onUpdateBudget({
        ...budget,
        totalBudget: Math.round(finalUsd * 100) / 100,
      });
      setIsEditingTotal(false);
    }
  };

  return (
    <div
      className={`rounded-3xl border transition-all p-5 shadow-xs ${
        budgetStatus.isOverBudget
          ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-500/20'
          : percentSpent >= 85
          ? 'bg-amber-50/80 border-amber-300'
          : 'bg-white border-slate-200/90'
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs ${
              budgetStatus.isOverBudget
                ? 'bg-rose-600 animate-pulse'
                : 'bg-purple-600'
            }`}
          >
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-slate-900">
                Control de Ingreso Mensual y Egresos ({monthName})
              </h3>
              {budgetStatus.isOverBudget && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white animate-bounce">
                  🚨 Ingreso Excedido
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Asigna tu ingreso mensual estimado y el sistema irá descontando automáticamente según cada egreso registrado
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setTempTotal(String(budget.totalBudget));
              setInputCurrency('USD');
              setIsEditingTotal(true);
            }}
            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-purple-600" />
            <span>Asignar Ingreso Mensual</span>
          </button>
          <button
            type="button"
            onClick={onOpenPersonsModal}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-purple-600" />
            <span>Personas Adheridas</span>
          </button>
        </div>
      </div>

      {/* Main Budget Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {/* 1. Ingreso Mensual Asignado */}
        <div className="bg-white/90 p-3.5 rounded-2xl border border-purple-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-extrabold uppercase tracking-wider text-[10px] text-purple-900">
              1. Ingreso Mensual Asignado
            </span>
            <button
              onClick={() => {
                setTempTotal(String(budget.totalBudget));
                setInputCurrency('USD');
                setIsEditingTotal(!isEditingTotal);
              }}
              className="text-purple-700 hover:text-purple-950 text-[11px] flex items-center gap-1 font-bold cursor-pointer"
            >
              <Edit3 className="w-3 h-3" /> {isEditingTotal ? 'Cancelar' : 'Modificar'}
            </button>
          </div>

          {isEditingTotal ? (
            <form onSubmit={handleSaveBudget} className="mt-2 space-y-2">
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-300 w-fit">
                <button
                  type="button"
                  onClick={() => {
                    if (inputCurrency === 'VES') {
                      const val = parseFloat(tempTotal) || 0;
                      setTempTotal(val > 0 ? (val / bcvRate).toFixed(2) : String(budget.totalBudget));
                    }
                    setInputCurrency('USD');
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                    inputCurrency === 'USD' ? 'bg-purple-600 text-white' : 'text-slate-600'
                  }`}
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (inputCurrency === 'USD') {
                      const val = parseFloat(tempTotal) || 0;
                      setTempTotal(val > 0 ? (val * bcvRate).toFixed(2) : (budget.totalBudget * bcvRate).toFixed(2));
                    }
                    setInputCurrency('VES');
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                    inputCurrency === 'VES' ? 'bg-purple-600 text-white' : 'text-slate-600'
                  }`}
                >
                  VES (Bs. BCV)
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="any"
                  required
                  value={tempTotal}
                  onChange={(e) => setTempTotal(e.target.value)}
                  placeholder="Monto de ingreso..."
                  className="w-32 px-2.5 py-1.5 bg-slate-50 border border-purple-400 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-purple-600 text-white font-bold text-xs rounded-lg hover:bg-purple-700 cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" /> Guardar
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                {inputCurrency === 'VES'
                  ? `Equivalente en USD a tasa BCV (Bs. ${bcvRate.toFixed(2)}): $ ${formatVE((parseFloat(tempTotal) || 0) / bcvRate)}`
                  : `Equivalente en Bolívares (Bs. ${bcvRate.toFixed(2)}): Bs. ${formatVE((parseFloat(tempTotal) || 0) * bcvRate)}`}
              </p>
            </form>
          ) : (
            <div className="mt-1">
              <span className="text-xl font-black text-purple-950 font-mono">
                $ {formatVE(budget.totalBudget)}
              </span>
              <p className="text-[11px] font-mono font-bold text-purple-800 mt-0.5">
                Bs. {formatVE(convertUsdToBs(budget.totalBudget, bcvRate))}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Fondo mensual asignado para cubrir egresos
              </p>
            </div>
          )}
        </div>

        {/* 2. Total Egresos Descontados */}
        <div className="bg-white/90 p-3.5 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
          <span className="font-extrabold uppercase tracking-wider text-[10px] text-slate-700">
            2. Total Egresos Descontados
          </span>
          <div className="mt-1">
            <span className="text-xl font-black text-slate-900 font-mono">
              $ {formatVE(budgetStatus.spent)}
            </span>
            <p className="text-[11px] font-mono font-bold text-slate-500 mt-0.5">
              Bs. {formatVE(convertUsdToBs(budgetStatus.spent, bcvRate))}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Descontado: <strong className={budgetStatus.isOverBudget ? 'text-rose-600 font-bold' : 'text-slate-800'}>{percentSpent}%</strong> de tu ingreso
            </p>
          </div>
        </div>

        {/* 3. Saldo Restante o NÚMEROS ROJOS */}
        <div
          className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
            budgetStatus.isOverBudget
              ? 'bg-rose-100 border-rose-300 text-rose-950 shadow-sm'
              : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
          }`}
        >
          <span className="font-extrabold uppercase tracking-wider text-[10px] flex items-center justify-between">
            <span>{budgetStatus.isOverBudget ? '🚨 3. MONTO EXCEDIDO (NÚMEROS ROJOS)' : '3. Saldo Restante Disponible'}</span>
            {budgetStatus.isOverBudget ? (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
          </span>
          <div className="mt-1">
            {/* Números Rojos Destacados */}
            <span
              className={`text-2xl font-black font-mono tracking-tight ${
                budgetStatus.isOverBudget
                  ? 'text-rose-600 underline decoration-rose-400'
                  : 'text-emerald-700'
              }`}
            >
              {budgetStatus.isOverBudget
                ? `-$ ${formatVE(budgetStatus.overspentAmount)}`
                : `$ ${formatVE(budgetStatus.remaining)}`}
            </span>
            <p
              className={`text-[11px] font-mono font-bold mt-0.5 ${
                budgetStatus.isOverBudget ? 'text-rose-700 font-black' : 'text-emerald-700'
              }`}
            >
              {budgetStatus.isOverBudget
                ? `-Bs. ${formatVE(convertUsdToBs(budgetStatus.overspentAmount, bcvRate))}`
                : `Bs. ${formatVE(convertUsdToBs(budgetStatus.remaining, bcvRate))}`}
            </p>
            <p
              className={`text-[10px] font-bold mt-0.5 ${
                budgetStatus.isOverBudget ? 'text-rose-700' : 'text-emerald-700'
              }`}
            >
              {budgetStatus.isOverBudget
                ? '⚠️ Has gastado más de lo que ingresaste este mes'
                : '✓ Te queda este margen disponible de tu ingreso'}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1 mb-4">
        <div className="w-full bg-slate-200/80 h-3 rounded-full overflow-hidden flex">
          <div
            className={`h-full transition-all duration-500 ${
              budgetStatus.isOverBudget
                ? 'bg-rose-600'
                : percentSpent >= 85
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, percentSpent)}%` }}
          ></div>
        </div>
      </div>

      {/* DETALLE EXACTO: ¿EN QUÉ GASTOS SE SOBREPASÓ EL PRESUPUESTO? */}
      {budgetStatus.isOverBudget && (
        <div className="p-4 bg-white rounded-2xl border border-rose-200 shadow-xs mb-3 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-black text-rose-900 uppercase tracking-wide">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Desglose: ¿En qué tipo de gastos se produjo el sobregiro?</span>
          </div>

          <p className="text-xs text-slate-600">
            El presupuesto se excedió por un total de{' '}
            <strong className="text-rose-600 font-bold font-mono">
              $ {formatVE(budgetStatus.overspentAmount)} (Bs. {formatVE(convertUsdToBs(budgetStatus.overspentAmount, bcvRate))})
            </strong>
            . Las siguientes categorías sobrepasaron su límite asignado:
          </p>

          <div className="space-y-2 pt-1">
            {budgetStatus.overspentCategories.length > 0 ? (
              budgetStatus.overspentCategories.map((item) => (
                <div
                  key={item.category}
                  className="p-2.5 bg-rose-50/70 border border-rose-200 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-rose-950 block">{item.category}</span>
                    <span className="text-[11px] text-slate-500">
                      Gastado: $ {formatVE(item.spent)} (Bs. {formatVE(convertUsdToBs(item.spent, bcvRate))}) • Límite: $ {formatVE(item.budget)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-rose-600 font-mono">
                      +$ {formatVE(item.exceeded)}
                    </span>
                    <span className="text-[10px] font-mono text-rose-700 block font-bold">
                      +Bs. {formatVE(convertUsdToBs(item.exceeded, bcvRate))}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 italic">
                El sobregiro se debe a la suma global de compras acumuladas este mes.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Desglose por Persona Adherida */}
      <div className="pt-3 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-700 text-[11px]">Gastos por Persona:</span>
          {Object.entries(budgetStatus.personSpending).map(([person, amount]) => (
            <span
              key={person}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-800 text-[11px] font-medium shadow-2xs"
            >
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              <strong>{person}:</strong> {formatCurrency(amount)}
            </span>
          ))}
        </div>

        <button
          onClick={() => setShowCategoryDetails(!showCategoryDetails)}
          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
        >
          {showCategoryDetails ? (
            <>
              Ocultar categorías <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              Ver distribución completa <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {showCategoryDetails && (
        <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
          {Object.entries(budget.categoryBudgets).map(([cat, catBudget]) => {
            return (
              <div key={cat} className="p-2 bg-white rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="truncate max-w-[140px] text-slate-700">{cat}</span>
                <span className="font-mono font-semibold text-slate-900">
                  Límite: {formatCurrency(catBudget)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
