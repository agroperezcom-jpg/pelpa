import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 1: Check if Empleado already has user_id linked
    let empleado = null;
    try {
      const empleados = await base44.entities.Empleado.filter({ user_id: user.id });
      empleado = empleados?.[0];
    } catch (err) {
      console.log('First check failed:', err.message);
    }

    if (empleado) {
      console.log('✅ Empleado already linked:', { user_id: user.id, empleado_id: empleado.id });
      return Response.json({ 
        status: 'already_linked',
        empleado_id: empleado.id 
      });
    }

    // Step 2: Try to find Empleado by email
    let empleadoByEmail = null;
    try {
      const empleados = await base44.entities.Empleado.filter({ email: user.email });
      empleadoByEmail = empleados?.[0];
    } catch (err) {
      console.log('Email lookup failed:', err.message);
    }

    if (empleadoByEmail) {
      // Step 3: Link the Empleado to this user
      try {
        await base44.entities.Empleado.update(empleadoByEmail.id, {
          user_id: user.id,
          status: 'active'
        });
        console.log('✅ Empleado linked successfully:', { 
          user_id: user.id, 
          empleado_id: empleadoByEmail.id 
        });
        return Response.json({ 
          status: 'linked',
          empleado_id: empleadoByEmail.id 
        });
      } catch (err) {
        console.error('❌ Error linking Empleado:', err);
        return Response.json({ 
          error: 'Failed to link Empleado',
          details: err.message 
        }, { status: 500 });
      }
    }

    // Step 4: No Empleado found - create one
    try {
      const newEmpleado = await base44.entities.Empleado.create({
        full_name: user.full_name || user.email,
        email: user.email,
        user_id: user.id,
        status: 'active'
      });
      console.log('✅ New Empleado created:', { 
        user_id: user.id, 
        empleado_id: newEmpleado.id 
      });
      return Response.json({ 
        status: 'created',
        empleado_id: newEmpleado.id 
      });
    } catch (err) {
      console.error('❌ Error creating Empleado:', err);
      return Response.json({ 
        error: 'Failed to create Empleado',
        details: err.message 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});