import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Solo procesar eliminación de proyectos
    if (event.type !== 'delete' || !data?.id) {
      return Response.json({ status: 'ignored' });
    }

    // Encontrar todas las órdenes de trabajo vinculadas a este proyecto
    const allProjects = await base44.asServiceRole.entities.Project.list();
    const workOrders = allProjects.filter(p => p.is_work_order && p.project_id === data.id);

    let eliminadas = 0;
    for (const wo of workOrders) {
      try {
        await base44.asServiceRole.entities.Project.delete(wo.id);
        eliminadas++;
      } catch (error) {
        console.error(`Error eliminando orden ${wo.id}:`, error.message);
      }
    }

    return Response.json({ status: 'success', message: `${eliminadas} órdenes de trabajo eliminadas` });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});