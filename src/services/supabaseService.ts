import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig, Transaction } from '../types/finance';

const STORAGE_KEY_CONFIG = 'contasync_supabase_config';

const DEFAULT_CONFIG: SupabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  bucketName: 'recibos-facturas',
  isConnected: false,
  lastChecked: null,
};

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = '';

export function getSupabaseConfig(): SupabaseConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        url: parsed.url || DEFAULT_CONFIG.url,
        anonKey: parsed.anonKey || DEFAULT_CONFIG.anonKey,
      };
    }
  } catch (e) {
    console.error('Error cargando configuración de Supabase:', e);
  }
  return DEFAULT_CONFIG;
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    cachedClient = null; // Forzar recreación con nuevos parámetros
  } catch (e) {
    console.error('Error guardando configuración de Supabase:', e);
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  const keyCombo = `${config.url}::${config.anonKey}`;
  if (cachedClient && cachedConfigKey === keyCombo) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
      },
    });
    cachedConfigKey = keyCombo;
    return cachedClient;
  } catch (err) {
    console.error('Error instanciando cliente Supabase:', err);
    return null;
  }
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!url || !anonKey) {
      return { success: false, message: 'URL y Anon Key son requeridos.' };
    }

    const cleanUrl = url.replace(/\/$/, '');
    const client = createClient(cleanUrl, anonKey);

    // Intentar leer metadata básica
    const { data: _buckets, error: bucketError } = await client.storage.listBuckets();

    if (bucketError && bucketError.message.includes('FetchError')) {
      return { success: false, message: `No se pudo conectar a la URL: ${bucketError.message}` };
    }

    return {
      success: true,
      message: 'Conexión verificada exitosamente con Supabase.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Error desconocido al conectar con Supabase',
    };
  }
}

/**
 * Sube una imagen ultraliviana al Storage Bucket de Supabase
 * Organiza los archivos por carpetas separadas:
 * - empresa/YYYY/MM/factura_...
 * - personal/YYYY/MM/factura_...
 */
export async function uploadReceiptToSupabase(
  blob: Blob,
  fileName: string,
  entity: string,
  dateStr?: string
): Promise<{ url: string; path: string } | null> {
  const client = getSupabaseClient();
  const config = getSupabaseConfig();

  if (!client) {
    console.warn('Supabase no está configurado, omitiendo subida a la nube');
    return null;
  }

  try {
    const bucketName = config.bucketName || 'recibos-facturas';
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Extraer año y mes de la fecha de la factura o de hoy
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const year = isNaN(targetDate.getFullYear()) ? new Date().getFullYear() : targetDate.getFullYear();
    const month = isNaN(targetDate.getMonth())
      ? String(new Date().getMonth() + 1).padStart(2, '0')
      : String(targetDate.getMonth() + 1).padStart(2, '0');

    // Estructura limpia y organizada en el Bucket de Supabase
    const filePath = `${entity}/${year}/${month}/${cleanFileName}`;

    const { data, error } = await client.storage
      .from(bucketName)
      .upload(filePath, blob, {
        upsert: true,
        contentType: blob.type || 'image/webp',
      });

    if (error) {
      console.warn('Error al subir a Supabase Bucket (verificar si el bucket existe):', error.message);
      return null;
    }

    // Obtener URL pública
    const { data: publicData } = client.storage.from(bucketName).getPublicUrl(data.path);

    return {
      url: publicData.publicUrl,
      path: data.path,
    };
  } catch (err) {
    console.error('Fallo en la subida a Supabase Storage:', err);
    return null;
  }
}

/**
 * Guarda o actualiza una transacción en la tabla finanzas_transacciones de Supabase
 */
export async function saveTransactionToSupabase(tx: Transaction): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const row = {
      id: tx.id,
      entity: tx.entity,
      type: tx.type,
      date: tx.date,
      supplier: tx.supplier,
      tax_id: tx.taxId || null,
      invoice_number: tx.invoiceNumber || null,
      category: tx.category,
      subtotal: tx.subtotal,
      tax_rate: tx.taxRate || 0,
      tax_amount: tx.taxAmount,
      retention_amount: tx.retentionAmount || 0,
      total: tx.total,
      currency: tx.currency,
      description: tx.description,
      receipt_url: tx.receiptUrl || null,
      receipt_storage_path: tx.receiptStoragePath || null,
      receipt_size_kb: tx.receiptSizeKb || null,
      is_deductible: tx.isDeductible,
      status: tx.status,
      payment_method: tx.paymentMethod,
      line_items: tx.lineItems || [],
      created_at: tx.createdAt,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('finanzas_transacciones').upsert(row);
    if (error) {
      console.error('Error insertando en Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error guardando en Supabase:', err);
    return false;
  }
}

