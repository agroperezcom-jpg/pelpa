import React from "react";
import { usePermissions } from "@/components/permissions/usePermissions";
import { Button } from "@/components/ui/button";

export default function PermissionButton({ modulo, accion, children, ...props }) {
  const { hasPermission } = usePermissions();

  if (!hasPermission(modulo, accion)) {
    return null;
  }

  return <Button {...props}>{children}</Button>;
}