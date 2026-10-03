import React from 'react';
import {
  Sparkles,
  Plus,
  FileDown,
  Database,
  LayoutDashboard,
  Building2,
  RefreshCw,
} from 'lucide-react';

interface MobileBottomNavProps {
  onOpenScanner: () => void;
  onOpenManual: () => void;
  onOpenAccountantPortal: () => void;
  onOpenSupabaseSettings: () => void;
  onSyncNow: () => void;
  isSyncing: boolean;
  isSupabaseConnected: boolean;
  onOpenCompanyProfile: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenScanner,
  onOpenManual,
  onOpenAccountantPortal,
  onOpenSupabaseSettings,
  onSyncNow,
  isSyncing,
  isSupabaseConnected,
  onOpenCompanyProfile,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-2 py-1.5 shadow-2xl md:hidden safe-area-bottom">
      <div className="flex items-center justify-around gap-1 max-w-lg mx-auto">
        {/* RIF & Empresa */}
        <button
          type="button"
          onClick={onOpenCompanyProfile}
          className="flex flex-col items-center justify-center p-1.5 rounded-xl text-slate-600 hover:text-blue-600 active:scale-95 transition-all"
        >
          <Building2 className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">Empresa</span>
        </button>

        {/* Manual */}
        <button
          type="button"
          onClick={onOpenManual}
          className="flex flex-col items-center justify-center p-1.5 rounded-xl text-slate-600 hover:text-slate-900 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5 text-slate-800" />
          <span className="text-[10px] font-bold mt-0.5">Manual</span>
        </button>

        {/* Escanear Factura con IA (Botón Central Destacado) */}
        <button
          type="button"
          onClick={onOpenScanner}
          className="flex flex-col items-center justify-center -mt-5 p-3 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-600/35 border-2 border-white active:scale-95 transition-all cursor-pointer"
        >
          <Sparkles className="w-6 h-6 animate-pulse" />
          <span className="text-[10px] font-extrabold mt-0.5">Escanear</span>
        </button>

        {/* Portal Contador */}
        <button
          type="button"
          onClick={onOpenAccountantPortal}
          className="flex flex-col items-center justify-center p-1.5 rounded-xl text-slate-600 hover:text-emerald-700 active:scale-95 transition-all"
        >
          <FileDown className="w-5 h-5 text-emerald-600" />
          <span className="text-[10px] font-bold mt-0.5">Contador</span>
        </button>

        {/* Sincronización en la Nube */}
        <button
          type="button"
          onClick={onSyncNow}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl active:scale-95 transition-all ${
            isSupabaseConnected ? 'text-emerald-700' : 'text-amber-600'
          }`}
          title="Sincronizar cambios entre PC y Teléfono"
        >
          <div className="relative">
            <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
            <span
              className={`absolute -top-0.5 -right-1 w-2 h-2 rounded-full ${
                isSupabaseConnected ? 'bg-emerald-500' : 'bg-amber-400 animate-ping'
              }`}
            />
          </div>
          <span className="text-[10px] font-bold mt-0.5">
            {isSyncing ? 'Subiendo' : 'Sincronizar'}
          </span>
        </button>
      </div>
    </nav>
  );
};
