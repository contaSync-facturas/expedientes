import React, { useState } from 'react';
import { X, Download, FileText, CheckCircle, ShieldCheck, Share2, FileDown, Loader2, Check } from 'lucide-react';
import { Transaction } from '../types/finance';
import { formatCurrency, generateSingleInvoicePDF, sharePdfFile } from '../services/pdfReportService';

interface ReceiptViewerModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export const ReceiptViewerModal: React.FC<ReceiptViewerModalProps> = ({
  transaction,
  onClose,
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!transaction) return null;

  const handleDownload = () => {
    if (!transaction.receiptUrl) return;
    const a = document.createElement('a');
    a.href = transaction.receiptUrl;
    a.download = `Comprobante_${transaction.invoiceNumber || transaction.id}.webp`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateSingleInvoicePDF(transaction, 'Distribuidora & Servicios Tecnológicos C.A.', true);
      setSuccessMsg('¡PDF descargado con éxito!');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSharePdf = async () => {
    setIsSharingPdf(true);
    try {
      const res = await generateSingleInvoicePDF(transaction, 'Distribuidora & Servicios Tecnológicos C.A.', false);
      const shared = await sharePdfFile(
        res.blob,
        res.filename,
        `Factura ${transaction.invoiceNumber || transaction.supplier}`,
        `Comprobante de ${transaction.supplier} por $ ${transaction.total}`
      );
      if (shared) {
        setSuccessMsg('¡Factura compartida con éxito!');
      } else {
        // Fallback: descargar y abrir WhatsApp
        const a = document.createElement('a');
        a.href = URL.createObjectURL(res.blob);
        a.download = res.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);

        const text = encodeURIComponent(
          `Comprobante de Pago:\n• Proveedor: ${transaction.supplier}\n• RIF: ${transaction.taxId || 'N/A'}\n• Factura: ${transaction.invoiceNumber || 'S/N'}\n• Fecha: ${transaction.date}\n• Total: ${transaction.currency === 'VES' ? 'Bs.' : '$'} ${transaction.total}${transaction.exchangeRateBcv ? `\n• Tasa Oficial BCV: Bs. ${transaction.exchangeRateBcv}` : ''}\n\nAdjunto archivo PDF con los datos fiscales y la foto del comprobante.`
        );
        const waLink = document.createElement('a');
        waLink.href = `https://wa.me/?text=${text}`;
        waLink.target = '_blank';
        waLink.rel = 'noopener noreferrer';
        document.body.appendChild(waLink);
        waLink.click();
        document.body.removeChild(waLink);
        setSuccessMsg('PDF descargado y enlace de WhatsApp generado para adjuntarlo.');
      }
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSharingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-lg">
                Comprobante Digital Ultraliviano
              </h3>
              <p className="text-xs text-slate-500">
                {transaction.invoiceNumber ? `Factura Nº ${transaction.invoiceNumber}` : 'Comprobante de Pago'} • {transaction.date}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info bar */}
        <div className="px-6 py-3 bg-emerald-50/70 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Emisor:</strong> {transaction.supplier} {transaction.taxId && `(${transaction.taxId})`}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-medium text-slate-700">
              Total: <strong>{formatCurrency(transaction.total, transaction.currency)}</strong>
            </span>
            {transaction.exchangeRateBcv ? (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md font-semibold border border-amber-200">
                🇻🇪 Tasa BCV: Bs. {transaction.exchangeRateBcv}
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium border border-slate-200">
                Sin Tasa BCV
              </span>
            )}
            {transaction.receiptSizeKb && (
              <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-full font-semibold">
                ⚡ Peso: {transaction.receiptSizeKb} KB
              </span>
            )}
          </div>
        </div>

        {/* Content / Image Preview */}
        <div className="p-6 flex-1 overflow-auto bg-slate-900/5 flex items-center justify-center min-h-[300px]">
          {transaction.receiptUrl ? (
            <div className="relative group max-w-full">
              <img
                src={transaction.receiptUrl}
                alt={`Comprobante ${transaction.invoiceNumber || transaction.supplier}`}
                className="max-h-[55vh] w-auto object-contain rounded-lg shadow-md border border-slate-200 bg-white"
              />
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-16 h-16 mx-auto mb-3 text-slate-300" />
              <p className="font-medium text-slate-600">Este movimiento no tiene comprobante adjunto</p>
              <p className="text-xs text-slate-400 mt-1">
                Puedes escanear o adjuntar una factura en cualquier momento
              </p>
            </div>
          )}
        </div>

        {/* Toast de Éxito */}
        {successMsg && (
          <div className="px-6 py-2 bg-emerald-50 border-t border-b border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-white">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">Optimizado para descarga ultrarrápida y resguardo contable</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Descargar PDF individual */}
            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handleDownloadPdf}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Descargar este comprobante en archivo PDF oficial"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generando PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                  <span>PDF de esta Factura</span>
                </>
              )}
            </button>

            {/* Compartir PDF */}
            <button
              type="button"
              disabled={isSharingPdf}
              onClick={handleSharePdf}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Compartir directo a WhatsApp o aplicaciones"
            >
              {isSharingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Compartir</span>
                </>
              )}
            </button>

            {/* Descargar imagen original si existe */}
            {transaction.receiptUrl && (
              <button
                type="button"
                onClick={handleDownload}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Descargar foto original en formato WebP"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Foto</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
