import React from "react";
import { usePermissions } from "@/components/permissions/usePermissions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";

export default function PermissionGuard({ modulo, accion, children, fallback = null, hideOnNoPermission = false }) {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return fallback;
  }

  if (!hasPermission(modulo, accion)) {
    if (hideOnNoPermission) {
      return null;
    }

    return fallback || (
      <Alert className="border-red-200 bg-red-50">
        <Lock className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-sm text-red-700">
          No tiene permisos para acceder a esta función
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}