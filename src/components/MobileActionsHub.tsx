import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Building2,
  Store,
  Users,
  FileDown,
  Database,
  RefreshCw,
  Wallet,
  Smartphone,
  Monitor,
  Share2,
  Check,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { EntityType, CompanyProfile } from '../types/finance';
import { getSupabaseConfig } from '../services/supabaseService';

interface MobileActionsHubProps {
  currentEntity: EntityType | 'todas';
  onSelectEntity: (entity: EntityType | 'todas') => void;
  onOpenScanner: () => void;
  onOpenManual: () => void;
  onOpenAccountantPortal: () => void;
  onOpenSupabaseSettings: () => void;
  onOpenCompanyProfile: () => void;
  onOpenBranches: () => void;
  onOpenPersons: () => void;
  onOpenBcvModal: () => void;
  bcvRate: number;
  companyProfile: CompanyProfile;
  isSupabaseConnected: boolean;
  onSyncNow: () => Promise<void>;
  isSyncing: boolean;
  syncResult: { success: boolean; message: string } | null;
  viewMode: 'pc' | 'phone';
  onToggleViewMode: () => void;
}

export const MobileActionsHub: React.FC<MobileActionsHubProps> = ({
  currentEntity,
  onSelectEntity,
  onOpenScanner,
  onOpenManual,
  onOpenAccountantPortal,
  onOpenSupabaseSettings,
  onOpenCompanyProfile,
  onOpenBranches,
  onOpenPersons,
  onOpenBcvModal,
  bcvRate,
  companyProfile,
  isSupabaseConnected,
  onSyncNow,
  isSyncing,
  syncResult,
  viewMode,
  onToggleViewMode,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  // Generar enlace para conectar el teléfono en 1 clic
  const handleCopyPhoneConnectLink = () => {
    const cfg = getSupabaseConfig();
    if (!cfg.url || !cfg.anonKey) {
      onOpenSupabaseSettings();
      return;
    }
    const origin = window.location.origin + window.location.pathname;
    const shareableUrl = `${origin}?s_url=${encodeURIComponent(cfg.url)}&s_key=${encodeURIComponent(cfg.anonKey)}`;
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Barra de Control de Modo y Estado de Nube */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl shadow-md border border-slate-700">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-white/10 text-emerald-400">
            {viewMode === 'phone' ? (
              <Smartphone className="w-5 h-5" />
            ) : (
              <Monitor className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {viewMode === 'phone' ? 'Modo Teléfono Táctil' : 'Modo Computadora (PC)'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isSupabaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              {isSupabaseConnected ? 'Nube Activa (Sincronización PC ⇄ Móvil)' : 'Modo local (Sin conectar a Nube)'}
            </p>
          </div>
        </div>

        {/* Botón Switch Modo PC / Teléfono */}
        <button
          type="button"
          onClick={onToggleViewMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white border border-white/15 cursor-pointer"
        >
          {viewMode === 'phone' ? (
            <>
              <Monitor className="w-3.5 h-3.5 text-blue-400" />
              <span>Cambiar a Modo PC</span>
            </>
          ) : (
            <>
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cambiar a Modo Teléfono</span>
            </>
          )}
        </button>
      </div>

      {/* Tarjeta Destacada de Sincronización Inmediata */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-900/90 via-teal-900 to-slate-900 text-white shadow-xl border border-emerald-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                Sincronización Inmediata PC ⇄ Teléfono
              </h3>
              <p className="text-[11px] text-emerald-200/80">
                Envía facturas, RIF, datos de empresa y sedes a la nube en tiempo real
              </p>
            </div>
          </div>

          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              isSupabaseConnected
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
            }`}
          >
            {isSupabaseConnected ? 'En línea' : 'Desconectado'}
          </span>
        </div>

        {/* Botones de Acción de Sincronización */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="button"
            onClick={onSyncNow}
            disabled={isSyncing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Subiendo cambios a la nube...' : '⚡ Sincronizar Ahora (Enviar y Recibir)'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyPhoneConnectLink}
            className="flex items-center justify-center gap-1.5 px-3.5 py-3 bg-white/10 hover:bg-white/20 text-emerald-200 border border-emerald-400/30 text-xs font-bold rounded-2xl active:scale-98 transition-all cursor-pointer"
            title="Copiar enlace directo con credenciales para abrir en tu teléfono"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">¡Enlace Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Vincular Celular</span>
              </>
            )}
          </button>
        </div>

        {/* Feedback de Sincronización */}
        {syncResult && (
          <div
            className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
              syncResult.success
                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-200'
                : 'bg-red-500/20 border border-red-500/30 text-red-200'
            }`}
          >
            {syncResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span className="font-medium">{syncResult.message}</span>
          </div>
        )}
      </div>

      {/* Menú de Todas las Opciones (Grid Táctil 100% Accesible) */}
      <div>
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 px-1 mb-2">
          Opciones y Funciones del Sistema
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {/* 1. Escanear Factura (IA) */}
          <button
            type="button"
            onClick={onOpenScanner}
            className="flex flex-col items-start p-3.5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl hover:shadow-md transition-all active:scale-95 text-left cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 mb-2 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900 text-xs">Escanear Factura</span>
            <span className="text-[10px] text-slate-500 line-clamp-1">Gemini AI • Cámara</span>
          </button>

          {/* 2. Nuevo Gasto / Ingreso Manual */}
          <button
            type="button"
            onClick={onOpenManual}
            className="flex flex-col items-start p-3.5 bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-all active:scale-95 text-left cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md mb-2 group-hover:scale-105 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900 text-xs">Carga Manual</span>
            <span className="text-[10px] text-slate-500 line-clamp-1">Gasto o Ingreso</span>
          </button>

          {/* 3. Datos Fiscales Empresa (RIF & Razón Social) */}
          <button
            type="button"
            onClick={onOpenCompanyProfile}
            className="flex flex-col items-start p-3.5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl hover:shadow-md transition-all active:scale-95 text-left cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20 mb-2 group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-blue-950 text-xs truncate w-full">
              {companyProfile.name || 'Datos Empresa'}
            </span>
            <span className="text-[10px] text-blue-700 font-mono font-bold">
              {companyProfile.taxId || 'RIF Fiscal'}
            </span>
          </button>

          {/* 4. Sedes & Sucursales */}
          <button
            type="button"
            onClick={onOpenBranches}
            className="flex flex-col items-start p-3.5 bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-all active:scale-95 text-left cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 mb-2 group-hover:scale-105 transition-transform">
              <Store className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900 text-xs">Sedes & Sucursales</span>
            <span className="text-[10px] text-slate-500 line-clamp-1">Principal / Tiendas</span>
          </button>

          {/* 5. Portal Contador (PDF & CSV) */}
          <button
            type="button"
            onClick={onOpenAccountantPortal}
            className="flex flex-col items-start p-3.5 bg-slate-900 text-white border border-slate-800 rounded-2xl hover:shadow-md transition-all active:scale-95 text-left cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-900 flex items-center justify-center shadow-md mb-2 group-hover:scale-105 transition-transform">
              <FileDown className="w-5 h-5 font-bold" />
            </div>
            <span className="font-bold text-white text-xs">Para el Contador</span>
            <span className="text-[10px] text-slate-400 line-clamp-1">PDF Expediente & CSV</span>
          </button>

          {/* 6. Tasa Oficial BCV Venezuela */}
          <button
            type="button"
            onClick={onOpenBcvModal}
            className="flex flex-col items-start p-3.5 bg-amber-50 border border-amber-200 rounded-2xl hover:shadow-md transition-all active:scale-95 text-left cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/20 mb-2 group-hover:scale-105 transition-transform">
              <span className="text-base">🇻🇪</span>
            </div>
            <span className="font-bold text-amber-950 text-xs">Tasa BCV Oficial</span>
            <span className="text-[10px] font-mono font-bold text-amber-800">
              Bs. {bcvRate.toFixed(2).replace('.', ',')} /$
            </span>
          </button>

          {/* 7. Personas Adheridas */}
          <button
            type="button"
            onClick={onOpenPersons}
            className="flex flex-col items-start p-3.5 bg-purple-50 border border-purple-200 rounded-2xl hover:shadow-md transition-all active:scale-95 text-left cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20 mb-2 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="font-bold text-purple-950 text-xs">Personas & Familia</span>
            <span className="text-[10px] text-purple-700 line-clamp-1">Finanzas Personales</span>
          </button>

          {/* 8. Configurar Supabase & SQL */}
          <button
            type="button"
            onClick={onOpenSupabaseSettings}
            className="flex flex-col items-start p-3.5 bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-all active:scale-95 text-left cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20 mb-2 group-hover:scale-105 transition-transform">
              <Database className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900 text-xs">Supabase & SQL</span>
            <span className="text-[10px] text-slate-500 line-clamp-1">Ver Script & Llaves</span>
          </button>
        </div>
      </div>
    </div>
  );
};
