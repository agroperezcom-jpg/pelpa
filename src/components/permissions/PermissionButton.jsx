import React from "react";
import { usePermissions } from "@/components/permissions/usePermissions";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function PermissionButton({ 
  modulo, 
  accion, 
  children, 
  hideOnNoPermission = true,
  showLoading = false,
  ...props 
}) {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    if (!showLoading) return null;
    return (
      <Button {...props} disabled>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        {children}
      </Button>
    );
  }

  if (!hasPermission(modulo, accion)) {
    if (hideOnNoPermission) {
      return null;
    }
    return (
      <Button {...props} disabled>
        {children}
      </Button>
    );
  }

  return <Button {...props}>{children}</Button>;
}