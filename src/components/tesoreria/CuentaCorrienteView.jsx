import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Users, Package, TrendingUp, TrendingDown, DollarSign, HandCoins } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function CuentaCorrienteView() {
  const [isCobroDialogOpen, setIsCobroDialogOpen] = useState(false);
  const [isPagoDialogOpen, setIsPagoDialogOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [formData, setFormData] = useState({
    monto: "",
    medio_pago_id: "",
    banco_id: "",
    caja_id: ""
  });

  const queryClient = useQueryClient();

  const { data: clientes = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: proveedores = [] } = useQuery({
    queryKey: ['proveedores'],
    queryFn: () => base44.entities.Proveedor.list()
  });

  const { data: movimientosCC = [] } = useQuery({
    queryKey: ['movimientosCC'],
    queryFn: () => base44.entities.MovimientoCC.list('-created_date', 100)
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

  const movimientosClientes = movimientosCC.filter(m => m.tipo_entidad === "CLIENTE");
  const movimientosProveedores = movimientosCC.filter(m => m.tipo_entidad === "PROVEEDOR");

  const totalDeudaClientes = clientes.reduce((acc, c) => acc + (c.saldo_cc || 0), 0);
  const totalDeudaProveedores = proveedores.reduce((acc, p) => acc + (p.saldo_cc || 0), 0);

  const cobrarClienteMutation = useMutation({
    mutationFn: async (data) => {
      const medio = mediosPago.find(m => m.id === data.medio_pago_id);
      const monto = parseFloat(data.monto);
      const cliente = clientes.find(c => c.id === selectedEntity.id);
      const nuevoSaldo = cliente.saldo_cc - monto;

      // Crear MovimientoCC (HABER)
      await base44.entities.MovimientoCC.create({
        tipo_entidad: "CLIENTE",
        entidad_id: cliente.id,
        entidad_nombre: cliente.name,
        fecha: new Date().toISOString().split('T')[0],
        concepto: `Cobro - ${medio.nombre}`,
        debe: 0,
        haber: monto,
        saldo: nuevoSaldo,
        referencia_tipo: "cobro",
        referencia_id: ""
      });

      // Actualizar saldo del cliente
      await base44.entities.Client.update(cliente.id, { saldo_cc: nuevoSaldo });

      // Crear MovimientoTesoreria (INGRESO)
      const banco = bancos.find(b => b.id === data.banco_id);
      const caja = cajas.find(c => c.id === data.caja_id);

      await base44.entities.MovimientoTesoreria.create({
        fecha: new Date().toISOString().split('T')[0],
        tipo: "INGRESO",
        medio_pago_id: medio.id,
        medio_pago_nombre: medio.nombre,
        banco_id: medio.requiere_banco ? banco?.id : null,
        banco_nombre: medio.requiere_banco ? banco?.nombre : "",
        caja_id: medio.requiere_caja ? caja?.id : null,
        caja_nombre: medio.requiere_caja ? caja?.nombre : "",
        importe: monto,
        referencia_tipo: "cobro",
        observaciones: `Cobro a ${cliente.name}`
      });

      // Actualizar saldos de banco/caja
      if (medio.requiere_banco && banco) {
        await base44.entities.Banco.update(banco.id, {
          saldo_actual: banco.saldo_actual + monto
        });
      }
      if (medio.requiere_caja && caja) {
        await base44.entities.Caja.update(caja.id, {
          saldo_actual: caja.saldo_actual + monto
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['movimientosCC'] });
      queryClient.invalidateQueries({ queryKey: ['movimientosTesoreria'] });
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['cajas'] });
      setIsCobroDialogOpen(false);
      setFormData({ monto: "", medio_pago_id: "", banco_id: "", caja_id: "" });
    }
  });

  const pagarProveedorMutation = useMutation({
    mutationFn: async (data) => {
      const medio = mediosPago.find(m => m.id === data.medio_pago_id);
      const monto = parseFloat(data.monto);
      const proveedor = proveedores.find(p => p.id === selectedEntity.id);
      const nuevoSaldo = proveedor.saldo_cc - monto;

      // Crear MovimientoCC (HABER)
      await base44.entities.MovimientoCC.create({
        tipo_entidad: "PROVEEDOR",
        entidad_id: proveedor.id,
        entidad_nombre: proveedor.nombre,
        fecha: new Date().toISOString().split('T')[0],
        concepto: `Pago - ${medio.nombre}`,
        debe: 0,
        haber: monto,
        saldo: nuevoSaldo,
        referencia_tipo: "pago",
        referencia_id: ""
      });

      // Actualizar saldo del proveedor
      await base44.entities.Proveedor.update(proveedor.id, { saldo_cc: nuevoSaldo });

      // Crear MovimientoTesoreria (EGRESO)
      const banco = bancos.find(b => b.id === data.banco_id);
      const caja = cajas.find(c => c.id === data.caja_id);

      await base44.entities.MovimientoTesoreria.create({
        fecha: new Date().toISOString().split('T')[0],
        tipo: "EGRESO",
        medio_pago_id: medio.id,
        medio_pago_nombre: medio.nombre,
        banco_id: medio.requiere_banco ? banco?.id : null,
        banco_nombre: medio.requiere_banco ? banco?.nombre : "",
        caja_id: medio.requiere_caja ? caja?.id : null,
        caja_nombre: medio.requiere_caja ? caja?.nombre : "",
        importe: monto,
        referencia_tipo: "pago",
        observaciones: `Pago a ${proveedor.nombre}`
      });

      // Actualizar saldos de banco/caja
      if (medio.requiere_banco && banco) {
        await base44.entities.Banco.update(banco.id, {
          saldo_actual: banco.saldo_actual - monto
        });
      }
      if (medio.requiere_caja && caja) {
        await base44.entities.Caja.update(caja.id, {
          saldo_actual: caja.saldo_actual - monto
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      queryClient.invalidateQueries({ queryKey: ['movimientosCC'] });
      queryClient.invalidateQueries({ queryKey: ['movimientosTesoreria'] });
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['cajas'] });
      setIsPagoDialogOpen(false);
      setFormData({ monto: "", medio_pago_id: "", banco_id: "", caja_id: "" });
    }
  });

  const handleCobrarCliente = (cliente) => {
    setSelectedEntity(cliente);
    setFormData({ monto: cliente.saldo_cc.toString(), medio_pago_id: "", banco_id: "", caja_id: "" });
    setIsCobroDialogOpen(true);
  };

  const handlePagarProveedor = (proveedor) => {
    setSelectedEntity(proveedor);
    setFormData({ monto: proveedor.saldo_cc.toString(), medio_pago_id: "", banco_id: "", caja_id: "" });
    setIsPagoDialogOpen(true);
  };

  const medioSeleccionado = mediosPago.find(m => m.id === formData.medio_pago_id);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Cuenta Corriente</h3>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Deuda Clientes</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  ${totalDeudaClientes.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">{clientes.length} clientes</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-0 shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Deuda Proveedores</p>
                <p className="text-3xl font-bold text-amber-600 mt-2">
                  ${totalDeudaProveedores.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">{proveedores.length} proveedores</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Package className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="clientes" className="space-y-4">
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="clientes" className="gap-2">
            <Users className="h-4 w-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="proveedores" className="gap-2">
            <Package className="h-4 w-4" />
            Proveedores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clientes">
          <Card className="border-0 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.filter(c => c.saldo_cc > 0).map((cliente) => (
                  <TableRow key={cliente.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{cliente.name}</TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-2">
                      <span className="font-bold text-blue-600">
                        ${cliente.saldo_cc?.toLocaleString() || 0}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => handleCobrarCliente(cliente)}>
                        <DollarSign className="h-3 w-3 mr-1" />
                        Cobrar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {clientes.filter(c => c.saldo_cc > 0).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-slate-500">
                      No hay clientes con deuda
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          <Card className="border-0 shadow-sm overflow-hidden mt-4">
            <div className="p-4 border-b bg-slate-50">
              <h4 className="font-semibold">Movimientos de Clientes</h4>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Debe</TableHead>
                  <TableHead className="text-right">Haber</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientosClientes.map((mov) => (
                  <TableRow key={mov.id} className="hover:bg-slate-50">
                    <TableCell className="text-sm text-slate-600">
                      {format(new Date(mov.fecha), "d MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium">{mov.entidad_nombre}</TableCell>
                    <TableCell className="text-sm">{mov.concepto}</TableCell>
                    <TableCell className="text-right">
                      {mov.debe > 0 && (
                        <span className="text-red-600 font-medium flex items-center justify-end gap-1">
                          <TrendingUp className="h-3 w-3" />
                          ${mov.debe.toLocaleString()}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {mov.haber > 0 && (
                        <span className="text-green-600 font-medium flex items-center justify-end gap-1">
                          <TrendingDown className="h-3 w-3" />
                          ${mov.haber.toLocaleString()}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold">${mov.saldo?.toLocaleString() || 0}</TableCell>
                  </TableRow>
                ))}
                {movimientosClientes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No hay movimientos de cuenta corriente
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="proveedores">
          <Card className="border-0 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proveedores.filter(p => p.saldo_cc > 0).map((proveedor) => (
                  <TableRow key={proveedor.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{proveedor.nombre}</TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-2">
                      <span className="font-bold text-amber-600">
                        ${proveedor.saldo_cc?.toLocaleString() || 0}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => handlePagarProveedor(proveedor)}>
                        <HandCoins className="h-3 w-3 mr-1" />
                        Pagar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {proveedores.filter(p => p.saldo_cc > 0).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-slate-500">
                      No hay proveedores con deuda
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          <Card className="border-0 shadow-sm overflow-hidden mt-4">
            <div className="p-4 border-b bg-slate-50">
              <h4 className="font-semibold">Movimientos de Proveedores</h4>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Debe</TableHead>
                  <TableHead className="text-right">Haber</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientosProveedores.map((mov) => (
                  <TableRow key={mov.id} className="hover:bg-slate-50">
                    <TableCell className="text-sm text-slate-600">
                      {format(new Date(mov.fecha), "d MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium">{mov.entidad_nombre}</TableCell>
                    <TableCell className="text-sm">{mov.concepto}</TableCell>
                    <TableCell className="text-right">
                      {mov.debe > 0 && (
                        <span className="text-red-600 font-medium flex items-center justify-end gap-1">
                          <TrendingUp className="h-3 w-3" />
                          ${mov.debe.toLocaleString()}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {mov.haber > 0 && (
                        <span className="text-green-600 font-medium flex items-center justify-end gap-1">
                          <TrendingDown className="h-3 w-3" />
                          ${mov.haber.toLocaleString()}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold">${mov.saldo?.toLocaleString() || 0}</TableCell>
                  </TableRow>
                ))}
                {movimientosProveedores.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No hay movimientos de cuenta corriente
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Cobrar Cliente */}
      <Dialog open={isCobroDialogOpen} onOpenChange={setIsCobroDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cobrar a {selectedEntity?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); cobrarClienteMutation.mutate(formData); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Monto a Cobrar *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.monto}
                onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                placeholder="0.00"
                required
              />
              <p className="text-xs text-slate-500">Saldo actual: ${selectedEntity?.saldo_cc?.toLocaleString()}</p>
            </div>

            <div className="space-y-2">
              <Label>Medio de Pago *</Label>
              <Select value={formData.medio_pago_id} onValueChange={(v) => setFormData({ ...formData, medio_pago_id: v, banco_id: "", caja_id: "" })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar medio" />
                </SelectTrigger>
                <SelectContent>
                  {mediosPago.filter(m => m.nombre !== "Cuenta Corriente").map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {medioSeleccionado?.requiere_banco && (
              <div className="space-y-2">
                <Label>Banco *</Label>
                <Select value={formData.banco_id} onValueChange={(v) => setFormData({ ...formData, banco_id: v })}>
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label>Caja *</Label>
                <Select value={formData.caja_id} onValueChange={(v) => setFormData({ ...formData, caja_id: v })}>
                  <SelectTrigger>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCobroDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Registrar Cobro
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Pagar Proveedor */}
      <Dialog open={isPagoDialogOpen} onOpenChange={setIsPagoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pagar a {selectedEntity?.nombre}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); pagarProveedorMutation.mutate(formData); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Monto a Pagar *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.monto}
                onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                placeholder="0.00"
                required
              />
              <p className="text-xs text-slate-500">Saldo actual: ${selectedEntity?.saldo_cc?.toLocaleString()}</p>
            </div>

            <div className="space-y-2">
              <Label>Medio de Pago *</Label>
              <Select value={formData.medio_pago_id} onValueChange={(v) => setFormData({ ...formData, medio_pago_id: v, banco_id: "", caja_id: "" })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar medio" />
                </SelectTrigger>
                <SelectContent>
                  {mediosPago.filter(m => m.nombre !== "Cuenta Corriente").map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {medioSeleccionado?.requiere_banco && (
              <div className="space-y-2">
                <Label>Banco *</Label>
                <Select value={formData.banco_id} onValueChange={(v) => setFormData({ ...formData, banco_id: v })}>
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label>Caja *</Label>
                <Select value={formData.caja_id} onValueChange={(v) => setFormData({ ...formData, caja_id: v })}>
                  <SelectTrigger>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPagoDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
                Registrar Pago
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}