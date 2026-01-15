import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all confirmed sales
    const sales = await base44.entities.Sale.filter({ estado: "CONFIRMADA" });
    
    // Get existing treasury movements from sales
    const existingMovements = await base44.entities.MovimientoTesoreria.filter({
      origen: "venta"
    });

    const existingSalesIds = new Set(existingMovements.map(m => m.origen_id));

    // Create missing movements for sales
    const newMovements = [];
    for (const sale of sales) {
      if (!existingSalesIds.has(sale.id)) {
        newMovements.push({
          fecha: sale.created_date?.split('T')[0] || new Date().toISOString().split('T')[0],
          tipo: "INGRESO",
          importe: sale.total,
          origen: "venta",
          origen_id: sale.id,
          descripcion: `Venta ${sale.numero_comprobante || 'sin número'}`,
          medio_pago_id: null,
          banco_id: null,
          caja_id: null
        });
      }
    }

    if (newMovements.length > 0) {
      await base44.entities.MovimientoTesoreria.bulkCreate(newMovements);
    }

    // Delete movements for sales that are no longer confirmed or were deleted
    const deletedSaleMovements = existingMovements.filter(
      m => !sales.some(s => s.id === m.origen_id)
    );

    for (const movement of deletedSaleMovements) {
      await base44.entities.MovimientoTesoreria.delete(movement.id);
    }

    return Response.json({
      created: newMovements.length,
      deleted: deletedSaleMovements.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});