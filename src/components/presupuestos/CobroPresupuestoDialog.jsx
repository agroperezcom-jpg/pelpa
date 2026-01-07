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
import {
  DollarSign, Trash2, Plus, AlertTriangle, CheckCircle2, Receipt
} from "lucide-react";

export default function CobroPresupuestoDialog({ isOpen, onClose, total, presupuesto, onConfirm }) {
  const [pagos, setPagos] = useState([]);
  const [generaIVA, setGeneraIVA] = useState(false);
  const [nuevoPago, setNuevoPago] = useState({
    medio_pago_id: "",
    importe: "",
    banco_id: "",
    caja_id: ""
  });

  const { data: mediosPago = [] } = useQuery({
    queryKey: ['mediosPago'],
    queryFn: () => base44.entities.MedioPago.list(),
    enabled: isOpen
  });

  const { data: bancos = [] } = useQuery({
    queryKey: ['bancos'],
    queryFn: () => base44.entities.Banco.list(),
    enabled: isOpen
  });

  const { data: cajas = [] } = useQuery({
    queryKey: ['cajas'],
    queryFn: () => base44.entities.Caja.list(),
    enabled: isOpen
  });

  const agregarPago = () => {
    if (!nuevoPago.medio_pago_id || !nuevoPago.importe || parseFloat(nuevoPago.importe) <= 0) {
      return;
    }

    const medio = mediosPago.find(m => m.id === nuevoPago.medio_pago_id);
    
    if (medio.requiere_banco && !nuevoPago.banco_id) {
      alert("Seleccione un banco");
      return;
    }

    if (medio.requiere_caja && !nuevoPago.caja_id) {
      alert("Seleccione una caja");
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

    setNuevoPago({ medio_pago_id: "", importe: "", banco_id: "", caja_id: "" });
  };

  const eliminarPago = (index) => {
    setPagos(pagos.filter((_, i) => i !== index));
  };

  const totalCobrado = pagos.reduce((acc, p) => acc + p.importe, 0);
  const saldoPendiente = total - totalCobrado;
  const cobroCompleto = Math.abs(saldoPendiente) < 0.01;

  const handleConfirmar = () => {
    if (!cobroCompleto) {
      alert("Debe cobrarse el 100% del presupuesto para aceptarlo");
      return;
    }

    onConfirm(pagos, generaIVA);
    setPagos([]);
    setGeneraIVA(false);
  };

  const handleClose = () => {
    setPagos([]);
    setGeneraIVA(false);
    onClose();
  };

  const medioSeleccionado = mediosPago.find(m => m.id === nuevoPago.medio_pago_id);

  // Auto-completar si queda un saldo pequeño
  const autoCompletar = () => {
    if (!nuevoPago.medio_pago_id) {
      alert("Primero seleccione un medio de pago");
      return;
    }
    setNuevoPago({ ...nuevoPago, importe: saldoPendiente.toFixed(2) });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Cobro del Presupuesto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info del Presupuesto */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-blue-900">Presupuesto: {presupuesto?.numero_presupuesto}</p>
                <p className="text-xs text-blue-700">Cliente: {presupuesto?.cliente_name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-700">Total Presupuesto</p>
                <p className="text-2xl font-bold text-blue-900">${total.toFixed(2)}</p>
              </div>
            </div>
            
            {/* Toggle IVA */}
            <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-blue-200">
              <div>
                <p className="text-sm font-semibold text-slate-800">Genera IVA Ventas</p>
                <p className="text-xs text-slate-600 mt-1">
                  {generaIVA ? "Factura B - IVA discriminado" : "Ticket X - Sin IVA"}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={generaIVA}
                  onChange={(e) => setGeneraIVA(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-slate-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Resumen de Cobro */}
          <div className="grid grid-cols-3 gap-4 p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Total Presupuesto</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">${total.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Cobrado</p>
              <p className="text-3xl font-bold text-green-600 mt-1">${totalCobrado.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Pendiente</p>
              <p className={`text-3xl font-bold mt-1 ${saldoPendiente > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                ${Math.abs(saldoPendiente).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Agregar Pago */}
          <div className="border-2 border-green-200 bg-green-50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm text-green-900">Registrar Cobro</h4>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-4">
                <Label className="text-xs">Medio de Pago *</Label>
                <Select value={nuevoPago.medio_pago_id} onValueChange={(v) => setNuevoPago({ ...nuevoPago, medio_pago_id: v, banco_id: "", caja_id: "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {mediosPago.filter(m => m.nombre !== "Cuenta Corriente").map(m => (
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
                      <SelectValue placeholder="Seleccionar" />
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
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {cajas.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className={`${medioSeleccionado?.requiere_banco || medioSeleccionado?.requiere_caja ? 'col-span-2' : 'col-span-5'} flex items-end gap-1`}>
                <Button onClick={agregarPago} className="flex-1 bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar
                </Button>
                {saldoPendiente > 0.01 && (
                  <Button onClick={autoCompletar} variant="outline" size="sm">
                    Total
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
                  {pagos.map((pago, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{pago.medio_pago_nombre}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {pago.banco_nombre && `🏦 ${pago.banco_nombre}`}
                        {pago.caja_nombre && `💵 ${pago.caja_nombre}`}
                        {!pago.banco_nombre && !pago.caja_nombre && "—"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600">${pago.importe.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => eliminarPago(idx)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Estado del Cobro */}
          <div className={`flex items-center justify-between gap-2 p-4 rounded-lg ${
            cobroCompleto ? 'bg-green-50 border-2 border-green-400' : 'bg-red-50 border-2 border-red-400'
          }`}>
            <div className="flex items-center gap-2">
              {cobroCompleto ? (
                <>
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <div>
                    <span className="text-base text-green-900 font-semibold block">✓ Cobro completo</span>
                    <span className="text-xs text-green-700">Puede confirmar la aceptación</span>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                  <div>
                    <span className="text-base text-red-900 font-semibold block">
                      Falta cobrar ${saldoPendiente.toFixed(2)}
                    </span>
                    <span className="text-xs text-red-700">
                      Debe cobrarse el 100% del presupuesto para aceptarlo
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {generaIVA && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-semibold text-blue-900">Cálculo IVA</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-blue-700">Neto Gravado:</p>
                  <p className="font-bold">${(total / 1.21).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-blue-700">IVA 21%:</p>
                  <p className="font-bold text-green-600">${(total - total / 1.21).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-blue-700">Total con IVA:</p>
                  <p className="font-bold">${total.toFixed(2)}</p>
                </div>
              </div>
              <p className="text-xs text-blue-700 mt-2">
                Se emitirá Factura B y se registrará en IVA Ventas
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmar} 
            className="bg-green-600 hover:bg-green-700"
            disabled={!cobroCompleto || pagos.length === 0}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Confirmar Aceptación y Cobro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}