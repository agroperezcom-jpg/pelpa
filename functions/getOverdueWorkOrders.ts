import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Gets overdue work orders
 * Overdue = not DELIVERED and estimated_delivery_date < today
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { company_id } = payload;

    if (!company_id) {
      return Response.json({ error: 'Missing company_id' }, { status: 400 });
    }

    // Fetch all work orders
    const workOrders = await base44.entities.Project.filter({
      company_id: company_id,
      is_work_order: true
    });

    if (!workOrders || workOrders.length === 0) {
      return Response.json({ overdueWorkOrders: [] });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueWorkOrders = workOrders.filter(wo => {
      // Only check if not delivered and has estimated date
      if (wo.work_order_status === 'DELIVERED' || !wo.estimated_delivery_date) {
        return false;
      }

      const estimatedDate = new Date(wo.estimated_delivery_date);
      estimatedDate.setHours(0, 0, 0, 0);

      return estimatedDate < today;
    });

    return Response.json({
      success: true,
      overdueWorkOrders: overdueWorkOrders.map(wo => ({
        id: wo.id,
        name: wo.name,
        number: wo.work_order_number,
        client: wo.client_name,
        status: wo.work_order_status,
        estimatedDate: wo.estimated_delivery_date,
        daysOverdue: Math.floor((today - new Date(wo.estimated_delivery_date)) / (1000 * 60 * 60 * 24))
      }))
    });

  } catch (error) {
    console.error('Error getting overdue work orders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});