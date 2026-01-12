import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticketType, ticketId } = await req.json();

    if (!ticketType || !ticketId) {
      return Response.json({ error: 'Missing ticketType or ticketId' }, { status: 400 });
    }

    let ticketData = null;
    let empresa = null;

    // Obtener configuración de la empresa
    const empresas = await base44.asServiceRole.entities.ConfiguracionEmpresa.list();
    empresa = empresas[0];

    if (ticketType === 'sale') {
      // Obtener venta
      const sales = await base44.asServiceRole.entities.Sale.filter({ id: ticketId });
      const sale = sales[0];

      if (!sale) {
        return Response.json({ error: 'Sale not found' }, { status: 404 });
      }

      ticketData = {
        comercio_nombre: empresa?.nombre_empresa || 'MI EMPRESA',
        comercio_domicilio: empresa?.domicilio || '',
        comercio_telefono: empresa?.telefono || '',
        comercio_email: empresa?.email || '',
        numero_comprobante: sale.numero_comprobante || '',
        tipo_comprobante: sale.tipo_comprobante || 'X',
        fecha: new Date(sale.created_date).toLocaleDateString('es-AR'),
        hora: new Date(sale.created_date).toLocaleTimeString('es-AR'),
        cliente_nombre: sale.client_name || 'CONSUMIDOR FINAL',
        cliente_documento: '',
        cliente_domicilio: '',
        items: sale.items || [],
        subtotal: sale.subtotal || 0,
        descuento: sale.discount || 0,
        neto_gravado: sale.neto_gravado || 0,
        iva_21: sale.iva_21 || 0,
        total: sale.total || 0,
        forma_pago: sale.tipo_venta || '',
        observaciones: sale.notes || '',
      };
    } else if (ticketType === 'presupuesto') {
      // Obtener presupuesto
      const budgets = await base44.asServiceRole.entities.Presupuesto.filter({ id: ticketId });
      const budget = budgets[0];

      if (!budget) {
        return Response.json({ error: 'Budget not found' }, { status: 404 });
      }

      ticketData = {
        comercio_nombre: empresa?.nombre_empresa || 'MI EMPRESA',
        comercio_domicilio: empresa?.domicilio || '',
        comercio_telefono: empresa?.telefono || '',
        comercio_email: empresa?.email || '',
        numero_comprobante: budget.numero_presupuesto || '',
        tipo_comprobante: 'PRESUPUESTO',
        fecha: new Date(budget.fecha).toLocaleDateString('es-AR'),
        hora: new Date(budget.created_date).toLocaleTimeString('es-AR'),
        cliente_nombre: budget.cliente_name || 'CLIENTE',
        cliente_documento: '',
        cliente_domicilio: '',
        items: budget.items || [],
        subtotal: budget.subtotal || 0,
        descuento: budget.descuento || 0,
        neto_gravado: budget.neto_gravado || 0,
        iva_21: budget.iva_21 || 0,
        total: budget.total_presupuesto || 0,
        forma_pago: '',
        observaciones: budget.observaciones || '',
      };
    }

    return Response.json({
      success: true,
      ticketData
    });
  } catch (error) {
    console.error('Error generating ticket data:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});