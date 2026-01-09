import React, { useState, useEffect, useRef } from "react";
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
import { Plus, Trash2, CreditCard, AlertCircle, CheckCircle, Banknote, Receipt as ReceiptIcon, Smartphone, FileText } from "lucide-react";

export default function PagosDialog({ isOpen, onClose, total, onConfirm, clienteId }) {
  const [pagos, setPagos] = useState([]);
  const [nuevoPago, setNuevoPago] = useState({
    medio_pago_id: "",
    importe: "",
    banco_id: "",
    caja_id: "",
    es_cheque: false,
    cheque_numero: "",
    cheque_banco_id: "",
    cheque_fecha_vencimiento: ""
  });
  const importeRef = useRef(null);

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

  const { data: bancosLista = [] } = useQuery({
    queryKey: ['bancos'],
    queryFn: () => base44.entities.Banco.list()
  });

  const medioSeleccionado = mediosPago.find(m => m.id === nuevoPago.medio_pago_id);
  const totalPagado = pagos.reduce((acc, p) => acc + parseFloat(p.importe), 0);
  const saldoPendiente = total - totalPagado;
  const pagoCompleto = Math.abs(saldoPendiente) < 0.01;

  // Autocompletar importe con saldo pendiente cuando se selecciona medio
  useEffect(() => {
    if (nuevoPago.medio_pago_id && !nuevoPago.importe && saldoPendiente > 0) {
      setNuevoPago(prev => ({ ...prev, importe: saldoPendiente.toFixed(2) }));
      setTimeout(() => importeRef.current?.select(), 100);
    }
  }, [nuevoPago.medio_pago_id, saldoPendiente]);

  // Preseleccionar caja activa si medio lo requiere
  useEffect(() => {
    if (medioSeleccionado?.requiere_caja && !nuevoPago.caja_id && cajas.length > 0) {
      const cajaActiva = cajas.find(c => c.is_active) || cajas[0];
      setNuevoPago(prev => ({ ...prev, caja_id: cajaActiva.id }));
    }
  }, [medioSeleccionado, cajas]);

  // Atajos de teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Enter" && !e.shiftKey && nuevoPago.medio_pago_id && nuevoPago.importe) {
        e.preventDefault();
        agregarPago();
        return;
      }

      // F2 = Efectivo, F3 = Débito, F4 = Crédito, F5 = Transferencia
      const atajosMedias = {
        "F2": "Efectivo",
        "F3": "Débito",
        "F4": "Crédito",
        "F5": "Transferencia"
      };

      if (atajosMedias[e.key]) {
        e.preventDefault();
        const medio = mediosPago.find(m => m.nombre === atajosMedias[e.key]);
        if (medio) {
          setNuevoPago(prev => ({ ...prev, medio_pago_id: medio.id, banco_id: "", caja_id: "" }));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, nuevoPago, mediosPago, onClose]);

  const agregarPago = () => {
    if (nuevoPago.es_cheque) {
      if (!nuevoPago.cheque_numero || !nuevoPago.cheque_banco_id || !nuevoPago.importe || parseFloat(nuevoPago.importe) <= 0) {
        alert("Complete todos los campos del cheque");
        return;
      }
    } else if (!nuevoPago.medio_pago_id || !nuevoPago.importe || parseFloat(nuevoPago.importe) <= 0) {
      return;
    }

    const importePago = parseFloat(nuevoPago.importe);

    // REGLA UX: No permitir pagar más del saldo pendiente
    if (importePago > saldoPendiente + 0.01) {
      alert(`No se puede pagar más del saldo pendiente ($${saldoPendiente.toFixed(2)})`);
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
      importe: importePago,
      banco_id: nuevoPago.banco_id || null,
      banco_nombre: banco?.nombre || "",
      caja_id: nuevoPago.caja_id || null,
      caja_nombre: caja?.nombre || "",
      es_cheque: nuevoPago.es_cheque || false,
      cheque_numero: nuevoPago.cheque_numero || "",
      cheque_banco_id: nuevoPago.cheque_banco_id || "",
      cheque_fecha_vencimiento: nuevoPago.cheque_fecha_vencimiento || ""
    }]);

    setNuevoPago({
      medio_pago_id: "",
      importe: "",
      banco_id: "",
      caja_id: "",
      es_cheque: false,
      cheque_numero: "",
      cheque_banco_id: "",
      cheque_fecha_vencimiento: ""
    });
  };

  const eliminarPago = (index) => {
    setPagos(pagos.filter((_, i) => i !== index));
  };

  const handleConfirmar = () => {
    // Si hay saldo pendiente y hay cliente, preguntar si lo deja en CC
    if (saldoPendiente > 0.01 && clienteId) {
      const confirmar = window.confirm(
        `Saldo pendiente: $${saldoPendiente.toFixed(2)}\n\n¿Desea dejar el saldo en cuenta corriente del cliente?`
      );
      
      if (confirmar) {
        // Agregar pago automático en cuenta corriente
        const medioCuentaCorriente = mediosPago.find(m => m.nombre === "Cuenta Corriente");
        if (medioCuentaCorriente) {
          const nuevosPagos = [...pagos, {
            medio_pago_id: medioCuentaCorriente.id,
            medio_pago_nombre: "Cuenta Corriente",
            importe: saldoPendiente,
            banco_id: null,
            banco_nombre: "",
            caja_id: null,
            caja_nombre: ""
          }];
          
          onConfirm(nuevosPagos, "MIXTA");
          return;
        }
      } else {
        return;
      }
    }

    if (!pagoCompleto && !clienteId) {
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
          <div className="grid grid-cols-3 gap-4 p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-slate-200">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Total Venta</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">${total.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Pagado</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">${totalPagado.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Pendiente</p>
              <p className={`text-3xl font-bold mt-1 ${saldoPendiente > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                ${Math.abs(saldoPendiente).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Botones Rápidos */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Medios de Pago Rápidos</Label>
            <div className="grid grid-cols-6 gap-2">
              {mediosPago.filter(m => ["Efectivo", "Débito", "Crédito", "Transferencia", "Cuenta Corriente", "Cheque"].includes(m.nombre)).map(medio => {
                const iconMap = {
                  "Efectivo": Banknote,
                  "Débito": CreditCard,
                  "Crédito": CreditCard,
                  "Transferencia": Smartphone,
                  "Cuenta Corriente": ReceiptIcon
                };
                const Icon = iconMap[medio.nombre] || CreditCard;
                const disabled = medio.nombre === "Cuenta Corriente" && !clienteId;
                
                return (
                  <Button
                    key={medio.id}
                    variant={nuevoPago.medio_pago_id === medio.id && !nuevoPago.es_cheque ? "default" : "outline"}
                    className={`h-16 flex flex-col gap-1 ${nuevoPago.medio_pago_id === medio.id && !nuevoPago.es_cheque ? 'bg-emerald-600' : ''}`}
                    onClick={() => !disabled && setNuevoPago({ ...nuevoPago, medio_pago_id: medio.id, banco_id: "", caja_id: "", es_cheque: false })}
                    disabled={disabled}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{medio.nombre.split(' ')[0]}</span>
                  </Button>
                );
              })}
              <Button
                variant={nuevoPago.es_cheque ? "default" : "outline"}
                className={`h-16 flex flex-col gap-1 ${nuevoPago.es_cheque ? 'bg-purple-600' : ''}`}
                onClick={() => setNuevoPago({ ...nuevoPago, es_cheque: true, medio_pago_id: "" })}
              >
                <FileText className="h-5 w-5" />
                <span className="text-xs">Cheque</span>
              </Button>
            </div>
          </div>

          {/* Agregar Pago */}
          {(nuevoPago.medio_pago_id || nuevoPago.es_cheque) && (
            <div className={`border-2 rounded-lg p-4 space-y-3 ${nuevoPago.es_cheque ? 'border-purple-200 bg-purple-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <h4 className={`font-medium text-sm ${nuevoPago.es_cheque ? 'text-purple-900' : 'text-emerald-900'}`}>
                {nuevoPago.es_cheque ? 'Detalle del Cheque' : 'Detalle del Pago'}
              </h4>
              <div className="grid grid-cols-12 gap-3">
                {nuevoPago.es_cheque ? (
                  <>
                    <div className="col-span-3">
                      <Label className="text-xs font-medium">Número Cheque *</Label>
                      <Input
                        value={nuevoPago.cheque_numero}
                        onChange={(e) => setNuevoPago({ ...nuevoPago, cheque_numero: e.target.value })}
                        placeholder="12345678"
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs font-medium">Banco *</Label>
                      <Select value={nuevoPago.cheque_banco_id} onValueChange={(v) => setNuevoPago({ ...nuevoPago, cheque_banco_id: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {bancosLista.map(b => (
                            <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs font-medium">Vencimiento</Label>
                      <Input
                        type="date"
                        value={nuevoPago.cheque_fecha_vencimiento}
                        onChange={(e) => setNuevoPago({ ...nuevoPago, cheque_fecha_vencimiento: e.target.value })}
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs font-medium">Importe *</Label>
                      <Input
                        ref={importeRef}
                        type="number"
                        step="0.01"
                        value={nuevoPago.importe}
                        onChange={(e) => setNuevoPago({ ...nuevoPago, importe: e.target.value })}
                        placeholder="0.00"
                        className="text-lg font-bold h-12"
                        autoFocus
                      />
                    </div>
                    <div className="col-span-1 flex items-end">
                      <Button 
                        onClick={agregarPago} 
                        className="w-full h-12 bg-purple-600 hover:bg-purple-700 font-medium"
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="col-span-5">
                      <Label className="text-xs font-medium">Importe *</Label>
                      <Input
                        ref={importeRef}
                        type="number"
                        step="0.01"
                        value={nuevoPago.importe}
                        onChange={(e) => setNuevoPago({ ...nuevoPago, importe: e.target.value })}
                        placeholder="0.00"
                        className="text-lg font-bold h-12"
                        autoFocus
                      />
                      <p className="text-xs text-emerald-700 mt-1">Presiona ENTER para agregar</p>
                    </div>

                    {medioSeleccionado?.requiere_banco && (
                      <div className="col-span-5">
                        <Label className="text-xs font-medium">Banco *</Label>
                        <Select value={nuevoPago.banco_id} onValueChange={(v) => setNuevoPago({ ...nuevoPago, banco_id: v })}>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Seleccionar banco" />
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
                      <div className="col-span-5">
                        <Label className="text-xs font-medium">Caja *</Label>
                        <Select value={nuevoPago.caja_id} onValueChange={(v) => setNuevoPago({ ...nuevoPago, caja_id: v })}>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Seleccionar caja" />
                          </SelectTrigger>
                          <SelectContent>
                            {cajas.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="col-span-2 flex items-end">
                      <Button 
                        onClick={agregarPago} 
                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-medium"
                      >
                        <Plus className="h-5 w-5 mr-1" />
                        Agregar
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

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
                      <TableCell>
                        <div className="font-medium">{pago.es_cheque ? "Cheque" : pago.medio_pago_nombre}</div>
                        {pago.es_cheque && (
                          <div className="text-xs text-purple-600">Nº {pago.cheque_numero}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {pago.es_cheque && pago.cheque_banco_id && bancosLista.find(b => b.id === pago.cheque_banco_id)?.nombre}
                        {!pago.es_cheque && pago.banco_nombre && `🏦 ${pago.banco_nombre}`}
                        {!pago.es_cheque && pago.caja_nombre && `💵 ${pago.caja_nombre}`}
                        {!pago.es_cheque && !pago.banco_nombre && !pago.caja_nombre && "—"}
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
          <div className={`flex items-center justify-between gap-2 p-4 rounded-lg ${
            pagoCompleto ? 'bg-green-50 border-2 border-green-300' : 'bg-amber-50 border-2 border-amber-300'
          }`}>
            <div className="flex items-center gap-2">
              {pagoCompleto ? (
                <>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <span className="text-base text-green-900 font-semibold">✓ Pago completo</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                  <div>
                    <span className="text-base text-amber-900 font-semibold block">
                      {pagos.length === 0 ? "Seleccione un medio de pago" : "Falta completar el pago"}
                    </span>
                    {saldoPendiente > 0.01 && (
                      <span className="text-sm text-amber-700">
                        Pendiente: ${saldoPendiente.toFixed(2)}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
            {!pagoCompleto && saldoPendiente > 0 && clienteId && (
              <Badge className="bg-blue-100 text-blue-700 text-xs">
                Puede confirmar con CC
              </Badge>
            )}
          </div>

          {/* Atajos de Teclado */}
          <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
            <p className="font-medium mb-1">Atajos de teclado:</p>
            <div className="grid grid-cols-2 gap-1">
              <span>• F2: Efectivo</span>
              <span>• F3: Débito</span>
              <span>• F4: Crédito</span>
              <span>• F5: Transferencia</span>
              <span>• ENTER: Agregar pago</span>
              <span>• ESC: Cancelar</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} size="lg">
            Cancelar (ESC)
          </Button>
          <Button 
            onClick={handleConfirmar}
            disabled={pagos.length === 0 && !clienteId}
            className="bg-emerald-600 hover:bg-emerald-700 text-lg h-12 px-8 font-semibold"
          >
            {pagoCompleto ? "✓ Confirmar Venta" : (clienteId && saldoPendiente > 0 ? "Confirmar (con CC)" : "Falta completar pago")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}