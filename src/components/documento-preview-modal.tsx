import * as React from 'react';
import { CheckCircle2, Download, Lock, ShieldAlert, X } from 'lucide-react';
import { formatCOP, formatTimestamp } from '../lib/catalog';
import {
  descargarDocumentoOficialPdf,
  generateVerificationQrDataUrl,
} from '../lib/pdf-generator';
import type { DocumentoEmitido } from '../types/domain';
import { Button } from './ui/button';

interface DocumentoPreviewModalProps {
  documento: DocumentoEmitido | null;
  onClose: () => void;
}

export function DocumentoPreviewModal({ documento, onClose }: DocumentoPreviewModalProps) {
  const [qrUrl, setQrUrl] = React.useState<string>('');
  const [downloading, setDownloading] = React.useState(false);

  React.useEffect(() => {
    if (!documento) {
      setQrUrl('');
      return;
    }
    let active = true;
    generateVerificationQrDataUrl(documento.codigo_verificacion)
      .then((url) => {
        if (active) setQrUrl(url);
      })
      .catch((err) => console.error('Error generando QR:', err));
    return () => {
      active = false;
    };
  }, [documento]);

  if (!documento) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await descargarDocumentoOficialPdf(documento);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-modal-title"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b bg-primary px-6 py-4 text-primary-foreground">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] opacity-80">
              Resguardo Indígena de Pueblo Nuevo · Caldono, Cauca
            </p>
            <h2 id="doc-modal-title" className="font-display text-lg font-semibold">
              {documento.tipo_documento_nombre}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar vista previa"
            className="rounded-lg p-1.5 text-primary-foreground/80 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/60 px-4 py-3 text-xs">
            <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums">
              <span>
                <strong className="text-muted-foreground">Radicado:</strong> {documento.radicado}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-muted-foreground">Código:</strong>{' '}
                {documento.codigo_verificacion}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              {documento.vigente ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                  Documento vigente
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-red-700">
                  <ShieldAlert className="h-4 w-4" />
                  Documento anulado
                </span>
              )}
            </div>
          </div>

          <div className="mt-5 space-y-4 rounded-lg border bg-[#fbfaf7] p-6 text-sm leading-relaxed text-foreground">
            <p className="text-center font-display text-base font-semibold tracking-wide text-primary">
              EL CABILDO INDÍGENA DEL RESGUARDO DE PUEBLO NUEVO CERTIFICA QUE:
            </p>
            <p>
              El(la) comunero(a) <strong>{documento.solicitante_nombre.toUpperCase()}</strong>,
              identificado(a) con{' '}
              <strong>
                {documento.tipo_documento_identidad} N.º {documento.numero_documento}
              </strong>
              , figura activo(a) en el Censo Poblacional Oficial del Resguardo Indígena de Pueblo
              Nuevo, con residencia comunitaria verificada en la vereda{' '}
              <strong>{documento.vereda}</strong>.
            </p>
            <p>
              El presente documento ({documento.tipo_documento_nombre}) se expide para:{' '}
              <strong>{documento.motivo}</strong>.
            </p>

            <div className="grid gap-3 border-t pt-4 text-xs text-muted-foreground sm:grid-cols-2">
              <div>
                <span className="block font-medium text-foreground">Fecha de emisión</span>
                <span>{formatTimestamp(documento.fecha_emision)}</span>
              </div>
              <div>
                <span className="block font-medium text-foreground">Tarifa / Recibo</span>
                <span className="tabular-nums">
                  {formatCOP(documento.tarifa_cop)}
                  {documento.recibo_pago ? ` · Recibo ${documento.recibo_pago}` : ''}
                </span>
              </div>
            </div>

            {!documento.vigente && documento.motivo_anulacion && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <strong>Motivo de anulación:</strong> {documento.motivo_anulacion}
              </div>
            )}

            <div className="flex flex-col items-start justify-between gap-4 border-t pt-5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                {qrUrl ? (
                  <img
                    src={qrUrl}
                    alt={`Código QR de verificación ${documento.codigo_verificacion}`}
                    className="h-24 w-24 rounded-md border bg-white p-1"
                  />
                ) : (
                  <div className="h-24 w-24 animate-pulse rounded-md border bg-muted" />
                )}
                <div className="text-xs">
                  <p className="font-semibold text-foreground">Verificación pública QR</p>
                  <p className="mt-0.5 font-mono text-foreground">{documento.codigo_verificacion}</p>
                  <p className="mt-1 max-w-[230px] text-muted-foreground">
                    Escanea el QR o ingresa el código en el Portal Virtual Cabildo Indígena de Pueblo Nuevo para validar autenticidad.
                  </p>
                </div>
              </div>
              <div className="text-left text-xs sm:text-right">
                <p className="font-semibold text-foreground">{documento.autoridad_firmante}</p>
                <p className="text-muted-foreground">Caldono, Cauca · Colombia</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-foreground">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <strong>Seguridad por cédula:</strong> el archivo PDF oficial se descarga cifrado.
              Para abrirlo, el lector de PDF le solicitará como contraseña el número de documento de
              identidad del titular (<strong className="font-mono">{documento.numero_documento}</strong>).
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <Button type="button" onClick={handleDownload} disabled={downloading}>
              <Download className="h-4 w-4" />
              {downloading ? 'Generando PDF protegido...' : 'Descargar PDF oficial'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
