import React from "react";
import { usePermissions } from "./usePermissions";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";

export function PageGuard({ moduleKey, children }) {
  const { loading, isBlocked, canView } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700 mx-auto mb-3"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md border-0 shadow-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Acceso Denegado</h2>
            <p className="text-muted-foreground mb-6">
              Tu cuenta ha sido bloqueada. Contacta al administrador.
            </p>
            <Button onClick={() => base44.auth.logout()} className="w-full">
              Cerrar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canView(moduleKey)) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md border-0 shadow-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Acceso Restringido</h2>
            <p className="text-muted-foreground mb-6">
              No tienes permiso para acceder a este módulo.
            </p>
            <Button onClick={() => (window.location.href = createPageUrl("Dashboard"))} className="w-full">
              Volver al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
}