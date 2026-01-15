import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // IDs de los movimientos huérfanos a eliminar
    const orphanIds = [
      '6968ea2f87623ab39b65557a', // $499.99 - Pago a pppp
      '6968e7ca7d01714f36b8239c'  // $1500 - Transferencia entre bancos
    ];

    const bancos = await base44.asServiceRole.entities.Banco.list();
    const cajas = await base44.asServiceRole.entities.Caja.list();
    const deletedMovements = [];

    for (const movId of orphanIds) {
      try {
        // Obtener el movimiento
        const movimientos = await base44.asServiceRole.entities.MovimientoTesoreria.list();
        const mov = movimientos.find(m => m.id === movId);

        if (!mov) {
          continue;
        }

        // Revertir saldos antes de eliminar
        if (mov.tipo === 'EGRESO') {
          if (mov.banco_id) {
            const banco = bancos.find(b => b.id === mov.banco_id);
            if (banco) {
              await base44.asServiceRole.entities.Banco.update(mov.banco_id, {
                saldo_actual: banco.saldo_actual + mov.importe
              });
            }
          }
          if (mov.caja_id) {
            const caja = cajas.find(c => c.id === mov.caja_id);
            if (caja) {
              await base44.asServiceRole.entities.Caja.update(mov.caja_id, {
                saldo_actual: caja.saldo_actual + mov.importe
              });
            }
          }
        }

        // Eliminar el movimiento
        await base44.asServiceRole.entities.MovimientoTesoreria.delete(movId);
        deletedMovements.push({
          id: movId,
          importe: mov.importe,
          observaciones: mov.observaciones
        });
      } catch (error) {
        console.error(`Error eliminando movimiento ${movId}:`, error);
      }
    }

    return Response.json({
      success: true,
      deletedCount: deletedMovements.length,
      movements: deletedMovements
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});