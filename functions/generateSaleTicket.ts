import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';
import QRCode from 'npm:qrcode@1.5.3';

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
    
    // Generar QR con datos de la venta
    const qrData = JSON.stringify({
      id: sale.id,
      numero: sale.numero_comprobante,
      fecha: new Date(sale.created_date).toISOString(),
      total: sale.total,
      cliente: sale.client_name
    });
    
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    let doc;

    // SALE_TICKET_MOBILE - 95mm width
    if (type === 'mobile') {
      doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [95, 297]
      });

      let y = 16;
      
      // Logo si existe
      if (empresa.logo_url) {
        try {
          doc.addImage(empresa.logo_url, 'PNG', 32.5, y, 30, 30);
          y += 35;
        } catch (e) {
          console.log('Error cargando logo:', e);
        }
      }
      
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(empresa.nombre_empresa || 'Librería', 47.5, y, { align: 'center' });
      
      y += 6;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      if (empresa.cuit) {
        doc.text(`CUIT: ${empresa.cuit}`, 47.5, y, { align: 'center' });
        y += 5;
      }
      if (empresa.direccion) {
        doc.text(empresa.direccion, 47.5, y, { align: 'center' });
        y += 5;
      }
      if (empresa.telefono) {
        doc.text(`Tel: ${empresa.telefono}`, 47.5, y, { align: 'center' });
        y += 5;
      }
      if (empresa.email) {
        doc.text(empresa.email, 47.5, y, { align: 'center' });
        y += 5;
      }
      
      y += 3;
      doc.setLineWidth(0.3);
      doc.line(10, y, 85, y);
      
      y += 6;
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(`Comprobante: ${sale.numero_comprobante || 'N/A'}`, 10, y);
      doc.setFont(undefined, 'normal');
      y += 5;
      doc.text(`Fecha: ${new Date(sale.created_date).toLocaleDateString('es-AR')}`, 10, y);
      y += 5;
      doc.text(`Hora: ${new Date(sale.created_date).toLocaleTimeString('es-AR')}`, 10, y);
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
        const itemName = item.name.length > 35 ? item.name.substring(0, 35) + '...' : item.name;
        doc.text(itemName, 10, y);
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
      
      if (sale.genera_iva) {
        y += 6;
        doc.setFontSize(10);
        doc.text('Neto Gravado:', 10, y);
        doc.text(`$${sale.neto_gravado?.toFixed(2)}`, 85, y, { align: 'right' });
        y += 5;
        doc.text('IVA 21%:', 10, y);
        doc.text(`$${sale.iva_21?.toFixed(2)}`, 85, y, { align: 'right' });
        y += 2;
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
      
      y += 8;
      doc.addImage(qrCodeDataURL, 'PNG', 32.5, y, 30, 30);
      y += 35;
      
      doc.setFontSize(9);
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
      
      // Logo pequeño
      if (empresa.logo_url) {
        try {
          doc.addImage(empresa.logo_url, 'PNG', 27.5, y, 25, 25);
          y += 28;
        } catch (e) {
          console.log('Error cargando logo:', e);
        }
      }
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(empresa.nombre_empresa || 'Librería', 40, y, { align: 'center' });
      
      y += 5;
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      if (empresa.cuit) {
        doc.text(`CUIT: ${empresa.cuit}`, 40, y, { align: 'center' });
        y += 4;
      }
      
      y += 2;
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text(`# ${sale.numero_comprobante || 'N/A'}`, 5, y);
      doc.setFont(undefined, 'normal');
      y += 4;
      doc.text(new Date(sale.created_date).toLocaleDateString('es-AR'), 5, y);
      y += 4;
      doc.text(new Date(sale.created_date).toLocaleTimeString('es-AR'), 5, y);
      
      y += 6;
      doc.setLineWidth(0.2);
      doc.line(5, y, 75, y);
      
      y += 5;
      doc.setFontSize(8);
      
      for (const item of sale.items || []) {
        const itemName = item.name.length > 28 ? item.name.substring(0, 28) + '...' : item.name;
        doc.text(itemName, 5, y);
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
      
      y += 6;
      doc.addImage(qrCodeDataURL, 'PNG', 27.5, y, 25, 25);
    }

    // SALE_TICKET_A4 - Formal document
    else if (type === 'a4') {
      doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let y = 20;
      
      // Logo y Header
      if (empresa.logo_url) {
        try {
          doc.addImage(empresa.logo_url, 'PNG', 20, y, 40, 40);
        } catch (e) {
          console.log('Error cargando logo:', e);
        }
      }
      
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text(empresa.nombre_empresa || 'Librería', 105, y + 10, { align: 'center' });
      
      y += 15;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      if (empresa.cuit) {
        doc.text(`CUIT: ${empresa.cuit}`, 105, y, { align: 'center' });
        y += 5;
      }
      if (empresa.direccion) {
        doc.text(empresa.direccion, 105, y, { align: 'center' });
        y += 5;
      }
      const contacto = [empresa.telefono, empresa.email].filter(Boolean).join(' | ');
      if (contacto) {
        doc.text(contacto, 105, y, { align: 'center' });
        y += 5;
      }
      
      y += 10;
      doc.setLineWidth(0.5);
      doc.line(20, y, 190, y);
      
      y += 10;
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(`COMPROBANTE ${sale.tipo_comprobante || ''} ${sale.numero_comprobante || 'N/A'}`, 20, y);
      
      y += 7;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Fecha: ${new Date(sale.created_date).toLocaleDateString('es-AR')} ${new Date(sale.created_date).toLocaleTimeString('es-AR')}`, 20, y);
      doc.text(`Vendedor: ${sale.employee_name || 'N/A'}`, 190, y, { align: 'right' });
      
      y += 10;
      doc.setFont(undefined, 'bold');
      doc.text('DATOS DEL CLIENTE', 20, y);
      y += 5;
      doc.setFont(undefined, 'normal');
      doc.text(`Cliente: ${sale.client_name || 'Consumidor Final'}`, 20, y);
      if (sale.client_tipo_iva) {
        y += 5;
        doc.text(`Condición IVA: ${sale.client_tipo_iva}`, 20, y);
      }
      
      y += 10;
      doc.setLineWidth(0.3);
      doc.line(20, y, 190, y);
      
      // Items Table Header
      y += 8;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      doc.text('Producto', 20, y);
      doc.text('Cant.', 115, y, { align: 'center' });
      doc.text('P. Unit.', 145, y, { align: 'right' });
      doc.text('Subtotal', 190, y, { align: 'right' });
      
      y += 2;
      doc.setLineWidth(0.2);
      doc.line(20, y, 190, y);
      
      y += 6;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      
      // Items con paginación mejorada
      for (const item of sale.items || []) {
        if (y > 250) {
          doc.addPage();
          y = 25;
          
          // Repetir header en nueva página
          doc.setFont(undefined, 'bold');
          doc.text('Producto', 20, y);
          doc.text('Cant.', 115, y, { align: 'center' });
          doc.text('P. Unit.', 145, y, { align: 'right' });
          doc.text('Subtotal', 190, y, { align: 'right' });
          y += 2;
          doc.line(20, y, 190, y);
          y += 6;
          doc.setFont(undefined, 'normal');
        }
        
        const itemName = item.name.length > 50 ? item.name.substring(0, 50) + '...' : item.name;
        doc.text(itemName, 20, y);
        doc.text(item.quantity.toString(), 115, y, { align: 'center' });
        doc.text(`$${item.precio_venta?.toFixed(2)}`, 145, y, { align: 'right' });
        doc.text(`$${item.total?.toFixed(2)}`, 190, y, { align: 'right' });
        y += 6;
      }
      
      y += 4;
      doc.setLineWidth(0.5);
      doc.line(20, y, 190, y);
      
      // Totales
      y += 8;
      doc.setFontSize(10);
      doc.text('Subtotal:', 145, y);
      doc.text(`$${sale.subtotal?.toFixed(2)}`, 190, y, { align: 'right' });
      
      if (sale.discount > 0) {
        y += 6;
        doc.text('Descuento:', 145, y);
        doc.text(`-$${sale.discount?.toFixed(2)}`, 190, y, { align: 'right' });
      }
      
      if (sale.genera_iva) {
        y += 6;
        doc.setLineWidth(0.2);
        doc.line(140, y, 190, y);
        y += 5;
        doc.text('Neto Gravado:', 145, y);
        doc.text(`$${sale.neto_gravado?.toFixed(2)}`, 190, y, { align: 'right' });
        y += 6;
        doc.text('IVA 21%:', 145, y);
        doc.text(`$${sale.iva_21?.toFixed(2)}`, 190, y, { align: 'right' });
      }
      
      y += 8;
      doc.setLineWidth(0.5);
      doc.line(140, y, 190, y);
      y += 7;
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('TOTAL:', 145, y);
      doc.text(`$${sale.total?.toFixed(2)}`, 190, y, { align: 'right' });
      
      y += 10;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Forma de pago: ${sale.tipo_venta || 'CONTADO'}`, 20, y);
      
      if (sale.notes) {
        y += 6;
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(`Observaciones: ${sale.notes}`, 170);
        doc.text(lines, 20, y);
        y += lines.length * 4;
      }
      
      // QR en esquina inferior derecha
      y += 10;
      if (y > 250) {
        doc.addPage();
        y = 25;
      }
      doc.addImage(qrCodeDataURL, 'PNG', 165, y, 25, 25);
      
      y += 30;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text('Comprobante generado electrónicamente', 105, y, { align: 'center' });
      doc.text(`ID: ${sale.id}`, 105, y + 4, { align: 'center' });
      
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
    console.error('Error generando PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});