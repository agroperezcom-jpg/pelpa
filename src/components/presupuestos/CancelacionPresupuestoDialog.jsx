import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  AlertTriangle, XCircle, Trash2, Plus, DollarSign, CheckCircle2
} from "lucide-react";

export default function CancelacionPresupuestoDialog({ isOpen, onClose, presupuesto, user, onConfirm }) {
  const [tipoCancelacion, setTipoCancelacion] = useState("ADMINISTRATIVA");
  const [motivo, setMotivo] = useState("");
  const [devoluciones, setDevoluciones] = useState([]);
  const [nuevaDevolucion, setNuevaDevolucion] = useState({
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

  const { data: proyecto } = useQuery({
    queryKey: ['proyecto', presupuesto?.proyecto_id],
    queryFn: async () => {
      if (!presupuesto?.proyecto_id) return null;
      const proyectos = await base44.entities.Project.list();
      return proyectos.find(p => p.id === presupuesto.proyecto_id);
    },
    enabled: isOpen && !!presupuesto?.proyecto_id
  });

  const agregarDevolucion = () => {
    if (!nuevaDevolucion.medio_pago_id || !nuevaDevolucion.importe || parseFloat(nuevaDevolucion.importe) <= 0) {
      return;
    }

    const medio = mediosPago.find(m => m.id === nuevaDevolucion.medio_pago_id);
    
    if (medio.requiere_banco && !nuevaDevolucion.banco_id) {
      alert("Seleccione un banco");
      return;
    }

    if (medio.requiere_caja && !nuevaDevolucion.caja_id) {
      alert("Seleccione una caja");
      return;
    }

    const banco = bancos.find(b => b.id === nuevaDevolucion.banco_id);
    const caja = cajas.find(c => c.id === nuevaDevolucion.caja_id);

    setDevoluciones([...devoluciones, {
      medio_pago_id: nuevaDevolucion.medio_pago_id,
      medio_pago_nombre: medio.nombre,
      importe: parseFloat(nuevaDevolucion.importe),
      banco_id: nuevaDevolucion.banco_id || null,
      banco_nombre: banco?.nombre || "",
      caja_id: nuevaDevolucion.caja_id || null,
      caja_nombre: caja?.nombre || ""
    }]);

    setNuevaDevolucion({ medio_pago_id: "", importe: "", banco_id: "", caja_id: "" });
  };

  const eliminarDevolucion = (index) => {
    setDevoluciones(devoluciones.filter((_, i) => i !== index));
  };

  const totalDevuelto = devoluciones.reduce((acc, d) => acc + d.importe, 0);
  const totalPresupuesto = presupuesto?.total_presupuesto || 0;
  const saldoPendiente = totalPresupuesto - totalDevuelto;
  const devolucionCompleta = Math.abs(saldoPendiente) < 0.01;

  const handleConfirmar = () => {
    if (!motivo || motivo.trim().length < 10) {
      alert("Debe ingresar un motivo detallado (mínimo 10 caracteres)");
      return;
    }

    if (tipoCancelacion === "CON_DEVOLUCION") {
      if (!devolucionCompleta) {
        alert("Debe registrar la devolución del 100% del monto cobrado");
        return;
      }
      if (devoluciones.length === 0) {
        alert("Debe agregar al menos un medio de devolución");
        return;
      }
    }

    onConfirm({
      tipoCancelacion,
      motivo,
      devoluciones: tipoCancelacion === "CON_DEVOLUCION" ? devoluciones : []
    });

    // Reset
    setTipoCancelacion("ADMINISTRATIVA");
    setMotivo("");
    setDevoluciones([]);
  };

  const handleClose = () => {
    setTipoCancelacion("ADMINISTRATIVA");
    setMotivo("");
    setDevoluciones([]);
    onClose();
  };

  const medioSeleccionado = mediosPago.find(m => m.id === nuevaDevolucion.medio_pago_id);

  // Verificar si el proyecto está avanzado
  const proyectoAvanzado = proyecto && (proyecto.progress_percentage || 0) > 25;

  // Auto-completar devolución
  const autoCompletar = () => {
    if (!nuevaDevolucion.medio_pago_id) {
      alert("Primero seleccione un medio de pago");
      return;
    }
    setNuevaDevolucion({ ...nuevaDevolucion, importe: saldoPendiente.toFixed(2) });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            Cancelar Presupuesto Aceptado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Advertencia Crítica */}
          <div className="p-4 bg-red-50 border-2 border-red-400 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-red-900 mb-1">⚠️ ACCIÓN IRREVERSIBLE</p>
                <p className="text-sm text-red-800">
                  Esta acción cancelará permanentemente el presupuesto, revertirá la venta, 
                  anulará el proyecto y devolverá los cobros. No se puede deshacer.
                </p>
              </div>
            </div>
          </div>

          {/* Info del Presupuesto */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 border rounded-lg">
              <p className="text-xs text-slate-500 uppercase mb-1">Presupuesto</p>
              <p className="text-lg font-bold text-slate-800">{presupuesto?.numero_presupuesto}</p>
              <p className="text-sm text-slate-600 mt-1">Cliente: {presupuesto?.cliente_name}</p>
            </div>
            <div className="p-4 bg-slate-50 border rounded-lg">
              <p className="text-xs text-slate-500 uppercase mb-1">Total Cobrado</p>
              <p className="text-lg font-bold text-red-600">${totalPresupuesto.toFixed(2)}</p>
              {presupuesto?.genera_iva && (
                <Badge className="bg-blue-100 text-blue-700 mt-1">Con IVA generado</Badge>
              )}
            </div>
          </div>

          {/* Estado del Proyecto */}
          {proyecto && (
            <div className={`p-4 border rounded-lg ${proyectoAvanzado ? 'bg-amber-50 border-amber-300' : 'bg-green-50 border-green-300'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Estado del Proyecto</p>
                  <p className="text-xs text-slate-600 mt-1">{proyecto.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{proyecto.progress_percentage || 0}%</p>
                  <p className="text-xs text-slate-600">de avance</p>
                </div>
              </div>
              {proyectoAvanzado && (
                <div className="mt-3 pt-3 border-t border-amber-300">
                  <p className="text-sm text-amber-800 font-medium">
                    ⚠️ El proyecto tiene más del 25% de avance. Verifique que sea correcto cancelarlo.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tipo de Cancelación */}
          <div className="space-y-2">
            <Label className="font-semibold">Tipo de Cancelación *</Label>
            <Select value={tipoCancelacion} onValueChange={setTipoCancelacion}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMINISTRATIVA">
                  📋 Administrativa (sin devolución de dinero)
                </SelectItem>
                <SelectItem value="CON_DEVOLUCION">
                  💰 Con Devolución de Dinero
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              {tipoCancelacion === "ADMINISTRATIVA" 
                ? "Para errores operativos o servicios no ejecutados sin devolución"
                : "Reintegro total al cliente"}
            </p>
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label className="font-semibold">Motivo de la Cancelación *</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Describa detalladamente el motivo de la cancelación (mínimo 10 caracteres)..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-slate-500">
              {motivo.length}/10 caracteres (mínimo)
            </p>
          </div>

          {/* Devoluciones (solo si es CON_DEVOLUCION) */}
          {tipoCancelacion === "CON_DEVOLUCION" && (
            <>
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Devolución de Cobros</h4>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Total a Devolver</p>
                    <p className="text-xl font-bold text-red-600">${totalPresupuesto.toFixed(2)}</p>
                  </div>
                </div>

                {/* Resumen */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">A Devolver</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">${totalPresupuesto.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Devuelto</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">${totalDevuelto.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Pendiente</p>
                    <p className={`text-2xl font-bold mt-1 ${saldoPendiente > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                      ${Math.abs(saldoPendiente).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Agregar Devolución */}
                <div className="border-2 border-red-200 bg-red-50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm text-red-900">Registrar Devolución</h4>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-4">
                      <Label className="text-xs">Medio de Pago *</Label>
                      <Select value={nuevaDevolucion.medio_pago_id} onValueChange={(v) => setNuevaDevolucion({ ...nuevaDevolucion, medio_pago_id: v, banco_id: "", caja_id: "" })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {mediosPago.map(m => (
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
                        value={nuevaDevolucion.importe}
                        onChange={(e) => setNuevaDevolucion({ ...nuevaDevolucion, importe: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>

                    {medioSeleccionado?.requiere_banco && (
                      <div className="col-span-3">
                        <Label className="text-xs">Banco *</Label>
                        <Select value={nuevaDevolucion.banco_id} onValueChange={(v) => setNuevaDevolucion({ ...nuevaDevolucion, banco_id: v })}>
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
                        <Select value={nuevaDevolucion.caja_id} onValueChange={(v) => setNuevaDevolucion({ ...nuevaDevolucion, caja_id: v })}>
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
                      <Button onClick={agregarDevolucion} className="flex-1 bg-red-600 hover:bg-red-700">
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

                {/* Lista de Devoluciones */}
                {devoluciones.length > 0 && (
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
                        {devoluciones.map((dev, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{dev.medio_pago_nombre}</TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {dev.banco_nombre && `🏦 ${dev.banco_nombre}`}
                              {dev.caja_nombre && `💵 ${dev.caja_nombre}`}
                              {!dev.banco_nombre && !dev.caja_nombre && "—"}
                            </TableCell>
                            <TableCell className="text-right font-bold text-red-600">${dev.importe.toFixed(2)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => eliminarDevolucion(idx)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Estado de Devolución */}
                <div className={`flex items-center gap-2 p-4 rounded-lg ${
                  devolucionCompleta ? 'bg-green-50 border-2 border-green-400' : 'bg-red-50 border-2 border-red-400'
                }`}>
                  {devolucionCompleta ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-green-900 font-semibold">
                        ✓ Devolución completa registrada
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <span className="text-sm text-red-900 font-semibold">
                        Falta devolver ${saldoPendiente.toFixed(2)}
                      </span>
                    </>
                  )}
                </div>
              </>
            </div>
          )}

          {/* Resumen de Reversiones */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="font-semibold text-sm text-blue-900 mb-3">Se ejecutarán las siguientes reversiones:</p>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Presupuesto → <Badge className="bg-red-100 text-red-700">CANCELADO</Badge>
              </li>
              <li className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Venta → <Badge className="bg-red-100 text-red-700">ANULADA</Badge>
              </li>
              <li className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Proyecto → <Badge className="bg-red-100 text-red-700">CANCELADO</Badge>
              </li>
              {tipoCancelacion === "CON_DEVOLUCION" && (
                <li className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Tesorería → {devoluciones.length} movimientos de EGRESO
                </li>
              )}
              {presupuesto?.genera_iva && (
                <li className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  IVA Ventas → Nota de crédito (revertir débito fiscal)
                </li>
              )}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmar}
            className="bg-red-600 hover:bg-red-700"
            disabled={
              !motivo || 
              motivo.trim().length < 10 || 
              (tipoCancelacion === "CON_DEVOLUCION" && !devolucionCompleta)
            }
          >
            <XCircle className="h-4 w-4 mr-2" />
            Confirmar Cancelación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}