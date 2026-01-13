import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/components/context/CompanyContext";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Zap, Loader2 } from "lucide-react";

export default function CompanyModeSection({ isAdmin = false }) {
  const { currentCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [showProductionDialog, setShowProductionDialog] = useState(false);
  const [productionPin, setProductionPin] = useState("");

  // Fetch company data
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list()
  });

  const company = companies.find(c => c.id === currentCompanyId);
  const isDemo = company?.environment_mode === 'DEMO';
  const productionDate = company?.production_activated_at;

  // Switch to production mutation
  const switchToProductionMutation = useMutation({
    mutationFn: async () => {
      if (!productionPin) {
        throw new Error('PIN is required');
      }

      return await base44.functions.invoke('switchToProductionMode', {
        company_id: currentCompanyId,
        reset_pin: productionPin
      });
    },
    onSuccess: () => {
      toast.success('¡Empresa activada en modo PRODUCCIÓN!');
      setProductionPin("");
      setShowProductionDialog(false);
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Error al activar modo producción');
    }
  });

  if (!company) {
    return null;
  }

  return (
    <>
      <Card className="border border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-slate-700" />
            <div>
              <CardTitle className="text-base">Modo de la Empresa</CardTitle>
              <CardDescription>Gestiona el modo de operación (DEMO o PRODUCCIÓN)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Mode Display */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Estado actual:</span>
              <div className={`px-3 py-1.5 rounded-lg font-semibold text-sm ${
                isDemo
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {isDemo ? '🧪 DEMO' : '✓ PRODUCCIÓN'}
              </div>
            </div>

            {productionDate && (
              <div className="text-xs text-slate-600">
                <span className="font-medium">Activado el:</span> {new Date(productionDate).toLocaleString('es-AR')}
              </div>
            )}

            {isDemo && (
              <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
                ℹ️ Tu empresa está en modo DEMO. Puedes hacer pruebas y resetear datos sin limitaciones.
              </p>
            )}

            {!isDemo && (
              <p className="text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
                ✓ Tu empresa está en modo PRODUCCIÓN. Los datos son reales y no se pueden resetear.
              </p>
            )}
          </div>

          {/* Activation Button (only in DEMO mode, only for admins) */}
          {isDemo && isAdmin && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-amber-900">
                ⚠️ Cambiar a modo PRODUCCIÓN
              </p>
              <p className="text-xs text-amber-800">
                Al activar modo PRODUCCIÓN, todos los datos de prueba serán eliminados permanentemente y la empresa quedará lista para operar con datos reales. Esta acción no se puede deshacer.
              </p>
              <Button
                onClick={() => setShowProductionDialog(true)}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white gap-2"
              >
                <Zap className="h-4 w-4" />
                Activar Modo PRODUCCIÓN
              </Button>
            </div>
          )}

          {!isAdmin && (
            <div className="p-3 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-700">
              ℹ️ Solo los administradores pueden cambiar el modo de la empresa
            </div>
          )}
        </CardContent>
      </Card>

      {/* Production Activation Dialog */}
      <AlertDialog open={showProductionDialog} onOpenChange={setShowProductionDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Confirmar Activación de Modo PRODUCCIÓN
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-left">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                <p className="text-sm font-semibold text-red-900">⚠️ ACCIÓN IRREVERSIBLE</p>
                <div className="text-xs text-red-800 space-y-1">
                  <p>• Se eliminarán todos los datos de prueba (ventas, inventario, etc.)</p>
                  <p>• El sistema quedará listo para operar con datos reales</p>
                  <p>• No se podrá deshacer ni resetear datos después</p>
                </div>
              </div>
              <p className="text-sm text-slate-700">
                ¿Deseas continuar? Ingresa tu PIN maestro de reseteo para confirmar.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="productionPin">PIN Maestro de Reseteo</Label>
              <Input
                id="productionPin"
                type="password"
                value={productionPin}
                onChange={(e) => setProductionPin(e.target.value)}
                placeholder="Ingresa PIN para confirmar"
                className="font-mono"
                autoFocus
              />
              <p className="text-xs text-slate-500">
                Este es el PIN que configuraste para resets de empresa
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProductionPin("")}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => switchToProductionMutation.mutate()}
              disabled={!productionPin || switchToProductionMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {switchToProductionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Activando...
                </>
              ) : (
                'Confirmar y Activar PRODUCCIÓN'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}