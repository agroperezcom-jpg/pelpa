import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Automatically updates Work Order status based on task completion
 * Rules:
 * - If any task is DESIGN → DESIGN
 * - If all design tasks done and printing active → PRINTING
 * - If printing done and finishing active → FINISHING
 * - If all tasks done → READY
 * - Otherwise → current status
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { project_id, company_id } = payload;

    if (!project_id || !company_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch project
    const projects = await base44.entities.Project.filter({
      id: project_id,
      company_id: company_id,
      is_work_order: true
    });

    if (!projects || projects.length === 0) {
      return Response.json({ error: 'Work order not found' }, { status: 404 });
    }

    const project = projects[0];

    // Fetch all tasks for this project
    const tasks = await base44.entities.Task.filter({
      project_id: project_id,
      company_id: company_id
    });

    // If no tasks, keep current status
    if (!tasks || tasks.length === 0) {
      return Response.json({ 
        status: project.work_order_status || 'DESIGN',
        message: 'No tasks found'
      });
    }

    // Determine new status based on task types and completion
    let newStatus = project.work_order_status || 'DESIGN';

    const designTasks = tasks.filter(t => t.task_type === 'DESIGN');
    const printingTasks = tasks.filter(t => t.task_type === 'PRINTING');
    const finishingTasks = tasks.filter(t => t.task_type === 'FINISHING');

    // Check if any task is active in each phase
    const hasActiveDesign = designTasks.some(t => t.status !== 'completado');
    const hasActivePrinting = printingTasks.some(t => t.status !== 'completado');
    const hasActiveFinishing = finishingTasks.some(t => t.status !== 'completado');

    // Auto-determine status
    if (hasActiveDesign) {
      newStatus = 'DESIGN';
    } else if (hasActivePrinting) {
      newStatus = 'PRINTING';
    } else if (hasActiveFinishing) {
      newStatus = 'FINISHING';
    } else {
      // All tasks completed
      newStatus = 'READY';
    }

    // Update project if status changed
    if (newStatus !== project.work_order_status) {
      await base44.entities.Project.update(project_id, {
        work_order_status: newStatus
      });
    }

    return Response.json({
      success: true,
      previousStatus: project.work_order_status,
      newStatus: newStatus,
      tasksAnalyzed: tasks.length
    });

  } catch (error) {
    console.error('Error updating work order status:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});