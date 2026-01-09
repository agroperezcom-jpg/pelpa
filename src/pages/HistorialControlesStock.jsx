import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ClipboardList,
  Search,
  Eye,
  Download,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ControlStockPDF from "../components/inventory/ControlStockPDF";
import ControlStockDialog from "../components/inventory/ControlStockDialog";

export default function HistorialControlesStock() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedControl, setSelectedControl] = useState(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isControlDialogOpen, setIsControlDialogOpen] = useState(false);
  const [controlToResume, setControlToResume] = useState(null);
  const [detalleSearchTerm, setDetalleSearchTerm] = useState("");
  const [detallePage, setDetallePage] = useState(0);
  const ITEMS_PER_PAGE = 20;

  const { data: controles = [] } = useQuery({
    queryKey: ['controlStock'],
    queryFn: () => base44.entities.ControlStock.list('-fecha_inicio')
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: detalles = [] } = useQuery({
    queryKey: ['controlStockDetalle', selectedControl?.id],
    queryFn: () => base44.entities.ControlStockDetalle.filter({
      control_stock_id: selectedControl.id
    }),
    enabled: !!selectedControl
  });

  const filteredControles = controles.filter(c =>
    c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.usuario_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const controlEnCurso = controles.find(c => c.estado === "EN_CURSO");

  const handleResumeControl = (control) => {
    setControlToResume(control);
    setIsControlDialogOpen(true);
  };

  const filteredDetalles = detalles.filter(d =>
    d.product_name?.toLowerCase().includes(detalleSearchTerm.toLowerCase()) ||
    d.barcode?.includes(detalleSearchTerm)
  );

  const paginatedDetalles = filteredDetalles.slice(
    detallePage * ITEMS_PER_PAGE,
    (detallePage + 1) * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredDetalles.length / ITEMS_PER_PAGE);

  const estadoConfig = {
    EN_CURSO: { color: "bg-blue-100 text-blue-700", icon: Clock, label: "En Curso" },
    FINALIZADO: { color: "bg-green-100 text-green-700", icon: CheckCircle2, label: "Finalizado" },
    CANCELADO: { color: "bg-slate-100 text-slate-700", icon: Clock, label: "Cancelado" }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-blue-600" />
            Historial de Controles de Stock
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Registro completo de inventarios físicos realizados
          </p>
        </div>
        {controlEnCurso && (
          <Button 
            onClick={() => handleResumeControl(controlEnCurso)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Clock className="h-4 w-4 mr-2" />
            Continuar Control en Curso
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Total Controles</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{controles.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Finalizados</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {controles.filter(c => c.estado === "FINALIZADO").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">En Curso</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {controles.filter(c => c.estado === "EN_CURSO").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Valor Diferencias</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              ${controles.reduce((acc, c) => acc + (c.valor_diferencias || 0), 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre o usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Control</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-center">Productos</TableHead>
              <TableHead className="text-center">Diferencias</TableHead>
              <TableHead className="text-right">Valor Dif.</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredControles.map((control) => {
              const config = estadoConfig[control.estado] || estadoConfig.EN_CURSO;
              const Icon = config.icon;

              return (
                <TableRow key={control.id} className="hover:bg-slate-50">
                  <TableCell>
                    <div>
                      <p className="font-medium">{control.nombre}</p>
                      {control.deposito && (
                        <p className="text-xs text-slate-500">{control.deposito}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{format(new Date(control.fecha_inicio), "d MMM yyyy", { locale: es })}</p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(control.fecha_inicio), "HH:mm", { locale: es })}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{control.usuario_nombre}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={config.color}>
                      <Icon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {control.total_productos_contados || 0}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={
                      control.total_diferencias > 0
                        ? "bg-amber-100 text-amber-700"
                        : "bg-green-100 text-green-700"
                    }>
                      {control.total_diferencias || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium text-red-600">
                    ${(control.valor_diferencias || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                   <div className="flex justify-center gap-2">
                     {control.estado === "EN_CURSO" ? (
                       <Button
                         size="sm"
                         variant="default"
                         className="bg-blue-600 hover:bg-blue-700"
                         onClick={() => handleResumeControl(control)}
                       >
                         Continuar
                       </Button>
                     ) : (
                       <>
                         <Button
                           size="sm"
                           variant="ghost"
                           onClick={() => {
                             setSelectedControl(control);
                             setDetalleSearchTerm("");
                             setDetallePage(0);
                           }}
                         >
                           <Eye className="h-4 w-4" />
                         </Button>
                         {control.estado === "FINALIZADO" && (
                           <Button
                             size="sm"
                             variant="ghost"
                             onClick={() => {
                               setSelectedControl(control);
                               setIsPrintDialogOpen(true);
                             }}
                           >
                             <Download className="h-4 w-4" />
                           </Button>
                         )}
                       </>
                     )}
                   </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredControles.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                  No se encontraron controles de stock
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Dialog */}
      {selectedControl && (
        <Dialog open={!!selectedControl && !isPrintDialogOpen} onOpenChange={() => setSelectedControl(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-blue-600" />
                Detalle del Control - {selectedControl.nombre}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-500">Responsable</p>
                  <p className="font-medium">{selectedControl.usuario_nombre}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Fecha</p>
                  <p className="font-medium">
                    {format(new Date(selectedControl.fecha_inicio), "d 'de' MMMM yyyy HH:mm", { locale: es })}
                  </p>
                </div>
                {selectedControl.deposito && (
                  <div>
                    <p className="text-sm text-slate-500">Depósito</p>
                    <p className="font-medium">{selectedControl.deposito}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-500">Estado</p>
                  <Badge className={estadoConfig[selectedControl.estado].color}>
                    {estadoConfig[selectedControl.estado].label}
                  </Badge>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-slate-600">Productos Contados</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {selectedControl.total_productos_contados || 0}
                  </p>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg">
                  <p className="text-sm text-slate-600">Diferencias</p>
                  <p className="text-2xl font-bold text-amber-700">
                    {selectedControl.total_diferencias || 0}
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-slate-600">Valor Diferencias</p>
                  <p className="text-2xl font-bold text-red-700">
                    ${(selectedControl.valor_diferencias || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Detalles con búsqueda y paginación */}
              {detalles.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold">Detalle de Productos ({detalles.length})</p>
                  </div>
                  
                  {/* Búsqueda */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Buscar producto o código..."
                      value={detalleSearchTerm}
                      onChange={(e) => {
                        setDetalleSearchTerm(e.target.value);
                        setDetallePage(0);
                      }}
                      className="pl-10"
                    />
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <div className="max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader className="bg-slate-50 sticky top-0">
                          <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead className="text-center">Stock Teórico</TableHead>
                            <TableHead className="text-center">Stock Contado</TableHead>
                            <TableHead className="text-center">Diferencia</TableHead>
                            <TableHead className="text-right">Valor Dif.</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedDetalles.map((detalle) => (
                            <TableRow key={detalle.id} className={
                              detalle.diferencia > 0 ? "bg-green-50" :
                              detalle.diferencia < 0 ? "bg-red-50" : ""
                            }>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{detalle.product_name}</p>
                                  {detalle.barcode && (
                                    <p className="text-xs text-slate-400">{detalle.barcode}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">{detalle.stock_teorico}</TableCell>
                              <TableCell className="text-center font-bold">{detalle.stock_contado}</TableCell>
                              <TableCell className="text-center">
                                {detalle.diferencia !== 0 ? (
                                  <Badge className={
                                    detalle.diferencia > 0
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                  }>
                                    {detalle.diferencia > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                    {detalle.diferencia > 0 ? '+' : ''}{detalle.diferencia}
                                  </Badge>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {detalle.diferencia !== 0 ? (
                                  `$${Math.abs(detalle.valor_diferencia).toLocaleString()}`
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                          {paginatedDetalles.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                No se encontraron productos
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Paginación */}
                    {totalPages > 1 && (
                      <div className="border-t bg-slate-50 px-4 py-3 flex items-center justify-between">
                        <p className="text-sm text-slate-600">
                          Mostrando {detallePage * ITEMS_PER_PAGE + 1} - {Math.min((detallePage + 1) * ITEMS_PER_PAGE, filteredDetalles.length)} de {filteredDetalles.length}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDetallePage(Math.max(0, detallePage - 1))}
                            disabled={detallePage === 0}
                          >
                            Anterior
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDetallePage(Math.min(totalPages - 1, detallePage + 1))}
                            disabled={detallePage >= totalPages - 1}
                          >
                            Siguiente
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedControl.observaciones && (
                <div>
                  <p className="font-semibold mb-2">Observaciones</p>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                    {selectedControl.observaciones}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Print Dialog */}
      {selectedControl && (
        <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-blue-600" />
                  Exportar Control de Stock
                </span>
              </DialogTitle>
            </DialogHeader>
            <ControlStockPDF control={selectedControl} detalles={detalles} />
          </DialogContent>
        </Dialog>
      )}

      {/* Control Stock Dialog */}
      <ControlStockDialog
        isOpen={isControlDialogOpen}
        onClose={() => {
          setIsControlDialogOpen(false);
          setControlToResume(null);
        }}
        products={products}
        controlEnCurso={controlToResume}
      />
    </div>
  );
}