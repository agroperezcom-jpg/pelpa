import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * RESET COMPLETO DEL SISTEMA DE PERMISOS
 * 
 * Este endpoint hace borrón y cuenta nueva:
 * 1. Elimina todos los RolePermission
 * 2. Elimina todos los Permission
 * 3. Elimina todos los Role
 * 4. Elimina todos los Module
 * 5. Recrea todo desde cero
 * 6. Asigna rol ADMIN al usuario actual
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const results = {
      deleted: {
        rolePermissions: 0,
        permissions: 0,
        roles: 0,
        modules: 0,
        empleados: 0
      },
      created: {
        modules: 0,
        permissions: 0,
        roles: 0,
        rolePermissions: 0,
        adminEmpleado: false
      },
      errors: []
    };

    // ========================================
    // PASO 1: LIMPIAR TODO
    // ========================================
    
    // 1.1 Eliminar RolePermission
    const allRolePerms = await base44.asServiceRole.entities.RolePermission.list();
    for (const rp of allRolePerms) {
      try {
        await base44.asServiceRole.entities.RolePermission.delete(rp.id);
        results.deleted.rolePermissions++;
      } catch (err) {
        results.errors.push({ step: 'delete_rolepermission', id: rp.id, error: err.message });
      }
    }

    // 1.2 Eliminar Permission
    const allPerms = await base44.asServiceRole.entities.Permission.list();
    for (const p of allPerms) {
      try {
        await base44.asServiceRole.entities.Permission.delete(p.id);
        results.deleted.permissions++;
      } catch (err) {
        results.errors.push({ step: 'delete_permission', id: p.id, error: err.message });
      }
    }

    // 1.3 Eliminar Role
    const allRoles = await base44.asServiceRole.entities.Role.list();
    for (const r of allRoles) {
      try {
        await base44.asServiceRole.entities.Role.delete(r.id);
        results.deleted.roles++;
      } catch (err) {
        results.errors.push({ step: 'delete_role', id: r.id, error: err.message });
      }
    }

    // 1.4 Eliminar Module
    const allModules = await base44.asServiceRole.entities.Module.list();
    for (const m of allModules) {
      try {
        await base44.asServiceRole.entities.Module.delete(m.id);
        results.deleted.modules++;
      } catch (err) {
        results.errors.push({ step: 'delete_module', id: m.id, error: err.message });
      }
    }

    // 1.5 Resetear empleados (quitar role_id inválido)
    const allEmpleados = await base44.asServiceRole.entities.Empleado.list();
    for (const emp of allEmpleados) {
      if (emp.role_id) {
        try {
          await base44.asServiceRole.entities.Empleado.update(emp.id, { role_id: null });
          results.deleted.empleados++;
        } catch (err) {
          results.errors.push({ step: 'reset_empleado', id: emp.id, error: err.message });
        }
      }
    }

    // ========================================
    // PASO 2: RECREAR TODO DESDE CERO
    // ========================================

    // CATÁLOGO ÚNICO DE MÓDULOS
    const SYSTEM_MODULES = [
      // VENTAS
      { key: 'sales', name: 'Ventas', icon: 'ShoppingCart', section: 'ventas', order: 100 },
      { key: 'budgets', name: 'Presupuestos', icon: 'FileText', section: 'ventas', order: 110 },
      { key: 'clients', name: 'Clientes', icon: 'Users', section: 'ventas', order: 120 },
      { key: 'services', name: 'Servicios', icon: 'Wrench', section: 'ventas', order: 130 },
      { key: 'talonarios', name: 'Talonarios', icon: 'FileCheck', section: 'ventas', order: 140 },

      // COMPRAS
      { key: 'purchases', name: 'Compras', icon: 'ShoppingBag', section: 'compras', order: 200 },
      { key: 'suppliers', name: 'Proveedores', icon: 'Building2', section: 'compras', order: 210 },
      { key: 'supplier_payments', name: 'Pagos Proveedores', icon: 'CreditCard', section: 'compras', order: 220 },

      // INVENTARIO
      { key: 'products', name: 'Productos', icon: 'Package', section: 'inventario', order: 300 },
      { key: 'inventory', name: 'Inventario', icon: 'Check', section: 'inventario', order: 310 },
      { key: 'stock_control', name: 'Control de Stock', icon: 'ClipboardList', section: 'inventario', order: 320 },

      // PROYECTOS
      { key: 'projects', name: 'Proyectos', icon: 'Briefcase', section: 'proyectos', order: 400 },
      { key: 'work_orders', name: 'Órdenes de Trabajo', icon: 'Briefcase', section: 'proyectos', order: 410 },

      // CALENDARIO (CRÍTICO)
      { key: 'calendar', name: 'Calendario', icon: 'Calendar', section: 'calendario', order: 500 },

      // FINANZAS
      { key: 'treasury', name: 'Tesorería', icon: 'Landmark', section: 'finanzas', order: 600 },
      { key: 'checks', name: 'Cheques', icon: 'CreditCard', section: 'finanzas', order: 610 },
      { key: 'expenses', name: 'Gastos', icon: 'DollarSign', section: 'finanzas', order: 620 },
      { key: 'financials', name: 'Finanzas', icon: 'BarChart3', section: 'finanzas', order: 630 },
      { key: 'income_statement', name: 'Estado de Resultados', icon: 'FileText', section: 'finanzas', order: 640 },
      { key: 'analytics', name: 'Analytics', icon: 'TrendingUp', section: 'finanzas', order: 650 },
    ];

    const STANDARD_ACTIONS = ['view', 'create', 'edit', 'delete', 'approve'];

    // 2.1 Crear Módulos
    for (const moduleData of SYSTEM_MODULES) {
      try {
        await base44.asServiceRole.entities.Module.create({
          key: moduleData.key,
          name: moduleData.name,
          icon: moduleData.icon,
          section: moduleData.section,
          order: moduleData.order,
          is_active: true
        });
        results.created.modules++;
      } catch (err) {
        results.errors.push({ step: 'create_module', module: moduleData.key, error: err.message });
      }
    }

    // 2.2 Crear Permisos
    const createdPermissions = [];
    for (const moduleData of SYSTEM_MODULES) {
      for (const action of STANDARD_ACTIONS) {
        try {
          const perm = await base44.asServiceRole.entities.Permission.create({
            module_key: moduleData.key,
            action: action,
            description: `${action} en ${moduleData.name}`
          });
          createdPermissions.push(perm);
          results.created.permissions++;
        } catch (err) {
          results.errors.push({ 
            step: 'create_permission', 
            permission: `${moduleData.key}.${action}`, 
            error: err.message 
          });
        }
      }
    }

    // 2.3 Crear Roles Base
    const BASE_ROLES = [
      {
        name: 'Administrador',
        description: 'Acceso total al sistema',
        permissions: 'all'
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

    const permissionsByKey = new Map(
      createdPermissions.map(p => [`${p.module_key}.${p.action}`, p])
    );

    let adminRoleId = null;

    for (const roleData of BASE_ROLES) {
      try {
        const newRole = await base44.asServiceRole.entities.Role.create({
          name: roleData.name,
          description: roleData.description,
          is_system: true
        });
        results.created.roles++;

        if (roleData.name === 'Administrador') {
          adminRoleId = newRole.id;
        }

        // 2.4 Asignar permisos al rol
        let permissionsToAssign = [];

        if (roleData.permissions === 'all') {
          permissionsToAssign = createdPermissions;
        } else {
          permissionsToAssign = roleData.permissions
            .map(key => permissionsByKey.get(key))
            .filter(p => p != null);
        }

        for (const perm of permissionsToAssign) {
          try {
            await base44.asServiceRole.entities.RolePermission.create({
              role_id: newRole.id,
              permission_id: perm.id
            });
            results.created.rolePermissions++;
          } catch (err) {
            results.errors.push({
              step: 'assign_permission',
              role: roleData.name,
              permission: `${perm.module_key}.${perm.action}`,
              error: err.message
            });
          }
        }
      } catch (err) {
        results.errors.push({ step: 'create_role', role: roleData.name, error: err.message });
      }
    }

    // ========================================
    // PASO 3: ASIGNAR ROL ADMIN AL USUARIO ACTUAL
    // ========================================
    if (adminRoleId) {
      try {
        // Buscar empleado del usuario actual
        const empleados = await base44.asServiceRole.entities.Empleado.filter({
          user_email: user.email
        });

        if (empleados.length > 0) {
          await base44.asServiceRole.entities.Empleado.update(empleados[0].id, {
            role_id: adminRoleId,
            role_name: 'Administrador'
          });
          results.created.adminEmpleado = true;
        } else {
          // Crear empleado si no existe
          await base44.asServiceRole.entities.Empleado.create({
            user_email: user.email,
            nombre: user.full_name || user.email,
            role_id: adminRoleId,
            role_name: 'Administrador',
            is_active: true
          });
          results.created.adminEmpleado = true;
        }
      } catch (err) {
        results.errors.push({ step: 'assign_admin_role', error: err.message });
      }
    }

    return Response.json({
      status: 'success',
      message: '🔥 Sistema completamente reseteado y reconstruido',
      summary: {
        deleted: `${results.deleted.rolePermissions + results.deleted.permissions + results.deleted.roles + results.deleted.modules + results.deleted.empleados} registros eliminados`,
        created: `${results.created.modules} módulos, ${results.created.permissions} permisos, ${results.created.roles} roles`,
        assignments: `${results.created.rolePermissions} asignaciones, admin asignado: ${results.created.adminEmpleado ? 'SÍ' : 'NO'}`
      },
      details: results,
      critical_checks: {
        calendar_module: SYSTEM_MODULES.find(m => m.key === 'calendar') ? '✅' : '❌',
        admin_role: adminRoleId ? '✅' : '❌',
        current_user_admin: results.created.adminEmpleado ? '✅' : '❌'
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