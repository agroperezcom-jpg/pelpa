import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function usePermissions() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: 1,
  });

  const { data: empleado } = useQuery({
    queryKey: ['empleado', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const empleados = await base44.entities.Empleado.filter({ email: currentUser.email });
      return empleados?.[0] || null;
    },
    enabled: !!currentUser?.email,
  });

  const { data: rol } = useQuery({
    queryKey: ['rol', empleado?.role_id],
    queryFn: () => base44.entities.Role.get(empleado.role_id),
    enabled: !!empleado?.role_id,
  });

  const { data: permisos = [] } = useQuery({
    queryKey: ['permisos', rol?.id],
    queryFn: async () => {
      if (!rol?.id) return [];
      const rolePermisos = await base44.entities.RolePermission.filter({ role_id: rol.id });
      return rolePermisos || [];
    },
    enabled: !!rol?.id,
  });

  const hasPermission = (moduleKey, action) => {
    return permisos.some(
      (p) => p.module_key === moduleKey && p.action === action
    );
  };

  const canAccessModule = (moduleKey) => {
    return permisos.some((p) => p.module_key === moduleKey);
  };

  return {
    currentUser,
    empleado,
    rol,
    permisos,
    hasPermission,
    canAccessModule,
  };
}