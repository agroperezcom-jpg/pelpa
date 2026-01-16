import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Estructura del sidebar (fuente de verdad)
    const SIDEBAR_MODULES = [
      { key: 'dashboard', name: 'Dashboard', section: 'General', page: 'Dashboard', icon_name: 'LayoutDashboard', order: 0 },
      
      // Ventas
      { key: 'sales', name: 'Ventas', section: 'Ventas', page: 'Sales', icon_name: 'ShoppingCart', order: 1 },
      { key: 'presupuestos', name: 'Presupuestos', section: 'Ventas', page: 'Presupuestos', icon_name: 'FileText', order: 2 },
      { key: 'clients', name: 'Clientes', section: 'Ventas', page: 'Clients', icon_name: 'Users', order: 3 },
      { key: 'services', name: 'Servicios', section: 'Ventas', page: 'Services', icon_name: 'Wrench', order: 4 },
      { key: 'talonarios', name: 'Talonarios', section: 'Ventas', page: 'Talonarios', icon_name: 'FileCheck', order: 5 },

      // Compras
      { key: 'purchases', name: 'Compras', section: 'Compras', page: 'Purchases', icon_name: 'ShoppingBag', order: 6 },
      { key: 'suppliers', name: 'Proveedores', section: 'Compras', page: 'Proveedores', icon_name: 'Building2', order: 7 },
      { key: 'supplier_payments', name: 'Pagos Proveedores', section: 'Compras', page: 'PagosProveedores', icon_name: 'CreditCard', order: 8 },

      // Inventario
      { key: 'products', name: 'Productos', section: 'Inventario', page: 'Products', icon_name: 'Package', order: 9 },
      { key: 'inventory', name: 'Inventario', section: 'Inventario', page: 'Inventory', icon_name: 'Check', order: 10 },
      { key: 'stock_control', name: 'Control de Stock', section: 'Inventario', page: 'HistorialControlesStock', icon_name: 'ClipboardList', order: 11 },

      // Proyectos
      { key: 'projects', name: 'Proyectos', section: 'Proyectos', page: 'Projects', icon_name: 'Briefcase', order: 12 },
      { key: 'work_orders', name: 'Órdenes de Trabajo', section: 'Proyectos', page: 'WorkOrders', icon_name: 'Briefcase', order: 13 },

      // Agenda/Calendario
      { key: 'calendar', name: 'Calendario', section: 'Agenda', page: 'Calendar', icon_name: 'Calendar', order: 14 },

      // Finanzas
      { key: 'treasury', name: 'Tesorería', section: 'Finanzas', page: 'TesoreriaV2', icon_name: 'Landmark', order: 15 },
      { key: 'checks', name: 'Cheques', section: 'Finanzas', page: 'Cheques', icon_name: 'CreditCard', order: 16 },
      { key: 'expenses', name: 'Gastos', section: 'Finanzas', page: 'Expenses', icon_name: 'DollarSign', order: 17 },
      { key: 'financials', name: 'Finanzas', section: 'Finanzas', page: 'FinanzasHub', icon_name: 'BarChart3', order: 18 },
      { key: 'income_statement', name: 'Estado de Resultados', section: 'Finanzas', page: 'EstadoResultados', icon_name: 'FileText', order: 19 },
      { key: 'analytics', name: 'Analytics', section: 'Finanzas', page: 'Analytics', icon_name: 'TrendingUp', order: 20 },

      // Sistema
      { key: 'settings', name: 'Configuración', section: 'Sistema', page: 'Settings', icon_name: 'Settings', order: 21 }
    ];

    // Obtener módulos existentes en BD
    const existingModules = await base44.asServiceRole.entities.Module.list();

    let created = 0;
    let updated = 0;
    let errors = [];

    // Sincronizar cada módulo
    for (const mod of SIDEBAR_MODULES) {
      try {
        const existing = existingModules.find(m => m.key === mod.key);
        
        if (existing) {
          // Actualizar si cambió algo
          await base44.asServiceRole.entities.Module.update(existing.id, {
            name: mod.name,
            section: mod.section,
            page: mod.page,
            icon_name: mod.icon_name,
            order: mod.order,
            is_active: true
          });
          updated++;
        } else {
          // Crear nuevo
          await base44.asServiceRole.entities.Module.create({
            key: mod.key,
            name: mod.name,
            section: mod.section,
            page: mod.page,
            icon_name: mod.icon_name,
            order: mod.order,
            is_active: true
          });
          created++;
        }
      } catch (error) {
        errors.push({ module: mod.key, error: error.message });
      }
    }

    return Response.json({
      status: 'success',
      message: 'Módulos sincronizados correctamente',
      created,
      updated,
      errors: errors.length > 0 ? errors : null
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});