import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo admin puede eliminar proyectos
    if (user.role !== 'admin') {
      return Response.json({ error: 'Permiso denegado: se requiere rol de administrador' }, { status: 403 });
    }

    const { project_id } = await req.json();

    if (!project_id) {
      return Response.json({ error: 'project_id es requerido' }, { status: 400 });
    }

    // Obtener el proyecto para registro
    const project = await base44.entities.Project.filter({ id: project_id });
    if (!project || project.length === 0) {
      return Response.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    const projectData = project[0];

    // 1. Eliminar fases del proyecto
    const phases = await base44.asServiceRole.entities.ProjectPhase.filter({ project_id });
    for (const phase of phases) {
      await base44.asServiceRole.entities.ProjectPhase.delete(phase.id);
    }

    // 2. Eliminar tareas del proyecto
    const tasks = await base44.asServiceRole.entities.ProjectTask.filter({ project_id });
    for (const task of tasks) {
      await base44.asServiceRole.entities.ProjectTask.delete(task.id);
    }

    // 3. Eliminar mensajes del proyecto
    const messages = await base44.asServiceRole.entities.ProjectMessage.filter({ project_id });
    for (const message of messages) {
      await base44.asServiceRole.entities.ProjectMessage.delete(message.id);
    }

    // 4. Eliminar actividades del proyecto
    const activities = await base44.asServiceRole.entities.ProjectActivity.filter({ project_id });
    for (const activity of activities) {
      await base44.asServiceRole.entities.ProjectActivity.delete(activity.id);
    }

    // 5. Eliminar documentos del proyecto
    const documents = await base44.asServiceRole.entities.ProjectDocument.filter({ project_id });
    for (const doc of documents) {
      await base44.asServiceRole.entities.ProjectDocument.delete(doc.id);
    }

    // 6. Eliminar hitos del proyecto
    const milestones = await base44.asServiceRole.entities.ProjectMilestone.filter({ project_id });
    for (const milestone of milestones) {
      await base44.asServiceRole.entities.ProjectMilestone.delete(milestone.id);
    }

    // 7. Eliminar comentarios del proyecto
    const comments = await base44.asServiceRole.entities.ProjectComment.filter({ project_id });
    for (const comment of comments) {
      await base44.asServiceRole.entities.ProjectComment.delete(comment.id);
    }

    // 8. Desvincular ventas del proyecto (no las eliminamos para mantener registro financiero)
    const sales = await base44.asServiceRole.entities.Sale.filter({ project_id });
    for (const sale of sales) {
      await base44.asServiceRole.entities.Sale.update(sale.id, { project_id: null });
    }

    // 9. Desvincular presupuestos (no eliminamos para mantener registro)
    const budgets = await base44.asServiceRole.entities.Presupuesto.filter({ project_id });
    for (const budget of budgets) {
      await base44.asServiceRole.entities.Presupuesto.update(budget.id, { project_id: null });
    }

    // 10. Eliminar el proyecto
    await base44.asServiceRole.entities.Project.delete(project_id);

    return Response.json({
      success: true,
      message: `Proyecto "${projectData.name}" eliminado exitosamente`,
      deleted_counts: {
        phases: phases.length,
        tasks: tasks.length,
        messages: messages.length,
        activities: activities.length,
        documents: documents.length,
        milestones: milestones.length,
        comments: comments.length,
        sales_unlinked: sales.length,
        budgets_unlinked: budgets.length
      }
    });

  } catch (error) {
    console.error('Error eliminando proyecto:', error);
    return Response.json({ 
      error: 'Error al eliminar el proyecto',
      details: error.message 
    }, { status: 500 });
  }
});