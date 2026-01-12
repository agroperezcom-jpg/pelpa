import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function DeleteRecurrenceDialog({ 
  isOpen, 
  onClose, 
  onConfirm,
  taskName,
  isRecurrenceInstance
}) {
  const [deleteOption, setDeleteOption] = React.useState("this");

  const handleConfirm = () => {
    onConfirm(deleteOption);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <DialogTitle>Eliminar tarea</DialogTitle>
          </div>
          <DialogDescription>
            Esta tarea es parte de una serie recurrente. ¿Cómo deseas proceder?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Solo esta instancia */}
          <label className="flex items-start gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors" style={{
            borderColor: deleteOption === "this" ? "var(--primary)" : undefined,
            backgroundColor: deleteOption === "this" ? "hsl(var(--primary) / 0.05)" : undefined
          }}>
            <input
              type="radio"
              name="delete-option"
              value="this"
              checked={deleteOption === "this"}
              onChange={(e) => setDeleteOption(e.target.value)}
              className="mt-1"
            />
            <div className="flex-1">
              <p className="font-medium text-sm">Solo esta tarea</p>
              <p className="text-xs text-muted-foreground">
                Elimina solo la instancia de hoy, mantiene el resto de la serie
              </p>
            </div>
          </label>

          {/* Esta y todas las futuras */}
          <label className="flex items-start gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors" style={{
            borderColor: deleteOption === "thisAndFuture" ? "var(--primary)" : undefined,
            backgroundColor: deleteOption === "thisAndFuture" ? "hsl(var(--primary) / 0.05)" : undefined
          }}>
            <input
              type="radio"
              name="delete-option"
              value="thisAndFuture"
              checked={deleteOption === "thisAndFuture"}
              onChange={(e) => setDeleteOption(e.target.value)}
              className="mt-1"
            />
            <div className="flex-1">
              <p className="font-medium text-sm">Esta y todas las futuras</p>
              <p className="text-xs text-muted-foreground">
                Elimina desde hoy hasta el final de la serie
              </p>
            </div>
          </label>

          {/* Todas las instancias */}
          <label className="flex items-start gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors" style={{
            borderColor: deleteOption === "all" ? "var(--primary)" : undefined,
            backgroundColor: deleteOption === "all" ? "hsl(var(--primary) / 0.05)" : undefined
          }}>
            <input
              type="radio"
              name="delete-option"
              value="all"
              checked={deleteOption === "all"}
              onChange={(e) => setDeleteOption(e.target.value)}
              className="mt-1"
            />
            <div className="flex-1">
              <p className="font-medium text-sm">Todas las tareas</p>
              <p className="text-xs text-muted-foreground">
                Elimina la tarea original y todas sus recurrencias
              </p>
            </div>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}