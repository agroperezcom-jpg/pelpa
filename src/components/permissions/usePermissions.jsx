import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function usePermissions() {
  // Step 1: Get current user
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: 1,
  });

  // Step 2: Get Empleado by user_id (NOT email)
  const { data: empleado, isLoading: empleadoLoading } = useQuery({
    queryKey: ['empleado', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      try {
        const empleados = await base44.entities.Empleado.filter({ user_id: currentUser.id });
        const emp = empleados?.[0] || null;
        console.log('🔍 Empleado lookup:', { user_id: currentUser.id, found: !!emp });
        return emp;
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
        const roleData = await base44.entities.Role.get(empleado.role_id);
        console.log('🔍 Rol lookup:', { role_id: empleado.role_id, found: !!roleData });
        return roleData;
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
        if (!rolePerms?.length) {
          console.log('🔍 Permisos lookup:', { role_id: rol.id, count: 0 });
          return [];
        }

        // Fetch Permission data for each RolePermission
        const permissionsData = await Promise.all(
          rolePerms.map(rp => base44.entities.Permission.get(rp.permission_id).catch(() => null))
        );

        const validPermisos = permissionsData.filter(p => p !== null);
        console.log('🔍 Permisos lookup:', { role_id: rol.id, count: validPermisos.length });
        return validPermisos;
      } catch (err) {
        console.error('❌ Error fetching permissions:', err);
        return [];
      }
    },
    enabled: !!rol?.id,
  });

  // Transform permisos to usable map
  const permisos = rawPermisos.reduce((acc, p) => {
    if (p?.module_key && p?.action) {
      const key = `${p.module_key}.${p.action}`;
      acc[key] = true;
    }
    return acc;
  }, {});

  // Helper: Check if user has specific permission
  const hasPermission = (moduleKey, action) => {
    const key = `${moduleKey}.${action}`;
    return !!permisos[key];
  };

  // Helper: Check if user can access module
  const canAccessModule = (moduleKey) => {
    return Object.keys(permisos).some(key => key.startsWith(moduleKey + '.'));
  };

  // Check if user is admin (global access)
  const isAdmin = currentUser?.role === 'admin';

  // Loading state
  const isLoading = userLoading || empleadoLoading || rolLoading || permisosLoading;

  // Debug helper
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

  console.log('🔐 Permissions chain:', debugInfo);

  return {
    currentUser,
    empleado,
    rol,
    permisos,
    hasPermission,
    canAccessModule,
    isAdmin,
    isLoading,
    debugInfo,
  };
}