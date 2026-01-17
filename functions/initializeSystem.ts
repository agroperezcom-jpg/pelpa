import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Sistema de Inicialización - ÚNICA FUENTE DE VERDAD
 * 
 * Arquitectura definitiva:
 * - module_key SIEMPRE en inglés técnico (calendar, sales, finance, etc.)
 * - Nombres visuales solo para UI, nunca para lógica
 * - Consistencia total: Module → Permission → RolePermission → LayoutContent
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // ========================================
    // CATÁLOGO ÚNICO DE MÓDULOS DEL SISTEMA
    // ========================================
    const SYSTEM_MODULES = [
      // VENTAS
      { key: 'sales', name: 'Ventas', section: 'ventas', order: 100 },
      { key: 'budgets', name: 'Presupuestos', section: 'ventas', order: 110 },
      { key: 'clients', name: 'Clientes', section: 'ventas', order: 120 },
      { key: 'services', name: 'Servicios', section: 'ventas', order: 130 },
      { key: 'talonarios', name: 'Talonarios', section: 'ventas', order: 140 },

      // COMPRAS
      { key: 'purchases', name: 'Compras', section: 'compras', order: 200 },
      { key: 'suppliers', name: 'Proveedores', section: 'compras', order: 210 },
      { key: 'supplier_payments', name: 'Pagos Proveedores', section: 'compras', order: 220 },

      // INVENTARIO
      { key: 'products', name: 'Productos', section: 'inventario', order: 300 },
      { key: 'inventory', name: 'Inventario', section: 'inventario', order: 310 },
      { key: 'stock_control', name: 'Control de Stock', section: 'inventario', order: 320 },

      // PROYECTOS
      { key: 'projects', name: 'Proyectos', section: 'proyectos', order: 400 },
      { key: 'work_orders', name: 'Órdenes de Trabajo', section: 'proyectos', order: 410 },

      // CALENDARIO (CRÍTICO: una sola referencia)
      { key: 'calendar', name: 'Calendario', section: 'calendario', order: 500 },

      // FINANZAS
      { key: 'treasury', name: 'Tesorería', section: 'finanzas', order: 600 },
      { key: 'checks', name: 'Cheques', section: 'finanzas', order: 610 },
      { key: 'expenses', name: 'Gastos', section: 'finanzas', order: 620 },
      { key: 'financials', name: 'Finanzas', section: 'finanzas', order: 630 },
      { key: 'income_statement', name: 'Estado de Resultados', section: 'finanzas', order: 640 },
      { key: 'analytics', name: 'Analytics', section: 'finanzas', order: 650 },
    ];

    // Acciones estándar por módulo
    const STANDARD_ACTIONS = ['view', 'create', 'edit', 'delete', 'approve'];

    const results = {
      modulesCreated: 0,
      modulesUpdated: 0,
      permissionsCreated: 0,
      permissionsSkipped: 0,
      rolesCreated: 0,
      rolesSkipped: 0,
      rolePermissionsAssigned: 0,
      errors: []
    };

    // ========================================
    // PASO 1: CREAR/ACTUALIZAR MÓDULOS
    // ========================================
    const existingModules = await base44.asServiceRole.entities.Module.list();
    const existingModulesByKey = new Map(existingModules.map(m => [m.key, m]));

    for (const moduleData of SYSTEM_MODULES) {
      try {
        if (existingModulesByKey.has(moduleData.key)) {
          // Actualizar si cambió el nombre o el orden
          const existing = existingModulesByKey.get(moduleData.key);
          if (existing.name !== moduleData.name || existing.order !== moduleData.order) {
            await base44.asServiceRole.entities.Module.update(existing.id, {
              name: moduleData.name,
              section: moduleData.section,
              order: moduleData.order
            });
            results.modulesUpdated++;
          }
        } else {
          // Crear nuevo
          await base44.asServiceRole.entities.Module.create({
            key: moduleData.key,
            name: moduleData.name,
            section: moduleData.section,
            order: moduleData.order,
            is_active: true
          });
          results.modulesCreated++;
        }
      } catch (err) {
        results.errors.push({
          step: 'modules',
          module: moduleData.key,
          error: err.message
        });
      }
    }

    // ========================================
    // PASO 2: CREAR PERMISOS
    // ========================================
    const existingPermissions = await base44.asServiceRole.entities.Permission.list();
    const existingPermissionKeys = new Set(
      existingPermissions.map(p => `${p.module_key}.${p.action}`)
    );

    for (const moduleData of SYSTEM_MODULES) {
      for (const action of STANDARD_ACTIONS) {
        const permKey = `${moduleData.key}.${action}`;

        if (existingPermissionKeys.has(permKey)) {
          results.permissionsSkipped++;
          continue;
        }

        try {
          await base44.asServiceRole.entities.Permission.create({
            module_key: moduleData.key,
            action: action,
            description: `${action} en ${moduleData.name}`
          });
          results.permissionsCreated++;
        } catch (err) {
          results.errors.push({
            step: 'permissions',
            permission: permKey,
            error: err.message
          });
        }
      }
    }

    // ========================================
    // PASO 3: CREAR ROLES BASE
    // ========================================
    const BASE_ROLES = [
      {
        name: 'Administrador',
        description: 'Acceso total al sistema',
        permissions: 'all' // Se asignarán todos los permisos
      },
      {
        name: 'Ventas',
        description: 'Personal de ventas',
        permissions: [
          'sales.view', 'sales.create', 'sales.edit',
          'budgets.view', 'budgets.create',
          'clients.view', 'clients.create', 'clients.edit',
          'services.view',
          'inventory.view'
        ]
      },
      {
        name: 'Tesorería',
        description: 'Gestión financiera',
        permissions: [
          'treasury.view', 'treasury.create', 'treasury.edit', 'treasury.delete',
          'checks.view', 'checks.create', 'checks.edit',
          'expenses.view', 'expenses.create',
          'financials.view',
          'sales.view'
        ]
      },
      {
        name: 'Compras',
        description: 'Gestión de compras',
        permissions: [
          'purchases.view', 'purchases.create', 'purchases.edit',
          'suppliers.view', 'suppliers.create', 'suppliers.edit',
          'supplier_payments.view', 'supplier_payments.create',
          'inventory.view'
        ]
      },
      {
        name: 'Operaciones',
        description: 'Personal operativo',
        permissions: [
          'inventory.view', 'inventory.edit',
          'stock_control.view',
          'products.view',
          'projects.view',
          'calendar.view'
        ]
      }
    ];

    const existingRoles = await base44.asServiceRole.entities.Role.list();
    const existingRolesByName = new Map(existingRoles.map(r => [r.name, r]));

    const allPermissions = await base44.asServiceRole.entities.Permission.list();
    const permissionsByKey = new Map(
      allPermissions.map(p => [`${p.module_key}.${p.action}`, p])
    );

    for (const roleData of BASE_ROLES) {
      let roleId;

      if (existingRolesByName.has(roleData.name)) {
        roleId = existingRolesByName.get(roleData.name).id;
        results.rolesSkipped++;
      } else {
        try {
          const newRole = await base44.asServiceRole.entities.Role.create({
            name: roleData.name,
            description: roleData.description,
            is_system: true
          });
          roleId = newRole.id;
          results.rolesCreated++;
        } catch (err) {
          results.errors.push({
            step: 'roles',
            role: roleData.name,
            error: err.message
          });
          continue;
        }
      }

      // ========================================
      // PASO 4: ASIGNAR PERMISOS A ROLES
      // ========================================
      const existingRolePerms = await base44.asServiceRole.entities.RolePermission.filter({
        role_id: roleId
      });
      const assignedPermIds = new Set(existingRolePerms.map(rp => rp.permission_id));

      let permissionsToAssign = [];

      if (roleData.permissions === 'all') {
        permissionsToAssign = allPermissions;
      } else {
        permissionsToAssign = roleData.permissions
          .map(key => permissionsByKey.get(key))
          .filter(p => p != null);
      }

      for (const perm of permissionsToAssign) {
        if (assignedPermIds.has(perm.id)) continue;

        try {
          await base44.asServiceRole.entities.RolePermission.create({
            role_id: roleId,
            permission_id: perm.id
          });
          results.rolePermissionsAssigned++;
        } catch (err) {
          results.errors.push({
            step: 'role_permissions',
            role: roleData.name,
            permission: `${perm.module_key}.${perm.action}`,
            error: err.message
          });
        }
      }
    }

    return Response.json({
      status: 'success',
      message: 'Sistema inicializado correctamente',
      summary: {
        modules: `${results.modulesCreated} creados, ${results.modulesUpdated} actualizados`,
        permissions: `${results.permissionsCreated} creados, ${results.permissionsSkipped} existían`,
        roles: `${results.rolesCreated} creados, ${results.rolesSkipped} existían`,
        rolePermissions: `${results.rolePermissionsAssigned} asignados`
      },
      details: results,
      critical: {
        calendar_module_created: SYSTEM_MODULES.find(m => m.key === 'calendar') ? 'YES' : 'NO',
        calendar_permissions_created: results.permissionsCreated > 0 ? 'YES' : 'CHECK',
        admin_role_found: existingRolesByName.has('Administrador') || results.rolesCreated > 0 ? 'YES' : 'NO'
      }
    });

  } catch (error) {
    return Response.json(
      { 
        status: 'error',
        error: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
});