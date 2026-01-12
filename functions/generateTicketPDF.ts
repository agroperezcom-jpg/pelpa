import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticketType, ticketId, ticketData } = await req.json();

    if (!ticketType || !ticketId || !ticketData) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Encabezado
    doc.setFontSize(20);
    doc.text(ticketType === 'budget' ? 'PRESUPUESTO' : 'TICKET DE VENTA', 20, yPosition);
    yPosition += 15;

    // Información general
    doc.setFontSize(10);
    doc.text(`Número: ${ticketData.numero || ticketId}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 20, yPosition);
    yPosition += 7;

    // Cliente
    if (ticketData.clientName) {
      doc.text(`Cliente: ${ticketData.clientName}`, 20, yPosition);
      yPosition += 7;
    }

    yPosition += 5;

    // Tabla de items
    doc.setFontSize(9);
    const startY = yPosition;
    
    // Headers de tabla
    doc.text('Descripción', 20, yPosition);
    doc.text('Cantidad', 100, yPosition);
    doc.text('Unitario', 130, yPosition);
    doc.text('Total', 160, yPosition);
    
    yPosition += 7;
    doc.setDrawColor(200);
    doc.line(20, yPosition - 1, pageWidth - 20, yPosition - 1);
    yPosition += 3;

    // Items
    if (ticketData.items && Array.isArray(ticketData.items)) {
      ticketData.items.forEach((item) => {
        const description = item.name || item.descripcion || '';
        const quantity = item.quantity || item.cantidad || 0;
        const price = item.price_venta || item.precio_unitario || 0;
        const total = (quantity * price).toFixed(2);

        doc.text(description.substring(0, 50), 20, yPosition);
        doc.text(quantity.toString(), 100, yPosition);
        doc.text(`$${price.toFixed(2)}`, 130, yPosition);
        doc.text(`$${total}`, 160, yPosition);

        yPosition += 7;

        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }
      });
    }

    yPosition += 3;
    doc.setDrawColor(200);
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 7;

    // Totales
    doc.setFontSize(10);
    if (ticketData.subtotal !== undefined) {
      doc.text('Subtotal:', 130, yPosition);
      doc.text(`$${ticketData.subtotal.toFixed(2)}`, 160, yPosition);
      yPosition += 7;
    }

    if (ticketData.discount && ticketData.discount > 0) {
      doc.text('Descuento:', 130, yPosition);
      doc.text(`-$${ticketData.discount.toFixed(2)}`, 160, yPosition);
      yPosition += 7;
    }

    if (ticketData.iva_21 && ticketData.iva_21 > 0) {
      doc.text('IVA (21%):', 130, yPosition);
      doc.text(`$${ticketData.iva_21.toFixed(2)}`, 160, yPosition);
      yPosition += 7;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('TOTAL:', 130, yPosition);
    doc.text(`$${(ticketData.total || 0).toFixed(2)}`, 160, yPosition);

    // Notas
    if (ticketData.notes) {
      yPosition += 15;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text('Notas:', 20, yPosition);
      yPosition += 5;
      const noteLines = doc.splitTextToSize(ticketData.notes, 170);
      doc.text(noteLines, 20, yPosition);
    }

    // Generar PDF como blob
    const pdfBlob = doc.output('blob');
    const filename = `${ticketType}-${ticketId}-${Date.now()}.pdf`;

    // Convertir blob a ArrayBuffer para UploadFile (público)
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({
      file: new Blob([arrayBuffer], { type: 'application/pdf' })
    });

    return Response.json({
      success: true,
      file_url: uploadResult.file_url,
      filename: filename
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});