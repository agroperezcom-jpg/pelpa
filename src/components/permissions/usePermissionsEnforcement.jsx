import { usePermissions } from './usePermissions';
import { useEffect } from 'react';

export function usePermissionsEnforcement() {
  const { 
    currentUser, 
    empleado, 
    rol, 
    isAdmin,
    hasPermission,
    canAccessModule,
    isLoading,
    debugInfo
  } = usePermissions();

  // Log all permission checks for debugging
  useEffect(() => {
    if (!isLoading) {
      console.log('📊 Permission enforcement debug:', {
        isAdmin,
        empleadoExists: !!empleado,
        empleadoStatus: empleado?.status,
        rolExists: !!rol,
        userAuthenticated: !!currentUser,
      });
    }
  }, [isLoading, isAdmin, empleado, rol, currentUser]);

  // Wrapper functions with admin bypass
  const canViewModule = (moduleKey) => {
    if (isAdmin) return true;
    if (empleado?.status !== 'active') return false;
    return canAccessModule(moduleKey);
  };

  const can = (moduleKey, action) => {
    if (isAdmin) return true;
    if (empleado?.status !== 'active') return false;
    return hasPermission(moduleKey, action);
  };

  return {
    isAdmin,
    isLoading,
    currentUser,
    empleado,
    rol,
    canViewModule,
    can,
    hasPermission,
    canAccessModule,
    debugInfo,
  };
}