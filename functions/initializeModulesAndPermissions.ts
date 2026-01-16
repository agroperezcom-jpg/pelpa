import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const SIDEBAR_MODULES = [
      { key: 'dashboard', name: 'Dashboard', section: 'General', page: 'Dashboard' },
      { key: 'sales', name: 'Ventas', section: 'Ventas', page: 'Sales' },
      { key: 'presupuestos', name: 'Presupuestos', section: 'Ventas', page: 'Presupuestos' },
      { key: 'clients', name: 'Clientes', section: 'Ventas', page: 'Clients' },
      { key: 'services', name: 'Servicios', section: 'Ventas', page: 'Services' },
      { key: 'talonarios', name: 'Talonarios', section: 'Ventas', page: 'Talonarios' },
      { key: 'purchases', name: 'Compras', section: 'Compras', page: 'Purchases' },
      { key: 'suppliers', name: 'Proveedores', section: 'Compras', page: 'Proveedores' },
      { key: 'supplier_payments', name: 'Pagos Proveedores', section: 'Compras', page: 'PagosProveedores' },
      { key: 'products', name: 'Productos', section: 'Inventario', page: 'Products' },
      { key: 'inventory', name: 'Inventario', section: 'Inventario', page: 'Inventory' },
      { key: 'stock_control', name: 'Control de Stock', section: 'Inventario', page: 'HistorialControlesStock' },
      { key: 'projects', name: 'Proyectos', section: 'Proyectos', page: 'Projects' },
      { key: 'work_orders', name: 'Órdenes de Trabajo', section: 'Proyectos', page: 'WorkOrders' },
      { key: 'calendar', name: 'Calendario', section: 'Agenda', page: 'Calendar' },
      { key: 'treasury', name: 'Tesorería', section: 'Finanzas', page: 'TesoreriaV2' },
      { key: 'checks', name: 'Cheques', section: 'Finanzas', page: 'Cheques' },
      { key: 'expenses', name: 'Gastos', section: 'Finanzas', page: 'Expenses' },
      { key: 'financials', name: 'Finanzas', section: 'Finanzas', page: 'FinanzasHub' },
      { key: 'income_statement', name: 'Estado de Resultados', section: 'Finanzas', page: 'EstadoResultados' },
      { key: 'analytics', name: 'Analytics', section: 'Finanzas', page: 'Analytics' },
      { key: 'settings', name: 'Configuración', section: 'Sistema', page: 'Settings' }
    ];

    const ACTIONS = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'CONFIRM'];

    let modulesCreated = 0;
    let permissionsCreated = 0;
    let rolePermissionsCreated = 0;

    // Get all existing modules, permissions, and roles first
    const existingModules = await base44.asServiceRole.entities.Module.list();
    const existingPermissions = await base44.asServiceRole.entities.Permission.list();
    const adminRoles = await base44.asServiceRole.entities.Role.filter({ name: 'Administrador' });
    const adminRole = adminRoles?.[0];

    // 1. Create/sync Modules (with rate limit delay)
    for (const mod of SIDEBAR_MODULES) {
      try {
        const exists = existingModules.some(m => m.key === mod.key);
        if (!exists) {
          await base44.asServiceRole.entities.Module.create({
            key: mod.key,
            name: mod.name,
            section: mod.section,
            page: mod.page,
            is_active: true
          });
          modulesCreated++;
          await sleep(100);
        }
      } catch (error) {
        console.error(`Error creating module ${mod.key}:`, error.message);
      }
    }

    // 2. Create Permissions (with rate limit delay)
    const permissionsToCreate = [];
    for (const mod of SIDEBAR_MODULES) {
      for (const action of ACTIONS) {
        const exists = existingPermissions.some(p => p.module_key === mod.key && p.action === action);
        if (!exists) {
          permissionsToCreate.push({ module_key: mod.key, action, name: mod.name });
        }
      }
    }

    for (const perm of permissionsToCreate) {
      try {
        await base44.asServiceRole.entities.Permission.create({
          module_key: perm.module_key,
          action: perm.action,
          description: `${perm.action} en ${perm.name}`
        });
        permissionsCreated++;
        await sleep(100);
      } catch (error) {
        console.error(`Error creating permission ${perm.module_key}/${perm.action}:`, error.message);
      }
    }

    // 3. Assign all permissions to Admin role
    if (adminRole) {
      const allPerms = await base44.asServiceRole.entities.Permission.list();
      const existingRolePerms = await base44.asServiceRole.entities.RolePermission.list();

      for (const perm of allPerms || []) {
        try {
          const exists = existingRolePerms.some(rp => rp.role_id === adminRole.id && rp.permission_id === perm.id);
          if (!exists) {
            await base44.asServiceRole.entities.RolePermission.create({
              role_id: adminRole.id,
              permission_id: perm.id,
              module_key: perm.module_key,
              action: perm.action
            });
            rolePermissionsCreated++;
            await sleep(50);
          }
        } catch (error) {
          console.error(`Error assigning permission to admin:`, error.message);
        }
      }
    }

    return Response.json({
      status: 'success',
      message: 'Sistema sincronizado',
      summary: {
        modulesCreated,
        permissionsCreated,
        rolePermissionsAssigned: rolePermissionsCreated,
        adminRoleId: adminRole?.id
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});