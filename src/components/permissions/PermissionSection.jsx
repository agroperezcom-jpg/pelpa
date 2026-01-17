import React from "react";
import { usePermissionsEnforcement } from "@/components/permissions/usePermissionsEnforcement";

export default function PermissionSection({ 
  modulo, 
  accion = "view",
  children,
  fallback = null
}) {
  const { hasPermission, isLoading } = usePermissionsEnforcement();

  if (isLoading) {
    return fallback;
  }

  if (!hasPermission(modulo, accion)) {
    return fallback;
  }

  return <>{children}</>;
}