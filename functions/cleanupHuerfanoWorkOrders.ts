import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Obtener TODAS las tareas (ProjectTask)
    const allTasks = await base44.asServiceRole.entities.ProjectTask.list('-created_date', 1000);

    // Eliminar TODAS las tareas
    let eliminadas = 0;
    const detalles = [];
    for (const task of allTasks) {
      try {
        await base44.asServiceRole.entities.ProjectTask.delete(task.id);
        eliminadas++;
        detalles.push({ id: task.id, nombre: task.name });
      } catch (error) {
        console.error(`Error eliminando tarea ${task.id}:`, error.message);
      }
    }

    return Response.json({
      status: 'success',
      message: `${eliminadas} tareas eliminadas`,
      detalles
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});