/**
 * Obtiene todas las transacciones de Supabase
 */
export async function fetchTransactionsFromSupabase(): Promise<Transaction[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('finanzas_transacciones')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.warn('No se pudieron obtener datos de Supabase:', error.message);
      return null;
    }

    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      entity: row.entity,
      type: row.type,
      date: row.date,
      supplier: row.supplier,
      taxId: row.tax_id,
      invoiceNumber: row.invoice_number,
      category: row.category,
      subtotal: Number(row.subtotal) || 0,
      taxRate: Number(row.tax_rate) || 0,
      taxAmount: Number(row.tax_amount) || 0,
      retentionAmount: Number(row.retention_amount) || 0,
      total: Number(row.total) || 0,
      currency: row.currency || 'USD',
      description: row.description || '',
      receiptUrl: row.receipt_url,
      receiptStoragePath: row.receipt_storage_path,
      receiptSizeKb: row.receipt_size_kb,
      isDeductible: Boolean(row.is_deductible),
      status: row.status || 'pagado',
      paymentMethod: row.payment_method || 'transferencia',
      lineItems: row.line_items || [],
      syncedWithSupabase: true,
      createdAt: row.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.error('Error obteniendo registros de Supabase:', err);
    return null;
  }
}

/**
 * Código SQL exacto para inicializar Supabase
 */
export function getSupabaseSqlScript(bucketName = 'recibos-facturas'): string {
  return `-- ========================================================
-- SCRIPT DE INICIALIZACIÓN PARA SUPABASE
-- Ejecutar en el SQL Editor de tu proyecto en Supabase
-- ========================================================

-- 1. Crear tabla principal de transacciones contables
CREATE TABLE IF NOT EXISTS finanzas_transacciones (
  id TEXT PRIMARY KEY,
  entity TEXT NOT NULL CHECK (entity IN ('empresa', 'personal')),
  type TEXT NOT NULL CHECK (type IN ('gasto', 'ingreso', 'compra_activo')),
  date DATE NOT NULL,
  supplier TEXT NOT NULL,
  tax_id TEXT,
  invoice_number TEXT,
  category TEXT NOT NULL,
  subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5, 2) DEFAULT 0,
  tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  retention_amount NUMERIC(14, 2) DEFAULT 0,
  total NUMERIC(14, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  description TEXT,
  receipt_url TEXT,
  receipt_storage_path TEXT,
  receipt_size_kb NUMERIC(10, 2),
  is_deductible BOOLEAN NOT NULL DEFAULT true,
  status VARCHAR(20) NOT NULL DEFAULT 'pagado',
  payment_method VARCHAR(30) NOT NULL DEFAULT 'transferencia',
  line_items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas ultrarrápidas mes a mes
CREATE INDEX IF NOT EXISTS idx_transacciones_date ON finanzas_transacciones(date DESC);
CREATE INDEX IF NOT EXISTS idx_transacciones_entity ON finanzas_transacciones(entity);
CREATE INDEX IF NOT EXISTS idx_transacciones_category ON finanzas_transacciones(category);

-- Habilitar Row Level Security (RLS)
ALTER TABLE finanzas_transacciones ENABLE ROW LEVEL SECURITY;

-- Política de lectura y escritura permisiva para Anon / Authenticated
CREATE POLICY "Permitir lectura para todos" 
  ON finanzas_transacciones FOR SELECT USING (true);

CREATE POLICY "Permitir insercion y actualizacion para todos" 
  ON finanzas_transacciones FOR ALL USING (true);

-- 2. Crear Storage Bucket para recibos ultralivianos
INSERT INTO storage.buckets (id, name, public)
VALUES ('${bucketName}', '${bucketName}', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para subir y visualizar comprobantes
CREATE POLICY "Permitir ver recibos públicos" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = '${bucketName}');

CREATE POLICY "Permitir subir comprobantes" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = '${bucketName}');

CREATE POLICY "Permitir actualizar comprobantes" 
  ON storage.objects FOR UPDATE 
  USING (bucket_id = '${bucketName}');
`;
}
