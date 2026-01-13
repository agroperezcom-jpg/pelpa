import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sale_id, type } = await req.json();

    if (!sale_id || !type) {
      return Response.json({ error: 'sale_id y type son requeridos' }, { status: 400 });
    }

    const [sales, config] = await Promise.all([
      base44.entities.Sale.list(),
      base44.entities.ConfiguracionEmpresa.list()
    ]);

    const sale = sales.find(s => s.id === sale_id);
    if (!sale) {
      return Response.json({ error: 'Venta no encontrada' }, { status: 404 });
    }

    const empresa = config[0] || {};
    let doc;

    // SALE_TICKET_MOBILE - 95mm width
    if (type === 'mobile') {
      doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [95, 297]
      });

      let y = 16;
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(empresa.nombre_empresa || 'Librería', 47.5, y, { align: 'center' });
      
      y += 6;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(empresa.cuit || '', 47.5, y, { align: 'center' });
      y += 5;
      doc.text(empresa.direccion || '', 47.5, y, { align: 'center' });
      y += 5;
      doc.text(empresa.telefono || '', 47.5, y, { align: 'center' });
      
      y += 8;
      doc.setLineWidth(0.3);
      doc.line(10, y, 85, y);
      
      y += 6;
      doc.setFontSize(11);
      doc.text(`Comprobante: ${sale.numero_comprobante || 'N/A'}`, 10, y);
      y += 5;
      doc.text(`Fecha: ${new Date(sale.created_date).toLocaleDateString()} ${new Date(sale.created_date).toLocaleTimeString()}`, 10, y);
      y += 5;
      doc.text(`Vendedor: ${sale.employee_name || 'N/A'}`, 10, y);
      y += 5;
      doc.text(`Cliente: ${sale.client_name || 'Consumidor Final'}`, 10, y);
      
      y += 8;
      doc.line(10, y, 85, y);
      
      y += 6;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('ITEMS', 10, y);
      doc.setFont(undefined, 'normal');
      
      y += 6;
      for (const item of sale.items || []) {
        doc.setFontSize(11);
        doc.text(item.name, 10, y);
        y += 5;
        doc.setFontSize(10);
        doc.text(`Cant: ${item.quantity}  Precio: $${item.precio_venta?.toFixed(2)}`, 10, y);
        y += 5;
        doc.text(`Subtotal: $${item.total?.toFixed(2)}`, 10, y);
        y += 6;
        doc.setLineWidth(0.1);
        doc.line(10, y, 85, y);
        y += 4;
      }
      
      y += 4;
      doc.setFontSize(12);
      doc.text('Subtotal:', 10, y);
      doc.text(`$${sale.subtotal?.toFixed(2)}`, 85, y, { align: 'right' });
      
      if (sale.discount > 0) {
        y += 6;
        doc.text('Descuento:', 10, y);
        doc.text(`-$${sale.discount?.toFixed(2)}`, 85, y, { align: 'right' });
      }
      
      y += 8;
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text('TOTAL:', 10, y);
      doc.text(`$${sale.total?.toFixed(2)}`, 85, y, { align: 'right' });
      
      y += 10;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Pago: ${sale.tipo_venta || 'CONTADO'}`, 47.5, y, { align: 'center' });
      y += 6;
      doc.text('Gracias por su compra', 47.5, y, { align: 'center' });
    }

    // SALE_TICKET_80MM - Thermal printer
    else if (type === '80mm') {
      doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 297]
      });

      let y = 8;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(empresa.nombre_empresa || 'Librería', 40, y, { align: 'center' });
      
      y += 5;
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(empresa.cuit || '', 40, y, { align: 'center' });
      
      y += 6;
      doc.setFontSize(9);
      doc.text(`# ${sale.numero_comprobante || 'N/A'}`, 5, y);
      y += 4;
      doc.text(new Date(sale.created_date).toLocaleDateString(), 5, y);
      
      y += 6;
      doc.setLineWidth(0.2);
      doc.line(5, y, 75, y);
      
      y += 5;
      doc.setFontSize(8);
      
      for (const item of sale.items || []) {
        doc.text(item.name.substring(0, 30), 5, y);
        y += 4;
        doc.text(`${item.quantity} x $${item.precio_venta?.toFixed(2)}`, 10, y);
        doc.text(`$${item.total?.toFixed(2)}`, 75, y, { align: 'right' });
        y += 5;
      }
      
      y += 2;
      doc.line(5, y, 75, y);
      
      y += 5;
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('TOTAL', 5, y);
      doc.text(`$${sale.total?.toFixed(2)}`, 75, y, { align: 'right' });
      
      y += 6;
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(`Pago: ${sale.tipo_venta || 'CONTADO'}`, 40, y, { align: 'center' });
    }

    // SALE_TICKET_A4 - Formal document
    else if (type === 'a4') {
      doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let y = 25;
      
      // Header
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text(empresa.nombre_empresa || 'Librería', 105, y, { align: 'center' });
      
      y += 7;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`CUIT: ${empresa.cuit || 'N/A'}`, 105, y, { align: 'center' });
      y += 5;
      doc.text(empresa.direccion || '', 105, y, { align: 'center' });
      y += 5;
      doc.text(`Tel: ${empresa.telefono || 'N/A'}`, 105, y, { align: 'center' });
      
      y += 10;
      doc.setLineWidth(0.5);
      doc.line(20, y, 190, y);
      
      y += 8;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`COMPROBANTE: ${sale.numero_comprobante || 'N/A'}`, 20, y);
      doc.text(`Fecha: ${new Date(sale.created_date).toLocaleDateString()}`, 190, y, { align: 'right' });
      
      y += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Cliente: ${sale.client_name || 'Consumidor Final'}`, 20, y);
      if (sale.client_tipo_iva) {
        y += 5;
        doc.text(`Condición IVA: ${sale.client_tipo_iva}`, 20, y);
      }
      
      y += 10;
      doc.setLineWidth(0.3);
      doc.line(20, y, 190, y);
      
      // Items Table
      y += 8;
      doc.setFont(undefined, 'bold');
      doc.text('Producto', 20, y);
      doc.text('Cant.', 110, y, { align: 'center' });
      doc.text('P. Unit.', 140, y, { align: 'right' });
      doc.text('Subtotal', 190, y, { align: 'right' });
      
      y += 2;
      doc.line(20, y, 190, y);
      
      y += 6;
      doc.setFont(undefined, 'normal');
      
      for (const item of sale.items || []) {
        if (y > 260) {
          doc.addPage();
          y = 25;
        }
        doc.text(item.name.substring(0, 40), 20, y);
        doc.text(item.quantity.toString(), 110, y, { align: 'center' });
        doc.text(`$${item.precio_venta?.toFixed(2)}`, 140, y, { align: 'right' });
        doc.text(`$${item.total?.toFixed(2)}`, 190, y, { align: 'right' });
        y += 6;
      }
      
      y += 4;
      doc.setLineWidth(0.5);
      doc.line(20, y, 190, y);
      
      // Totals
      y += 8;
      doc.setFontSize(11);
      doc.text('Subtotal:', 140, y);
      doc.text(`$${sale.subtotal?.toFixed(2)}`, 190, y, { align: 'right' });
      
      if (sale.discount > 0) {
        y += 6;
        doc.text('Descuento:', 140, y);
        doc.text(`-$${sale.discount?.toFixed(2)}`, 190, y, { align: 'right' });
      }
      
      if (sale.genera_iva) {
        y += 6;
        doc.text('Neto Gravado:', 140, y);
        doc.text(`$${sale.neto_gravado?.toFixed(2)}`, 190, y, { align: 'right' });
        y += 6;
        doc.text('IVA 21%:', 140, y);
        doc.text(`$${sale.iva_21?.toFixed(2)}`, 190, y, { align: 'right' });
      }
      
      y += 8;
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('TOTAL:', 140, y);
      doc.text(`$${sale.total?.toFixed(2)}`, 190, y, { align: 'right' });
      
      y += 10;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Forma de pago: ${sale.tipo_venta || 'CONTADO'}`, 20, y);
      
      if (sale.notes) {
        y += 6;
        doc.text(`Observaciones: ${sale.notes}`, 20, y);
      }
    } else {
      return Response.json({ error: 'Tipo inválido. Usar: mobile, 80mm, a4' }, { status: 400 });
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=ticket_${type}_${sale.numero_comprobante || sale.id}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});