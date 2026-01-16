import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 1. Obtener IDs de los roles
    const ventasRole = await base44.asServiceRole.entities.Role.filter({
      name: 'Ventas'
    });

    const tesoreriaRole = await base44.asServiceRole.entities.Role.filter({
      name: 'Tesorería'
    });

    if (ventasRole.length === 0 || tesoreriaRole.length === 0) {
      return Response.json({ 
        error: 'Los roles Ventas o Tesorería no existen. Ejecuta seedPermissions primero.' 
      }, { status: 400 });
    }

    const ventasRoleId = ventasRole[0].id;
    const tesoreriaRoleId = tesoreriaRole[0].id;

    // 2. Crear usuarios de prueba en Base44
    const testEmails = [
      { email: 'vendedor@test.local', fullName: 'Vendedor Test', roleId: ventasRoleId },
      { email: 'tesorero@test.local', fullName: 'Tesorero Test', roleId: tesoreriaRoleId }
    ];

    const createdEmpleados = [];

    for (const testUser of testEmails) {
      // Verificar si empleado ya existe
      const existing = await base44.asServiceRole.entities.Empleado.filter({
        email: testUser.email
      });

      if (existing.length > 0) {
        createdEmpleados.push({
          email: testUser.email,
          status: 'exists',
          id: existing[0].id
        });
        continue;
      }

      // Invitar usuario a Base44
      try {
        await base44.users.inviteUser(testUser.email, 'user');
      } catch (err) {
        // Usuario tal vez ya existe en Base44, continuamos
      }

      // Crear empleado
      const empleado = await base44.asServiceRole.entities.Empleado.create({
        full_name: testUser.fullName,
        email: testUser.email,
        role_id: testUser.roleId,
        status: 'invited'
      });

      createdEmpleados.push({
        email: testUser.email,
        fullName: testUser.fullName,
        roleId: testUser.roleId,
        id: empleado.id,
        status: 'created'
      });
    }

    return Response.json({
      status: 'success',
      message: 'Usuarios de prueba creados',
      users: createdEmpleados,
      instructions: 'Los usuarios han sido invitados. Ellos recibirán un email para activar su cuenta. Después, al login, se les asignarán automáticamente los permisos del rol.'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});