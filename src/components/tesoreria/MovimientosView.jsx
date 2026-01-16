import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
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
import { ArrowDownCircle, ArrowUpCircle, ShoppingCart, DollarSign, Receipt, FileText, Info } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency } from "@/components/utils/formatCurrency";

export default function MovimientosView() {
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedMovimiento, setSelectedMovimiento] = useState(null);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("todos");

  // Fetch entidades origen
  const { data: gastos = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date', 1000)
  });

  const { data: ventas = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-created_date', 1000)
  });

  const { data: compras = [] } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => base44.entities.Compra.list('-fecha', 1000)
  });

  const { data: presupuestos = [] } = useQuery({
    queryKey: ['presupuestos'],
    queryFn: () => base44.entities.Presupuesto.list('-created_date', 1000)
  });

  // Generar movimientos derivados en tiempo real
  const movimientosDerivados = useMemo(() => {
    const movs = [];

    // Gastos → EGRESO
    gastos.forEach(gasto => {
      movs.push({
        id: `gasto-${gasto.id}`,
        fecha: gasto.date,
        tipo: "EGRESO",
        importe: gasto.amount,
        origen: "Gasto",
        origen_id: gasto.id,
        descripcion: gasto.description,
        medio_pago: gasto.medio_pago_nombre || gasto.payment_method || "N/A",
        banco_nombre: gasto.banco_nombre || "",
        caja_nombre: gasto.caja_nombre || "",
        cuenta_contable: gasto.cuenta_contable_nombre || gasto.category,
        created_date: gasto.created_date
      });
    });

    // Ventas confirmadas → INGRESO
    ventas.filter(v => v.estado === "CONFIRMADA").forEach(venta => {
      movs.push({
        id: `venta-${venta.id}`,
        fecha: venta.created_date.split('T')[0],
        tipo: "INGRESO",
        importe: venta.total,
        origen: "Venta",
        origen_id: venta.id,
        descripcion: `Venta ${venta.numero_comprobante || venta.id.slice(0, 8)}`,
        medio_pago: "Venta",
        banco_nombre: "",
        caja_nombre: "",
        cuenta_contable: venta.cuenta_contable_nombre || "",
        created_date: venta.created_date
      });
    });

    // Compras → EGRESO
    compras.forEach(compra => {
      movs.push({
        id: `compra-${compra.id}`,
        fecha: compra.fecha,
        tipo: "EGRESO",
        importe: compra.total,
        origen: "Compra",
        origen_id: compra.id,
        descripcion: `Compra ${compra.numero_comprobante || compra.id.slice(0, 8)}`,
        medio_pago: compra.forma_pago || "N/A",
        banco_nombre: "",
        caja_nombre: "",
        cuenta_contable: "",
        created_date: compra.created_date
      });
    });

    // Presupuestos aprobados/confirmados → INGRESO
    presupuestos.filter(p => p.estado === "aprobado" || p.estado === "confirmado").forEach(pres => {
      movs.push({
        id: `presupuesto-${pres.id}`,
        fecha: pres.created_date.split('T')[0],
        tipo: "INGRESO",
        importe: pres.total,
        origen: "Presupuesto",
        origen_id: pres.id,
        descripcion: `Presupuesto ${pres.numero || pres.id.slice(0, 8)}`,
        medio_pago: "Presupuesto",
        banco_nombre: "",
        caja_nombre: "",
        cuenta_contable: "",
        created_date: pres.created_date
      });
    });

    // Ordenar por fecha descendente
    return movs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }, [gastos, ventas, compras, presupuestos]);

  // Filtrar movimientos
  const movimientosFiltrados = movimientosDerivados.filter(mov => {
    const fechaMov = new Date(mov.fecha);
    const desde = fechaDesde ? new Date(fechaDesde) : null;
    const hasta fechaHasta ? new Date(fechaHasta) : null;

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

  const getOrigenIcon = (origen) => {
    switch (origen) {
      case "Gasto": return <Receipt className="h-4 w-4" />;
      case "Venta": return <DollarSign className="h-4 w-4" />;
      case "Compra": return <ShoppingCart className="h-4 w-4" />;
      case "Presupuesto": return <FileText className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Movimientos de Tesorería</h3>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <Info className="h-3 w-3" />
            Vista derivada en tiempo real desde Gastos, Ventas, Compras y Presupuestos
          </p>
        </div>
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
              <TableHead>Origen</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Medio/Destino</TableHead>
              <TableHead className="text-right">Importe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimientosFiltrados.map((mov) => (
              <TableRow 
                key={mov.id} 
                className="hover:bg-slate-50 cursor-pointer"
                onClick={() => {
                  setSelectedMovimiento(mov);
                  setDetailDialogOpen(true);
                }}
              >
                <TableCell className="text-sm text-slate-600">
                  {format(new Date(mov.fecha), "d MMM yyyy", { locale: es })}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="gap-1">
                    {getOrigenIcon(mov.origen)}
                    {mov.origen}
                  </Badge>
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
                <TableCell className="font-medium text-sm">{mov.descripcion}</TableCell>
                <TableCell className="text-sm">
                  <div className="text-slate-600">{mov.medio_pago}</div>
                  {mov.banco_nombre && <div className="text-xs text-blue-600">🏦 {mov.banco_nombre}</div>}
                  {mov.caja_nombre && <div className="text-xs text-emerald-600">💵 {mov.caja_nombre}</div>}
                  {mov.cuenta_contable && <div className="text-xs text-slate-500">{mov.cuenta_contable}</div>}
                </TableCell>
                <TableCell className="text-right">
                  <span className={`font-bold ${mov.tipo === "INGRESO" ? "text-green-600" : "text-red-600"}`}>
                    {mov.tipo === "INGRESO" ? "+" : "-"} {formatCurrency(mov.importe, false)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {movimientosFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <Info className="h-8 w-8 text-slate-300" />
                    <p>No hay movimientos para mostrar</p>
                    <p className="text-xs">Los movimientos se generan automáticamente desde Gastos, Ventas, Compras y Presupuestos</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle del Movimiento</DialogTitle>
          </DialogHeader>
          {selectedMovimiento && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${selectedMovimiento.tipo === "INGRESO" ? "bg-green-50" : "bg-red-50"}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-600">Tipo</p>
                  <Badge className={selectedMovimiento.tipo === "INGRESO" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                    {selectedMovimiento.tipo === "INGRESO" ? (
                      <ArrowDownCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowUpCircle className="h-3 w-3 mr-1" />
                    )}
                    {selectedMovimiento.tipo}
                  </Badge>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(selectedMovimiento.importe)}</p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Movimiento derivado</p>
                    <p>Origen: {selectedMovimiento.origen} (ID: {selectedMovimiento.origen_id.slice(0, 8)}...)</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase">Fecha</p>
                  <p className="font-medium">{format(new Date(selectedMovimiento.fecha), "d MMMM yyyy", { locale: es })}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase">Descripción</p>
                  <p className="font-medium">{selectedMovimiento.descripcion}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase">Medio de Pago</p>
                  <p className="font-medium">{selectedMovimiento.medio_pago}</p>
                </div>

                {(selectedMovimiento.banco_nombre || selectedMovimiento.caja_nombre) && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Destino</p>
                    {selectedMovimiento.banco_nombre && <p className="font-medium">🏦 {selectedMovimiento.banco_nombre}</p>}
                    {selectedMovimiento.caja_nombre && <p className="font-medium">💵 {selectedMovimiento.caja_nombre}</p>}
                  </div>
                )}

                {selectedMovimiento.cuenta_contable && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Cuenta Contable</p>
                    <p className="font-medium">{selectedMovimiento.cuenta_contable}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}