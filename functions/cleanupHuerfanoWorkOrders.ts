import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Obtener todas las órdenes de trabajo
    const allProjects = await base44.asServiceRole.entities.Project.list();
    const workOrders = allProjects.filter(p => p.is_work_order);
    const validProjectIds = new Set(allProjects.filter(p => !p.is_work_order).map(p => p.id));

    // Identificar órdenes huérfanas (cuyo proyecto no existe o fue eliminado)
    const huerfanas = workOrders.filter(wo => !wo.project_id || !validProjectIds.has(wo.project_id));

    let eliminadas = 0;
    for (const wo of huerfanas) {
      try {
        await base44.asServiceRole.entities.Project.delete(wo.id);
        eliminadas++;
      } catch (error) {
        console.error(`Error eliminando orden ${wo.id}:`, error.message);
      }
    }

    return Response.json({
      status: 'success',
      message: `${eliminadas} órdenes de trabajo huérfanas eliminadas`,
      detalles: huerfanas.map(wo => ({ id: wo.id, nombre: wo.name }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});