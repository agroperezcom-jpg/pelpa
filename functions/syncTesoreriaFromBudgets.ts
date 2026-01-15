import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all accepted budgets
    const budgets = await base44.entities.Presupuesto.filter({
      estado: "ACEPTADO"
    });
    
    // Get existing treasury movements from budgets
    const existingMovements = await base44.entities.MovimientoTesoreria.filter({
      origen: "presupuesto"
    });

    const existingBudgetIds = new Set(existingMovements.map(m => m.origen_id));

    // Create missing movements for accepted budgets
    const newMovements = [];
    for (const budget of budgets) {
      if (!existingBudgetIds.has(budget.id)) {
        newMovements.push({
          fecha: budget.fecha_aceptacion?.split('T')[0] || budget.fecha,
          tipo: "INGRESO",
          importe: budget.total_presupuesto,
          origen: "presupuesto",
          origen_id: budget.id,
          descripcion: `Presupuesto aceptado ${budget.numero_presupuesto}`,
          medio_pago_id: null,
          banco_id: null,
          caja_id: null
        });
      }
    }

    if (newMovements.length > 0) {
      await base44.entities.MovimientoTesoreria.bulkCreate(newMovements);
    }

    // Delete movements for budgets that are no longer accepted or were deleted
    const deletedBudgetMovements = existingMovements.filter(
      m => !budgets.some(b => b.id === m.origen_id)
    );

    for (const movement of deletedBudgetMovements) {
      await base44.entities.MovimientoTesoreria.delete(movement.id);
    }

    return Response.json({
      created: newMovements.length,
      deleted: deletedBudgetMovements.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});