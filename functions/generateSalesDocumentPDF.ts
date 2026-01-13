import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import jsPDF from 'npm:jspdf@2.5.2';
import html2canvas from 'npm:html2canvas@1.4.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { saleId, documentType } = await req.json();

    if (!saleId || !documentType) {
      return Response.json({ error: 'Missing saleId or documentType' }, { status: 400 });
    }

    // Get sale data
    const sales = await base44.entities.Sale.list('-created_date', 1000);
    const sale = sales.find(s => s.id === saleId);

    if (!sale) {
      return Response.json({ error: 'Sale not found' }, { status: 404 });
    }

    // Get company config
    const configs = await base44.entities.ConfiguracionEmpresa.list();
    const config = configs[0] || {};

    // Create HTML content based on document type
    let htmlContent = '';
    let pdfWidth = 210;
    let pdfHeight = 297;
    let fileName = '';

    if (documentType === 'mobile') {
      fileName = `recibo-mobile-${saleId}.pdf`;
      htmlContent = generateMobileReceipt(sale, config);
      pdfWidth = 100;
      pdfHeight = 200;
    } else if (documentType === 'thermal') {
      fileName = `recibo-termico-${saleId}.txt`;
      const textContent = generateThermalReceipt(sale, config);
      return new Response(textContent, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileName}"`
        }
      });
    } else if (documentType === 'a4') {
      fileName = `documento-a4-${saleId}.pdf`;
      htmlContent = generateA4Document(sale, config);
      pdfWidth = 210;
      pdfHeight = 297;
    }

    // Convert HTML to canvas and then to PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfWidth, pdfHeight]
    });

    // Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    document.body.removeChild(container);

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateMobileReceipt(sale, config) {
  const companyName = config.nombre_empresa || 'Mi Empresa';
  const companyAddress = config.direccion || '';
  const companyPhone = config.telefono || '';
  const subtotal = sale.subtotal || 0;
  const discount = sale.discount || 0;
  const total = sale.total || 0;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        #mobile-receipt { width: 375px; padding: 20px; color: #1a1a1a; background: #fff; }
        .header { text-align: center; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 2px solid #e5e7eb; }
        .header h1 { margin: 0 0 6px 0; font-size: 18px; font-weight: 700; color: #0f172a; }
        .header p { margin: 3px 0; font-size: 12px; color: #64748b; }
        .doc-info { margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid #e5e7eb; text-align: center; }
        .doc-info p { margin: 0; font-size: 12px; }
        .doc-title { font-size: 14px; font-weight: 700; color: #0f172a; }
        .client-box { margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid #e5e7eb; background: #f8fafc; padding: 12px; border-radius: 8px; }
        .items { margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid #e5e7eb; }
        .item { margin-bottom: 12px; font-size: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; }
        .item-name { font-weight: 600; color: #1a1a1a; display: flex; justify-content: space-between; }
        .item-price { font-size: 11px; color: #64748b; display: flex; justify-content: space-between; }
        .totals { margin-bottom: 16px; padding: 14px; background: #f0f9ff; border-radius: 8px; border: 1px solid #bfdbfe; }
        .total-line { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; }
        .total-line.main { font-size: 16px; font-weight: 700; color: #0f172a; padding-top: 8px; border-top: 1px solid #bfdbfe; }
        .payment { margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid #e5e7eb; }
        .footer { text-align: center; padding-top: 12px; border-top: 1px solid #e5e7eb; }
        .label { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
      </style>
    </head>
    <body>
      <div id="mobile-receipt">
        <div class="header">
          <h1>${escapeHtml(companyName)}</h1>
          ${companyAddress ? `<p>${escapeHtml(companyAddress)}</p>` : ''}
          ${companyPhone ? `<p>☎ ${escapeHtml(companyPhone)}</p>` : ''}
        </div>
        <div class="doc-info">
          <p class="doc-title">${sale.tipo_comprobante === 'X' ? 'TICKET' : sale.tipo_comprobante === 'B' ? 'FACTURA B' : 'FACTURA A'}</p>
          ${sale.numero_comprobante ? `<p>#${sale.numero_comprobante}</p>` : ''}
          <p>${new Date(sale.created_date).toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        ${sale.client_name ? `<div class="client-box"><p class="label">Comprador</p><p style="margin: 6px 0 0 0; font-size: 13px; font-weight: 600; color: #1a1a1a;">${escapeHtml(sale.client_name)}</p></div>` : ''}
        <div class="items">
          <p class="label" style="margin-bottom: 10px;">Productos</p>
          ${sale.items && sale.items.length > 0 ? sale.items.map(item => `
            <div class="item">
              <div class="item-name">
                <span>${escapeHtml(item.name)}</span>
                <span>x${item.quantity}</span>
              </div>
              <div class="item-price">
                <span>$${item.precio_unitario?.toLocaleString() || '0'}/u</span>
                <span style="font-weight: 600; color: #1a1a1a;">$${item.total?.toLocaleString() || '0'}</span>
              </div>
            </div>
          `).join('') : '<p style="font-size: 12px; color: #94a3b8;">Sin items</p>'}
        </div>
        <div class="totals">
          <div class="total-line"><span>Subtotal:</span><span>$${subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
          ${discount > 0 ? `<div class="total-line" style="color: #16a34a;"><span>✓ Descuento:</span><span>-$${discount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>` : ''}
          ${sale.iva_21 > 0 ? `<div class="total-line"><span>IVA (21%):</span><span>$${sale.iva_21.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>` : ''}
          <div class="total-line main"><span>TOTAL</span><span>$${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
        </div>
        ${sale.tipo_venta ? `<div class="payment"><p class="label" style="margin-bottom: 6px;">Forma de Pago</p><p style="margin: 6px 0 0 0; font-size: 13px; font-weight: 600; color: #1a1a1a;">${sale.tipo_venta === 'CONTADO' ? '💵 Contado' : sale.tipo_venta === 'CTA_CTE' ? '📊 Cuenta Corriente' : '🔄 Mixto'}</p></div>` : ''}
        <div class="footer">
          <p style="margin: 12px 0 0 0; font-size: 12px; font-weight: 600; color: #0f172a;">✓ Gracias por su compra</p>
          <p style="margin: 6px 0 0 0; font-size: 10px; color: #94a3b8;">${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateA4Document(sale, config) {
  const companyName = config.nombre_empresa || 'Mi Empresa';
  const companyAddress = config.direccion || '';
  const companyPhone = config.telefono || '';
  const companyCuit = config.cuit || '——';
  const subtotal = sale.subtotal || 0;
  const discount = sale.discount || 0;
  const total = sale.total || 0;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, sans-serif; }
        #a4-document { width: 210mm; padding: 20mm; color: #1a1a1a; background: #fff; }
        .header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #0f172a; }
        .header-top { display: flex; justify-content: space-between; margin-bottom: 12px; }
        .company-info h1 { margin: 0 0 4px 0; font-size: 28px; font-weight: 700; }
        .badge { background: #0f172a; color: #fff; padding: 8px 16px; border-radius: 4px; font-weight: 700; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { background: #0f172a; color: #fff; padding: 12px 8px; text-align: left; font-weight: 700; }
        td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) { background: #f9fafb; }
        .totals-box { width: 280px; background: #f8fafc; padding: 16px; border-radius: 4px; border: 1px solid #e5e7eb; float: right; margin-bottom: 24px; }
        .total-line { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 11px; }
        .total-main { font-size: 14px; font-weight: 700; margin-top: 12px; padding-top: 12px; border-top: 2px solid #0f172a; }
        .payment-box { background: #fef3c7; padding: 10px 12px; border-radius: 4px; border: 1px solid #fcd34d; margin-top: 8px; }
      </style>
    </head>
    <body>
      <div id="a4-document">
        <div class="header">
          <div class="header-top">
            <div class="company-info">
              <h1>${escapeHtml(companyName)}</h1>
              <p style="margin: 0; font-size: 10px; color: #64748b;">CUIT: <strong>${companyCuit}</strong></p>
            </div>
            <div class="badge">${sale.tipo_comprobante === 'X' ? 'TICKET' : sale.tipo_comprobante === 'B' ? 'FACTURA B' : 'FACTURA A'}</div>
          </div>
          <p style="margin: 4px 0; font-size: 10px; color: #64748b;">${escapeHtml(companyAddress)}</p>
          <p style="margin: 0; font-size: 10px; color: #64748b;">Tel: ${escapeHtml(companyPhone)}</p>
        </div>
        
        <div style="background: #f8fafc; padding: 16px; border-radius: 4px; margin-bottom: 24px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
          <div><p style="margin: 0 0 6px 0; font-size: 10px; font-weight: 700; color: #475569;">Fecha</p><p style="margin: 0; font-size: 12px; font-weight: 600;">${new Date(sale.created_date).toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' })}</p></div>
          <div><p style="margin: 0 0 6px 0; font-size: 10px; font-weight: 700; color: #475569;">Comprobante</p><p style="margin: 0; font-size: 12px; font-weight: 600;">${sale.numero_comprobante || '——'}</p></div>
          <div><p style="margin: 0 0 6px 0; font-size: 10px; font-weight: 700; color: #475569;">Vendedor</p><p style="margin: 0; font-size: 11px;">${escapeHtml(sale.employee_name || '——')}</p></div>
        </div>

        <div style="background: #eff6ff; padding: 16px; border-radius: 4px; border: 1px solid #bfdbfe; margin-bottom: 24px;">
          <p style="margin: 0 0 12px 0; font-size: 10px; font-weight: 700; color: #0c4a6e; text-transform: uppercase;">Cliente</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div><p style="margin: 0 0 4px 0; font-size: 10px; color: #475569;">Razón Social</p><p style="margin: 0; font-size: 12px; font-weight: 600;">${escapeHtml(sale.client_name || '——')}</p></div>
            <div><p style="margin: 0 0 4px 0; font-size: 10px; color: #475569;">Categoría IVA</p><p style="margin: 0; font-size: 12px; font-weight: 600;">${escapeHtml(sale.client_tipo_iva || '——')}</p></div>
          </div>
        </div>

        <table>
          <thead><tr>
            <th>Descripción</th>
            <th style="text-align: center; width: 70px;">Cantidad</th>
            <th style="text-align: right; width: 90px;">Precio Unit.</th>
            <th style="text-align: right; width: 90px;">Total</th>
          </tr></thead>
          <tbody>
            ${sale.items && sale.items.length > 0 ? sale.items.map((item, idx) => `
              <tr>
                <td>${escapeHtml(item.name)}</td>
                <td style="text-align: center; font-weight: 600;">${item.quantity}</td>
                <td style="text-align: right;">$${item.precio_unitario?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '0'}</td>
                <td style="text-align: right; font-weight: 600;">$${item.total?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '0'}</td>
              </tr>
            `).join('') : '<tr><td colspan="4" style="text-align: center; color: #94a3b8;">Sin items</td></tr>'}
          </tbody>
        </table>

        <div class="totals-box">
          <div class="total-line"><span>Subtotal:</span><span style="font-weight: 600;">$${subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
          ${discount > 0 ? `<div class="total-line" style="color: #16a34a;"><span>✓ Descuento:</span><span style="font-weight: 600;">-$${discount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>` : ''}
          ${sale.iva_21 > 0 ? `<div class="total-line"><span>IVA (21%):</span><span style="font-weight: 600;">$${sale.iva_21.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>` : ''}
          <div class="total-line total-main"><span>TOTAL</span><span>$${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
        </div>

        <div style="clear: both; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 8px 0; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase;">Forma de Pago</p>
          <div class="payment-box">
            <p style="margin: 0; font-size: 12px; font-weight: 600; color: #92400e;">${sale.tipo_venta === 'CONTADO' ? '💵 Contado' : sale.tipo_venta === 'CTA_CTE' ? '📊 Cuenta Corriente' : '🔄 Mixto'}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateThermalReceipt(sale, config) {
  const companyName = config.nombre_empresa || 'EMPRESA';
  const lineWidth = 42;
  const separator = '='.repeat(lineWidth);

  const padBetween = (left, right) => {
    const totalSpaces = lineWidth - left.length - right.length;
    return left + ' '.repeat(Math.max(0, totalSpaces)) + right;
  };

  const centerText = (text) => {
    const spaces = Math.max(0, (lineWidth - text.length) / 2);
    return ' '.repeat(Math.floor(spaces)) + text;
  };

  let receipt = `${centerText(companyName.substring(0, lineWidth).toUpperCase())}\n`;
  receipt += `${separator}\n`;
  receipt += new Date(sale.created_date).toLocaleDateString('es-AR') + '\n';
  if (sale.numero_comprobante) receipt += ` TICKET: ${sale.numero_comprobante}\n`;
  receipt += `${separator}\n`;
  receipt += `CLIENTE: ${(sale.client_name || 'CONSUMIDOR FINAL').substring(0, lineWidth - 9)}\n`;
  receipt += `${separator}\n`;

  if (sale.items && sale.items.length > 0) {
    sale.items.forEach(item => {
      const qty = item.quantity.toString();
      const unitPrice = `$${item.precio_unitario?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}`;
      const itemTotal = `$${item.total?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}`;
      const name = item.name.substring(0, Math.max(5, lineWidth - 10));
      receipt += `${padBetween(`${qty}x ${name}`, itemTotal)}\n  ${unitPrice}/u\n`;
    });
  }

  receipt += `${separator}\n`;
  receipt += `${padBetween('SUBTOTAL', `$${(sale.subtotal || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`)}\n`;
  if (sale.discount > 0) receipt += `${padBetween('DESCUENTO -', `-$${sale.discount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`)}\n`;
  if (sale.iva_21 > 0) receipt += `${padBetween('IVA 21%', `$${sale.iva_21.toLocaleString(undefined, { maximumFractionDigits: 2 })}`)}\n`;
  receipt += `${separator}\n`;
  receipt += `${padBetween('TOTAL', `$${(sale.total || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`)}\n`;
  receipt += `${separator}\n`;
  receipt += `${centerText(sale.tipo_venta === 'CONTADO' ? 'PAGO: CONTADO' : sale.tipo_venta === 'CTA_CTE' ? 'PAGO: CUENTA CORRIENTE' : 'PAGO: MIXTO')}\n`;
  receipt += `${separator}\n`;
  receipt += `${centerText('*** GRACIAS ***')}\n`;
  receipt += `${separator}\n`;

  return receipt;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}