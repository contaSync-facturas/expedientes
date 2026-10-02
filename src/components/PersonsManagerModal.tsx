import React, { useState } from 'react';
import { X, UserPlus, Users, Trash2, Check, User } from 'lucide-react';
import { Person } from '../types/finance';
import { addStoredPerson, deleteStoredPerson, getStoredPersons } from '../services/storageService';

interface PersonsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPersonsUpdated: (persons: Person[]) => void;
}

export const PersonsManagerModal: React.FC<PersonsManagerModalProps> = ({
  isOpen,
  onClose,
  onPersonsUpdated,
}) => {
  const [persons, setPersons] = useState<Person[]>(getStoredPersons());
  const [newName, setNewName] = useState('');
  const [newRelation, setNewRelation] = useState('Familiar');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    addStoredPerson(newName.trim(), newRelation);
    const updated = getStoredPersons();
    setPersons(updated);
    onPersonsUpdated(updated);
    setNewName('');
  };

  const handleDelete = (id: string) => {
    deleteStoredPerson(id);
    const updated = getStoredPersons();
    setPersons(updated);
    onPersonsUpdated(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Personas en Finanzas Personales
              </h2>
              <p className="text-xs text-slate-500">
                Asigna facturas y tickets a diferentes miembros de la familia
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
        <div className="p-6 space-y-5">
          {/* Form to add person */}
          <form onSubmit={handleAdd} className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-purple-950 block">
              Adherir Nueva Persona
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="text"
                  required
                  placeholder="Nombre (ej: María, Carlos)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <select
                  value={newRelation}
                  onChange={(e) => setNewRelation(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Yo">Yo (Titular)</option>
                  <option value="Pareja">Esposa / Pareja</option>
                  <option value="Hijos">Hijo(a)</option>
                  <option value="Padres">Padre / Madre</option>
                  <option value="Familiar">Otro Familiar</option>
                  <option value="Colaborador">Colaborador</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Adherir Persona
            </button>
          </form>

          {/* List of Persons */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Personas Registradas ({persons.length})
            </span>
            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {persons.map((p) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-xs"
                      style={{ backgroundColor: p.color || '#9333ea' }}
                    >
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{p.name}</h4>
                      <span className="text-[11px] text-slate-400">{p.relation || 'Miembro'}</span>
                    </div>
                  </div>

                  {persons.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar persona"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
