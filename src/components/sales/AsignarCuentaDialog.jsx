import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { Search, FileText } from "lucide-react";
import toast from "react-hot-toast";

export default function AsignarCuentaDialog({ isOpen, onClose, venta }) {
  const [cuentaSearch, setCuentaSearch] = useState("");
  const [selectedCuenta, setSelectedCuenta] = useState(null);

  const queryClient = useQueryClient();

  const { data: cuentasContables = [] } = useQuery({
    queryKey: ['cuentasContables'],
    queryFn: () => base44.entities.CuentaContable.list('codigo', 500)
  });

  const asignarCuentaMutation = useMutation({
    mutationFn: async (cuenta) => {
      return await base44.entities.Sale.update(venta.id, {
        cuenta_contable_id: cuenta.id,
        cuenta_contable_codigo: cuenta.codigo_contable || cuenta.codigo,
        cuenta_contable_nombre: cuenta.nombre,
        cuenta_contable_asignada: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success("Cuenta contable asignada correctamente");
      onClose();
    },
    onError: (error) => {
      toast.error("Error al asignar cuenta: " + error.message);
    }
  });

  const cuentasIngresos = cuentasContables.filter(c => 
    c.imputable && 
    c.usa_en_ingresos && 
    c.is_active !== false &&
    (c.rubro_contable === "Ingresos" || c.tipo_resultado === "Ingreso")
  );

  const cuentaDefecto = cuentasIngresos.find(c => 
    c.nombre.toLowerCase().includes("venta") && 
    c.nombre.toLowerCase().includes("mercaderia")
  );

  const filteredCuentas = cuentasIngresos.filter(c =>
    c.nombre.toLowerCase().includes(cuentaSearch.toLowerCase()) ||
    (c.codigo_contable || c.codigo).toLowerCase().includes(cuentaSearch.toLowerCase())
  );

  const handleAsignar = () => {
    const cuenta = selectedCuenta || cuentaDefecto;
    if (!cuenta) {
      toast.error("Selecciona una cuenta contable");
      return;
    }
    asignarCuentaMutation.mutate(cuenta);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Asignar Cuenta Contable - Venta #{venta?.numero_comprobante}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              ⚠️ La venta está registrada pero sin cuenta contable asignada. 
              Asigna una cuenta de ingresos para el estado de resultados.
            </p>
          </div>

          {cuentaDefecto && !selectedCuenta && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 mb-2">
                ✓ Se asignará por defecto: <strong>{cuentaDefecto.nombre}</strong>
              </p>
              <p className="text-xs text-green-700">
                Código: {cuentaDefecto.codigo_contable || cuentaDefecto.codigo}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Buscar Cuenta de Ingresos</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar cuenta..."
                value={cuentaSearch}
                onChange={(e) => setCuentaSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="border rounded-lg max-h-64 overflow-y-auto">
            {filteredCuentas.map(cuenta => (
              <button
                key={cuenta.id}
                type="button"
                onClick={() => setSelectedCuenta(cuenta)}
                className={`w-full text-left px-4 py-3 hover:bg-slate-50 border-b last:border-b-0 transition-colors ${
                  selectedCuenta?.id === cuenta.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{cuenta.nombre}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Código: {cuenta.codigo_contable || cuenta.codigo}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className="bg-green-100 text-green-700 text-xs">
                      {cuenta.rubro_contable}
                    </Badge>
                    {cuenta === cuentaDefecto && !selectedCuenta && (
                      <Badge variant="outline" className="text-xs">Predeterminada</Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
            {filteredCuentas.length === 0 && (
              <div className="text-center py-8 text-sm text-slate-500">
                No se encontraron cuentas de ingresos
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAsignar}
            disabled={asignarCuentaMutation.isPending || (cuentasIngresos.length === 0)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {asignarCuentaMutation.isPending ? "Asignando..." : "Asignar Cuenta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}