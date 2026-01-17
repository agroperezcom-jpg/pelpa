import React from 'react';
import { usePermissionsEnforcement } from './usePermissionsEnforcement';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

/**
 * PermissionGuard - Protege componentes basándose en permisos
 * Delega completamente en usePermissionsEnforcement
 */
export default function PermissionGuard({ children, moduleKey, action, fallback = null }) {
  const { canAccessModule, hasPermission, isLoading } = usePermissionsEnforcement();

  if (isLoading) {
    return null;
  }

  if (!canAccessModule(moduleKey)) {
    return fallback || (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No tienes permisos para acceder a este módulo.
        </AlertDescription>
      </Alert>
    );
  }

  if (action && !hasPermission(moduleKey, action)) {
    return fallback || (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No tienes permisos para realizar esta acción.
        </AlertDescription>
      </Alert>
    );
  }

  return children;
}