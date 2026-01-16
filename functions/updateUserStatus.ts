import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Parse request body
    const { empleado_id, new_status } = await req.json();

    // Validate required fields
    if (!empleado_id || !new_status) {
      return Response.json(
        { error: 'Missing required fields: empleado_id, new_status' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['active', 'invited', 'blocked'];
    if (!validStatuses.includes(new_status)) {
      return Response.json(
        { error: 'Invalid status. Must be one of: active, invited, blocked' },
        { status: 400 }
      );
    }

    // Get empleado record
    const empleado = await base44.entities.Empleado.get(empleado_id);
    if (!empleado) {
      return Response.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Update empleado status
    const updated = await base44.entities.Empleado.update(empleado_id, {
      status: new_status
    });

    return Response.json({
      success: true,
      empleado: updated,
      message: `Employee status updated to ${new_status}`
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});