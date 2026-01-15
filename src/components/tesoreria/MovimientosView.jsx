import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { ArrowDownCircle, ArrowUpCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency } from "@/components/utils/formatCurrency";

export default function MovimientosView() {
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedMovimiento, setSelectedMovimiento] = useState(null);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [origenFiltro, setOrigenFiltro] = useState("todos");
  const [movimientos, setMovimientos] = useState([]);

  // Fetch fuentes
  const { data: gastos = [] } = useQuery({
    queryKey: ['gastos'],
    queryFn: () => base44.entities.Expense.list()
  });

  const { data: compras = [] } = useQuery({
    queryKey: ['compras'],
    queryFn: () => base44.entities.Compra.filter({ 
      estado: { $in: ["CONFIRMADA", "PENDIENTE", "PARCIAL"] }
    })
  });

  const { data: ventasConfirmadas = [] } = useQuery({
    queryKey: ['ventasConfirmadas'],
    queryFn: () => base44.entities.Sale.filter({ estado: "CONFIRMADA" })
  });

  const { data: presupuestosAceptados = [] } = useQuery({
    queryKey: ['presupuestosAceptados'],
    queryFn: () => base44.entities.Presupuesto.filter({ estado: "ACEPTADO" })
  });

  // Construir movimientos derivados
  useEffect(() => {
    const movs = [];

    // Egresos de gastos
    gastos.forEach(gasto => {
      movs.push({
        id: `gasto-${gasto.id}`,
        fecha: gasto.date,
        tipo: "EGRESO",
        importe: gasto.amount,
        origen: "gasto",
        origen_id: gasto.id,
        descripcion: gasto.description,
        origen_data: gasto
      });
    });

    // Egresos de compras
    compras.forEach(compra => {
      movs.push({
        id: `compra-${compra.id}`,
        fecha: compra.fecha,
        tipo: "EGRESO",
        importe: compra.total_compra,
        origen: "compra",
        origen_id: compra.id,
        descripcion: `Compra a ${compra.proveedor_nombre}`,
        origen_data: compra
      });
    });

    // Ingresos de ventas confirmadas
    ventasConfirmadas.forEach(venta => {
      movs.push({
        id: `venta-${venta.id}`,
        fecha: venta.created_date?.split('T')[0],
        tipo: "INGRESO",
        importe: venta.total,
        origen: "venta",
        origen_id: venta.id,
        descripcion: `Venta ${venta.numero_comprobante || 'sin número'}`,
        origen_data: venta
      });
    });

    // Ingresos de presupuestos aceptados
    presupuestosAceptados.forEach(presupuesto => {
      movs.push({
        id: `presupuesto-${presupuesto.id}`,
        fecha: presupuesto.fecha_aceptacion?.split('T')[0] || presupuesto.fecha,
        tipo: "INGRESO",
        importe: presupuesto.total_presupuesto,
        origen: "presupuesto",
        origen_id: presupuesto.id,
        descripcion: `Presupuesto ${presupuesto.numero_presupuesto}`,
        origen_data: presupuesto
      });
    });

    // Ordenar por fecha descendente
    movs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    setMovimientos(movs);
  }, [gastos, compras, ventasConfirmadas, presupuestosAceptados]);

  // Filtrar
  const movimientosFiltrados = movimientos.filter(mov => {
    const fechaMov = new Date(mov.fecha);
    const desde = fechaDesde ? new Date(fechaDesde) : null;
    const hasta = fechaHasta ? new Date(fechaHasta) : null;

    const cumpleFecha = (!desde || fechaMov >= desde) && (!hasta || fechaMov <= hasta);
    const cumpleTipo = tipoFiltro === "todos" || mov.tipo === tipoFiltro;
    const cumpleOrigen = origenFiltro === "todos" || mov.origen === origenFiltro;

    return cumpleFecha && cumpleTipo && cumpleOrigen;
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
        <h3 className="text-lg font-semibold">Movimientos de Tesorería (Derivados)</h3>
        <Badge variant="outline" className="text-xs">
          Vista calculada en tiempo real
        </Badge>
      </div>

      {/* Alerta informativa */}
      <Card className="border-amber-200 bg-amber-50 p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Vista derivada 100%</p>
            <p>Los movimientos se calculan automáticamente desde Gastos, Compras, Ventas y Presupuestos. No se pueden crear, editar ni eliminar manualmente.</p>
          </div>
        </div>
      </Card>

      {/* Filtros */}
      <Card className="border-0 shadow-sm">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <div className="space-y-2">
              <Label className="text-xs">Origen</Label>
              <Select value={origenFiltro} onValueChange={setOrigenFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="venta">Ventas</SelectItem>
                  <SelectItem value="presupuesto">Presupuestos</SelectItem>
                  <SelectItem value="gasto">Gastos</SelectItem>
                  <SelectItem value="compra">Compras</SelectItem>
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
                  setOrigenFiltro("todos");
                }}
                className="w-full"
              >
                Limpiar
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
              <TableHead>Origen</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimientosFiltrados.length > 0 ? (
              movimientosFiltrados.map((mov) => (
                <TableRow 
                  key={mov.id} 
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => {
                    setSelectedMovimiento(mov);
                    setDetailDialogOpen(true);
                  }}
                >
                  <TableCell className="text-sm text-slate-600">
                    {mov.fecha ? format(new Date(mov.fecha), "d MMM yyyy", { locale: es }) : "-"}
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
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {mov.origen}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{mov.descripcion}</TableCell>
                  <TableCell className="text-right">
                    <span className={`font-bold ${mov.tipo === "INGRESO" ? "text-green-600" : "text-red-600"}`}>
                      {mov.tipo === "INGRESO" ? "+" : "-"} {formatCurrency(mov.importe, false)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMovimiento(mov);
                        setDetailDialogOpen(true);
                      }}
                    >
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  {movimientos.length === 0 
                    ? "No hay movimientos (crea ventas, presupuestos, gastos o compras)"
                    : "No hay movimientos que coincidan con los filtros"
                  }
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Dialog - READ ONLY */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
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

              <div className="space-y-3 border-t pt-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase">Fecha</p>
                  <p className="font-medium">
                    {selectedMovimiento.fecha 
                      ? format(new Date(selectedMovimiento.fecha), "d MMMM yyyy", { locale: es })
                      : "-"
                    }
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase">Origen</p>
                  <Badge variant="outline" className="capitalize">
                    {selectedMovimiento.origen}
                  </Badge>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase">Descripción</p>
                  <p className="font-medium">{selectedMovimiento.descripcion}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase">ID de Origen</p>
                  <p className="font-mono text-xs bg-slate-50 p-2 rounded">{selectedMovimiento.origen_id}</p>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  <p className="font-medium">📌 Solo lectura</p>
                  <p>Este movimiento se calcula automáticamente desde su origen. Para modificarlo, edita el {selectedMovimiento.origen} original.</p>
                </div>
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