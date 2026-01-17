import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * ÚNICA FUENTE DE VERDAD PARA PERMISOS
 * 
 * Sistema unificado de permisos basado EXCLUSIVAMENTE en role_id + permisos asignados.
 * NO existe lógica especial para admin, superadmin o auth.role.
 * 
 * Contrato:
 * - module_key: minúsculas (calendario, ventas, configuraciones)
 * - action: ver | crear | editar | eliminar | aprobar
 */
export function usePermissionsEnforcement() {
  // Step 1: Get current user
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: 1,
  });

  // Step 2: Get Empleado by user_id
  const { data: empleado, isLoading: empleadoLoading } = useQuery({
    queryKey: ['empleado', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      try {
        const empleados = await base44.entities.Empleado.filter({ user_id: currentUser.id });
        return empleados?.[0] || null;
      } catch (err) {
        console.error('❌ Error fetching empleado:', err);
        return null;
      }
    },
    enabled: !!currentUser?.id,
  });

  // Step 3: Get Rol
  const { data: rol, isLoading: rolLoading } = useQuery({
    queryKey: ['rol', empleado?.role_id],
    queryFn: async () => {
      if (!empleado?.role_id) return null;
      try {
        return await base44.entities.Role.get(empleado.role_id);
      } catch (err) {
        console.error('❌ Error fetching rol:', err);
        return null;
      }
    },
    enabled: !!empleado?.role_id,
  });

  // Step 4: Get Permisos (RolePermissions + Permission data)
  const { data: rawPermisos = [], isLoading: permisosLoading } = useQuery({
    queryKey: ['rolePermissions', rol?.id],
    queryFn: async () => {
      if (!rol?.id) return [];
      try {
        const rolePerms = await base44.entities.RolePermission.filter({ role_id: rol.id });
        if (!rolePerms?.length) return [];

        // Fetch Permission data for each RolePermission
        const permissionsData = await Promise.all(
          rolePerms.map(rp => base44.entities.Permission.get(rp.permission_id).catch(() => null))
        );

        return permissionsData.filter(p => p !== null);
      } catch (err) {
        console.error('❌ Error fetching permissions:', err);
        return [];
      }
    },
    enabled: !!rol?.id,
  });

  // Transform permisos to usable map (normalizar a minúsculas)
  const permisosMap = rawPermisos.reduce((acc, p) => {
    if (p?.module_key && p?.action) {
      const normalizedKey = `${p.module_key.toLowerCase()}.${p.action.toLowerCase()}`;
      acc[normalizedKey] = true;
    }
    return acc;
  }, {});

  // Loading state
  const isLoading = userLoading || empleadoLoading || rolLoading || permisosLoading;

  /**
   * Verifica si el usuario tiene un permiso específico
   * @param {string} moduleKey - Identificador del módulo (ej: 'calendario', 'ventas')
   * @param {string} action - Acción del permiso (ej: 'ver', 'crear', 'editar', 'eliminar')
   * @returns {boolean}
   */
  const hasPermission = (moduleKey, action) => {
    if (empleado?.status !== 'active') return false;
    const normalizedKey = `${moduleKey.toLowerCase()}.${action.toLowerCase()}`;
    return !!permisosMap[normalizedKey];
  };

  /**
   * Verifica si el usuario puede acceder a un módulo (cualquier permiso)
   * @param {string} moduleKey - Identificador del módulo
   * @returns {boolean}
   */
  const canAccessModule = (moduleKey) => {
    if (empleado?.status !== 'active') return false;
    const normalizedModule = moduleKey.toLowerCase();
    return Object.keys(permisosMap).some(key => key.startsWith(normalizedModule + '.'));
  };

  /**
   * Verifica si el usuario puede ver un módulo (permiso 'ver')
   * @param {string} moduleKey - Identificador del módulo
   * @returns {boolean}
   */
  const canViewModule = (moduleKey) => {
    return hasPermission(moduleKey, 'ver');
  };

  // Alias para compatibilidad
  const can = hasPermission;

  // Debug info
  const debugInfo = {
    user: currentUser?.email,
    userId: currentUser?.id,
    empleado: empleado?.full_name,
    empleadoId: empleado?.id,
    empleadoStatus: empleado?.status,
    rolId: rol?.id,
    rolName: rol?.name,
    permissionsCount: rawPermisos.length,
  };

  // Logs centralizados de debugging (solo cuando se completa la carga)
  React.useEffect(() => {
    if (!isLoading) {
      const accessibleModules = Object.keys(permisosMap)
        .map(key => key.split('.')[0])
        .filter((module, index, self) => self.indexOf(module) === index);

      console.group('🔐 PERMISOS DEL USUARIO');
      console.log('👤 Usuario:', currentUser?.email || 'No autenticado');
      console.log('👔 Empleado:', empleado?.full_name || 'No vinculado', empleado?.status ? `(${empleado.status})` : '');
      console.log('🎭 Rol:', rol?.name || 'Sin rol asignado');
      console.log('📊 Permisos totales:', rawPermisos.length);
      console.log('📦 Módulos accesibles:', accessibleModules.length > 0 ? accessibleModules.join(', ') : 'Ninguno');
      
      if (rawPermisos.length > 0) {
        console.log('📋 Detalle de permisos:', permisosMap);
      }
      
      console.groupEnd();
    }
  }, [isLoading, currentUser, empleado, rol, rawPermisos, permisosMap]);

  return {
    isLoading,
    currentUser,
    empleado,
    rol,
    permisos: permisosMap,
    hasPermission,
    can,
    canAccessModule,
    canViewModule,
    debugInfo,
  };
}