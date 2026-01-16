import React from 'react';
import { usePermissions } from './usePermissionsCorrect';
import { Button } from '@/components/ui/button';

export default function PermissionButton({ 
  children, 
  moduleKey, 
  action,
  ...props 
}) {
  const { hasPermission, canAccessModule } = usePermissions();

  const hasAccess = canAccessModule(moduleKey) && 
    (!action || hasPermission(moduleKey, action));

  return (
    <Button 
      disabled={!hasAccess}
      title={!hasAccess ? "No tienes permisos para esta acción" : ""}
      {...props}
    >
      {children}
    </Button>
  );
}