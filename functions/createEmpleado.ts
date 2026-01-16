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
    const { full_name, email, role_id } = await req.json();

    // Validate required fields
    if (!full_name || !email) {
      return Response.json(
        { error: 'Missing required fields: full_name, email' },
        { status: 400 }
      );
    }

    // Check if employee already exists
    const existingEmpleados = await base44.entities.Empleado.filter({ email });
    if (existingEmpleados && existingEmpleados.length > 0) {
      return Response.json(
        { error: 'Employee with this email already exists' },
        { status: 400 }
      );
    }

    // Invite user to Base44
    const inviteResponse = await base44.users.inviteUser(email, 'user');
    
    if (!inviteResponse || !inviteResponse.id) {
      return Response.json(
        { error: 'Failed to invite user to Base44' },
        { status: 500 }
      );
    }

    // Create Empleado record with user_id
    const empleado = await base44.entities.Empleado.create({
      full_name,
      email,
      user_id: inviteResponse.id,
      role_id: role_id || null,
      status: 'invited'
    });

    return Response.json({
      success: true,
      empleado,
      message: 'Employee created and invitation sent'
    });
  } catch (error) {
    console.error('Error creating empleado:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});