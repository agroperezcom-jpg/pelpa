import React from "react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "./usePermissions";

export function ActionButton({
  moduleKey,
  action,
  children,
  className,
  ...props
}) {
  const { hasPermission } = usePermissions();

  // Hide button if no permission
  if (!hasPermission(moduleKey, action)) {
    return null;
  }

  return (
    <Button className={className} {...props}>
      {children}
    </Button>
  );
}