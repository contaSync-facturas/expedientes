import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  MapPin,
  FileText,
  Phone,
  Mail,
  Briefcase,
  Check,
  ShieldCheck,
  Store,
  ExternalLink,
} from 'lucide-react';
import { CompanyProfile, CompanyBranch } from '../types/finance';
import {
  getStoredCompanyProfile,
  saveStoredCompanyProfile,
  getStoredBranches,
} from '../services/storageService';

interface CompanyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (profile: CompanyProfile) => void;
  onOpenBranches?: () => void;
}

export const CompanyProfileModal: React.FC<CompanyProfileModalProps> = ({
  isOpen,
  onClose,
  onProfileUpdated,
  onOpenBranches,
}) => {
  const [profile, setProfile] = useState<CompanyProfile>(getStoredCompanyProfile());
  const [branches, setBranches] = useState<CompanyBranch[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProfile(getStoredCompanyProfile());
      setBranches(getStoredBranches());
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.name.trim() || !profile.taxId.trim()) return;

    const updatedProfile: CompanyProfile = {
      name: profile.name.trim(),
      taxId: profile.taxId.trim().toUpperCase(),
      address: profile.address.trim(),
      phone: profile.phone?.trim() || '',
      email: profile.email?.trim() || '',
      activity: profile.activity?.trim() || '',
    };

    saveStoredCompanyProfile(updatedProfile);
    setProfile(updatedProfile);
    if (onProfileUpdated) onProfileUpdated(updatedProfile);

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Datos Fiscales de la Empresa
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  SENIAT • RIF
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Razón Social, RIF y Domicilio Fiscal para informes, expedientes y contabilidad
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

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>¡Datos fiscales actualizados con éxito! Se aplicarán en todos los informes.</span>
            </div>
          )}

          {/* Tarjeta de Razón Social y RIF */}
          <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-950 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Identificación Jurídica Principal</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Razón Social / Nombre Comercial *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Lubricantes Asiáticos C.A."
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Aparece en el membrete del PDF oficial y en los libros diarios
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Número de RIF *
                </label>
                <input
                  type="text"
                  required
                  placeholder="J-31456789-0"
                  value={profile.taxId}
                  onChange={(e) => setProfile({ ...profile, taxId: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Formato SENIAT (J-, V-, G-, E-)
                </span>
              </div>
            </div>
          </div>

          {/* Domicilio Fiscal */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Domicilio Fiscal y Ubicación</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Dirección / Domicilio Fiscal Completo *
              </label>
              <textarea
                required
                rows={2}
                placeholder="Ej: Av. Principal Zona Industrial Los Galpones, Galpón 4-B, Valencia, Edo. Carabobo"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Domicilio registrado ante el SENIAT para emitir y recibir comprobantes
              </span>
            </div>
          </div>

          {/* Datos de Contacto y Actividad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                Teléfono de Contacto
              </label>
              <input
                type="text"
                placeholder="Ej: 0414-1234567 / 0241-8000000"
                value={profile.phone || ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                Correo Electrónico
              </label>
              <input
                type="email"
                placeholder="administracion@lubricantesasiaticos.com"
                value={profile.email || ''}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-500" />
              Actividad Comercial / Objeto
            </label>
            <input
              type="text"
              placeholder="Ej: Venta, Distribución e Importación de Lubricantes, Filtros e Insumos"
              value={profile.activity || ''}
              onChange={(e) => setProfile({ ...profile, activity: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sedes / Sucursales Asociadas */}
          <div className="p-4 bg-slate-100/70 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Store className="w-4 h-4 text-blue-700 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Sedes y Sucursales de {profile.name || 'la Empresa'}
                </span>
                <span className="text-[11px] text-slate-600">
                  {branches.length} sedes activas ({branches.map((b) => b.name).join(', ')})
                </span>
              </div>
            </div>
            {onOpenBranches && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBranches();
                }}
                className="px-3 py-1.5 bg-white hover:bg-slate-200 text-blue-800 border border-blue-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              >
                <span>Gestionar Sedes</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </button>
            )}
          </div>

          {/* Footer buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-600/25"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Datos Fiscales</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
