import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Bookmark, Trash2 } from "lucide-react";

export default function CustomRangeDialog({ isOpen, onClose, onSave, savedRanges = [], onDeleteRange }) {
  const [customDays, setCustomDays] = useState(5);
  const [rangeName, setRangeName] = useState("");

  const quickRanges = [
    { name: "Próximos 3 días", days: 3 },
    { name: "Próximos 5 días", days: 5 },
    { name: "Próximos 7 días", days: 7 },
    { name: "Próximos 10 días", days: 10 },
    { name: "Próximos 14 días", days: 14 },
  ];

  const handleApply = () => {
    if (customDays < 2 || customDays > 30) {
      alert("El rango debe ser entre 2 y 30 días");
      return;
    }
    onSave(customDays, null);
    onClose();
  };

  const handleSaveRange = () => {
    if (!rangeName) {
      alert("Ingresa un nombre para el rango");
      return;
    }
    if (customDays < 2 || customDays > 30) {
      alert("El rango debe ser entre 2 y 30 días");
      return;
    }
    onSave(customDays, rangeName);
    setRangeName("");
    onClose();
  };

  const handleQuickRange = (days) => {
    onSave(days, null);
    onClose();
  };

  const handleSavedRange = (days) => {
    onSave(days, null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Rango personalizado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Rangos rápidos */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Rangos rápidos</Label>
            <div className="grid grid-cols-2 gap-2">
              {quickRanges.map((range) => (
                <Button
                  key={range.name}
                  variant="outline"
                  onClick={() => handleQuickRange(range.days)}
                  className="justify-start text-sm"
                >
                  {range.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Rangos guardados */}
          {savedRanges.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Bookmark className="h-4 w-4" />
                Rangos guardados
              </Label>
              <div className="space-y-2">
                {savedRanges.map((range, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    <button
                      onClick={() => handleSavedRange(range.days)}
                      className="flex-1 text-left text-sm font-medium"
                    >
                      {range.name}
                      <Badge variant="outline" className="ml-2 text-xs">
                        {range.days} días
                      </Badge>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteRange(idx)}
                      className="h-8 w-8 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rango personalizado */}
          <div className="border-t pt-6 space-y-4">
            <Label className="text-sm font-semibold">Personalizar</Label>
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Cantidad de días (2-30)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="2"
                  max="30"
                  value={customDays}
                  onChange={(e) => setCustomDays(parseInt(e.target.value) || 2)}
                  className="flex-1"
                />
                <Button onClick={handleApply} variant="outline">
                  Aplicar
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Guardar como favorito</Label>
              <div className="flex gap-2">
                <Input
                  value={rangeName}
                  onChange={(e) => setRangeName(e.target.value)}
                  placeholder='Ej: "Mi semana laboral"'
                  className="flex-1"
                />
                <Button onClick={handleSaveRange} className="bg-primary hover:bg-[hsl(var(--primary-hover))]">
                  <Bookmark className="h-4 w-4 mr-2" />
                  Guardar
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}