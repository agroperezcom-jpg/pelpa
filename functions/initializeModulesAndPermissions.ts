import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
    let errors = [];

    // 1. Create/sync Module records
    for (const mod of SIDEBAR_MODULES) {
      try {
        const existing = await base44.asServiceRole.entities.Module.filter({ key: mod.key });
        if (!existing || existing.length === 0) {
          await base44.asServiceRole.entities.Module.create({
            key: mod.key,
            name: mod.name,
            section: mod.section,
            page: mod.page,
            is_active: true
          });
          modulesCreated++;
        }
      } catch (error) {
        errors.push({ step: 'module', module: mod.key, error: error.message });
      }
    }

    // 2. Create Permission records (module_key + action combination)
    for (const mod of SIDEBAR_MODULES) {
      for (const action of ACTIONS) {
        try {
          const existing = await base44.asServiceRole.entities.Permission.filter({ 
            module_key: mod.key, 
            action: action 
          });
          if (!existing || existing.length === 0) {
            await base44.asServiceRole.entities.Permission.create({
              module_key: mod.key,
              action: action,
              description: `${action} en ${mod.name}`
            });
            permissionsCreated++;
          }
        } catch (error) {
          errors.push({ step: 'permission', module: mod.key, action, error: error.message });
        }
      }
    }

    // 3. Get Admin role
    const adminRoles = await base44.asServiceRole.entities.Role.filter({ name: 'Administrador' });
    const adminRole = adminRoles?.[0];

    if (adminRole) {
      // Delete existing role permissions for Admin
      const existingPerms = await base44.asServiceRole.entities.RolePermission.filter({ role_id: adminRole.id });
      for (const perm of existingPerms || []) {
        try {
          await base44.asServiceRole.entities.RolePermission.delete(perm.id);
        } catch (e) {
          // Silent
        }
      }

      // Get all permissions
      const allPermissions = await base44.asServiceRole.entities.Permission.list();

      // Assign all permissions to Admin role
      for (const permission of allPermissions || []) {
        try {
          await base44.asServiceRole.entities.RolePermission.create({
            role_id: adminRole.id,
            permission_id: permission.id,
            module_key: permission.module_key,
            action: permission.action
          });
          rolePermissionsCreated++;
        } catch (error) {
          errors.push({ step: 'rolePermission', module: permission.module_key, error: error.message });
        }
      }
    }

    return Response.json({
      status: 'success',
      message: 'Sistema de módulos y permisos inicializado correctamente',
      summary: {
        modulesCreated,
        permissionsCreated,
        rolePermissionsAssigned: rolePermissionsCreated,
        adminRoleId: adminRole?.id
      },
      errors: errors.length > 0 ? errors : null
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});