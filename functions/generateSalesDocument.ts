import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import jsPDF from 'npm:jspdf@2.5.2';
import html2canvas from 'npm:html2canvas@1.4.1';
import React from 'npm:react@18.2.0';
import { render } from 'npm:react-dom/server@18.2.0';

// Import templates
const MobileReceiptTemplate = ({ sale, config }) => {
  const subtotal = sale.subtotal || 0;
  const discount = sale.discount || 0;
  const total = sale.total || 0;

  const companyName = config?.nombre_empresa || "Mi Empresa";
  const companyAddress = config?.direccion || "";
  const companyPhone = config?.telefono || "";

  return React.createElement('div', { 
    style: {
      width: '375px',
      padding: '16px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      color: '#000',
      backgroundColor: '#fff',
      margin: '0 auto',
      lineHeight: '1.4',
    }
  },
    React.createElement('div', { style: { textAlign: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #eee' } },
      React.createElement('h1', { style: { margin: '0 0 4px 0', fontSize: '16px', fontWeight: 'bold' } }, companyName),
      companyAddress && React.createElement('p', { style: { margin: '2px 0', fontSize: '11px', color: '#666' } }, companyAddress),
      companyPhone && React.createElement('p', { style: { margin: '2px 0', fontSize: '11px', color: '#666' } }, companyPhone)
    ),
    React.createElement('div', { style: { marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #eee', textAlign: 'center' } },
      React.createElement('p', { style: { margin: '0', fontSize: '13px', fontWeight: '600' } }, 
        sale.tipo_comprobante === 'X' ? 'TICKET' : sale.tipo_comprobante === 'B' ? 'FACTURA B' : 'FACTURA'
      ),
      sale.numero_comprobante && React.createElement('p', { style: { margin: '2px 0', fontSize: '11px', color: '#666' } }, `# ${sale.numero_comprobante}`),
      React.createElement('p', { style: { margin: '2px 0', fontSize: '11px', color: '#666' } }, 
        new Date(sale.created_date).toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      )
    ),
    sale.client_name && React.createElement('div', { style: { marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #eee' } },
      React.createElement('p', { style: { margin: '0', fontSize: '11px', fontWeight: '600' } }, 'CLIENTE'),
      React.createElement('p', { style: { margin: '4px 0 0 0', fontSize: '12px' } }, sale.client_name)
    ),
    React.createElement('div', { style: { marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #eee' } },
      React.createElement('p', { style: { margin: '0 0 8px 0', fontSize: '11px', fontWeight: '600' } }, 'ITEMS'),
      sale.items && sale.items.length > 0 ? sale.items.map((item, idx) => 
        React.createElement('div', { key: idx, style: { marginBottom: '8px', fontSize: '11px' } },
          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '2px' } },
            React.createElement('span', { style: { fontWeight: '500', flex: 1 } }, item.name),
            React.createElement('span', { style: { fontSize: '10px', color: '#666', marginLeft: '4px' } }, item.quantity)
          ),
          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666' } },
            React.createElement('span', null, `$${item.precio_unitario?.toLocaleString() || '0'}`),
            React.createElement('span', null, `$${item.total?.toLocaleString() || '0'}`)
          )
        )
      ) : React.createElement('p', { style: { fontSize: '11px', color: '#999' } }, 'Sin items')
    ),
    React.createElement('div', { style: { marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #eee' } },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px' } },
        React.createElement('span', null, 'Subtotal:'),
        React.createElement('span', null, `$${subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`)
      ),
      discount > 0 && React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px', color: '#d97706' } },
        React.createElement('span', null, 'Descuento:'),
        React.createElement('span', null, `-$${discount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`)
      ),
      sale.iva_21 > 0 && React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px', color: '#666' } },
        React.createElement('span', null, 'IVA (21%):'),
        React.createElement('span', null, `$${sale.iva_21.toLocaleString(undefined, { maximumFractionDigits: 2 })}`)
      ),
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold' } },
        React.createElement('span', null, 'TOTAL:'),
        React.createElement('span', null, `$${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}`)
      )
    ),
    sale.tipo_venta && React.createElement('div', { style: { marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #eee' } },
      React.createElement('p', { style: { margin: '0', fontSize: '11px', fontWeight: '600' } }, 'PAGO'),
      React.createElement('p', { style: { margin: '4px 0 0 0', fontSize: '12px' } }, 
        sale.tipo_venta === 'CONTADO' ? 'Contado' : sale.tipo_venta === 'CTA_CTE' ? 'Cuenta Corriente' : 'Mixto'
      )
    ),
    React.createElement('div', { style: { textAlign: 'center', paddingTop: '8px' } },
      React.createElement('p', { style: { margin: '0', fontSize: '11px', fontStyle: 'italic', color: '#666' } }, 'Gracias por su compra')
    )
  );
};

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

    // Get sale and config data
    const sale = await base44.entities.Sale.list().then(sales => 
      sales.find(s => s.id === saleId)
    );

    if (!sale) {
      return Response.json({ error: 'Sale not found' }, { status: 404 });
    }

    const config = await base44.entities.ConfiguracionEmpresa.list().then(configs => configs[0]);

    if (documentType === 'mobile') {
      // Generate mobile PDF
      const pdf = new jsPDF({ format: [375, 0], unit: 'px' });
      
      const html = render(React.createElement(MobileReceiptTemplate, { sale, config }), null);
      const canvas = await html2canvas(html, { scale: 2 });
      
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 375, pdf.internal.pageSize.getHeight());
      
      const pdfBytes = pdf.output('arraybuffer');
      return new Response(pdfBytes, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=receipt-mobile-${saleId}.pdf`
        }
      });
    } else if (documentType === 'thermal') {
      // Generate thermal text receipt
      const textContent = generateThermalReceipt(sale, config);
      return new Response(textContent, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename=receipt-thermal-${saleId}.txt`
        }
      });
    } else if (documentType === 'a4') {
      // Generate A4 PDF
      const pdf = new jsPDF({ format: 'a4' });
      const html = render(React.createElement(A4SalesDocumentTemplate, { sale, config }), null);
      const canvas = await html2canvas(html, { scale: 2 });
      
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
      
      const pdfBytes = pdf.output('arraybuffer');
      return new Response(pdfBytes, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=document-a4-${saleId}.pdf`
        }
      });
    }

    return Response.json({ error: 'Invalid documentType' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateThermalReceipt(sale, config) {
  const companyName = config?.nombre_empresa || 'EMPRESA';
  const lineWidth = 40;
  const separator = '─'.repeat(lineWidth);

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
  if (sale.numero_comprobante) receipt += `#${sale.numero_comprobante}\n`;
  receipt += `${separator}\n`;
  receipt += `${(sale.client_name || 'CONSUMIDOR FINAL').substring(0, lineWidth)}\n`;
  receipt += `${separator}\n`;

  if (sale.items && sale.items.length > 0) {
    sale.items.forEach(item => {
      const qty = item.quantity.toString().substring(0, 3);
      const price = `$${item.precio_unitario?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}`;
      const total = `$${item.total?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}`;
      const name = item.name.substring(0, Math.max(5, lineWidth - 3 - price.length - total.length));
      receipt += `${padBetween(`${qty}x ${name}`, total)}\n`;
    });
  }

  receipt += `${separator}\n`;
  receipt += `${padBetween('SUBTOTAL', `$${(sale.subtotal || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`)}\n`;
  if (sale.discount > 0) receipt += `${padBetween('DESCUENTO', `-$${sale.discount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`)}\n`;
  if (sale.iva_21 > 0) receipt += `${padBetween('IVA (21%)', `$${sale.iva_21.toLocaleString(undefined, { maximumFractionDigits: 2 })}`)}\n`;
  receipt += `${separator}\n`;
  receipt += `${padBetween('TOTAL', `$${(sale.total || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`)}\n`;
  receipt += `${separator}\n`;
  receipt += `${centerText(sale.tipo_venta === 'CONTADO' ? 'CONTADO' : sale.tipo_venta === 'CTA_CTE' ? 'CUENTA CORRIENTE' : 'MIXTO')}\n`;
  receipt += `${separator}\n`;
  receipt += `${centerText('GRACIAS POR SU COMPRA')}\n`;
  receipt += `${separator}\n`;

  return receipt;
}

function A4SalesDocumentTemplate({ sale, config }) {
  // Placeholder for A4 template
  return React.createElement('div', { style: { padding: '20px' } }, 'A4 Document');
}