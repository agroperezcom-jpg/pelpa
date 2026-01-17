import React from 'react';
import { usePermissionsEnforcement } from './usePermissionsEnforcement';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

/**
 * PermissionGuard - Protege componentes basándose EXCLUSIVAMENTE en permisos
 * Sin bypass para admin, sin lógica especial
 */
export default function PermissionGuard({ children, moduleKey, action = 'ver', fallback = null }) {
  const { hasPermission, isLoading } = usePermissionsEnforcement();

  if (isLoading) {
    return null;
  }

  // Verificación estricta de permisos
  if (!hasPermission(moduleKey, action)) {
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