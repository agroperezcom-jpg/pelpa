import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ArqueoDialog from "./ArqueoDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { FileText, Printer, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ReportesDialog({ isOpen, onClose, user }) {
  const [generandoReporte, setGenerandoReporte] = useState(false);
  const [reporteGenerado, setReporteGenerado] = useState(null);
  const [isArqueoDialogOpen, setIsArqueoDialogOpen] = useState(false);
  const [requiereArqueo, setRequiereArqueo] = useState(false);

  const queryClient = useQueryClient();

  const { data: turnoActual } = useQuery({
    queryKey: ['turnoActual'],
    queryFn: async () => {
      const turnos = await base44.entities.TurnoPOS.filter({ estado: "ABIERTO" });
      return turnos[0] || null;
    },
    enabled: isOpen
  });

  const { data: ventas = [] } = useQuery({
    queryKey: ['ventasHoy'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const allSales = await base44.entities.Sale.list('-created_date', 500);
      return allSales.filter(s => s.created_date?.startsWith(today) && s.estado === "CONFIRMADA");
    },
    enabled: isOpen
  });

  const { data: pagosVentas = [] } = useQuery({
    queryKey: ['pagosVentasHoy'],
    queryFn: async () => {
      const ventasIds = ventas.map(v => v.id);
      if (ventasIds.length === 0) return [];
      const allPagos = await base44.entities.PagoVenta.list('', 1000);
      return allPagos.filter(p => ventasIds.includes(p.venta_id));
    },
    enabled: isOpen && ventas.length > 0
  });

  const abrirTurnoMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.TurnoPOS.create({
        fecha_apertura: new Date().toISOString(),
        usuario_apertura: user.email,
        usuario_apertura_nombre: user.full_name,
        estado: "ABIERTO",
        saldo_inicial_efectivo: 0,
        total_ventas: 0,
        cantidad_ventas: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turnoActual'] });
    }
  });

  const { data: arqueoTurno } = useQuery({
    queryKey: ['arqueoTurno', turnoActual?.id],
    queryFn: async () => {
      if (!turnoActual?.id) return null;
      const arqueos = await base44.entities.ArqueoCaja.filter({ 
        turno_pos_id: turnoActual.id,
        estado: "CERRADO"
      });
      return arqueos[0] || null;
    },
    enabled: isOpen && !!turnoActual
  });

  const generarReporteMutation = useMutation({
    mutationFn: async (tipo) => {
      if (tipo === "Z" && !turnoActual) {
        throw new Error("No hay turno abierto para generar Reporte Z");
      }

      // Validar arqueo para Reporte Z
      if (tipo === "Z" && !arqueoTurno) {
        throw new Error("Debe realizar el arqueo de caja antes de cerrar el turno");
      }

      // Calcular totales por medio de pago
      const detallesMediosPago = {};
      
      pagosVentas.forEach(pago => {
        const medio = pago.medio_pago_nombre || "Sin especificar";
        if (!detallesMediosPago[medio]) {
          detallesMediosPago[medio] = { cantidad: 0, total: 0 };
        }
        detallesMediosPago[medio].cantidad += 1;
        detallesMediosPago[medio].total += pago.importe;
      });

      const detalleMediosPagoArray = Object.keys(detallesMediosPago).map(medio => ({
        medio_pago: medio,
        cantidad: detallesMediosPago[medio].cantidad,
        total: detallesMediosPago[medio].total
      }));

      const totalVentas = ventas.reduce((acc, v) => acc + v.total, 0);

      const reporte = await base44.entities.ReportePOS.create({
        tipo,
        turno_id: turnoActual?.id || null,
        fecha: new Date().toISOString(),
        usuario: user.email,
        usuario_nombre: user.full_name,
        cantidad_ventas: ventas.length,
        total_ventas: totalVentas,
        detalle_medios_pago: detalleMediosPagoArray,
        ventas_ids: ventas.map(v => v.id)
      });

      // Si es Reporte Z, cerrar el turno
      if (tipo === "Z" && turnoActual) {
        await base44.entities.TurnoPOS.update(turnoActual.id, {
          fecha_cierre: new Date().toISOString(),
          usuario_cierre: user.email,
          usuario_cierre_nombre: user.full_name,
          estado: "CERRADO",
          total_ventas: totalVentas,
          cantidad_ventas: ventas.length
        });
      }

      return reporte;
    },
    onSuccess: (reporte) => {
      queryClient.invalidateQueries({ queryKey: ['turnoActual'] });
      queryClient.invalidateQueries({ queryKey: ['reportes'] });
      setReporteGenerado(reporte);
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const handleGenerarReporte = async (tipo) => {
    // Si es Reporte Z y no hay arqueo, abrir diálogo de arqueo
    if (tipo === "Z" && !arqueoTurno) {
      setRequiereArqueo(true);
      setIsArqueoDialogOpen(true);
      return;
    }

    setGenerandoReporte(true);
    await generarReporteMutation.mutateAsync(tipo);
    setGenerandoReporte(false);
  };

  const handleArqueoCompleted = async () => {
    setIsArqueoDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['arqueoTurno'] });
    
    // Después del arqueo, generar el reporte Z
    if (requiereArqueo) {
      setRequiereArqueo(false);
      setGenerandoReporte(true);
      await generarReporteMutation.mutateAsync("Z");
      setGenerandoReporte(false);
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  const totalVentas = ventas.reduce((acc, v) => acc + v.total, 0);

  const detallesMediosPago = {};
  pagosVentas.forEach(pago => {
    const medio = pago.medio_pago_nombre || "Sin especificar";
    if (!detallesMediosPago[medio]) {
      detallesMediosPago[medio] = { cantidad: 0, total: 0 };
    }
    detallesMediosPago[medio].cantidad += 1;
    detallesMediosPago[medio].total += pago.importe;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Reportes POS
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Estado del Turno */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Estado del Turno</p>
                {turnoActual ? (
                  <div className="space-y-2 mt-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Turno Abierto
                      </Badge>
                      <span className="text-xs text-slate-600">
                        desde {format(new Date(turnoActual.fecha_apertura), "HH:mm", { locale: es })}
                      </span>
                    </div>
                    {arqueoTurno ? (
                      <Badge className="bg-purple-100 text-purple-700">
                        ✓ Arqueo Realizado
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700">
                        ⚠ Arqueo Pendiente
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-red-100 text-red-700">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Sin Turno Abierto
                    </Badge>
                  </div>
                )}
              </div>
              {!turnoActual && (
                <Button onClick={() => abrirTurnoMutation.mutate()} size="sm" className="bg-blue-600 hover:bg-blue-700">
                  Abrir Turno
                </Button>
              )}
            </div>
          </div>

          {/* Vista Previa del Reporte */}
          {!reporteGenerado ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase">Ventas Hoy</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{ventas.length}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase">Total del Día</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">${totalVentas.toLocaleString()}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Detalle por Medio de Pago</h4>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Medio de Pago</TableHead>
                      <TableHead className="text-center">Operaciones</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.keys(detallesMediosPago).map((medio) => (
                      <TableRow key={medio}>
                        <TableCell className="font-medium">{medio}</TableCell>
                        <TableCell className="text-center">{detallesMediosPago[medio].cantidad}</TableCell>
                        <TableCell className="text-right font-bold text-emerald-600">
                          ${detallesMediosPago[medio].total.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {Object.keys(detallesMediosPago).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-slate-500 py-8">
                          No hay ventas registradas
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Información de Reportes */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border-2 border-blue-200 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                      X
                    </div>
                    <div>
                      <p className="font-semibold text-blue-900">Reporte X</p>
                      <p className="text-xs text-blue-700 mt-1">Parcial - No cierra turno</p>
                      <p className="text-xs text-blue-600 mt-2">Puede ejecutarse múltiples veces</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-2 border-red-200 bg-red-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold">
                      Z
                    </div>
                    <div>
                      <p className="font-semibold text-red-900">Reporte Z</p>
                      <p className="text-xs text-red-700 mt-1">Cierre definitivo</p>
                      <p className="text-xs text-red-600 mt-2">Solo una vez por turno</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-8">
                <div className={`w-16 h-16 ${
                  reporteGenerado.tipo === "X" ? "bg-blue-600" : "bg-red-600"
                } rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4`}>
                  {reporteGenerado.tipo}
                </div>
                <h3 className="text-xl font-bold">
                  Reporte {reporteGenerado.tipo} Generado
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {format(new Date(reporteGenerado.fecha), "dd/MM/yyyy HH:mm", { locale: es })}
                </p>
                {reporteGenerado.tipo === "Z" && (
                  <Badge className="mt-3 bg-red-100 text-red-700">
                    Turno Cerrado
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">Cantidad de Ventas</p>
                  <p className="text-2xl font-bold">{reporteGenerado.cantidad_ventas}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    ${reporteGenerado.total_ventas.toLocaleString()}
                  </p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Medio de Pago</TableHead>
                    <TableHead className="text-center">Operaciones</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reporteGenerado.detalle_medios_pago.map((detalle, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{detalle.medio_pago}</TableCell>
                      <TableCell className="text-center">{detalle.cantidad}</TableCell>
                      <TableCell className="text-right font-bold">
                        ${detalle.total.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Button onClick={handleImprimir} className="w-full" variant="outline">
                <Printer className="h-4 w-4 mr-2" />
                Imprimir Reporte
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          {!reporteGenerado ? (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={() => handleGenerarReporte("X")}
                disabled={generandoReporte || ventas.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Generar Reporte X
              </Button>
              <Button
                onClick={() => handleGenerarReporte("Z")}
                disabled={generandoReporte || ventas.length === 0 || !turnoActual}
                className="bg-red-600 hover:bg-red-700"
              >
                {!arqueoTurno ? "Arquear y Cerrar (Z)" : "Generar Reporte Z"}
              </Button>
            </>
          ) : (
            <Button onClick={() => { setReporteGenerado(null); onClose(); }}>
              Cerrar
            </Button>
          )}
        </DialogFooter>

        <ArqueoDialog
          isOpen={isArqueoDialogOpen}
          onClose={() => {
            setIsArqueoDialogOpen(false);
            setRequiereArqueo(false);
          }}
          turnoActual={turnoActual}
          user={user}
          onArqueoCompleted={handleArqueoCompleted}
        />
      </DialogContent>
    </Dialog>
  );
}