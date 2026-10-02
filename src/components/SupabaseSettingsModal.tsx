import React, { useState } from 'react';
import {
  X,
  Database,
  Cloud,
  Check,
  Copy,
  AlertCircle,
  ExternalLink,
  Code,
  Github,
  Globe,
  RefreshCw,
  FolderLock,
} from 'lucide-react';
import { SupabaseConfig } from '../types/finance';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  getSupabaseSqlScript,
  testSupabaseConnection,
} from '../services/supabaseService';
import { syncWithSupabase } from '../services/storageService';

interface SupabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
}

export const SupabaseSettingsModal: React.FC<SupabaseSettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
}) => {
  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [bucketName, setBucketName] = useState(currentConfig.bucketName || 'recibos-facturas');

  const [activeTab, setActiveTab] = useState<'config' | 'sql' | 'github'>('config');
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const sqlCode = getSupabaseSqlScript(bucketName);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await testSupabaseConnection(url, anonKey);
      setTestResult(res);

      if (res.success) {
        const newConfig: SupabaseConfig = {
          url: url.trim(),
          anonKey: anonKey.trim(),
          bucketName: bucketName.trim(),
          isConnected: true,
          lastChecked: new Date().toISOString(),
        };
        saveSupabaseConfig(newConfig);
        onConfigUpdated();
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Error al conectar',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveOnly = () => {
    const newConfig: SupabaseConfig = {
      url: url.trim(),
      anonKey: anonKey.trim(),
      bucketName: bucketName.trim(),
      isConnected: Boolean(url && anonKey),
      lastChecked: new Date().toISOString(),
    };
    saveSupabaseConfig(newConfig);
    onConfigUpdated();
    onClose();
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setTestResult(null);
    try {
      const res = await syncWithSupabase();
      setTestResult({ success: true, message: res.message });
      onConfigUpdated();
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Resguardo en Supabase & Despliegue
              </h2>
              <p className="text-xs text-slate-400">
                Almacena transacciones en PostgreSQL y facturas ultralivianas en el Bucket de Storage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'config'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            Credenciales Supabase
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'sql'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Script SQL (Tablas & Bucket)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('github')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'github'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            GitHub & Netlify
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {testResult && (
            <div
              className={`mb-5 p-3.5 rounded-2xl flex items-start gap-3 text-xs border ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-900 leading-relaxed">
                <p className="font-semibold text-emerald-950 mb-1 flex items-center gap-1.5">
                  <FolderLock className="w-4 h-4 text-emerald-600" />
                  Almacenamiento Híbrido Automático
                </p>
                ContaSync funciona de manera inmediata con almacenamiento local persistente. Al ingresar tu <strong>Project URL</strong> y <strong>Anon Key</strong> de Supabase, las transacciones se sincronizan y las fotos de facturas ultralivianas se respaldan en el bucket público de tu proyecto.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supabase Project URL *
                </label>
                <input
                  type="text"
                  placeholder="https://xyzproject.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Encuéntrala en: Supabase Dashboard &gt; Project Settings &gt; API &gt; Project URL
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supabase Anon / Public API Key *
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Encuéntrala en: Supabase Dashboard &gt; Project Settings &gt; API &gt; Project API keys (anon public)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Storage Bucket para Recibos
                </label>
                <input
                  type="text"
                  value={bucketName}
                  onChange={(e) => setBucketName(e.target.value)}
                  placeholder="recibos-facturas"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Por defecto: <code className="bg-slate-100 px-1 py-0.5 rounded">recibos-facturas</code> (creado con el script SQL de la siguiente pestaña)
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={isSyncing || !url || !anonKey}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sincronizar Registros Ahora
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || !url || !anonKey}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isTesting ? 'Probando...' : 'Probar Conexión'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveOnly}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    Guardar Configuración
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">
                    Script SQL para el Editor de Supabase
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Copia y pega este script en el <strong>SQL Editor</strong> de tu proyecto Supabase para crear las tablas y permisos automáticamente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> ¡Código Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copiar SQL
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 bg-slate-950 text-emerald-400 rounded-2xl font-mono text-[11px] leading-relaxed overflow-x-auto max-h-72 border border-slate-800 select-all">
                <pre>{sqlCode}</pre>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">Instrucciones rápidas en Supabase:</p>
                <ol className="list-decimal list-inside text-[11px] text-slate-500 space-y-0.5">
                  <li>Inicia sesión en <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-600 underline">supabase.com</a> y abre tu proyecto.</li>
                  <li>Ve al menú lateral izquierdo y haz clic en <strong>SQL Editor</strong>.</li>
                  <li>Crea una nueva consulta (+ New Query), pega este script y pulsa <strong>Run</strong>.</li>
                  <li>¡Listo! Tu base de datos y tu bucket estarán preparados para recibir recibos y transacciones.</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'github' && (
            <div className="space-y-4 text-xs text-slate-700">
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl text-blue-900 leading-relaxed">
                <h3 className="font-bold text-sm text-blue-950 mb-1 flex items-center gap-2">
                  <Github className="w-4 h-4" />
                  Guía de Resguardo en GitHub y Despliegue en Netlify
                </h3>
                <p className="text-[11px] text-blue-800">
                  Como solicitaste, esta aplicación está construida con arquitectura estándar compatible con repositorios Git y plataformas Jamstack como Netlify o Vercel.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <h4 className="font-bold text-slate-800 mb-1">1. Subir el proyecto a GitHub:</h4>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Ejecuta estos comandos en tu terminal para crear tu repositorio de respaldo:
                  </p>
                  <pre className="bg-slate-900 text-slate-100 p-2.5 rounded-xl font-mono text-[11px] overflow-x-auto">
{`git init
git add .
git commit -m "ContaSync AI & Supabase - Finanzas y Contabilidad"
git remote add origin https://github.com/TU-USUARIO/contasync-app.git
git push -u origin main`}
                  </pre>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <h4 className="font-bold text-slate-800 mb-1">2. Desplegar en Netlify:</h4>
                  <ul className="list-disc list-inside text-[11px] text-slate-500 space-y-1">
                    <li>Entra en <strong>netlify.com</strong> y selecciona <strong>Add new site &gt; Import an existing project</strong>.</li>
                    <li>Selecciona tu repositorio de GitHub.</li>
                    <li>Build command: <code className="bg-slate-200 px-1 py-0.5 rounded">npm run build</code></li>
                    <li>Publish directory: <code className="bg-slate-200 px-1 py-0.5 rounded">dist</code></li>
                    <li>
                      En <strong>Environment Variables</strong> de Netlify agrega:
                      <ul className="list-disc list-inside ml-4 mt-1 font-mono text-[10px] text-slate-700">
                        <li><code>GEMINI_API_KEY</code> = tu clave de Google AI Studio</li>
                        <li><code>VITE_SUPABASE_URL</code> = tu url de Supabase</li>
                        <li><code>VITE_SUPABASE_ANON_KEY</code> = tu clave pública de Supabase</li>
                      </ul>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
