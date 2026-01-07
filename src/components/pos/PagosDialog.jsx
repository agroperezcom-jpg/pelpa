import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Plus, Trash2, CreditCard, AlertCircle, CheckCircle } from "lucide-react";

export default function PagosDialog({ isOpen, onClose, total, onConfirm, clienteId }) {
  const [pagos, setPagos] = useState([]);
  const [nuevoPago, setNuevoPago] = useState({
    medio_pago_id: "",
    importe: "",
    banco_id: "",
    caja_id: ""
  });

  const { data: mediosPago = [] } = useQuery({
    queryKey: ['mediosPago'],
    queryFn: () => base44.entities.MedioPago.list()
  });

  const { data: bancos = [] } = useQuery({
    queryKey: ['bancos'],
    queryFn: () => base44.entities.Banco.list()
  });

  const { data: cajas = [] } = useQuery({
    queryKey: ['cajas'],
    queryFn: () => base44.entities.Caja.list()
  });

  const medioSeleccionado = mediosPago.find(m => m.id === nuevoPago.medio_pago_id);
  const totalPagado = pagos.reduce((acc, p) => acc + parseFloat(p.importe), 0);
  const saldoPendiente = total - totalPagado;
  const pagoCompleto = Math.abs(saldoPendiente) < 0.01;

  const agregarPago = () => {
    if (!nuevoPago.medio_pago_id || !nuevoPago.importe || parseFloat(nuevoPago.importe) <= 0) {
      return;
    }

    const medio = mediosPago.find(m => m.id === nuevoPago.medio_pago_id);
    
    if (medio.requiere_banco && !nuevoPago.banco_id) {
      alert("Este medio de pago requiere seleccionar un banco");
      return;
    }

    if (medio.requiere_caja && !nuevoPago.caja_id) {
      alert("Este medio de pago requiere seleccionar una caja");
      return;
    }

    const banco = bancos.find(b => b.id === nuevoPago.banco_id);
    const caja = cajas.find(c => c.id === nuevoPago.caja_id);

    setPagos([...pagos, {
      medio_pago_id: nuevoPago.medio_pago_id,
      medio_pago_nombre: medio.nombre,
      importe: parseFloat(nuevoPago.importe),
      banco_id: nuevoPago.banco_id || null,
      banco_nombre: banco?.nombre || "",
      caja_id: nuevoPago.caja_id || null,
      caja_nombre: caja?.nombre || ""
    }]);

    setNuevoPago({
      medio_pago_id: "",
      importe: "",
      banco_id: "",
      caja_id: ""
    });
  };

  const eliminarPago = (index) => {
    setPagos(pagos.filter((_, i) => i !== index));
  };

  const handleConfirmar = () => {
    if (!pagoCompleto) {
      alert("El total de pagos debe ser igual al total de la venta");
      return;
    }

    // Determinar tipo de venta
    const tieneCuentaCorriente = pagos.some(p => p.medio_pago_nombre === "Cuenta Corriente");
    const tieneOtrosPagos = pagos.some(p => p.medio_pago_nombre !== "Cuenta Corriente");
    
    let tipoVenta;
    if (tieneCuentaCorriente && !tieneOtrosPagos) {
      tipoVenta = "CTA_CTE";
    } else if (tieneCuentaCorriente && tieneOtrosPagos) {
      tipoVenta = "MIXTA";
    } else {
      tipoVenta = "CONTADO";
    }

    onConfirm(pagos, tipoVenta);
  };

  const calcularSugerencia = () => {
    if (saldoPendiente > 0 && nuevoPago.medio_pago_id) {
      setNuevoPago({ ...nuevoPago, importe: saldoPendiente.toFixed(2) });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-600" />
            Formas de Pago
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="text-xs text-slate-500">Total Venta</p>
              <p className="text-xl font-bold">${total.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Pagado</p>
              <p className="text-xl font-bold text-emerald-600">${totalPagado.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Saldo Pendiente</p>
              <p className={`text-xl font-bold ${saldoPendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ${Math.abs(saldoPendiente).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Agregar Pago */}
          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">Agregar Pago</h4>
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-4">
                <Label className="text-xs">Medio de Pago *</Label>
                <Select 
                  value={nuevoPago.medio_pago_id} 
                  onValueChange={(v) => setNuevoPago({ ...nuevoPago, medio_pago_id: v, banco_id: "", caja_id: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {mediosPago.filter(m => !clienteId || m.nombre !== "Cuenta Corriente" ? true : clienteId).map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-3">
                <Label className="text-xs">Importe *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={nuevoPago.importe}
                  onChange={(e) => setNuevoPago({ ...nuevoPago, importe: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              {medioSeleccionado?.requiere_banco && (
                <div className="col-span-3">
                  <Label className="text-xs">Banco *</Label>
                  <Select value={nuevoPago.banco_id} onValueChange={(v) => setNuevoPago({ ...nuevoPago, banco_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Banco" />
                    </SelectTrigger>
                    <SelectContent>
                      {bancos.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {medioSeleccionado?.requiere_caja && (
                <div className="col-span-3">
                  <Label className="text-xs">Caja *</Label>
                  <Select value={nuevoPago.caja_id} onValueChange={(v) => setNuevoPago({ ...nuevoPago, caja_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Caja" />
                    </SelectTrigger>
                    <SelectContent>
                      {cajas.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="col-span-2 flex items-end gap-1">
                <Button onClick={agregarPago} size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4" />
                </Button>
                {saldoPendiente > 0 && (
                  <Button onClick={calcularSugerencia} size="sm" variant="outline" title="Completar saldo">
                    $
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Lista de Pagos */}
          {pagos.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Medio de Pago</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagos.map((pago, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{pago.medio_pago_nombre}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {pago.banco_nombre && `🏦 ${pago.banco_nombre}`}
                        {pago.caja_nombre && `💵 ${pago.caja_nombre}`}
                        {!pago.banco_nombre && !pago.caja_nombre && "—"}
                      </TableCell>
                      <TableCell className="text-right font-bold">${pago.importe.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => eliminarPago(index)} className="h-8 w-8">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Estado de Validación */}
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            pagoCompleto ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
          }`}>
            {pagoCompleto ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-800 font-medium">Pago completo - Listo para confirmar</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <span className="text-sm text-amber-800">
                  {pagos.length === 0 
                    ? "Agregue al menos un pago" 
                    : `Falta pagar $${saldoPendiente.toFixed(2)}`
                  }
                </span>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmar}
            disabled={!pagoCompleto}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Confirmar Venta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}