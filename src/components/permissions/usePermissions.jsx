import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export function usePermissions() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const { data: rolPermisos = [] } = useQuery({
    queryKey: ['rolPermisos', user?.rol_id],
    queryFn: async () => {
      if (!user?.rol_id) return [];
      return await base44.entities.RolPermiso.filter({ rol_id: user.rol_id });
    },
    enabled: !!user?.rol_id
  });

  const hasPermission = (modulo, accion) => {
    // Si el usuario está inactivo, no tiene permisos
    if (user?.activo === false) return false;

    // Si es admin de rol del sistema, tiene acceso a todo
    if (user?.role === 'admin') return true;

    // Si no tiene rol personalizado, solo puede ver dashboard y calendario
    if (!user?.rol_id) {
      return (modulo === 'calendario' || modulo === 'proyectos') && accion === 'VIEW';
    }

    // Verificar permiso específico
    const hasSpecific = rolPermisos.some(
      rp => rp.modulo === modulo && rp.accion === accion
    );

    // Si tiene permiso ADMIN del módulo, tiene todos los permisos
    const hasAdminModule = rolPermisos.some(
      rp => rp.modulo === modulo && rp.accion === 'ADMIN'
    );

    return hasSpecific || hasAdminModule;
  };

  const getModulePermissions = (modulo) => {
    if (user?.role === 'admin') {
      return ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'CONFIRM', 'PAY', 'ANNUL', 'REPORT', 'CLOSE_PERIOD', 'ADMIN'];
    }

    const permisos = rolPermisos
      .filter(rp => rp.modulo === modulo)
      .map(rp => rp.accion);

    return permisos;
  };

  const getAllowedModules = () => {
    // Si el usuario está inactivo, no permitir nada excepto ver su perfil
    if (user?.activo === false) {
      return [];
    }

    // Si es admin de rol del sistema, tiene acceso a todo
    if (user?.role === 'admin') {
      return ['ventas', 'presupuestos', 'compras', 'inventario', 'productos', 'tesoreria', 'cheques', 
              'proyectos', 'calendario', 'clientes', 'proveedores', 'gastos', 'analytics', 
              'tablero_fiscal', 'iva_mensual', 'ingresos_brutos', 'talonarios', 'configuracion', 'usuarios'];
    }

    // Obtener módulos únicos de los permisos del rol
    const modulos = [...new Set(rolPermisos.map(rp => rp.modulo))];
    return modulos;
  };

  return {
    user,
    loading,
    hasPermission,
    getModulePermissions,
    getAllowedModules,
    isAdmin: user?.role === 'admin',
    isActive: user?.activo !== false
  };
}