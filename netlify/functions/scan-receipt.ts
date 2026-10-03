import { GoogleGenAI, Type } from '@google/genai';

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { imageBase64, mimeType = 'image/jpeg', targetEntity } = JSON.parse(event.body || '{}');

    if (!imageBase64) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Se requiere la imagen en base64' }),
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'No se detectó GEMINI_API_KEY en las variables de entorno de Netlify.',
        }),
      };
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');

    const promptText = `Eres un auditor contable experto en comprobantes fiscales de Venezuela y Latinoamérica (facturas fiscales con IVA 16%, notas de entrega con monto único, vouchers/tickets de punto de venta POS, recibos).

REGLA TRIBUTARIA FUNDAMENTAL DE VENEZUELA (SENIAT):
- Las 'factura_fiscal': Llevan RIF, número de factura/control y desglose de IVA (16% en Venezuela) y/o montos exentos. Son deducibles para el SENIAT.
- Las 'nota_entrega' y 'ticket_punto_venta' (POS / vouchers): NO SON DEDUCIBLES PARA EL SENIAT Y NO SE LES DESGLOSA EL IVA. Para estos comprobantes: subtotal = 0, taxRate = 0, taxAmount = 0, exemptAmount = 0. ÚNICAMENTE se debe indicar el MONTO TOTAL REFERENCIAL general en Bs. o en $ (según la moneda del documento).

Analiza minuciosamente la imagen del comprobante y extrae todos los datos contables con la máxima precisión:
1. Proveedor / Emisor / Comercio (Razón social o nombre comercial).
2. Identificación fiscal: RIF de Venezuela (J-..., V-..., G-..., E-...) o Tax ID.
3. Tipo de documento: 'factura_fiscal', 'nota_entrega', o 'ticket_punto_venta'.
4. Número de factura, nota o comprobante.
5. Número de Referencia o Lote.
6. Fecha de emisión en formato YYYY-MM-DD.
7. Moneda ('USD', 'VES', 'USDT' u otra).
8. Subtotal (Base imponible gravable solo si es factura_fiscal; 0 si es nota_entrega o ticket_punto_venta).
9. Tasa de impuesto: 16% si es factura fiscal con IVA, o 0% si es nota de entrega o ticket POS.
10. Monto de IVA: 16% de la base gravable en factura fiscal, o 0 si es nota de entrega o ticket POS.
11. Monto Exento: Bienes o servicios no gravados con IVA en facturas fiscales. (0 para nota_entrega/ticket_pos).
12. Total general final pagado (Monto referencial en Bs. o en $).
13. Método de pago detectado.
14. Categoría contable idónea.
15. Tipo de movimiento: 'ingreso', 'gasto' o 'compra_activo'.
16. Sugerencia de Entidad: 'empresa' o 'personal'. Si targetEntity='${targetEntity || ''}', respeta esa indicación.
17. Breve resumen / descripción de los conceptos comprados.
18. Tasa de cambio oficial BCV en Bs./USD si aparece explícitamente impresa en la factura física o comprobante. Si NO aparece impresa ninguna tasa en la factura física, omite este campo o devuelve null.
19. Sede / Sucursal de la empresa si aparece mencionada en el documento.`;

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
            supplier: { type: Type.STRING },
            taxId: { type: Type.STRING },
            documentType: { type: Type.STRING },
            invoiceNumber: { type: Type.STRING },
            referenceNumber: { type: Type.STRING },
            date: { type: Type.STRING },
            currency: { type: Type.STRING },
            exchangeRateBcv: { type: Type.NUMBER },
            subtotal: { type: Type.NUMBER },
            taxRate: { type: Type.NUMBER },
            taxAmount: { type: Type.NUMBER },
            exemptAmount: { type: Type.NUMBER },
            total: { type: Type.NUMBER },
            paymentMethod: { type: Type.STRING },
            category: { type: Type.STRING },
            type: { type: Type.STRING },
            entity: { type: Type.STRING },
            branch: { type: Type.STRING },
            description: { type: Type.STRING },
          },
          required: ['supplier', 'total', 'category', 'type', 'entity', 'description'],
        },
      },
    });

    const parsedData = JSON.parse(response.text || '{}');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: parsedData,
      }),
    };
  } catch (err: any) {
    console.error('Error en Netlify Function scan-receipt:', err);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: err.message || 'Error procesando OCR',
      }),
    };
  }
};
