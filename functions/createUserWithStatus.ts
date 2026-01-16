import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Solo admin puede crear usuarios
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { full_name, email, role_id, status = 'active' } = await req.json();

    if (!full_name || !email) {
      return Response.json({ error: 'full_name y email son requeridos' }, { status: 400 });
    }

    // Crear el usuario con la API de Base44
    const newUser = await base44.asServiceRole.entities.User.create({
      full_name,
      email,
      role_id,
      status,
    });

    return Response.json({ success: true, user: newUser });
  } catch (error) {
    console.error('Error creating user:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});