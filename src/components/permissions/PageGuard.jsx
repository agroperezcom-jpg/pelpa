import React from "react";
import { usePermissionsEnforcement } from "@/components/permissions/usePermissionsEnforcement";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

/**
 * Page Guard Component
 * Blocks access to pages if user lacks 'view' permission
 * Delega completamente en usePermissionsEnforcement
 * 
 * Usage:
 * <PageGuard module="inventory">
 *   <YourPageComponent />
 * </PageGuard>
 */
export default function PageGuard({ module, children }) {
  const { canViewModule, isLoading } = usePermissionsEnforcement();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!canViewModule(module)) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <Card className="max-w-md border-l-4 border-l-red-500 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h2 className="font-semibold text-red-900">Acceso Denegado</h2>
                <p className="text-sm text-red-800">
                  No tienes permiso para acceder a este módulo.
                </p>
                <div className="pt-4">
                  <Link to={createPageUrl("Dashboard")}>
                    <Button size="sm" variant="outline">
                      Volver al Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
}