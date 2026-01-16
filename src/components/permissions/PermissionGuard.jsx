import React from 'react';
import { usePermissions } from './usePermissionsCorrect';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function PermissionGuard({ children, moduleKey, action, fallback = null }) {
  const { hasPermission, canAccessModule } = usePermissions();

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