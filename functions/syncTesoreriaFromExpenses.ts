import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all expenses
    const expenses = await base44.entities.Expense.list();
    
    // Get existing treasury movements from expenses
    const existingMovements = await base44.entities.MovimientoTesoreria.filter({
      origen: "gasto"
    });

    const existingExpenseIds = new Set(existingMovements.map(m => m.origen_id));

    // Create missing movements for expenses
    const newMovements = [];
    for (const expense of expenses) {
      if (!existingExpenseIds.has(expense.id)) {
        newMovements.push({
          fecha: expense.date,
          tipo: "EGRESO",
          importe: expense.amount,
          origen: "gasto",
          origen_id: expense.id,
          descripcion: expense.description,
          medio_pago_id: expense.medio_pago_id || null,
          banco_id: expense.banco_id || null,
          caja_id: expense.caja_id || null
        });
      }
    }

    if (newMovements.length > 0) {
      await base44.entities.MovimientoTesoreria.bulkCreate(newMovements);
    }

    // Delete movements for expenses that no longer exist
    const deletedExpenseMovements = existingMovements.filter(
      m => !expenses.some(e => e.id === m.origen_id)
    );

    for (const movement of deletedExpenseMovements) {
      await base44.entities.MovimientoTesoreria.delete(movement.id);
    }

    return Response.json({
      created: newMovements.length,
      deleted: deletedExpenseMovements.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});