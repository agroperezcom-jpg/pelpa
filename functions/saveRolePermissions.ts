import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { rolId, permisosSeleccionados, rolNombre } = await req.json();

    if (!rolId || !permisosSeleccionados) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Obtener todos los permisos existentes del rol
    const rolPermisosExistentes = await base44.asServiceRole.entities.RolPermiso.filter({
      rol_id: rolId
    });

    // 2. Eliminar todos los permisos existentes
    for (const rp of rolPermisosExistentes) {
      try {
        await base44.asServiceRole.entities.RolPermiso.delete(rp.id);
      } catch (e) {
        console.log(`Warning: Could not delete RolPermiso ${rp.id}:`, e.message);
      }
    }

    // 3. Obtener todos los permisos disponibles
    const todosPermisos = await base44.asServiceRole.entities.Permiso.list();

    // 4. Crear los nuevos permisos seleccionados
    const permisosACrear = Object.entries(permisosSeleccionados)
      .filter(([, isSelected]) => isSelected === true)
      .map(([key]) => {
        const parts = key.split('_');
        const accion = parts[parts.length - 1];
        const modulo = parts.slice(0, -1).join('_');
        return { modulo, accion };
      });

    let permisosCreados = 0;

    for (const { modulo, accion } of permisosACrear) {
      let permisoId = null;

      // Buscar permiso existente
      const permisoBD = todosPermisos.find(p => p.modulo === modulo && p.accion === accion);
      
      if (permisoBD) {
        permisoId = permisoBD.id;
      } else {
        // Crear nuevo permiso si no existe
        const nuevoPermiso = await base44.asServiceRole.entities.Permiso.create({
          modulo,
          accion,
          descripcion: `${accion} en ${modulo}`
        });
        permisoId = nuevoPermiso.id;
      }

      // Crear relación rol-permiso
      await base44.asServiceRole.entities.RolPermiso.create({
        rol_id: rolId,
        rol_nombre: rolNombre || "",
        permiso_id: permisoId,
        modulo,
        accion
      });

      permisosCreados++;
    }

    return Response.json({ 
      success: true, 
      message: `Permisos guardados correctamente (${permisosCreados} permisos)`,
      permisosCreados
    });
  } catch (error) {
    console.error('Error al guardar permisos:', error);
    return Response.json({ 
      error: error.message || 'Error al guardar permisos'
    }, { status: 500 });
  }
});