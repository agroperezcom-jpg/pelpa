import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { full_name, email, role_id } = await req.json();

    if (!full_name || !email) {
      return Response.json({ error: 'full_name y email son requeridos' }, { status: 400 });
    }

    // 1. Invitar usuario en Base44
    await base44.users.inviteUser(email, 'user');

    // 2. Crear empleado con user_id 
    // Por ahora, el user_id será un placeholder hasta que el usuario acepte la invitación
    const empleado = await base44.asServiceRole.entities.Empleado.create({
      full_name,
      email,
      role_id: role_id || null,
      status: 'invited',
    });

    return Response.json({ success: true, empleado });
  } catch (error) {
    console.error('Error creating empleado:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});