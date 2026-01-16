import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const newModules = [
      'calendar',
      'clients',
      'services',
      'talonarios',
      'supplier_payments',
      'stock_control',
      'checks',
      'income_statement',
      'analytics'
    ];

    const actions = ['view', 'create', 'edit', 'delete', 'approve'];

    const results = {
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

    // Get all existing permissions
    const allPermissions = await base44.asServiceRole.entities.Permission.list();
    const existingPermissionKeys = allPermissions.map(p => `${p.module_key}.${p.action}`);

    // Get all existing role-permission associations for Administrador
    const existingRolePerms = await base44.asServiceRole.entities.RolePermission.filter({
      role_id: adminRoleId
    });
    const existingAssociations = new Set(
      existingRolePerms.map(rp => rp.permission_id)
    );

    // Process each module
    for (const moduleKey of newModules) {
      for (const action of actions) {
        const permissionKey = `${moduleKey}.${action}`;

        // Check if permission already exists
        const existing = allPermissions.find(
          p => p.module_key === moduleKey && p.action === action
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
            module_key: moduleKey,
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
            action: 'create',
            permission: permissionKey,
            error: err.message
          });
        }
      }
    }

    return Response.json({
      status: 'success',
      message: 'Missing modules added successfully',
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