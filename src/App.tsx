/**
 * ContaSync AI & Supabase - Finanzas Empresa y Personales
 * Adaptado con IVA 16% (Venezuela), Facturas Fiscales, Notas de Entrega,
 * Tickets de Punto de Venta, Pago Móvil, Dólares Efectivo, USDT,
 * Múltiples Personas en Gastos Personales y Presupuesto Mensual con Alerta de Sobregiro en Números Rojos.
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Building2,
  User,
  Database,
  FileDown,
  Layers,
  ArrowRight,
  ShieldAlert,
  Zap,
  CheckCircle2,
  Calendar,
  Wallet,
  Users,
  Store,
  MapPin,
  Edit3,
} from 'lucide-react';
import { Transaction, EntityType, MonthlyBudget, BudgetStatus, CompanyProfile } from './types/finance';
import {
  getStoredTransactions,
  saveStoredTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  calculateMonthSummary,
  getAvailableMonths,
  syncWithSupabase,
  getStoredBudget,
  saveStoredBudget,
  calculateBudgetStatus,
  getStoredCompanyProfile,
} from './services/storageService';
import {
  getSupabaseConfig,
  getSupabaseClient,
  saveSupabaseConfig,
  fetchTransactionsFromSupabase,
} from './services/supabaseService';
import { Navbar } from './components/Navbar';
import { MonthPicker } from './components/MonthPicker';
import { StatsOverview } from './components/StatsOverview';
import { TransactionList } from './components/TransactionList';
import { ChartsSection } from './components/ChartsSection';
import { ReceiptScannerModal } from './components/ReceiptScannerModal';
import { ManualTransactionModal } from './components/ManualTransactionModal';
import { AccountantPortalModal } from './components/AccountantPortalModal';
import { SupabaseSettingsModal } from './components/SupabaseSettingsModal';
import { ReceiptViewerModal } from './components/ReceiptViewerModal';
import { BudgetTrackerCard } from './components/BudgetTrackerCard';
import { PersonsManagerModal } from './components/PersonsManagerModal';
import { BranchesManagerModal } from './components/BranchesManagerModal';
import { CompanyProfileModal } from './components/CompanyProfileModal';
import { BcvRateModal } from './components/BcvRateModal';
import { MobileActionsHub } from './components/MobileActionsHub';
import { MobileBottomNav } from './components/MobileBottomNav';
import { getBcvRate } from './services/currencyService';

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentEntity, setCurrentEntity] = useState<EntityType | 'todas'>('empresa');
  const [currentMonthKey, setCurrentMonthKey] = useState<string>('2026-09');
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);
  const [bcvRate, setBcvRate] = useState<number>(getBcvRate());

  // Presupuesto mensual personal
  const [budget, setBudget] = useState<MonthlyBudget>(getStoredBudget(currentMonthKey));

  // Modales
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isAccountantOpen, setIsAccountantOpen] = useState(false);
  const [isSupabaseOpen, setIsSupabaseOpen] = useState(false);
  const [isPersonsModalOpen, setIsPersonsModalOpen] = useState(false);
  const [isBranchesModalOpen, setIsBranchesModalOpen] = useState(false);
  const [isCompanyProfileOpen, setIsCompanyProfileOpen] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(getStoredCompanyProfile());
  const [isBcvModalOpen, setIsBcvModalOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<Transaction | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Modo de visualización: Teléfono o PC
  const [viewMode, setViewMode] = useState<'pc' | 'phone'>(() => {
    try {
      const saved = localStorage.getItem('contasync_view_mode');
      if (saved === 'phone' || saved === 'pc') return saved;
      if (typeof window !== 'undefined' && window.innerWidth < 768) return 'phone';
    } catch (e) {}
    return 'phone';
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleToggleViewMode = () => {
    setViewMode((prev) => {
      const next = prev === 'phone' ? 'pc' : 'phone';
      try {
        localStorage.setItem('contasync_view_mode', next);
      } catch (e) {}
      return next;
    });
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncWithSupabase();
      setSyncResult({ success: true, message: res.message });
      setTransactions(getStoredTransactions());
      setCompanyProfile(getStoredCompanyProfile());
      setTimeout(() => setSyncResult(null), 6000);
    } catch (err: any) {
      setSyncResult({ success: false, message: err.message || 'Error en la sincronización' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Cargar datos iniciales y auto-detectar enlace compartido de Supabase para vincular el celular
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const sharedUrl = params.get('s_url') || params.get('supabase_url');
      const sharedKey = params.get('s_key') || params.get('supabase_key');
      if (sharedUrl && sharedKey) {
        const newConfig = {
          url: decodeURIComponent(sharedUrl.trim()),
          anonKey: decodeURIComponent(sharedKey.trim()),
          bucketName: 'recibos-facturas',
          isConnected: true,
          lastChecked: new Date().toISOString(),
        };
        saveSupabaseConfig(newConfig);
        setIsSupabaseConnected(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {
      console.warn('Error leyendo parámetros de vinculación:', e);
    }

    const loaded = getStoredTransactions();
    setTransactions(loaded);

    const cfg = getSupabaseConfig();
    setIsSupabaseConnected(Boolean(cfg.url && cfg.anonKey));

    if (cfg.url && cfg.anonKey) {
      syncWithSupabase().then((res) => {
        if (res.syncedCount > 0) {
          setTransactions(getStoredTransactions());
          setCompanyProfile(getStoredCompanyProfile());
        }
      });
    }

    const handleProfileUpdate = (e: any) => {
      if (e.detail) {
        setCompanyProfile(e.detail);
      } else {
        setCompanyProfile(getStoredCompanyProfile());
      }
    };

    window.addEventListener('contasync_company_profile_updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('contasync_company_profile_updated', handleProfileUpdate);
    };
  }, []);

  // Sincronización automática entre PC y Teléfono (al cambiar de pestaña o en tiempo real)
  useEffect(() => {
    const handleSync = async () => {
      const cfg = getSupabaseConfig();
      if (cfg.url && cfg.anonKey) {
        const res = await syncWithSupabase();
        if (res.syncedCount > 0) {
          setTransactions(getStoredTransactions());
        }
      }
    };

    const handleFocus = () => {
      handleSync();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleSync();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Suscripción Realtime en Supabase para reflejar cambios instantáneos entre PC y teléfono
    let channel: any = null;
    const client = getSupabaseClient();
    if (client) {
      try {
        channel = client
          .channel('finanzas_realtime_channel')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'finanzas_transacciones' },
            async () => {
              const remote = await fetchTransactionsFromSupabase();
              if (remote && remote.length > 0) {
                saveStoredTransactions(remote);
                setTransactions(remote);
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Realtime channel info:', err);
      }
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (channel && client) {
        client.removeChannel(channel);
      }
    };
  }, [isSupabaseConnected]);

  // Actualizar presupuesto al cambiar el mes
  useEffect(() => {
    setBudget(getStoredBudget(currentMonthKey));
  }, [currentMonthKey]);

  const availableMonths = getAvailableMonths(transactions);
  const monthSummary = calculateMonthSummary(transactions, currentMonthKey, currentEntity);
  const budgetStatus = calculateBudgetStatus(transactions, currentMonthKey, budget);

  const handleTransactionSaved = async (tx: Transaction) => {
    if (editingTransaction) {
      await updateTransaction(tx);
      setEditingTransaction(null);
    } else {
      await addTransaction(tx);
    }
    setTransactions(getStoredTransactions());
  };

  const handleDelete = async (id: string) => {
    await deleteTransaction(id);
    setTransactions(getStoredTransactions());
  };

  const handleEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsManualOpen(true);
  };

  const handleConfigUpdated = () => {
    const cfg = getSupabaseConfig();
    setIsSupabaseConnected(Boolean(cfg.url && cfg.anonKey));
    setTransactions(getStoredTransactions());
  };

  const handleUpdateBudget = (newBudget: MonthlyBudget) => {
    setBudget(newBudget);
    saveStoredBudget(newBudget);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Barra de Navegación Principal */}
      <Navbar
        currentEntity={currentEntity}
        onSelectEntity={setCurrentEntity}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenManual={() => {
          setEditingTransaction(null);
          setIsManualOpen(true);
        }}
        onOpenAccountantPortal={() => setIsAccountantOpen(true)}
        onOpenSupabaseSettings={() => setIsSupabaseOpen(true)}
        isSupabaseConnected={isSupabaseConnected}
        bcvRate={bcvRate}
        onOpenBcvModal={() => setIsBcvModalOpen(true)}
        onOpenCompanyProfile={() => setIsCompanyProfileOpen(true)}
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
        onSyncNow={handleSyncNow}
        isSyncing={isSyncing}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 pb-24 md:pb-8">
        {/* Centro de Opciones y Sincronización Inmediata */}
        <MobileActionsHub
          currentEntity={currentEntity}
          onSelectEntity={setCurrentEntity}
          onOpenScanner={() => setIsScannerOpen(true)}
          onOpenManual={() => {
            setEditingTransaction(null);
            setIsManualOpen(true);
          }}
          onOpenAccountantPortal={() => setIsAccountantOpen(true)}
          onOpenSupabaseSettings={() => setIsSupabaseOpen(true)}
          onOpenCompanyProfile={() => setIsCompanyProfileOpen(true)}
          onOpenBranches={() => setIsBranchesModalOpen(true)}
          onOpenPersons={() => setIsPersonsModalOpen(true)}
          onOpenBcvModal={() => setIsBcvModalOpen(true)}
          bcvRate={bcvRate}
          companyProfile={companyProfile}
          isSupabaseConnected={isSupabaseConnected}
          onSyncNow={handleSyncNow}
          isSyncing={isSyncing}
          syncResult={syncResult}
          viewMode={viewMode}
          onToggleViewMode={handleToggleViewMode}
        />

        {/* Banner de Entidad Activa */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-sm ${
                currentEntity === 'empresa'
                  ? 'bg-blue-600'
                  : currentEntity === 'personal'
                  ? 'bg-purple-600'
                  : 'bg-slate-900'
              }`}
            >
              {currentEntity === 'empresa' ? (
                <Building2 className="w-6 h-6" />
              ) : currentEntity === 'personal' ? (
                <User className="w-6 h-6" />
              ) : (
                <Layers className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {currentEntity === 'empresa'
                    ? 'Contabilidad Empresa (Persona Jurídica)'
                    : currentEntity === 'personal'
                    ? 'Finanzas Personales (Familiar & Individual)'
                    : 'Visión Consolidada (Empresa + Personal)'}
                </h2>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    currentEntity === 'empresa'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : currentEntity === 'personal'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {currentEntity === 'empresa' ? 'IVA 16% Deducible' : 'Con Presupuesto y Personas'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentEntity === 'empresa'
                  ? 'Facturas fiscales con RIF, IVA 16%, notas de entrega y tickets POS corporativos.'
                  : currentEntity === 'personal'
                  ? 'Control presupuestario familiar por persona adherida, con alerta en números rojos en caso de sobregiro.'
                  : 'Balance integrado de ingresos, gastos, compras, presupuesto y comprobantes digitalizados.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentEntity === 'empresa' && (
              <>
                <button
                  type="button"
                  onClick={() => setIsCompanyProfileOpen(true)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  title="Modificar Razón Social, RIF y Domicilio Fiscal de la Empresa"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Datos Empresa (RIF & Domicilio)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsBranchesModalOpen(true)}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  title="Administrar sedes y sucursales (Principal, Sucursales)"
                >
                  <Store className="w-3.5 h-3.5 text-blue-700" />
                  Sedes de la Empresa
                </button>
              </>
            )}
            {currentEntity === 'personal' && (
              <button
                type="button"
                onClick={() => setIsPersonsModalOpen(true)}
                className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Users className="w-3.5 h-3.5 text-purple-600" />
                Personas Adheridas
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsAccountantOpen(true)}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Compartir o descargar expediente PDF con fotos de las facturas cargadas"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-600" />
              <span>Compartir PDF con Fotos</span>
            </button>
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Escanear Factura / POS
            </button>
          </div>

          {/* Sub-banner de Datos Fiscales de la Empresa (Razón Social, RIF, Domicilio Fiscal) */}
          {currentEntity !== 'personal' && (
            <div className="w-full pt-3 mt-1 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5 text-blue-950 font-extrabold text-sm">
                  <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{companyProfile.name}</span>
                </div>
                <span className="font-mono font-bold bg-blue-50 text-blue-900 px-2.5 py-0.5 rounded-lg border border-blue-200 text-xs">
                  RIF: {companyProfile.taxId}
                </span>
                <span className="text-slate-300 hidden md:inline">•</span>
                <div className="flex items-center gap-1 text-slate-600 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="max-w-md truncate" title={companyProfile.address}>
                    {companyProfile.address}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCompanyProfileOpen(true)}
                className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
                title="Modificar Razón Social, RIF y Domicilio Fiscal"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                <span>Modificar RIF y Domicilio</span>
              </button>
            </div>
          )}
        </div>

        {/* Notificación si Supabase aún no está configurado */}
        {!isSupabaseConnected && (
          <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Modo Local Activo:</strong> Tus datos y comprobantes se guardan de forma segura en este navegador. Conecta Supabase para resguardarlos en PostgreSQL y en el Bucket de Storage.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsSupabaseOpen(true)}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Database className="w-3 h-3" /> Conectar Supabase
            </button>
          </div>
        )}

        {/* CONTROL DE PRESUPUESTO PERSONAL CON NÚMEROS ROJOS Y ALERTA DE SOBREGIRO */}
        {(currentEntity === 'personal' || currentEntity === 'todas') && (
          <BudgetTrackerCard
            budget={budget}
            budgetStatus={budgetStatus}
            onUpdateBudget={handleUpdateBudget}
            onOpenPersonsModal={() => setIsPersonsModalOpen(true)}
            monthName={monthSummary.monthName}
          />
        )}

        {/* Selector Mes a Mes */}
        <MonthPicker
          currentMonthKey={currentMonthKey}
          availableMonths={availableMonths}
          onChangeMonth={setCurrentMonthKey}
          transactionCount={transactions.filter((t) => t.date.startsWith(currentMonthKey)).length}
        />

        {/* Tarjetas de Métricas del Mes (Con IVA 16% de Venezuela) */}
        <StatsOverview
          summary={monthSummary}
          entityFilter={currentEntity}
        />

        {/* Gráficos y Distribución */}
        <ChartsSection
          transactions={transactions}
          currentMonthKey={currentMonthKey}
          entityFilter={currentEntity}
        />

        {/* Tabla de Facturas, Notas y Vouchers POS */}
        <TransactionList
          transactions={transactions}
          currentMonthKey={currentMonthKey}
          entityFilter={currentEntity}
          onViewReceipt={(tx) => setViewingReceipt(tx)}
          onEditTransaction={handleEdit}
          onDeleteTransaction={handleDelete}
          onOpenScanner={() => setIsScannerOpen(true)}
          onOpenManual={() => {
            setEditingTransaction(null);
            setIsManualOpen(true);
          }}
          onOpenAccountantPortal={() => setIsAccountantOpen(true)}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">ContaSync AI</span>
            <span>•</span>
            <span>IVA 16% Venezuela • Notas de Entrega • Tickets POS</span>
            <span>•</span>
            <span className="text-emerald-600 font-medium">Fotos Ultralivianas en Supabase</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsAccountantOpen(true)}
              className="text-slate-600 hover:text-emerald-700 font-medium transition-colors cursor-pointer"
            >
              Generar PDF Contador
            </button>
            <button
              onClick={() => setIsSupabaseOpen(true)}
              className="text-slate-600 hover:text-emerald-700 font-medium transition-colors cursor-pointer"
            >
              Configurar Supabase & SQL
            </button>
          </div>
        </div>
      </footer>

      {/* Modales */}
      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onTransactionSaved={handleTransactionSaved}
        defaultEntity={currentEntity === 'todas' ? 'empresa' : currentEntity}
      />

      <ManualTransactionModal
        isOpen={isManualOpen}
        onClose={() => {
          setIsManualOpen(false);
          setEditingTransaction(null);
        }}
        onTransactionSaved={handleTransactionSaved}
        defaultEntity={currentEntity === 'todas' ? 'empresa' : currentEntity}
        editingTransaction={editingTransaction}
      />

      <AccountantPortalModal
        isOpen={isAccountantOpen}
        onClose={() => setIsAccountantOpen(false)}
        transactions={transactions}
        currentMonthKey={currentMonthKey}
        monthSummary={monthSummary}
        availableMonths={availableMonths}
        onSelectMonth={setCurrentMonthKey}
        entityFilter={currentEntity}
        onOpenCompanyProfile={() => setIsCompanyProfileOpen(true)}
        onOpenBranches={() => setIsBranchesModalOpen(true)}
      />

      <SupabaseSettingsModal
        isOpen={isSupabaseOpen}
        onClose={() => setIsSupabaseOpen(false)}
        onConfigUpdated={handleConfigUpdated}
      />

      <ReceiptViewerModal
        transaction={viewingReceipt}
        onClose={() => setViewingReceipt(null)}
      />

      <PersonsManagerModal
        isOpen={isPersonsModalOpen}
        onClose={() => setIsPersonsModalOpen(false)}
        onPersonsUpdated={() => {
          // Trigger re-render
          setTransactions([...getStoredTransactions()]);
        }}
      />

      <BranchesManagerModal
        isOpen={isBranchesModalOpen}
        onClose={() => setIsBranchesModalOpen(false)}
        onBranchesUpdated={() => {
          // Trigger re-render
          setTransactions([...getStoredTransactions()]);
        }}
        onOpenCompanyProfile={() => setIsCompanyProfileOpen(true)}
      />

      <CompanyProfileModal
        isOpen={isCompanyProfileOpen}
        onClose={() => setIsCompanyProfileOpen(false)}
        onProfileUpdated={(updated) => {
          setCompanyProfile(updated);
          setTransactions([...getStoredTransactions()]);
        }}
        onOpenBranches={() => setIsBranchesModalOpen(true)}
      />

      <BcvRateModal
        isOpen={isBcvModalOpen}
        onClose={() => setIsBcvModalOpen(false)}
        currentRate={bcvRate}
        currentMonthKey={currentMonthKey}
        availableMonths={availableMonths}
        transactions={transactions}
        onRateUpdated={(newRate) => {
          setBcvRate(newRate);
          setTransactions([...getStoredTransactions()]);
        }}
        onTransactionsRevalued={() => {
          setTransactions([...getStoredTransactions()]);
        }}
      />

      {/* Barra de Navegación Flotante Inferior para Teléfonos */}
      <MobileBottomNav
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenManual={() => {
          setEditingTransaction(null);
          setIsManualOpen(true);
        }}
        onOpenAccountantPortal={() => setIsAccountantOpen(true)}
        onOpenSupabaseSettings={() => setIsSupabaseOpen(true)}
        onSyncNow={handleSyncNow}
        isSyncing={isSyncing}
        isSupabaseConnected={isSupabaseConnected}
        onOpenCompanyProfile={() => setIsCompanyProfileOpen(true)}
      />
    </div>
  );
}
