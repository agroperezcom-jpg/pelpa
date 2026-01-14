import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
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
import { AlertTriangle, Lock, Trash2 } from "lucide-react";

/**
 * System Master Reset Dialog (Single-Company)
 * Allows admins to:
 * 1. Set/update reset PIN
 * 2. Enable/disable reset capability
 * 3. Trigger system data reset with PIN confirmation
 */
export default function CompanyResetDialog({ isOpen, onClose }) {
  const [tab, setTab] = useState("configure"); // configure | reset
  const [resetPin, setResetPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [enableReset, setEnableReset] = useState(false);
  const [resetConfirmPin, setResetConfirmPin] = useState("");
  const [showResetConfirmDialog, setShowResetConfirmDialog] = useState(false);

  // Fetch current reset config
  const { data: resetConfig } = useQuery({
    queryKey: ['resetConfig'],
    queryFn: async () => {
      try {
        const configs = await base44.entities.CompanyResetConfig.list();
        return configs[0] || null;
      } catch (e) {
        return null;
      }
    },
    enabled: isOpen
  });

  // Set PIN mutation
  const setResetPinMutation = useMutation({
    mutationFn: async () => {
      if (!resetPin || resetPin.length < 4) {
        throw new Error("PIN must be at least 4 characters");
      }
      if (resetPin !== confirmPin) {
        throw new Error("PINs don't match");
      }

      return await base44.functions.invoke('setCompanyResetPin', {
        reset_pin: resetPin,
        enable_reset: enableReset
      });
    },
    onSuccess: (result) => {
      toast.success(result.message);
      setResetPin("");
      setConfirmPin("");
      onClose();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  // Master reset mutation
  const masterResetMutation = useMutation({
    mutationFn: async () => {
      if (!resetConfirmPin) {
        throw new Error("PIN is required");
      }

      return await base44.functions.invoke('masterCompanyReset', {
        reset_pin: resetConfirmPin
      });
    },
    onSuccess: (result) => {
      toast.success("✓ Company data reset successfully!");
      setResetConfirmPin("");
      setShowResetConfirmDialog(false);
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || "Reset failed");
    }
  });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-red-600" />
              Reseteo de Sistema
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Tab selector */}
            <div className="flex gap-2 border-b">
              <button
                onClick={() => setTab("configure")}
                className={`pb-2 px-2 text-sm font-medium transition-colors ${
                  tab === "configure"
                    ? "text-slate-900 border-b-2 border-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Configurar PIN
              </button>
              <button
                onClick={() => setTab("reset")}
                className={`pb-2 px-2 text-sm font-medium transition-colors ${
                  tab === "reset"
                    ? "text-slate-900 border-b-2 border-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                disabled={!resetConfig?.reset_enabled}
              >
                Resetear Datos
              </button>
            </div>

            {/* Configure PIN Tab */}
            {tab === "configure" && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-800">
                    <strong>⚠️ Seguridad:</strong> Establece un PIN fuerte (mínimo 4 caracteres). Lo necesitarás para resetear los datos de la empresa.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pin">PIN Maestro de Reseteo</Label>
                  <Input
                    id="pin"
                    type="password"
                    value={resetPin}
                    onChange={(e) => setResetPin(e.target.value)}
                    placeholder="Ingresa PIN (mín. 4 caracteres)"
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPin">Confirmar PIN</Label>
                  <Input
                    id="confirmPin"
                    type="password"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="Confirma PIN"
                    className="font-mono"
                  />
                </div>

                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <input
                    type="checkbox"
                    id="enableReset"
                    checked={enableReset}
                    onChange={(e) => setEnableReset(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label
                    htmlFor="enableReset"
                    className="text-sm cursor-pointer flex-1"
                  >
                    Habilitar capacidad de reseteo del sistema
                  </label>
                </div>

                {resetConfig?.reset_enabled && (
                  <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2">
                    ✓ El reseteo está actualmente <strong>habilitado</strong>
                  </div>
                )}
              </div>
            )}

            {/* Reset Data Tab */}
            {tab === "reset" && (
             <div className="space-y-4">
               <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                 <p className="text-sm font-semibold text-red-800 flex items-center gap-2">
                   <AlertTriangle className="h-4 w-4" />
                   ⚠️ ACCIÓN IRREVERSIBLE
                 </p>
                 <p className="text-xs text-red-700">
                   Esta acción eliminará permanentemente TODOS los datos del sistema (incluyendo ventas, stock, calendario, tareas y proyectos).
                 </p>
                 <p className="text-xs font-medium text-red-800 mt-2">
                   Esta acción no se puede deshacer.
                 </p>
               </div>

               <Button
                 onClick={() => setShowResetConfirmDialog(true)}
                 className="w-full bg-red-600 hover:bg-red-700 text-white gap-2"
               >
                 <Trash2 className="h-4 w-4" />
                 Eliminar Todos los Datos
               </Button>
             </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            {tab === "configure" && (
              <Button
                onClick={() => setResetPinMutation.mutate()}
                disabled={!resetPin || resetPin !== confirmPin || resetPin.length < 4}
                className="bg-slate-700 hover:bg-slate-800"
              >
                {setResetPinMutation.isPending ? "Guardando..." : "Guardar PIN"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetConfirmDialog} onOpenChange={setShowResetConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Confirmar Reseteo de Sistema
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ingresa tu PIN maestro de reseteo para confirmar la eliminación de todos los datos del sistema.
              Esta acción es permanente y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resetPin">PIN Maestro de Reseteo</Label>
              <Input
                id="resetPin"
                type="password"
                value={resetConfirmPin}
                onChange={(e) => setResetConfirmPin(e.target.value)}
                placeholder="Ingresa PIN para confirmar"
                className="font-mono"
                autoFocus
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setResetConfirmPin("")}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => masterResetMutation.mutate()}
              disabled={!resetConfirmPin || masterResetMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {masterResetMutation.isPending ? "Reseteando..." : "Confirmar y Eliminar Todos los Datos"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}