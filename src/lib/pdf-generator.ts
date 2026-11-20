import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { formatCOP, formatTimestamp } from './catalog';
import type { DocumentoEmitido } from '../types/domain';

export async function generateVerificationQrDataUrl(codigoVerificacion: string): Promise<string> {
  const verifyUrl = `${window.location.origin}/autoservicio?tab=validar&codigo=${encodeURIComponent(codigoVerificacion)}`;
  return QRCode.toDataURL(verifyUrl, {
    width: 240,
    margin: 1,
    color: {
      dark: '#102e21',
      light: '#ffffff',
    },
  });
}

export async function descargarDocumentoOficialPdf(docData: DocumentoEmitido): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
    encryption: {
      userPassword: docData.numero_documento.trim(),
      ownerPassword: `PN-CABILDO-${docData.codigo_verificacion}`,
      userPermissions: ['print'],
    },
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const marginX = 22;
  const contentWidth = pageWidth - marginX * 2;

  // Header band
  pdf.setFillColor(20, 59, 43);
  pdf.rect(0, 0, pageWidth, 34, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('times', 'bold');
  pdf.setFontSize(15);
  pdf.text('RESGUARDO INDÍGENA DE PUEBLO NUEVO', pageWidth / 2, 13, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.text('CABILDO INDÍGENA — AUTORIDAD TRADICIONAL · CALDONO, CAUCA', pageWidth / 2, 20, {
    align: 'center',
  });
  pdf.setFontSize(8.5);
  pdf.text('NIT 817.001.452-9 · Ley 89 de 1890 · Art. 246 Constitución Política de Colombia', pageWidth / 2, 26, {
    align: 'center',
  });

  // Document Metadata bar
  pdf.setDrawColor(210, 205, 192);
  pdf.setFillColor(246, 245, 240);
  pdf.roundedRect(marginX, 42, contentWidth, 18, 2, 2, 'FD');

  pdf.setTextColor(86, 99, 91);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('RADICADO', marginX + 5, 48);
  pdf.text('CÓDIGO DE VERIFICACIÓN', marginX + 62, 48);
  pdf.text('ESTADO', marginX + 128, 48);

  pdf.setTextColor(24, 32, 27);
  pdf.setFont('courier', 'bold');
  pdf.setFontSize(10.5);
  pdf.text(docData.radicado, marginX + 5, 55);
  pdf.text(docData.codigo_verificacion, marginX + 62, 55);
  pdf.setTextColor(docData.vigente ? 20 : 185, docData.vigente ? 83 : 28, docData.vigente ? 45 : 28);
  pdf.text(docData.vigente ? 'VIGENTE' : 'ANULADO', marginX + 128, 55);

  // Title
  pdf.setTextColor(20, 59, 43);
  pdf.setFont('times', 'bold');
  pdf.setFontSize(17);
  pdf.text(docData.tipo_documento_nombre.toUpperCase(), pageWidth / 2, 76, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(86, 99, 91);
  pdf.text('EL CABILDO INDÍGENA DEL RESGUARDO DE PUEBLO NUEVO', pageWidth / 2, 85, {
    align: 'center',
  });

  pdf.setFont('times', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(24, 32, 27);
  pdf.text('CERTIFICA Y HACE CONSTAR QUE:', pageWidth / 2, 95, { align: 'center' });

  // Body paragraph
  const fechaEmisionTexto = formatTimestamp(docData.fecha_emision);
  const cuerpo = `El(la) comunero(a) ${docData.solicitante_nombre.toUpperCase()}, identificado(a) con ${docData.tipo_documento_identidad} N.º ${docData.numero_documento}, se encuentra debidamente inscrito(a) y activo(a) en el Censo Poblacional Oficial del Resguardo Indígena de Pueblo Nuevo, municipio de Caldono, departamento del Cauca, con residencia comunitaria verificada en la vereda ${docData.vereda}.`;

  pdf.setFont('times', 'normal');
  pdf.setFontSize(11.5);
  pdf.setTextColor(30, 36, 32);
  const bodyLines = pdf.splitTextToSize(cuerpo, contentWidth);
  pdf.text(bodyLines, marginX, 108, { lineHeightFactor: 1.55 });

  let cursorY = 108 + bodyLines.length * 7.5 + 6;

  const motivoTexto = `El presente documento (${docData.tipo_documento_nombre}) se expide a solicitud de la parte interesada para fines de: ${docData.motivo}.`;
  const motivoLines = pdf.splitTextToSize(motivoTexto, contentWidth);
  pdf.text(motivoLines, marginX, cursorY, { lineHeightFactor: 1.55 });
  cursorY += motivoLines.length * 7.5 + 8;

  // Details Box
  pdf.setDrawColor(220, 216, 205);
  pdf.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.setTextColor(86, 99, 91);
  pdf.text(`Fecha de expedición: ${fechaEmisionTexto}`, marginX, cursorY);
  cursorY += 6;
  pdf.text(
    `Derechos de expedición: ${formatCOP(docData.tarifa_cop)}${docData.recibo_pago ? ` (Recibo Tesorería N.º ${docData.recibo_pago})` : ''}`,
    marginX,
    cursorY,
  );
  cursorY += 6;
  if (!docData.vigente && docData.motivo_anulacion) {
    pdf.setTextColor(185, 28, 28);
    pdf.text(`Documento anulado: ${docData.motivo_anulacion}`, marginX, cursorY);
    cursorY += 6;
  }

  // QR Code & Signature block at bottom
  const qrDataUrl = await generateVerificationQrDataUrl(docData.codigo_verificacion);
  const footerY = 205;

  pdf.setDrawColor(210, 205, 192);
  pdf.line(marginX, footerY - 6, pageWidth - marginX, footerY - 6);

  pdf.addImage(qrDataUrl, 'PNG', marginX, footerY, 34, 34);

  pdf.setTextColor(24, 32, 27);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('VERIFICACIÓN DIGITAL CON CÓDIGO QR', marginX + 40, footerY + 6);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(86, 99, 91);
  const qrInfoLines = pdf.splitTextToSize(
    `Cualquier entidad pública o privada puede verificar la autenticidad y vigencia de este documento ingresando el código ${docData.codigo_verificacion} en el Portal Virtual Cabildo Indígena de Pueblo Nuevo.`,
    pageWidth - (marginX + 40) - marginX,
  );
  pdf.text(qrInfoLines, marginX + 40, footerY + 12, { lineHeightFactor: 1.35 });

  // Signature line
  pdf.setDrawColor(24, 32, 27);
  pdf.line(marginX + 40, footerY + 31, pageWidth - marginX, footerY + 31);
  pdf.setTextColor(24, 32, 27);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text(docData.autoridad_firmante, marginX + 40, footerY + 36);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(86, 99, 91);
  pdf.text('Resguardo Indígena de Pueblo Nuevo · Caldono, Cauca', marginX + 40, footerY + 41);

  pdf.save(`Documento_${docData.codigo_verificacion}.pdf`);
}
