import React from "react";
import { usePermissions } from "@/components/permissions/usePermissions";

export default function PermissionSection({ 
  modulo, 
  accion = "VIEW",
  children,
  fallback = null
}) {
  const { hasPermission, loading, isAdmin } = usePermissions();

  if (loading) {
    return fallback;
  }

  if (!isAdmin && !hasPermission(modulo, accion)) {
    return fallback;
  }

  return <>{children}</>;
}