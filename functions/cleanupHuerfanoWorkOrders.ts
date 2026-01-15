import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Obtener todos los proyectos
    const allProjects = await base44.asServiceRole.entities.Project.list('-created_date', 500);
    const projectIds = new Set(allProjects.map(p => p.id));

    // Obtener TODAS las tareas (ProjectTask)
    const allTasks = await base44.asServiceRole.entities.ProjectTask.list('-created_date', 1000);

    // Identificar tareas huérfanas (sin proyecto válido)
    const huerfanas = allTasks.filter(task => !task.project_id || !projectIds.has(task.project_id));

    // Eliminar tareas huérfanas
    let eliminadas = 0;
    const detalles = [];
    for (const task of huerfanas) {
      try {
        await base44.asServiceRole.entities.ProjectTask.delete(task.id);
        eliminadas++;
        detalles.push({ id: task.id, nombre: task.name, project_id: task.project_id });
      } catch (error) {
        console.error(`Error eliminando tarea ${task.id}:`, error.message);
      }
    }

    return Response.json({
      status: 'success',
      message: `${eliminadas} tareas huérfanas eliminadas de ${allTasks.length} totales`,
      detalles
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});