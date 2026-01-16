import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const moduleDefinitions = [
      { key: 'calendar', name: 'Agenda', icon: 'Calendar', section: 'calendario', order: 5 },
      { key: 'clients', name: 'Clientes', icon: 'Users', section: 'ventas', order: 3 },
      { key: 'services', name: 'Servicios', icon: 'Wrench', section: 'ventas', order: 4 },
      { key: 'talonarios', name: 'Talonarios', icon: 'FileCheck', section: 'ventas', order: 5 },
      { key: 'supplier_payments', name: 'Pagos Proveedores', icon: 'CreditCard', section: 'compras', order: 3 },
      { key: 'stock_control', name: 'Control de Stock', icon: 'ClipboardList', section: 'inventario', order: 3 },
      { key: 'checks', name: 'Cheques', icon: 'CreditCard', section: 'tesoreria', order: 2 },
      { key: 'income_statement', name: 'Estado de Resultados', icon: 'FileText', section: 'tesoreria', order: 5 },
      { key: 'analytics', name: 'Analytics', icon: 'TrendingUp', section: 'tesoreria', order: 6 }
    ];

    const actions = ['view', 'create', 'edit', 'delete', 'approve'];

    const results = {
      modulesCreated: 0,
      modulesSkipped: 0,
      permissionsCreated: 0,
      permissionsSkipped: 0,
      permissionsAssigned: 0,
      errors: []
    };

    // Get the Administrador role
    const adminRole = await base44.asServiceRole.entities.Role.filter({
      name: 'Administrador'
    });

    if (!adminRole || adminRole.length === 0) {
      return Response.json({
        error: 'Administrador role not found. Run seedPermissions first.',
        status: 'error'
      }, { status: 400 });
    }

    const adminRoleId = adminRole[0].id;

    // Get all existing modules and permissions
    const allModules = await base44.asServiceRole.entities.Module.list();
    const allPermissions = await base44.asServiceRole.entities.Permission.list();

    // Get existing role-permission associations
    const existingRolePerms = await base44.asServiceRole.entities.RolePermission.filter({
      role_id: adminRoleId
    });
    const existingAssociations = new Set(
      existingRolePerms.map(rp => rp.permission_id)
    );

    // Step 1: Create missing modules
    for (const moduleDef of moduleDefinitions) {
      const existing = allModules.find(m => m.key === moduleDef.key);
      
      if (existing) {
        results.modulesSkipped++;
        continue;
      }

      try {
        await base44.asServiceRole.entities.Module.create({
          key: moduleDef.key,
          name: moduleDef.name,
          icon: moduleDef.icon,
          section: moduleDef.section,
          order: moduleDef.order,
          is_active: true
        });
        results.modulesCreated++;
      } catch (err) {
        results.errors.push({
          action: 'create_module',
          module: moduleDef.key,
          error: err.message
        });
      }
    }

    // Step 2: Create missing permissions and assign to Administrador
    for (const moduleDef of moduleDefinitions) {
      for (const action of actions) {
        const permissionKey = `${moduleDef.key}.${action}`;

        // Check if permission already exists
        const existing = allPermissions.find(
          p => p.module_key === moduleDef.key && p.action === action
        );

        if (existing) {
          results.permissionsSkipped++;

          // Check if it's already assigned to Administrador
          if (!existingAssociations.has(existing.id)) {
            try {
              await base44.asServiceRole.entities.RolePermission.create({
                role_id: adminRoleId,
                permission_id: existing.id
              });
              results.permissionsAssigned++;
            } catch (err) {
              results.errors.push({
                action: 'assign',
                permission: permissionKey,
                error: err.message
              });
            }
          }
          continue;
        }

        // Create new permission
        try {
          const newPermission = await base44.asServiceRole.entities.Permission.create({
            module_key: moduleDef.key,
            action: action
          });

          results.permissionsCreated++;

          // Assign to Administrador
          try {
            await base44.asServiceRole.entities.RolePermission.create({
              role_id: adminRoleId,
              permission_id: newPermission.id
            });
            results.permissionsAssigned++;
          } catch (err) {
            results.errors.push({
              action: 'assign',
              permission: permissionKey,
              error: err.message
            });
          }
        } catch (err) {
          results.errors.push({
            action: 'create_permission',
            permission: permissionKey,
            error: err.message
          });
        }
      }
    }

    return Response.json({
      status: 'success',
      message: 'Modules and permissions added successfully',
      ...results,
      adminRoleId
    });
  } catch (error) {
    return Response.json(
      { error: error.message, status: 'error' },
      { status: 500 }
    );
  }
});