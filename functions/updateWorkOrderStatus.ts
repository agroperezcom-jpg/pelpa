import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Automatically calculate and update work order status based on task completion
 * Called whenever a task status changes
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id } = await req.json();

    if (!project_id) {
      return Response.json({ error: 'project_id is required' }, { status: 400 });
    }

    // Get project
    const project = await base44.asServiceRole.entities.Project.list();
    const workOrder = project.find(p => p.id === project_id);

    if (!workOrder || !workOrder.is_work_order) {
      return Response.json({ error: 'Not a work order' }, { status: 400 });
    }

    // Get all tasks for this project
    const tasks = await base44.asServiceRole.entities.Task.filter({
      project_id
    });

    // Calculate new status based on task types and completion
    let newStatus = calculateWorkOrderStatus(tasks);

    // Update project with new status
    const updates = { work_order_status: newStatus };

    // If status changed to DELIVERED and no real_delivery_date, set it
    if (newStatus === 'DELIVERED' && !workOrder.real_delivery_date) {
      updates.real_delivery_date = new Date().toISOString().split('T')[0];
    }

    await base44.asServiceRole.entities.Project.update(project_id, updates);

    return Response.json({
      success: true,
      project_id,
      new_status: newStatus,
      task_summary: {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'completado').length,
        by_type: groupTasksByType(tasks)
      }
    });
  } catch (error) {
    console.error('Error in updateWorkOrderStatus:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Calculate work order status based on task types and completion
 */
function calculateWorkOrderStatus(tasks) {
  if (tasks.length === 0) {
    return 'DESIGN';
  }

  // Group tasks by type
  const designTasks = tasks.filter(t => t.task_type === 'DESIGN');
  const printingTasks = tasks.filter(t => t.task_type === 'PRINTING');
  const finishingTasks = tasks.filter(t => t.task_type === 'FINISHING');
  const allTasks = tasks;

  // Count completed by type
  const designCompleted = designTasks.filter(t => t.status === 'completado').length;
  const printingCompleted = printingTasks.filter(t => t.status === 'completado').length;
  const finishingCompleted = finishingTasks.filter(t => t.status === 'completado').length;
  const allCompleted = allTasks.filter(t => t.status === 'completado').length;

  // Status logic:
  // 1. If any design task is not completed → DESIGN
  if (designTasks.length > 0 && designCompleted < designTasks.length) {
    return 'DESIGN';
  }

  // 2. If design complete and any printing task exists and not completed → PRINTING
  if (printingTasks.length > 0 && printingCompleted < printingTasks.length) {
    return 'PRINTING';
  }

  // 3. If design and printing complete and finishing tasks exist and not completed → FINISHING
  if (finishingTasks.length > 0 && finishingCompleted < finishingTasks.length) {
    return 'FINISHING';
  }

  // 4. If all tasks completed → READY
  if (allCompleted === allTasks.length && allTasks.length > 0) {
    return 'READY';
  }

  return 'DESIGN';
}

/**
 * Group tasks by type
 */
function groupTasksByType(tasks) {
  return {
    DESIGN: tasks.filter(t => t.task_type === 'DESIGN').length,
    PRINTING: tasks.filter(t => t.task_type === 'PRINTING').length,
    FINISHING: tasks.filter(t => t.task_type === 'FINISHING').length,
    OTHER: tasks.filter(t => t.task_type === 'OTHER' || !t.task_type).length
  };
}