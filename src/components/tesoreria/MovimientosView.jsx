import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Trash2, ArrowDownCircle, ArrowUpCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency } from "@/components/utils/formatCurrency";

export default function MovimientosView() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tipo: "INGRESO",
    medio_pago_id: "",
    banco_id: "",
    caja_id: "",
    importe: "",
    referencia_tipo: "ajuste",
    observaciones: ""
  });

  const queryClient = useQueryClient();

  const { data: movimientos = [] } = useQuery({
    queryKey: ['movimientosTesoreria'],
    queryFn: () => base44.entities.MovimientoTesoreria.list('-created_date', 1000)
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

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const medio = mediosPago.find(m => m.id === data.medio_pago_id);
      
      // Validaciones
      if (medio.requiere_banco && !data.banco_id) {
        throw new Error("Este medio de pago requiere seleccionar un banco");
      }
      if (medio.requiere_caja && !data.caja_id) {
        throw new Error("Este medio de pago requiere seleccionar una caja");
      }

      const banco = bancos.find(b => b.id === data.banco_id);
      const caja = cajas.find(c => c.id === data.caja_id);

      // Validar saldo suficiente para egresos
      if (data.tipo === "EGRESO") {
        if (data.banco_id && banco.saldo_actual < parseFloat(data.importe)) {
          throw new Error(`Saldo insuficiente en ${banco.nombre}. Saldo disponible: $${banco.saldo_actual}`);
        }
        if (data.caja_id && caja.saldo_actual < parseFloat(data.importe)) {
          throw new Error(`Saldo insuficiente en ${caja.nombre}. Saldo disponible: $${caja.saldo_actual}`);
        }
      }

      const movimiento = await base44.entities.MovimientoTesoreria.create({
        ...data,
        medio_pago_nombre: medio.nombre,
        banco_nombre: banco?.nombre || "",
        caja_nombre: caja?.nombre || ""
      });

      // Actualizar saldos
      if (data.banco_id) {
        const nuevoSaldo = data.tipo === "INGRESO" 
          ? banco.saldo_actual + parseFloat(data.importe)
          : banco.saldo_actual - parseFloat(data.importe);
        await base44.entities.Banco.update(data.banco_id, { saldo_actual: nuevoSaldo });
      }

      if (data.caja_id) {
        const nuevoSaldo = data.tipo === "INGRESO"
          ? caja.saldo_actual + parseFloat(data.importe)
          : caja.saldo_actual - parseFloat(data.importe);
        await base44.entities.Caja.update(data.caja_id, { saldo_actual: nuevoSaldo });
      }

      return movimiento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientosTesoreria'] });
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['cajas'] });
      handleCloseDialog();
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (movimiento) => {
      // Revertir saldo
      if (movimiento.banco_id) {
        const banco = bancos.find(b => b.id === movimiento.banco_id);
        const nuevoSaldo = movimiento.tipo === "INGRESO"
          ? banco.saldo_actual - movimiento.importe
          : banco.saldo_actual + movimiento.importe;
        await base44.entities.Banco.update(movimiento.banco_id, { saldo_actual: nuevoSaldo });
      }

      if (movimiento.caja_id) {
        const caja = cajas.find(c => c.id === movimiento.caja_id);
        const nuevoSaldo = movimiento.tipo === "INGRESO"
          ? caja.saldo_actual - movimiento.importe
          : caja.saldo_actual + movimiento.importe;
        await base44.entities.Caja.update(movimiento.caja_id, { saldo_actual: nuevoSaldo });
      }

      await base44.entities.MovimientoTesoreria.delete(movimiento.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientosTesoreria'] });
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['cajas'] });
    }
  });

  const handleOpenDialog = () => {
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      tipo: "INGRESO",
      medio_pago_id: "",
      banco_id: "",
      caja_id: "",
      importe: "",
      referencia_tipo: "ajuste",
      observaciones: ""
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      importe: parseFloat(formData.importe)
    });
  };

  const medioSeleccionado = mediosPago.find(m => m.id === formData.medio_pago_id);

  const movimientosFiltrados = movimientos.filter(mov => {
    const fechaMov = new Date(mov.fecha);
    const desde = fechaDesde ? new Date(fechaDesde) : null;
    const hasta = fechaHasta ? new Date(fechaHasta) : null;

    const cumpleFecha = (!desde || fechaMov >= desde) && (!hasta || fechaMov <= hasta);
    const cumpleTipo = tipoFiltro === "todos" || mov.tipo === tipoFiltro;

    return cumpleFecha && cumpleTipo;
  });

  const totalIngresos = movimientosFiltrados
    .filter(m => m.tipo === "INGRESO")
    .reduce((acc, m) => acc + m.importe, 0);
  
  const totalEgresos = movimientosFiltrados
    .filter(m => m.tipo === "EGRESO")
    .reduce((acc, m) => acc + m.importe, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Movimientos de Tesorería</h3>
        <Button onClick={handleOpenDialog} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Movimiento
        </Button>
      </div>

      {/* Filtros */}
      <Card className="border-0 shadow-sm">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Desde</Label>
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Hasta</Label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Tipo</Label>
              <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="INGRESO">Solo Ingresos</SelectItem>
                  <SelectItem value="EGRESO">Solo Egresos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setFechaDesde("");
                  setFechaHasta("");
                  setTipoFiltro("todos");
                }}
                className="w-full"
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
            <div>
              <p className="text-xs text-slate-500">Total Ingresos</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIngresos)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Egresos</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalEgresos)}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Medio de Pago</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimientosFiltrados.map((mov) => (
              <TableRow key={mov.id} className="hover:bg-slate-50">
                <TableCell className="text-sm text-slate-600">
                  {format(new Date(mov.fecha), "d MMM yyyy", { locale: es })}
                </TableCell>
                <TableCell>
                  <Badge className={mov.tipo === "INGRESO" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                    {mov.tipo === "INGRESO" ? (
                      <ArrowDownCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowUpCircle className="h-3 w-3 mr-1" />
                    )}
                    {mov.tipo}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{mov.medio_pago_nombre}</TableCell>
                <TableCell className="text-sm">
                  {mov.banco_nombre && <div className="text-blue-600">🏦 {mov.banco_nombre}</div>}
                  {mov.caja_nombre && <div className="text-emerald-600">💵 {mov.caja_nombre}</div>}
                </TableCell>
                <TableCell className="text-right">
                  <span className={`font-bold ${mov.tipo === "INGRESO" ? "text-green-600" : "text-red-600"}`}>
                    {mov.tipo === "INGRESO" ? "+" : "-"} {formatCurrency(mov.importe, false)}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-slate-500 capitalize">{mov.referencia_tipo}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => deleteMutation.mutate(mov)} className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
              ))}
              {movimientosFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No hay movimientos registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Movimiento de Tesorería</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INGRESO">Ingreso</SelectItem>
                    <SelectItem value="EGRESO">Egreso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Medio de Pago *</Label>
              <Select value={formData.medio_pago_id} onValueChange={(v) => setFormData({ ...formData, medio_pago_id: v, banco_id: "", caja_id: "" })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar medio" />
                </SelectTrigger>
                <SelectContent>
                  {mediosPago.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {medioSeleccionado?.requiere_banco && (
              <div className="space-y-2">
                <Label>Banco * <Badge className="ml-2 bg-blue-100 text-blue-700">Requerido</Badge></Label>
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
                <Label>Caja * <Badge className="ml-2 bg-emerald-100 text-emerald-700">Requerido</Badge></Label>
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
              <Label>Tipo de Referencia</Label>
              <Select value={formData.referencia_tipo} onValueChange={(v) => setFormData({ ...formData, referencia_tipo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ajuste">Ajuste Manual</SelectItem>
                  <SelectItem value="venta">Venta</SelectItem>
                  <SelectItem value="cobro">Cobro Cliente</SelectItem>
                  <SelectItem value="pago">Pago Proveedor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Detalles adicionales..."
                rows={2}
              />
            </div>

            {medioSeleccionado && (medioSeleccionado.requiere_banco || medioSeleccionado.requiere_caja) && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Validación obligatoria</p>
                  <p>Este medio de pago requiere seleccionar {medioSeleccionado.requiere_banco ? 'banco' : 'caja'}</p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                Crear Movimiento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}