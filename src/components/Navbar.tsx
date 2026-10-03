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
  Smartphone,
  Monitor,
  RefreshCw,
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
  viewMode?: 'pc' | 'phone';
  onToggleViewMode?: () => void;
  onSyncNow?: () => void;
  isSyncing?: boolean;
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
  viewMode,
  onToggleViewMode,
  onSyncNow,
  isSyncing = false,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/25 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                ContaSync <span className="text-emerald-600">AI</span>
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Supabase + Gemini
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">
              Contabilidad Empresarial & Finanzas Personales
            </p>
          </div>
        </div>

        {/* Entity Switcher (Empresa vs Personal vs Todas) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => onSelectEntity('empresa')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentEntity === 'empresa'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Empresa</span>
            <span className="md:hidden">Emp</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectEntity('personal')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentEntity === 'personal'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Pers</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectEntity('todas')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentEntity === 'todas'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
            title="Ver consolidado"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Todo</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Switcher Modo PC / Teléfono */}
          {onToggleViewMode && (
            <button
              type="button"
              onClick={onToggleViewMode}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs ${
                viewMode === 'phone'
                  ? 'bg-purple-50 text-purple-900 border-purple-300 hover:bg-purple-100'
                  : 'bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100'
              }`}
              title="Cambiar entre Vista Computadora y Vista Teléfono"
            >
              {viewMode === 'phone' ? (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                  <span className="hidden md:inline">Vista Teléfono</span>
                </>
              ) : (
                <>
                  <Monitor className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden md:inline">Vista PC</span>
                </>
              )}
            </button>
          )}

          {/* Botón Sincronizar Ahora en Navbar */}
          {onSyncNow && (
            <button
              type="button"
              onClick={onSyncNow}
              disabled={isSyncing}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-2xs ${
                isSupabaseConnected
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              } disabled:opacity-50`}
              title="Sincronizar cambios en tiempo real entre PC y Teléfono"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Enviando...' : 'Sincronizar'}</span>
            </button>
          )}

          {/* Tasa Oficial BCV Venezuela */}
          <button
            type="button"
            onClick={onOpenBcvModal}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-300 bg-amber-50/90 text-amber-900 hover:bg-amber-100 transition-all cursor-pointer shadow-2xs"
            title="Ver y ajustar Tasa Oficial del Banco Central de Venezuela"
          >
            <span className="text-xs sm:text-sm">🇻🇪</span>
            <span className="hidden sm:inline text-amber-800 font-medium">BCV:</span>
            <span className="font-mono font-black text-amber-950 text-[11px] sm:text-xs">
              Bs.{bcvRate.toFixed(1).replace('.', ',')}
            </span>
          </button>

          {/* Supabase Status / Settings */}
          <button
            type="button"
            onClick={onOpenSupabaseSettings}
            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isSupabaseConnected
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Sincronización en la Nube (PC & Teléfono)"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden lg:inline">{isSupabaseConnected ? 'Nube Activa' : 'Nube'}</span>
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
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Modificar Razón Social, RIF y Domicilio Fiscal de la Empresa"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-700" />
              <span className="hidden lg:inline">RIF & Domicilio</span>
              <span className="lg:hidden">RIF</span>
            </button>
          )}

          {/* Portal Contador */}
          <button
            type="button"
            onClick={onOpenAccountantPortal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            title="Descargar informe PDF o exportar para el contador"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">Para el Contador</span>
          </button>

          {/* Escanear Factura con IA */}
          <button
            type="button"
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Escanear Factura</span>
            <span className="sm:hidden">Escanear</span>
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
