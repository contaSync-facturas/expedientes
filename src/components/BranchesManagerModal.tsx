import React, { useState } from 'react';
import { X, Building2, Plus, Trash2, Check, MapPin, Store } from 'lucide-react';
import { CompanyBranch } from '../types/finance';
import { addStoredBranch, deleteStoredBranch, getStoredBranches, getStoredCompanyProfile } from '../services/storageService';

interface BranchesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBranchesUpdated: (branches: CompanyBranch[]) => void;
  onOpenCompanyProfile?: () => void;
}

export const BranchesManagerModal: React.FC<BranchesManagerModalProps> = ({
  isOpen,
  onClose,
  onBranchesUpdated,
  onOpenCompanyProfile,
}) => {
  const [branches, setBranches] = useState<CompanyBranch[]>(getStoredBranches());
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newAddress, setNewAddress] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    addStoredBranch(newName.trim(), newCode.trim(), newAddress.trim());
    const updated = getStoredBranches();
    setBranches(updated);
    onBranchesUpdated(updated);
    setNewName('');
    setNewCode('');
    setNewAddress('');
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Deseas eliminar esta sede de la empresa?')) {
      deleteStoredBranch(id);
      const updated = getStoredBranches();
      setBranches(updated);
      onBranchesUpdated(updated);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Sedes y Sucursales de la Empresa
              </h2>
              <p className="text-xs text-slate-500">
                Asigna facturas a cada sede para generar informes contables completos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Tarjeta de Razón Social y RIF actual */}
          <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">
                  {getStoredCompanyProfile().name}
                </span>
                <span className="text-[11px] text-slate-300 font-mono">
                  RIF: {getStoredCompanyProfile().taxId} • {getStoredCompanyProfile().address ? getStoredCompanyProfile().address.slice(0, 35) + '...' : 'Sin domicilio configurado'}
                </span>
              </div>
            </div>
            {onOpenCompanyProfile && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCompanyProfile();
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Editar RIF y Domicilio
              </button>
            )}
          </div>

          {/* Form to add branch */}
          <form onSubmit={handleAdd} className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-blue-950 block">
              Registrar Nueva Sede / Sucursal
            </span>
            <div className="space-y-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-900 mb-1">
                  Nombre de la Sede *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Lubricantes Asiáticos (Sucursal Este)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-900 mb-1">
                    Código Corto
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: SUC-2"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-900 mb-1">
                    Dirección o Zona
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Av. Las Américas"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Guardar Sede / Sucursal</span>
            </button>
          </form>

          {/* List of active branches */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Sedes Activas ({branches.length})
              </span>
            </div>

            <div className="space-y-2">
              {branches.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/20 transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {b.code || 'SED'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{b.name}</span>
                        {b.isMain && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Principal
                          </span>
                        )}
                      </div>
                      {b.address && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{b.address}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {!b.isMain && branches.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDelete(b.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar sede"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            ✓ Facturas y reportes contables discriminados por sede
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
