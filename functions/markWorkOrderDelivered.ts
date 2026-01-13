import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Marks a Work Order as DELIVERED
 * Automatically sets real_delivery_date to today
 * Only admins can do manual status changes
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
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

    const today = new Date().toISOString().split('T')[0];

    // Update project
    await base44.entities.Project.update(project_id, {
      work_order_status: 'DELIVERED',
      real_delivery_date: today
    });

    return Response.json({
      success: true,
      message: 'Work order marked as delivered',
      real_delivery_date: today
    });

  } catch (error) {
    console.error('Error marking work order delivered:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});