import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all confirmed purchases
    const purchases = await base44.entities.Compra.filter({ 
      estado: { $in: ["CONFIRMADA", "PENDIENTE", "PARCIAL"] }
    });
    
    // Get existing treasury movements from purchases
    const existingMovements = await base44.entities.MovimientoTesoreria.filter({
      origen: "compra"
    });

    const existingPurchaseIds = new Set(existingMovements.map(m => m.origen_id));

    // Create missing movements for purchases
    const newMovements = [];
    for (const purchase of purchases) {
      if (!existingPurchaseIds.has(purchase.id)) {
        newMovements.push({
          fecha: purchase.fecha,
          tipo: "EGRESO",
          importe: purchase.total_compra,
          origen: "compra",
          origen_id: purchase.id,
          descripcion: `Compra a ${purchase.proveedor_nombre}`,
          medio_pago_id: null,
          banco_id: null,
          caja_id: null
        });
      }
    }

    if (newMovements.length > 0) {
      await base44.entities.MovimientoTesoreria.bulkCreate(newMovements);
    }

    // Delete movements for purchases that are no longer in valid states or were deleted
    const deletedPurchaseMovements = existingMovements.filter(
      m => !purchases.some(p => p.id === m.origen_id)
    );

    for (const movement of deletedPurchaseMovements) {
      await base44.entities.MovimientoTesoreria.delete(movement.id);
    }

    return Response.json({
      created: newMovements.length,
      deleted: deletedPurchaseMovements.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});