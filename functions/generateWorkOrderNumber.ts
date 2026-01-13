import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generate sequential work order number for a company
 * Format: OT-{company_year}-{sequence}
 * Example: OT-2026-0001
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { company_id } = await req.json();

    if (!company_id) {
      return Response.json({ error: 'company_id is required' }, { status: 400 });
    }

    // Get all work orders for this company in current year
    const currentYear = new Date().getFullYear();
    const workOrders = await base44.asServiceRole.entities.Project.filter({
      company_id,
      is_work_order: true
    });

    // Filter by current year
    const currentYearOrders = workOrders.filter(wo => {
      if (!wo.work_order_number) return false;
      return wo.work_order_number.includes(`-${currentYear}-`);
    });

    const nextSequence = currentYearOrders.length + 1;
    const sequenceStr = String(nextSequence).padStart(4, '0');
    const workOrderNumber = `OT-${currentYear}-${sequenceStr}`;

    return Response.json({
      success: true,
      work_order_number: workOrderNumber,
      sequence: nextSequence
    });
  } catch (error) {
    console.error('Error in generateWorkOrderNumber:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});