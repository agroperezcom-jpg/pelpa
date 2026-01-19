import React from "react";
import { usePermissionsEnforcement } from "@/components/permissions/usePermissionsEnforcement";

export default function PermissionSection({ 
  modulo, 
  accion = "VIEW",
  children,
  fallback = null
}) {
  const { hasPermission, isLoading, isAdmin } = usePermissionsEnforcement();

  if (isLoading) {
    return fallback;
  }

  if (!hasPermission(modulo, accion)) {
    return fallback;
  }

  return <>{children}</>;
}