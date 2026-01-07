import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ArrowRightLeft } from "lucide-react";

export default function TransferenciasDialog({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    origen_tipo: "",
    origen_id: "",
    destino_tipo: "",
    destino_id: "",
    importe: "",
    observaciones: ""
  });

  const queryClient = useQueryClient();

  const { data: cajas = [] } = useQuery({
    queryKey: ['cajas'],
    queryFn: () => base44.entities.Caja.list()
  });

  const { data: bancos = [] } = useQuery({
    queryKey: ['bancos'],
    queryFn: () => base44.entities.Banco.list()
  });

  const transferenciaMutation = useMutation({
    mutationFn: async (data) => {
      const importe = parseFloat(data.importe);

      // Obtener origen y destino
      const origen = data.origen_tipo === "CAJA" 
        ? cajas.find(c => c.id === data.origen_id)
        : bancos.find(b => b.id === data.origen_id);

      const destino = data.destino_tipo === "CAJA"
        ? cajas.find(c => c.id === data.destino_id)
        : bancos.find(b => b.id === data.destino_id);

      if (!origen || !destino) {
        throw new Error("Origen o destino no encontrado");
      }

      if (origen.saldo_actual < importe) {
        throw new Error(`Saldo insuficiente en ${origen.nombre}. Saldo disponible: $${origen.saldo_actual}`);
      }

      // Crear movimientos de salida (EGRESO) y entrada (INGRESO)
      const medioTransferencia = await base44.entities.MedioPago.filter({ nombre: "Transferencia" });
      const medioId = medioTransferencia[0]?.id;

      // Movimiento EGRESO (salida del origen)
      await base44.entities.MovimientoTesoreria.create({
        fecha: new Date().toISOString().split('T')[0],
        tipo: "EGRESO",
        medio_pago_id: medioId,
        medio_pago_nombre: "Transferencia",
        banco_id: data.origen_tipo === "BANCO" ? origen.id : null,
        banco_nombre: data.origen_tipo === "BANCO" ? origen.nombre : "",
        caja_id: data.origen_tipo === "CAJA" ? origen.id : null,
        caja_nombre: data.origen_tipo === "CAJA" ? origen.nombre : "",
        importe: importe,
        referencia_tipo: "transferencia",
        observaciones: `Transferencia a ${destino.nombre}${data.observaciones ? ' - ' + data.observaciones : ''}`
      });

      // Movimiento INGRESO (entrada al destino)
      await base44.entities.MovimientoTesoreria.create({
        fecha: new Date().toISOString().split('T')[0],
        tipo: "INGRESO",
        medio_pago_id: medioId,
        medio_pago_nombre: "Transferencia",
        banco_id: data.destino_tipo === "BANCO" ? destino.id : null,
        banco_nombre: data.destino_tipo === "BANCO" ? destino.nombre : "",
        caja_id: data.destino_tipo === "CAJA" ? destino.id : null,
        caja_nombre: data.destino_tipo === "CAJA" ? destino.nombre : "",
        importe: importe,
        referencia_tipo: "transferencia",
        observaciones: `Transferencia desde ${origen.nombre}${data.observaciones ? ' - ' + data.observaciones : ''}`
      });

      // Actualizar saldos
      if (data.origen_tipo === "CAJA") {
        await base44.entities.Caja.update(origen.id, {
          saldo_actual: origen.saldo_actual - importe
        });
      } else {
        await base44.entities.Banco.update(origen.id, {
          saldo_actual: origen.saldo_actual - importe
        });
      }

      if (data.destino_tipo === "CAJA") {
        await base44.entities.Caja.update(destino.id, {
          saldo_actual: destino.saldo_actual + importe
        });
      } else {
        await base44.entities.Banco.update(destino.id, {
          saldo_actual: destino.saldo_actual + importe
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cajas'] });
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['movimientosTesoreria'] });
      setFormData({
        origen_tipo: "",
        origen_id: "",
        destino_tipo: "",
        destino_id: "",
        importe: "",
        observaciones: ""
      });
      onClose();
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (formData.origen_tipo === formData.destino_tipo && formData.origen_id === formData.destino_id) {
      alert("El origen y destino no pueden ser iguales");
      return;
    }

    transferenciaMutation.mutate(formData);
  };

  const cuentasOrigen = formData.origen_tipo === "CAJA" ? cajas : formData.origen_tipo === "BANCO" ? bancos : [];
  const cuentasDestino = formData.destino_tipo === "CAJA" ? cajas : formData.destino_tipo === "BANCO" ? bancos : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-purple-600" />
            Transferencia entre Cuentas
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
            <h4 className="font-medium text-sm">Origen</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Tipo *</Label>
                <Select 
                  value={formData.origen_tipo} 
                  onValueChange={(v) => setFormData({ ...formData, origen_tipo: v, origen_id: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAJA">Caja</SelectItem>
                    <SelectItem value="BANCO">Banco</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Cuenta *</Label>
                <Select 
                  value={formData.origen_id} 
                  onValueChange={(v) => setFormData({ ...formData, origen_id: v })}
                  disabled={!formData.origen_tipo}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {cuentasOrigen.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre} (${c.saldo_actual?.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
            <h4 className="font-medium text-sm">Destino</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Tipo *</Label>
                <Select 
                  value={formData.destino_tipo} 
                  onValueChange={(v) => setFormData({ ...formData, destino_tipo: v, destino_id: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAJA">Caja</SelectItem>
                    <SelectItem value="BANCO">Banco</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Cuenta *</Label>
                <Select 
                  value={formData.destino_id} 
                  onValueChange={(v) => setFormData({ ...formData, destino_id: v })}
                  disabled={!formData.destino_tipo}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {cuentasDestino.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre} (${c.saldo_actual?.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Importe *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.importe}
              onChange={(e) => setFormData({ ...formData, importe: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              placeholder="Detalles de la transferencia..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-purple-600 hover:bg-purple-700"
              disabled={transferenciaMutation.isPending}
            >
              Transferir
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}