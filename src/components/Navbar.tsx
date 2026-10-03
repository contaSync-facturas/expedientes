import React from 'react';
import {
  Sparkles,
  Building2,
  User,
  Plus,
  FileDown,
  Database,
  Cloud,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { EntityType } from '../types/finance';

interface NavbarProps {
  currentEntity: EntityType | 'todas';
  onSelectEntity: (entity: EntityType | 'todas') => void;
  onOpenScanner: () => void;
  onOpenManual: () => void;
  onOpenAccountantPortal: () => void;
  onOpenSupabaseSettings: () => void;
  isSupabaseConnected: boolean;
  bcvRate: number;
  onOpenBcvModal: () => void;
  onOpenCompanyProfile?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentEntity,
  onSelectEntity,
  onOpenScanner,
  onOpenManual,
  onOpenAccountantPortal,
  onOpenSupabaseSettings,
  isSupabaseConnected,
  bcvRate,
  onOpenBcvModal,
  onOpenCompanyProfile,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/25">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base text-slate-900 tracking-tight">
                ContaSync <span className="text-emerald-600">AI</span>
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Supabase + Gemini
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Contabilidad Empresarial & Finanzas Personales
            </p>
          </div>
        </div>

        {/* Entity Switcher (Empresa vs Personal vs Todas) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => onSelectEntity('empresa')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentEntity === 'empresa'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Empresa</span> (Jurídica)
          </button>
          <button
            type="button"
            onClick={() => onSelectEntity('personal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentEntity === 'personal'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Personal</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectEntity('todas')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentEntity === 'todas'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
            title="Ver consolidado"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Consolidado</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Tasa Oficial BCV Venezuela */}
          <button
            type="button"
            onClick={onOpenBcvModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-300 bg-amber-50/90 text-amber-900 hover:bg-amber-100 transition-all cursor-pointer shadow-2xs"
            title="Ver y ajustar Tasa Oficial del Banco Central de Venezuela"
          >
            <span className="text-sm">🇻🇪</span>
            <span className="hidden sm:inline text-amber-800 font-medium">BCV:</span>
            <span className="font-mono font-black text-amber-950">
              Bs. {bcvRate.toFixed(2).replace('.', ',')}
            </span>
            <span className="text-[10px] text-amber-700 bg-white/80 px-1 py-0.2 rounded border border-amber-200">
              /$
            </span>
          </button>

          {/* Supabase Status / Settings */}
          <button
            type="button"
            onClick={onOpenSupabaseSettings}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isSupabaseConnected
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Sincronización en la Nube (PC & Teléfono)"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">{isSupabaseConnected ? 'Nube Activa' : 'Nube'}</span>
            <span
              className={`w-2 h-2 rounded-full ${
                isSupabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            ></span>
          </button>

          {/* Datos Empresa / RIF & Domicilio */}
          {currentEntity !== 'personal' && onOpenCompanyProfile && (
            <button
              type="button"
              onClick={onOpenCompanyProfile}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Modificar Razón Social, RIF y Domicilio Fiscal de la Empresa"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-700" />
              <span className="hidden sm:inline">RIF & Domicilio</span>
            </button>
          )}

          {/* Portal Contador */}
          <button
            type="button"
            onClick={onOpenAccountantPortal}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            title="Descargar informe PDF o exportar para el contador"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Para el Contador</span>
          </button>

          {/* Escanear Factura con IA */}
          <button
            type="button"
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Escanear Factura</span>
          </button>

          {/* Agregar Manual */}
          <button
            type="button"
            onClick={onOpenManual}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Registrar movimiento manual"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
