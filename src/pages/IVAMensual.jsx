import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Plus,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Download,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Receipt,
  RefreshCw
} from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";

export default function IVAMensual() {
  const [selectedPeriodo, setSelectedPeriodo] = useState(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isClosingDialog, setIsClosingDialog] = useState(false);
  const [periodoToClose, setPeriodoToClose] = useState(null);
  const [observaciones, setObservaciones] = useState("");
  const [user, setUser] = useState(null);

  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: periodos = [] } = useQuery({
    queryKey: ['periodosIVA'],
    queryFn: () => base44.entities.PeriodoIVA.list('-anio,-mes', 50)
  });

  const { data: ivaVentas = [] } = useQuery({
    queryKey: ['ivaVentas'],
    queryFn: () => base44.entities.IVAVenta.list('-fecha', 500)
  });

  const { data: compras = [] } = useQuery({
    queryKey: ['compras'],
    queryFn: () => base44.entities.Compra.list('-fecha', 500)
  });

  const { data: periodosIIBB = [] } = useQuery({
    queryKey: ['periodosIIBB'],
    queryFn: () => base44.entities.PeriodoIIBB.list('-anio,-mes', 12)
  });

  const { data: iibbVentas = [] } = useQuery({
    queryKey: ['iibbVentas'],
    queryFn: () => base44.entities.IIBBVenta.list('-fecha', 500)
  });

  const { data: retencionesIIBB = [] } = useQuery({
    queryKey: ['retencionesIIBB'],
    queryFn: () => base44.entities.RetencionIIBB.list('-fecha', 500)
  });

  const crearPeriodoMutation = useMutation({
    mutationFn: async ({ mes, anio }) => {
      const periodo = `${anio}-${String(mes).padStart(2, '0')}`;
      const fechaDesde = format(startOfMonth(new Date(anio, mes - 1)), 'yyyy-MM-dd');
      const fechaHasta = format(endOfMonth(new Date(anio, mes - 1)), 'yyyy-MM-dd');

      // Verificar si ya existe
      const existente = periodos.find(p => p.periodo === periodo);
      if (existente) {
        throw new Error('El período ya existe');
      }

      // Calcular IVA Ventas del período
      const ventasPeriodo = ivaVentas.filter(iv => 
        iv.fecha >= fechaDesde && iv.fecha <= fechaHasta
      );
      const totalDebito = ventasPeriodo.reduce((acc, iv) => acc + (iv.iva_21 || 0), 0);

      // Calcular IVA Compras del período
      const comprasPeriodo = compras.filter(c => 
        c.fecha >= fechaDesde && 
        c.fecha <= fechaHasta && 
        c.estado === "CONFIRMADA" &&
        (c.tipo_comprobante === "A" || c.tipo_comprobante === "B")
      );
      const totalCredito = comprasPeriodo.reduce((acc, c) => acc + (c.iva_21 || 0), 0);

      const saldo = totalDebito - totalCredito;

      const periodoIVA = await base44.entities.PeriodoIVA.create({
        mes,
        anio,
        periodo,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        estado: "ABIERTO",
        total_iva_debito: totalDebito,
        total_iva_credito: totalCredito,
        saldo_iva: saldo,
        cantidad_facturas_emitidas: ventasPeriodo.length,
        cantidad_facturas_recibidas: comprasPeriodo.length
      });

      // 🆕 AUTO-CREAR PERÍODO IIBB
      const existeIIBB = periodosIIBB.find(p => p.periodo === periodo);
      if (!existeIIBB) {
        const ventasIIBBPeriodo = iibbVentas.filter(iv => 
          iv.fecha >= fechaDesde && iv.fecha <= fechaHasta
        );
        const retencionesIIBBPeriodo = retencionesIIBB.filter(r => 
          r.fecha >= fechaDesde && r.fecha <= fechaHasta
        );

        const totalIIBBVentas = ventasIIBBPeriodo.reduce((acc, iv) => acc + (iv.importe_iibb || 0), 0);
        const totalRetenciones = retencionesIIBBPeriodo.reduce((acc, r) => acc + (r.importe_retenido || 0), 0);

        await base44.entities.PeriodoIIBB.create({
          mes,
          anio,
          periodo,
          fecha_desde: fechaDesde,
          fecha_hasta: fechaHasta,
          estado: "ABIERTO",
          iibb_ventas: totalIIBBVentas,
          iibb_retenido: totalRetenciones,
          saldo_iibb: totalIIBBVentas - totalRetenciones,
          cantidad_ventas: ventasIIBBPeriodo.length,
          cantidad_retenciones: retencionesIIBBPeriodo.length
        });
      }

      return periodoIVA;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodosIVA'] });
      queryClient.invalidateQueries({ queryKey: ['periodosIIBB'] });
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const recalcularPeriodoMutation = useMutation({
    mutationFn: async (periodoId) => {
      const periodo = periodos.find(p => p.id === periodoId);
      if (!periodo) throw new Error('Período no encontrado');
      if (periodo.estado === "CERRADO") throw new Error('No se puede recalcular un período cerrado');

      const ventasPeriodo = ivaVentas.filter(iv => 
        iv.fecha >= periodo.fecha_desde && iv.fecha <= periodo.fecha_hasta
      );
      const totalDebito = ventasPeriodo.reduce((acc, iv) => acc + (iv.iva_21 || 0), 0);

      const comprasPeriodo = compras.filter(c => 
        c.fecha >= periodo.fecha_desde && 
        c.fecha <= periodo.fecha_hasta && 
        c.estado === "CONFIRMADA" &&
        (c.tipo_comprobante === "A" || c.tipo_comprobante === "B")
      );
      const totalCredito = comprasPeriodo.reduce((acc, c) => acc + (c.iva_21 || 0), 0);

      const saldo = totalDebito - totalCredito;

      return await base44.entities.PeriodoIVA.update(periodoId, {
        total_iva_debito: totalDebito,
        total_iva_credito: totalCredito,
        saldo_iva: saldo,
        cantidad_facturas_emitidas: ventasPeriodo.length,
        cantidad_facturas_recibidas: comprasPeriodo.length
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodosIVA'] });
    }
  });

  const cerrarPeriodoMutation = useMutation({
    mutationFn: async ({ periodoId, observaciones }) => {
      const periodo = periodos.find(p => p.id === periodoId);
      if (!periodo) throw new Error('Período no encontrado');

      // Recalcular antes de cerrar
      const ventasPeriodo = ivaVentas.filter(iv => 
        iv.fecha >= periodo.fecha_desde && iv.fecha <= periodo.fecha_hasta
      );
      const totalDebito = ventasPeriodo.reduce((acc, iv) => acc + (iv.iva_21 || 0), 0);

      const comprasPeriodo = compras.filter(c => 
        c.fecha >= periodo.fecha_desde && 
        c.fecha <= periodo.fecha_hasta && 
        c.estado === "CONFIRMADA" &&
        (c.tipo_comprobante === "A" || c.tipo_comprobante === "B")
      );
      const totalCredito = comprasPeriodo.reduce((acc, c) => acc + (c.iva_21 || 0), 0);

      const saldo = totalDebito - totalCredito;

      return await base44.entities.PeriodoIVA.update(periodoId, {
        estado: "CERRADO",
        total_iva_debito: totalDebito,
        total_iva_credito: totalCredito,
        saldo_iva: saldo,
        cantidad_facturas_emitidas: ventasPeriodo.length,
        cantidad_facturas_recibidas: comprasPeriodo.length,
        fecha_cierre: new Date().toISOString(),
        cerrado_por: user?.email,
        observaciones
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodosIVA'] });
      setIsClosingDialog(false);
      setPeriodoToClose(null);
      setObservaciones("");
    }
  });

  const handleCrearPeriodo = (mes, anio) => {
    crearPeriodoMutation.mutate({ mes, anio });
  };

  const handleVerDetalle = (periodo) => {
    setSelectedPeriodo(periodo);
    setIsDetailDialogOpen(true);
  };

  const handleCerrarPeriodo = (periodo) => {
    setPeriodoToClose(periodo);
    setIsClosingDialog(true);
  };

  const exportarPeriodo = (periodo) => {
    const ventasPeriodo = ivaVentas.filter(iv => 
      iv.fecha >= periodo.fecha_desde && iv.fecha <= periodo.fecha_hasta
    );
    const comprasPeriodo = compras.filter(c => 
      c.fecha >= periodo.fecha_desde && 
      c.fecha <= periodo.fecha_hasta && 
      c.estado === "CONFIRMADA" &&
      (c.tipo_comprobante === "A" || c.tipo_comprobante === "B")
    );

    const data = {
      periodo: periodo.periodo,
      estado: periodo.estado,
      resumen: {
        iva_debito: periodo.total_iva_debito,
        iva_credito: periodo.total_iva_credito,
        saldo: periodo.saldo_iva,
        facturas_emitidas: periodo.cantidad_facturas_emitidas,
        facturas_recibidas: periodo.cantidad_facturas_recibidas
      },
      ventas: ventasPeriodo.map(v => ({
        fecha: v.fecha,
        tipo: v.tipo_comprobante,
        numero: v.numero_comprobante,
        cliente: v.cliente_nombre,
        neto: v.neto_gravado,
        iva: v.iva_21,
        total: v.total
      })),
      compras: comprasPeriodo.map(c => ({
        fecha: c.fecha,
        tipo: c.tipo_comprobante,
        numero: c.numero_comprobante_proveedor,
        proveedor: c.proveedor_nombre,
        neto: c.neto_gravado,
        iva: c.iva_21,
        total: c.total_compra
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `iva_mensual_${periodo.periodo}.json`;
    link.click();
  };

  // Calcular períodos sugeridos (últimos 12 meses)
  const periodosSugeridos = [];
  for (let i = 0; i < 12; i++) {
    const fecha = subMonths(new Date(), i);
    const mes = fecha.getMonth() + 1;
    const anio = fecha.getFullYear();
    const periodo = `${anio}-${String(mes).padStart(2, '0')}`;
    const existe = periodos.find(p => p.periodo === periodo);
    if (!existe) {
      periodosSugeridos.push({ mes, anio, periodo });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            IVA Mensual
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestión de períodos fiscales y cálculo de IVA
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Crear Período
        </Button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Períodos Totales</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{periodos.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Abiertos</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  {periodos.filter(p => p.estado === "ABIERTO").length}
                </p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Cerrados</p>
                <p className="text-2xl font-bold text-slate-600 mt-1">
                  {periodos.filter(p => p.estado === "CERRADO").length}
                </p>
              </div>
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                <Lock className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Saldo Acumulado</p>
                <p className={`text-2xl font-bold mt-1 ${
                  periodos.reduce((acc, p) => acc + (p.saldo_iva || 0), 0) > 0 ? 'text-red-600' : 'text-emerald-600'
                }`}>
                  ${Math.abs(periodos.reduce((acc, p) => acc + (p.saldo_iva || 0), 0)).toLocaleString()}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                periodos.reduce((acc, p) => acc + (p.saldo_iva || 0), 0) > 0 ? 'bg-red-50' : 'bg-emerald-50'
              }`}>
                <DollarSign className={`h-5 w-5 ${
                  periodos.reduce((acc, p) => acc + (p.saldo_iva || 0), 0) > 0 ? 'text-red-600' : 'text-emerald-600'
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de períodos */}
      {(() => {
        const mesActual = new Date().getMonth() + 1;
        const anioActual = new Date().getFullYear();
        const mesAnterior = mesActual === 1 ? 12 : mesActual - 1;
        const anioAnterior = mesActual === 1 ? anioActual - 1 : anioActual;
        const periodoAnterior = `${anioAnterior}-${String(mesAnterior).padStart(2, '0')}`;
        const periodoAnteriorRecord = periodos.find(p => p.periodo === periodoAnterior);
        const periodoAnteriorAbierto = periodoAnteriorRecord && periodoAnteriorRecord.estado === "ABIERTO";

        return (
          <>
            {periodoAnteriorAbierto && (
              <Card className="border-0 shadow-sm bg-red-50 border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-red-900 mb-1">
                        ⚠️ Período {format(new Date(anioAnterior, mesAnterior - 1), 'MMMM yyyy', { locale: es })} ABIERTO
                      </p>
                      <p className="text-sm text-red-700 mb-3">
                        Debes cerrar el período del mes pasado antes de continuar operando
                      </p>
                      <Button 
                        size="sm" 
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => handleCerrarPeriodo(periodoAnteriorRecord)}
                      >
                        <Lock className="h-3 w-3 mr-1" />
                        Cerrar Período Ahora
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {periodosSugeridos.length > 0 && (
              <Card className="border-0 shadow-sm bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-blue-900 mb-2">
                        Períodos Pendientes de Crear ({periodosSugeridos.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {periodosSugeridos.slice(0, 6).map((p) => (
                          <Button
                            key={p.periodo}
                            size="sm"
                            variant="outline"
                            className="bg-white"
                            onClick={() => handleCrearPeriodo(p.mes, p.anio)}
                          >
                            {format(new Date(p.anio, p.mes - 1), 'MMMM yyyy', { locale: es })}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        );
      })()}

      {/* Tabla de Períodos */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Período</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">IVA Débito</TableHead>
              <TableHead className="text-right">IVA Crédito</TableHead>
              <TableHead className="text-right">Saldo IVA</TableHead>
              <TableHead className="text-center">Comprobantes</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periodos.map((periodo) => (
              <TableRow key={periodo.id} className="hover:bg-slate-50">
                <TableCell>
                  <div>
                    <p className="font-medium">
                      {format(new Date(periodo.anio, periodo.mes - 1), 'MMMM yyyy', { locale: es })}
                    </p>
                    <p className="text-xs text-slate-500">
                      {periodo.fecha_desde} a {periodo.fecha_hasta}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={
                    periodo.estado === "ABIERTO" 
                      ? "bg-emerald-100 text-emerald-700" 
                      : "bg-slate-100 text-slate-600"
                  }>
                    {periodo.estado === "ABIERTO" ? (
                      <><CheckCircle2 className="h-3 w-3 mr-1" /> Abierto</>
                    ) : (
                      <><Lock className="h-3 w-3 mr-1" /> Cerrado</>
                    )}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <TrendingUp className="h-3 w-3 text-red-500" />
                    <span className="font-medium text-red-600">
                      ${(periodo.total_iva_debito || 0).toLocaleString()}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <TrendingDown className="h-3 w-3 text-emerald-500" />
                    <span className="font-medium text-emerald-600">
                      ${(periodo.total_iva_credito || 0).toLocaleString()}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className={`font-bold ${
                    (periodo.saldo_iva || 0) > 0 ? 'text-red-600' : 'text-emerald-600'
                  }`}>
                    {(periodo.saldo_iva || 0) > 0 ? 'A Pagar' : 'A Favor'}: $
                    {Math.abs(periodo.saldo_iva || 0).toLocaleString()}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2 text-xs">
                    <Badge variant="outline" className="gap-1">
                      <Receipt className="h-3 w-3" />
                      {periodo.cantidad_facturas_emitidas || 0}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Receipt className="h-3 w-3" />
                      {periodo.cantidad_facturas_recibidas || 0}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleVerDetalle(periodo)}>
                      Ver Detalle
                    </Button>
                    {periodo.estado === "ABIERTO" && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-blue-600 hover:text-blue-700"
                          onClick={() => recalcularPeriodoMutation.mutate(periodo.id)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Recalcular
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleCerrarPeriodo(periodo)}
                        >
                          <Lock className="h-3 w-3 mr-1" />
                          Cerrar
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => exportarPeriodo(periodo)}>
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {periodos.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No hay períodos creados. Crea el primer período.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog Crear Período */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Período IVA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Selecciona un período sugerido o ingresa manualmente:
            </p>
            <div className="space-y-2">
              {periodosSugeridos.slice(0, 3).map((p) => (
                <Button
                  key={p.periodo}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    handleCrearPeriodo(p.mes, p.anio);
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {format(new Date(p.anio, p.mes - 1), 'MMMM yyyy', { locale: es })}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Cerrar Período */}
      <AlertDialog open={isClosingDialog} onOpenChange={setIsClosingDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Cerrar Período Fiscal
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de cerrar el período <strong>{periodoToClose?.periodo}</strong>?
              <br /><br />
              <strong>⚠️ Esta acción es irreversible.</strong> Una vez cerrado:
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>No se podrán agregar más ventas o compras al período</li>
                <li>Los valores de IVA quedarán fijados</li>
                <li>Se recalcularán los totales antes del cierre</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>Observaciones (opcional)</Label>
            <Textarea
              placeholder="Notas sobre el cierre del período..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsClosingDialog(false);
              setPeriodoToClose(null);
              setObservaciones("");
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (periodoToClose) {
                  cerrarPeriodoMutation.mutate({
                    periodoId: periodoToClose.id,
                    observaciones
                  });
                }
              }}
            >
              Cerrar Período
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Detalle */}
      {selectedPeriodo && (
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Detalle del Período {format(new Date(selectedPeriodo.anio, selectedPeriodo.mes - 1), 'MMMM yyyy', { locale: es })}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Resumen */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-2 border-red-200 bg-red-50">
                  <CardContent className="p-4">
                    <p className="text-xs text-red-700 font-medium uppercase">IVA Débito (Ventas)</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">
                      ${(selectedPeriodo.total_iva_debito || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      {selectedPeriodo.cantidad_facturas_emitidas} facturas B
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-emerald-200 bg-emerald-50">
                  <CardContent className="p-4">
                    <p className="text-xs text-emerald-700 font-medium uppercase">IVA Crédito (Compras)</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">
                      ${(selectedPeriodo.total_iva_credito || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">
                      {selectedPeriodo.cantidad_facturas_recibidas} facturas recibidas
                    </p>
                  </CardContent>
                </Card>

                <Card className={`border-2 ${
                  (selectedPeriodo.saldo_iva || 0) > 0 
                    ? 'border-red-200 bg-red-50' 
                    : 'border-emerald-200 bg-emerald-50'
                }`}>
                  <CardContent className="p-4">
                    <p className={`text-xs font-medium uppercase ${
                      (selectedPeriodo.saldo_iva || 0) > 0 ? 'text-red-700' : 'text-emerald-700'
                    }`}>
                      Saldo IVA
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${
                      (selectedPeriodo.saldo_iva || 0) > 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}>
                      ${Math.abs(selectedPeriodo.saldo_iva || 0).toLocaleString()}
                    </p>
                    <p className={`text-xs mt-1 ${
                      (selectedPeriodo.saldo_iva || 0) > 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}>
                      {(selectedPeriodo.saldo_iva || 0) > 0 ? 'A Pagar' : 'A Favor'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Info del cierre */}
              {selectedPeriodo.estado === "CERRADO" && (
                <Card className="bg-slate-50 border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="h-4 w-4 text-slate-600" />
                      <p className="font-semibold text-slate-800">Período Cerrado</p>
                    </div>
                    <div className="text-sm text-slate-600 space-y-1">
                      <p>Cerrado el: {format(new Date(selectedPeriodo.fecha_cierre), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}</p>
                      <p>Por: {selectedPeriodo.cerrado_por}</p>
                      {selectedPeriodo.observaciones && (
                        <p className="mt-2 text-slate-700">Observaciones: {selectedPeriodo.observaciones}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Ventas del período */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-red-600" />
                  Facturas B Emitidas ({(() => {
                    const ventas = ivaVentas.filter(iv => 
                      iv.fecha >= selectedPeriodo.fecha_desde && iv.fecha <= selectedPeriodo.fecha_hasta
                    );
                    return ventas.length;
                  })()})
                </h4>
                <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Fecha</TableHead>
                        <TableHead>Comprobante</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Neto</TableHead>
                        <TableHead className="text-right">IVA 21%</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ivaVentas
                        .filter(iv => 
                          iv.fecha >= selectedPeriodo.fecha_desde && iv.fecha <= selectedPeriodo.fecha_hasta
                        )
                        .map((iv) => (
                          <TableRow key={iv.id}>
                            <TableCell className="text-sm">{iv.fecha}</TableCell>
                            <TableCell className="text-sm font-medium">{iv.tipo_comprobante} {iv.numero_comprobante}</TableCell>
                            <TableCell className="text-sm">{iv.cliente_nombre}</TableCell>
                            <TableCell className="text-right text-sm">${(iv.neto_gravado || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-right text-sm font-bold text-red-600">${(iv.iva_21 || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-right text-sm font-bold">${(iv.total || 0).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Compras del período */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-emerald-600" />
                  Facturas Recibidas ({(() => {
                    const comprasPeriodo = compras.filter(c => 
                      c.fecha >= selectedPeriodo.fecha_desde && 
                      c.fecha <= selectedPeriodo.fecha_hasta && 
                      c.estado === "CONFIRMADA" &&
                      (c.tipo_comprobante === "A" || c.tipo_comprobante === "B")
                    );
                    return comprasPeriodo.length;
                  })()})
                </h4>
                <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Fecha</TableHead>
                        <TableHead>Comprobante</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead className="text-right">Neto</TableHead>
                        <TableHead className="text-right">IVA 21%</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {compras
                        .filter(c => 
                          c.fecha >= selectedPeriodo.fecha_desde && 
                          c.fecha <= selectedPeriodo.fecha_hasta && 
                          c.estado === "CONFIRMADA" &&
                          (c.tipo_comprobante === "A" || c.tipo_comprobante === "B")
                        )
                        .map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="text-sm">{c.fecha}</TableCell>
                            <TableCell className="text-sm font-medium">{c.tipo_comprobante} {c.numero_comprobante_proveedor}</TableCell>
                            <TableCell className="text-sm">{c.proveedor_nombre}</TableCell>
                            <TableCell className="text-right text-sm">${(c.neto_gravado || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-right text-sm font-bold text-emerald-600">${(c.iva_21 || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-right text-sm font-bold">${(c.total_compra || 0).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => exportarPeriodo(selectedPeriodo)}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button onClick={() => setIsDetailDialogOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}