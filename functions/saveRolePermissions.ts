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
      return Response.json({ error: 'Falta información requerida' }, { status: 400 });
    }

    // Obtener permisos existentes del rol
    const rolPermisosExistentes = await base44.asServiceRole.entities.RolPermiso.filter({
      rol_id: rolId
    });

    // Crear mapa de permisos nuevos
    const permisosNuevos = Object.entries(permisosSeleccionados)
      .filter(([, isSelected]) => isSelected === true)
      .map(([key]) => {
        const parts = key.split('_');
        const accion = parts[parts.length - 1];
        const modulo = parts.slice(0, -1).join('_');
        return `${modulo}_${accion}`;
      });

    const permisosExistentes = new Map();
    rolPermisosExistentes.forEach(rp => {
      permisosExistentes.set(`${rp.modulo}_${rp.accion}`, rp.id);
    });

    // Eliminar permisos que fueron desmarcados
    const permisosAEliminar = [];
    permisosExistentes.forEach((rpId, key) => {
      if (!permisosNuevos.includes(key)) {
        permisosAEliminar.push(rpId);
      }
    });

    for (const rpId of permisosAEliminar) {
      try {
        await base44.asServiceRole.entities.RolPermiso.delete(rpId);
      } catch (e) {
        console.log(`Warning: No se pudo eliminar RolPermiso ${rpId}`);
      }
    }

    // Obtener todos los permisos disponibles
    const todosPermisos = await base44.asServiceRole.entities.Permiso.list();

    let permisosCreados = 0;

    // Crear solo los permisos nuevos que no existen
    for (const key of permisosNuevos) {
      if (!permisosExistentes.has(key)) {
        const [modulo, accion] = [key.substring(0, key.lastIndexOf('_')), key.substring(key.lastIndexOf('_') + 1)];
        
        let permisoId = null;
        const permisoBD = todosPermisos.find(p => p.modulo === modulo && p.accion === accion);
        
        if (permisoBD) {
          permisoId = permisoBD.id;
        } else {
          const nuevoPermiso = await base44.asServiceRole.entities.Permiso.create({
            modulo,
            accion,
            descripcion: `${accion} en ${modulo}`
          });
          permisoId = nuevoPermiso.id;
        }

        await base44.asServiceRole.entities.RolPermiso.create({
          rol_id: rolId,
          rol_nombre: rolNombre || "",
          permiso_id: permisoId,
          modulo,
          accion
        });

        permisosCreados++;
      }
    }

    return Response.json({ 
      success: true, 
      message: 'Permisos guardados correctamente',
      permisosCreados,
      permisosEliminados: permisosAEliminar.length
    });
  } catch (error) {
    console.error('Error al guardar permisos:', error);
    return Response.json({ 
      error: error.message || 'Error al guardar permisos'
    }, { status: 500 });
  }
});