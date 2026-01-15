import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Obtener todos los proyectos
    const projects = await base44.asServiceRole.entities.Project.list();
    
    // Obtener todos los presupuestos para mapear project_ids
    const presupuestos = await base44.asServiceRole.entities.Presupuesto.list();
    const projectIdsInPresupuestos = new Set(presupuestos.map(p => p.proyecto_id).filter(Boolean));

    // Identificar proyectos huérfanos (sin presupuesto asociado)
    const huerfanos = projects.filter(p => !projectIdsInPresupuestos.has(p.id));

    let eliminados = 0;
    for (const project of huerfanos) {
      try {
        await base44.asServiceRole.entities.Project.delete(project.id);
        eliminados++;
      } catch (error) {
        console.error(`Error eliminando proyecto ${project.id}:`, error.message);
      }
    }

    return Response.json({ 
      status: 'success',
      message: `${eliminados} proyectos huérfanos eliminados`,
      detalles: huerfanos.map(p => ({ id: p.id, nombre: p.name }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});