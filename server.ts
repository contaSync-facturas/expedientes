import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Permite payloads de imágenes en base64 para OCR
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Inicialización de Gemini en el servidor con header requerido de telemetría
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint de verificación de estado
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Endpoint para probar conexión a Supabase
app.post('/api/test-supabase', async (req: Request, res: Response) => {
  try {
    const { supabaseUrl, supabaseAnonKey } = req.body;
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(400).json({ error: 'Supabase URL y Anon Key son requeridos' });
    }

    const cleanUrl = supabaseUrl.replace(/\/$/, '');
    const testResponse = await fetch(`${cleanUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });

    if (testResponse.ok || testResponse.status === 200 || testResponse.status === 404) {
      // 200 o lista vacía de esquema de rest/v1 significa que las credenciales son válidas
      return res.json({ success: true, message: 'Conexión a Supabase exitosa' });
    } else {
      const errText = await testResponse.text();
      return res.status(400).json({
        success: false,
        error: `Supabase respondió con código ${testResponse.status}: ${errText.slice(0, 150)}`,
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Error de red al conectar con Supabase: ${err.message}`,
    });
  }
});

// Endpoint para escanear factura o recibo mediante Gemini 3.8 Flash (OCR Contable)
app.post('/api/scan-receipt', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', targetEntity } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Se requiere la imagen en base64' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'No se detectó GEMINI_API_KEY en las variables de entorno del servidor.',
      });
    }

    // Limpiar header de data URL si viene incluido
    const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');

    const promptText = `Eres un auditor contable experto en comprobantes fiscales de Venezuela y Latinoamérica (facturas fiscales con IVA 16%, notas de entrega con monto único, vouchers/tickets de punto de venta POS, recibos).

REGLA TRIBUTARIA FUNDAMENTAL DE VENEZUELA (SENIAT):
- Las 'factura_fiscal': Llevan RIF, número de factura/control y desglose de IVA (16% en Venezuela) y/o montos exentos. Son deducibles para el SENIAT.
- Las 'nota_entrega' y 'ticket_punto_venta' (POS / vouchers): NO SON DEDUCIBLES PARA EL SENIAT Y NO SE LES DESGLOSA EL IVA. Para estos comprobantes: subtotal = 0, taxRate = 0, taxAmount = 0, exemptAmount = 0. ÚNICAMENTE se debe indicar el MONTO TOTAL REFERENCIAL general en Bs. o en $ (según la moneda del documento).

Analiza minuciosamente la imagen del comprobante y extrae todos los datos contables con la máxima precisión:
1. Proveedor / Emisor / Comercio (Razón social o nombre comercial).
2. Identificación fiscal: RIF de Venezuela (J-..., V-..., G-..., E-...) o Tax ID.
3. Tipo de documento:
   - 'factura_fiscal': Factura formal con RIF, número de control/factura y desglose de IVA (16% en Venezuela).
   - 'nota_entrega': Nota de entrega o remisión comercial habitual con monto único sin desglose de IVA (No deducible SENIAT).
   - 'ticket_punto_venta': Voucher de punto de venta (POS) bancario con monto total cobrado, número de lote y referencia de tarjeta (No deducible SENIAT).
4. Número de factura, nota o comprobante (Folio / Factura # / Control #).
5. Número de Referencia o Lote (habitual en vouchers de punto de venta y comprobantes de Pago Móvil).
6. Fecha de emisión en formato YYYY-MM-DD.
7. Moneda ('USD', 'VES', 'USDT' u otra).
8. Subtotal (Base imponible gravable sujeta a IVA 16% solo si es factura_fiscal; 0 si es nota_entrega o ticket_punto_venta).
9. Tasa de impuesto: 16% si es factura fiscal con IVA, o 0% si es nota de entrega o ticket POS.
10. Monto de IVA: 16% de la base gravable en factura fiscal, o 0 si es nota de entrega o ticket POS.
11. Monto Exento: Bienes o servicios no gravados con IVA en facturas fiscales. (0 para nota_entrega/ticket_pos).
12. Total general final pagado (Monto referencial en Bs. o en $).
13. Método de pago detectado si aparece en el comprobante: 'punto_venta', 'pago_movil', 'transferencia', 'dolares_efectivo', 'efectivo_bs', 'usdt_binance' u 'otro'.
14. Categoría contable idónea ('Venta de Productos / Mercancía', 'Venta de Servicios / Consultoría', 'Compra Materia Prima / Insumos', 'Alimentación & Supermercado', 'Salud & Farmacia', 'Suministros de Oficina', 'Software & Tecnología', 'Transporte & Combustible', 'Alquiler & Oficina', 'Equipos de Cómputo & Activos', 'Nómina & Honorarios', 'Educación & Cursos', 'Otros Gastos'). Si son aceites, lubricantes base, aditivos, filtros, químicos, tambores o insumos de producción, clasifica en 'Compra Materia Prima / Insumos'. Si es factura de venta emitida por la empresa a un cliente, clasifica en 'Venta de Productos / Mercancía' o 'Venta de Servicios / Consultoría'.
15. Tipo de movimiento: 'ingreso' (si es factura de venta o cobranza emitida a un cliente) o 'gasto' (factura de compra/proveedor, nota de entrega, recibo/ticket POS) o 'compra_activo' (maquinaria, computación, vehículo).
16. Sugerencia de Entidad: 'empresa' o 'personal'. Si targetEntity='${targetEntity || ''}', respeta esa indicación.
17. Breve resumen / descripción de los conceptos comprados.
18. Tasa de cambio oficial BCV en Bs./USD si aparece explícitamente impresa en la factura física o comprobante (ej: 'Tasa BCV: 36,85', 'Cambio BCV: 37,10', 'Tasa: 38,00'). Si NO aparece impresa ninguna tasa en la factura física, NO la inventes; omite este campo o devuelve null.
19. Sede / Sucursal de la empresa si aparece mencionada en el documento (ej. 'Principal', 'Sucursal', o razón social de la sede).`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || 'image/jpeg',
            },
          },
          {
            text: promptText,
          },
        ],
      },
      config: {
        systemInstruction: 'Eres un sistema OCR contable estructurado de alta precisión para facturación en Venezuela y comprobantes comerciales.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            supplier: { type: Type.STRING, description: 'Nombre o razón social del emisor o comercio' },
            taxId: { type: Type.STRING, description: 'RIF (J-, V-, G-, E-) o identificación fiscal' },
            documentType: { type: Type.STRING, description: 'factura_fiscal, nota_entrega, o ticket_punto_venta' },
            invoiceNumber: { type: Type.STRING, description: 'Número de factura, nota o comprobante' },
            referenceNumber: { type: Type.STRING, description: 'Número de referencia de punto de venta o pago móvil' },
            date: { type: Type.STRING, description: 'Fecha en formato YYYY-MM-DD' },
            currency: { type: Type.STRING, description: 'Código de moneda USD, VES, USDT' },
            exchangeRateBcv: { type: Type.NUMBER, description: 'Tasa oficial BCV en Bs./USD si aparece impresa en la factura física, o null si no existe' },
            subtotal: { type: Type.NUMBER, description: 'Base imponible gravable (antes de IVA)' },
            taxRate: { type: Type.NUMBER, description: 'Porcentaje de IVA (16 en Venezuela o 0)' },
            taxAmount: { type: Type.NUMBER, description: 'Monto de IVA 16%' },
            exemptAmount: { type: Type.NUMBER, description: 'Monto exento de IVA' },
            retentionAmount: { type: Type.NUMBER, description: 'Monto de retención fiscal si aplica' },
            total: { type: Type.NUMBER, description: 'Monto total pagado' },
            paymentMethod: { type: Type.STRING, description: 'punto_venta, pago_movil, transferencia, dolares_efectivo, efectivo_bs, usdt_binance' },
            category: { type: Type.STRING, description: 'Categoría contable asignada' },
            type: { type: Type.STRING, description: 'gasto, compra_activo o ingreso' },
            entity: { type: Type.STRING, description: 'empresa o personal' },
            branch: { type: Type.STRING, description: 'Sede sugerida ej: Lubricantes Asiáticos (Principal) o Lubricantes Asiáticos (Sucursal)' },
            description: { type: Type.STRING, description: 'Resumen conciso del comprobante' },
            confidence: { type: Type.NUMBER, description: 'Confianza de la extracción 0 a 100' },
          },
          required: ['supplier', 'total', 'category', 'type', 'entity', 'description'],
        },
      },
    });

    const responseText = response.text || '{}';
    const parsedData = JSON.parse(responseText);

    return res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Error al procesar escaneo con Gemini:', error);
    const isQuota = error?.status === 429 || error?.message?.includes('RESOURCE_EXHAUSTED') || error?.message?.includes('quota');
    const userMessage = isQuota
      ? 'La cuota temporal del servicio OCR de IA está al límite. Los campos quedan habilitados para llenado manual y guardado con comprobante adjunto.'
      : (error?.message || 'Error procesando la imagen con IA');

    return res.status(200).json({
      success: false,
      fallback: true,
      error: userMessage,
    });
  }
});

// Middleware para servir la app en desarrollo o producción
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Modo Desarrollo: Integrar middleware de Vite para HMR y servir frontend en puerto 3000
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Modo Producción
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ContaSync server running on http://0.0.0.0:${PORT} [${isProd ? 'PROD' : 'DEV'}]`);
  });
}

startServer().catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});
