import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sale_id, recipient_email, ticket_type = 'a4' } = await req.json();

    if (!sale_id || !recipient_email) {
      return Response.json({ error: 'sale_id y recipient_email son requeridos' }, { status: 400 });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipient_email)) {
      return Response.json({ error: 'Email inválido' }, { status: 400 });
    }

    // Obtener la venta
    const sales = await base44.entities.Sale.list();
    const sale = sales.find(s => s.id === sale_id);
    
    if (!sale) {
      return Response.json({ error: 'Venta no encontrada' }, { status: 404 });
    }

    // Generar el PDF
    const pdfResponse = await base44.functions.invoke('generateSaleTicket', {
      sale_id: sale_id,
      type: ticket_type
    });

    // Convertir el PDF a base64 para adjuntarlo
    const pdfBuffer = new Uint8Array(pdfResponse.data);
    const pdfBase64 = btoa(String.fromCharCode(...pdfBuffer));

    // Obtener configuración de empresa
    const config = await base44.entities.ConfiguracionEmpresa.list();
    const empresa = config[0] || {};

    // Determinar nombre del tipo de ticket
    const typeNames = {
      'mobile': 'Mobile',
      '80mm': 'Térmico 80mm',
      'a4': 'Comprobante A4'
    };

    // Enviar email usando la integración Core.SendEmail
    await base44.integrations.Core.SendEmail({
      from_name: empresa.nombre_empresa || 'Librería',
      to: recipient_email,
      subject: `Comprobante de Venta ${sale.numero_comprobante || sale.id}`,
      body: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2563eb;">Comprobante de Venta</h2>
              <p>Estimado/a <strong>${sale.client_name || 'Cliente'}</strong>,</p>
              <p>Adjuntamos su comprobante de venta con los siguientes detalles:</p>
              
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Comprobante:</strong> ${sale.numero_comprobante || 'N/A'}</p>
                <p style="margin: 5px 0;"><strong>Fecha:</strong> ${new Date(sale.created_date).toLocaleDateString('es-AR')}</p>
                <p style="margin: 5px 0;"><strong>Total:</strong> $${sale.total?.toFixed(2)}</p>
                <p style="margin: 5px 0;"><strong>Formato:</strong> ${typeNames[ticket_type]}</p>
              </div>
              
              <p>El comprobante está adjunto en formato PDF.</p>
              
              <p style="margin-top: 30px; font-size: 14px; color: #666;">
                Gracias por su compra.<br>
                <strong>${empresa.nombre_empresa || 'Librería'}</strong>
                ${empresa.telefono ? `<br>Tel: ${empresa.telefono}` : ''}
                ${empresa.email ? `<br>Email: ${empresa.email}` : ''}
              </p>
            </div>
          </body>
        </html>
      `,
      attachments: [{
        filename: `comprobante_${sale.numero_comprobante || sale.id}.pdf`,
        content: pdfBase64,
        encoding: 'base64',
        contentType: 'application/pdf'
      }]
    });

    return Response.json({ 
      success: true, 
      message: `Comprobante enviado a ${recipient_email}` 
    });

  } catch (error) {
    console.error('Error enviando email:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});