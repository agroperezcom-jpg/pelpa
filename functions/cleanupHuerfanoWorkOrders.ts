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

    // Eliminar TODAS las órdenes de trabajo
    let eliminadas = 0;
    const detalles = [];
    for (const wo of workOrders) {
      try {
        await base44.asServiceRole.entities.Project.delete(wo.id);
        eliminadas++;
        detalles.push({ id: wo.id, nombre: wo.name });
      } catch (error) {
        console.error(`Error eliminando orden ${wo.id}:`, error.message);
      }
    }

    return Response.json({
      status: 'success',
      message: `${eliminadas} órdenes de trabajo eliminadas`,
      detalles
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});