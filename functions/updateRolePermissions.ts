import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rolId, permisosSeleccionados, rolNombre } = await req.json();

    if (!rolId || !permisosSeleccionados) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Obtener todos los permisos existentes del rol
    const rolPermisosExistentes = await base44.asServiceRole.entities.RolPermiso.filter({
      rol_id: rolId
    });

    // Eliminar todos los permisos existentes
    for (const rp of rolPermisosExistentes) {
      await base44.asServiceRole.entities.RolPermiso.delete(rp.id);
    }

    // Obtener todos los permisos disponibles
    const todosPermisos = await base44.asServiceRole.entities.Permiso.list();

    // Crear los nuevos permisos seleccionados
    const permisosACrear = Object.entries(permisosSeleccionados)
      .filter(([, isSelected]) => isSelected)
      .map(([key]) => {
        const parts = key.split('_');
        return {
          accion: parts[parts.length - 1],
          modulo: parts.slice(0, -1).join('_')
        };
      });

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
    }

    return Response.json({ success: true, message: 'Permisos actualizados correctamente' });
  } catch (error) {
    console.error('Error al actualizar permisos:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});