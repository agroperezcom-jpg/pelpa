import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 1. Definir módulos y acciones
    const modulesAndActions = [
      { module: 'sales', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
      { module: 'purchases', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
      { module: 'inventory', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'projects', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'calendar', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'finance', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
    ];

    // 2. Crear/obtener todos los permisos
    const permissionMap = {};
    
    for (const { module, actions } of modulesAndActions) {
      for (const action of actions) {
        const permissionKey = `${module}.${action}`;
        
        // Buscar si existe
        const existing = await base44.asServiceRole.entities.Permission.filter({
          module_key: module,
          action: action
        });

        if (existing.length === 0) {
          // Crear nuevo
          const created = await base44.asServiceRole.entities.Permission.create({
            module_key: module,
            action: action
          });
          permissionMap[permissionKey] = created.id;
        } else {
          permissionMap[permissionKey] = existing[0].id;
        }
      }
    }

    // 3. Definir roles y sus permisos
    const roleDefinitions = [
      {
        name: 'Administrador',
        description: 'Acceso total al sistema',
        permissions: Object.keys(permissionMap) // Todos
      },
      {
        name: 'Ventas',
        description: 'Acceso a módulo de ventas',
        permissions: [
          'sales.view', 'sales.create', 'sales.edit', 'sales.delete',
          'inventory.view'
        ]
      },
      {
        name: 'Tesorería',
        description: 'Acceso a finanzas y tesorería',
        permissions: [
          'finance.view', 'finance.create', 'finance.edit', 'finance.delete', 'finance.approve',
          'sales.view'
        ]
      },
      {
        name: 'Compras',
        description: 'Acceso a módulo de compras',
        permissions: [
          'purchases.view', 'purchases.create', 'purchases.edit', 'purchases.delete',
          'inventory.view'
        ]
      },
      {
        name: 'Operaciones',
        description: 'Acceso a proyectos e inventario',
        permissions: [
          'projects.view', 'projects.create', 'projects.edit',
          'inventory.view', 'inventory.create', 'inventory.edit',
          'calendar.view', 'calendar.create', 'calendar.edit'
        ]
      }
    ];

    const roleMap = {};

    // 4. Crear/obtener roles y asignar permisos
    for (const roleDef of roleDefinitions) {
      const existing = await base44.asServiceRole.entities.Role.filter({
        name: roleDef.name
      });

      let roleId;
      if (existing.length === 0) {
        const created = await base44.asServiceRole.entities.Role.create({
          name: roleDef.name,
          description: roleDef.description,
          is_system_role: false
        });
        roleId = created.id;
      } else {
        roleId = existing[0].id;
      }

      roleMap[roleDef.name] = roleId;

      // Asignar permisos al rol
      for (const permissionKey of roleDef.permissions) {
        const permissionId = permissionMap[permissionKey];
        if (permissionId) {
          // Verificar que no exista
          const existingRolePermission = await base44.asServiceRole.entities.RolePermission.filter({
            role_id: roleId,
            permission_id: permissionId
          });

          if (existingRolePermission.length === 0) {
            await base44.asServiceRole.entities.RolePermission.create({
              role_id: roleId,
              permission_id: permissionId
            });
          }
        }
      }
    }

    return Response.json({
      status: 'success',
      message: 'Seed de permisos completado',
      permissionsCreated: Object.keys(permissionMap).length,
      rolesCreated: Object.keys(roleMap).length,
      roles: roleMap
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});