import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Receipt,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Lock,
  FileText,
  Calendar,
  DollarSign,
  BarChart3,
  Settings,
  Plus,
  X
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

export default function IngresosBrutos() {
  const [activeTab, setActiveTab] = useState("periodos");
  const [selectedPeriodo, setSelectedPeriodo] = useState(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isCreatePeriodoDialogOpen, setIsCreatePeriodoDialogOpen] = useState(false);
  const [isRetencionDialogOpen, setIsRetencionDialogOpen] = useState(false);
  const [isProyeccionDialogOpen, setIsProyeccionDialogOpen] = useState(false);
  const [isClosePeriodoDialogOpen, setIsClosePeriodoDialogOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [nuevoPeriodo, setNuevoPeriodo] = useState({
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear()
  });
  const [nuevaRetencion, setNuevaRetencion] = useState({
    compra_id: "",
    fecha: format(new Date(), 'yyyy-MM-dd'),
    neto_base: "",
    importe_retenido: "",
    numero_comprobante: ""
  });
  const [nuevaProyeccion, setNuevaProyeccion] = useState({
    mes: new Date().getMonth() + 2,
    anio: new Date().getFullYear(),
    ventas_estimadas: "",
    retenciones_estimadas: "",
    base_calculo: "PROMEDIO_HISTORICO"
  });
  const [observacionesCierre, setObservacionesCierre] = useState("");

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: periodos = [] } = useQuery({
    queryKey: ['periodosIIBB'],
    queryFn: () => base44.entities.PeriodoIIBB.list('-anio,-mes', 24)
  });

  const { data: iibbVentas = [] } = useQuery({
    queryKey: ['iibbVentas'],
    queryFn: () => base44.entities.IIBBVenta.list('-fecha', 500)
  });

  const { data: retencionesIIBB = [] } = useQuery({
    queryKey: ['retencionesIIBB'],
    queryFn: () => base44.entities.RetencionIIBB.list('-fecha', 500)
  });

  const { data: proyecciones = [] } = useQuery({
    queryKey: ['proyeccionesIIBB'],
    queryFn: () => base44.entities.ProyeccionIIBB.list('anio,mes', 12)
  });

  const { data: configuraciones = [] } = useQuery({
    queryKey: ['configuracionIIBB'],
    queryFn: () => base44.entities.ConfiguracionIIBB.list()
  });

  const { data: compras = [] } = useQuery({
    queryKey: ['compras'],
    queryFn: () => base44.entities.Compra.list('-fecha', 200)
  });

  const configuracion = configuraciones[0];

  const crearPeriodoMutation = useMutation({
    mutationFn: async ({ mes, anio }) => {
      const periodo = `${anio}-${String(mes).padStart(2, '0')}`;
      const existente = periodos.find(p => p.periodo === periodo);
      
      if (existente) {
        throw new Error("El período ya existe");
      }

      const fechaDesde = format(startOfMonth(new Date(anio, mes - 1)), 'yyyy-MM-dd');
      const fechaHasta = format(endOfMonth(new Date(anio, mes - 1)), 'yyyy-MM-dd');

      await base44.entities.PeriodoIIBB.create({
        mes,
        anio,
        periodo,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        estado: "ABIERTO",
        iibb_ventas: 0,
        iibb_retenido: 0,
        saldo_iibb: 0,
        cantidad_ventas: 0,
        cantidad_retenciones: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodosIIBB'] });
      setIsCreatePeriodoDialogOpen(false);
      alert("✅ Período creado exitosamente");
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const recalcularPeriodoMutation = useMutation({
    mutationFn: async (periodoId) => {
      const periodo = periodos.find(p => p.id === periodoId);
      
      if (periodo.estado === "CERRADO") {
        throw new Error("No se puede recalcular un período cerrado");
      }

      const ventasDelPeriodo = iibbVentas.filter(v => v.periodo === periodo.periodo);
      const retencionesDelPeriodo = retencionesIIBB.filter(r => r.periodo === periodo.periodo);

      const totalVentas = ventasDelPeriodo.reduce((acc, v) => acc + (v.importe_iibb || 0), 0);
      const totalRetenciones = retencionesDelPeriodo.reduce((acc, r) => acc + (r.importe_retenido || 0), 0);
      const saldo = totalVentas - totalRetenciones;

      await base44.entities.PeriodoIIBB.update(periodoId, {
        iibb_ventas: totalVentas,
        iibb_retenido: totalRetenciones,
        saldo_iibb: saldo,
        cantidad_ventas: ventasDelPeriodo.length,
        cantidad_retenciones: retencionesDelPeriodo.length
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodosIIBB'] });
      alert("✅ Período recalculado");
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const cerrarPeriodoMutation = useMutation({
    mutationFn: async ({ periodoId, observaciones }) => {
      if (!user) throw new Error("Usuario no autenticado");
      
      const periodo = periodos.find(p => p.id === periodoId);
      
      if (periodo.estado === "CERRADO") {
        throw new Error("El período ya está cerrado");
      }

      // Recalcular antes de cerrar
      const ventasDelPeriodo = iibbVentas.filter(v => v.periodo === periodo.periodo);
      const retencionesDelPeriodo = retencionesIIBB.filter(r => r.periodo === periodo.periodo);

      const totalVentas = ventasDelPeriodo.reduce((acc, v) => acc + (v.importe_iibb || 0), 0);
      const totalRetenciones = retencionesDelPeriodo.reduce((acc, r) => acc + (r.importe_retenido || 0), 0);
      const saldo = totalVentas - totalRetenciones;

      await base44.entities.PeriodoIIBB.update(periodoId, {
        estado: "CERRADO",
        iibb_ventas: totalVentas,
        iibb_retenido: totalRetenciones,
        saldo_iibb: saldo,
        cantidad_ventas: ventasDelPeriodo.length,
        cantidad_retenciones: retencionesDelPeriodo.length,
        fecha_cierre: new Date().toISOString(),
        cerrado_por: user.email,
        observaciones
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodosIIBB'] });
      setIsClosePeriodoDialogOpen(false);
      setSelectedPeriodo(null);
      alert("✅ Período cerrado exitosamente");
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const crearRetencionMutation = useMutation({
    mutationFn: async (retencionData) => {
      if (!retencionData.compra_id) throw new Error("Seleccione una compra");
      if (!retencionData.importe_retenido || retencionData.importe_retenido <= 0) {
        throw new Error("El importe retenido debe ser mayor a 0");
      }

      const compra = compras.find(c => c.id === retencionData.compra_id);
      const periodo = retencionData.fecha.substring(0, 7);

      // Verificar que el período esté abierto
      const periodoIIBB = periodos.find(p => p.periodo === periodo);
      if (periodoIIBB?.estado === "CERRADO") {
        throw new Error("No se pueden registrar retenciones en períodos cerrados");
      }

      await base44.entities.RetencionIIBB.create({
        compra_id: retencionData.compra_id,
        proveedor_id: compra.proveedor_id,
        proveedor_nombre: compra.proveedor_nombre,
        fecha: retencionData.fecha,
        periodo,
        neto_base: retencionData.neto_base || compra.neto_gravado,
        importe_retenido: retencionData.importe_retenido,
        numero_comprobante: retencionData.numero_comprobante || ""
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retencionesIIBB'] });
      setIsRetencionDialogOpen(false);
      setNuevaRetencion({
        compra_id: "",
        fecha: format(new Date(), 'yyyy-MM-dd'),
        neto_base: "",
        importe_retenido: "",
        numero_comprobante: ""
      });
      alert("✅ Retención registrada");
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const crearProyeccionMutation = useMutation({
    mutationFn: async (proyData) => {
      if (!configuracion) throw new Error("Configure primero los parámetros de IIBB");
      if (!proyData.ventas_estimadas || proyData.ventas_estimadas <= 0) {
        throw new Error("Las ventas estimadas deben ser mayores a 0");
      }

      const periodo = `${proyData.anio}-${String(proyData.mes).padStart(2, '0')}`;
      const iibbVentasProyectado = proyData.ventas_estimadas * configuracion.alicuota_iibb;
      const saldoIIBBProyectado = iibbVentasProyectado - (proyData.retenciones_estimadas || 0);

      await base44.entities.ProyeccionIIBB.create({
        mes: proyData.mes,
        anio: proyData.anio,
        periodo,
        ventas_estimadas: proyData.ventas_estimadas,
        alicuota: configuracion.alicuota_iibb,
        iibb_ventas_proyectado: iibbVentasProyectado,
        retenciones_estimadas: proyData.retenciones_estimadas || 0,
        saldo_iibb_proyectado: saldoIIBBProyectado,
        base_calculo: proyData.base_calculo
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proyeccionesIIBB'] });
      setIsProyeccionDialogOpen(false);
      setNuevaProyeccion({
        mes: new Date().getMonth() + 2,
        anio: new Date().getFullYear(),
        ventas_estimadas: "",
        retenciones_estimadas: "",
        base_calculo: "PROMEDIO_HISTORICO"
      });
      alert("✅ Proyección creada");
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const handleOpenDetail = (periodo) => {
    setSelectedPeriodo(periodo);
    setIsDetailDialogOpen(true);
  };

  const ventasDelPeriodo = selectedPeriodo 
    ? iibbVentas.filter(v => v.periodo === selectedPeriodo.periodo)
    : [];

  const retencionesDelPeriodo = selectedPeriodo
    ? retencionesIIBB.filter(r => r.periodo === selectedPeriodo.periodo)
    : [];

  const comprasPendientes = compras.filter(c => 
    c.estado === "CONFIRMADA" || c.estado === "PENDIENTE" || c.estado === "PARCIAL" || c.estado === "PAGADA"
  );

  // Estadísticas
  const periodoActual = periodos.find(p => p.periodo === format(new Date(), 'yyyy-MM'));
  const acumuladoAnioActual = periodos
    .filter(p => p.anio === new Date().getFullYear())
    .reduce((acc, p) => acc + (p.saldo_iibb || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-purple-600" />
            Ingresos Brutos (IIBB)
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestión fiscal de IIBB - Ventas, Retenciones y Proyecciones
          </p>
        </div>
        <Button onClick={() => setIsConfigDialogOpen(true)} variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Configuración
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">IIBB Período Actual</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">
              ${(periodoActual?.saldo_iibb || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Acumulado Año</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              ${acumuladoAnioActual.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Períodos Abiertos</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {periodos.filter(p => p.estado === "ABIERTO").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Alícuota Actual</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {configuracion ? `${(configuracion.alicuota_iibb * 100).toFixed(2)}%` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="periodos">Períodos IIBB</TabsTrigger>
          <TabsTrigger value="retenciones">Retenciones</TabsTrigger>
          <TabsTrigger value="proyecciones">Proyecciones</TabsTrigger>
        </TabsList>

        <TabsContent value="periodos" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsCreatePeriodoDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Crear Período
            </Button>
          </div>

          <Card className="border-0 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">IIBB Ventas</TableHead>
                  <TableHead className="text-right">Retenciones</TableHead>
                  <TableHead className="text-right">Saldo IIBB</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodos.map((periodo) => (
                  <TableRow key={periodo.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">
                      {format(new Date(periodo.anio, periodo.mes - 1), "MMMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="text-right text-red-600 font-bold">
                      ${(periodo.iibb_ventas || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-bold">
                      ${(periodo.iibb_retenido || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-bold text-purple-600">
                      ${(periodo.saldo_iibb || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={periodo.estado === "CERRADO" ? "bg-slate-100 text-slate-700" : "bg-amber-100 text-amber-700"}>
                        {periodo.estado === "CERRADO" && <Lock className="h-3 w-3 mr-1" />}
                        {periodo.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenDetail(periodo)}>
                          <FileText className="h-4 w-4" />
                        </Button>
                        {periodo.estado === "ABIERTO" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => recalcularPeriodoMutation.mutate(periodo.id)}
                            >
                              <TrendingUp className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-slate-600"
                              onClick={() => {
                                setSelectedPeriodo(periodo);
                                setIsClosePeriodoDialogOpen(true);
                              }}
                            >
                              <Lock className="h-3 w-3 mr-1" />
                              Cerrar
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {periodos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No hay períodos creados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="retenciones" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsRetencionDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Registrar Retención
            </Button>
          </div>

          <Card className="border-0 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">Importe Retenido</TableHead>
                  <TableHead>Comprobante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {retencionesIIBB.map((ret) => (
                  <TableRow key={ret.id}>
                    <TableCell className="text-sm text-slate-600">
                      {format(new Date(ret.fecha), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium">{ret.proveedor_nombre}</TableCell>
                    <TableCell className="font-mono text-sm">{ret.periodo}</TableCell>
                    <TableCell className="text-right">${(ret.neto_base || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      ${(ret.importe_retenido || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{ret.numero_comprobante || "—"}</TableCell>
                  </TableRow>
                ))}
                {retencionesIIBB.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No hay retenciones registradas
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="proyecciones" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsProyeccionDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Proyección
            </Button>
          </div>

          <Card className="border-0 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Ventas Estimadas</TableHead>
                  <TableHead className="text-right">IIBB Proyectado</TableHead>
                  <TableHead className="text-right">Retenciones Est.</TableHead>
                  <TableHead className="text-right">Saldo Proyectado</TableHead>
                  <TableHead>Base Cálculo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proyecciones.map((proy) => {
                  const umbral = configuracion?.umbral_alerta || 50000;
                  const alerta = proy.saldo_iibb_proyectado > umbral;

                  return (
                    <TableRow key={proy.id} className={alerta ? "bg-red-50" : ""}>
                      <TableCell className="font-medium">
                        {format(new Date(proy.anio, proy.mes - 1), "MMMM yyyy", { locale: es })}
                      </TableCell>
                      <TableCell className="text-right">${(proy.ventas_estimadas || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-purple-600 font-bold">
                        ${(proy.iibb_ventas_proyectado || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        ${(proy.retenciones_estimadas || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {alerta && <AlertTriangle className="h-4 w-4 text-red-600 inline mr-1" />}
                        ${(proy.saldo_iibb_proyectado || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{proy.base_calculo?.replace(/_/g, ' ')}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {proyecciones.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No hay proyecciones creadas
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Crear Período */}
      <Dialog open={isCreatePeriodoDialogOpen} onOpenChange={setIsCreatePeriodoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Período IIBB</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mes</Label>
              <Select value={String(nuevoPeriodo.mes)} onValueChange={(v) => setNuevoPeriodo({ ...nuevoPeriodo, mes: parseInt(v) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                    <SelectItem key={m} value={String(m)}>
                      {format(new Date(2000, m - 1), "MMMM", { locale: es })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Año</Label>
              <Input
                type="number"
                value={nuevoPeriodo.anio}
                onChange={(e) => setNuevoPeriodo({ ...nuevoPeriodo, anio: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatePeriodoDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => crearPeriodoMutation.mutate(nuevoPeriodo)} className="bg-purple-600">
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalle Período */}
      {selectedPeriodo && (
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Detalle Período - {format(new Date(selectedPeriodo.anio, selectedPeriodo.mes - 1), "MMMM yyyy", { locale: es })}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-2 border-red-200">
                  <CardContent className="p-4">
                    <p className="text-xs text-red-700 uppercase font-medium">IIBB Ventas</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">
                      ${(selectedPeriodo.iibb_ventas || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{selectedPeriodo.cantidad_ventas} operaciones</p>
                  </CardContent>
                </Card>
                <Card className="border-2 border-green-200">
                  <CardContent className="p-4">
                    <p className="text-xs text-green-700 uppercase font-medium">Retenciones</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      ${(selectedPeriodo.iibb_retenido || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{selectedPeriodo.cantidad_retenciones} retenciones</p>
                  </CardContent>
                </Card>
                <Card className="border-2 border-purple-200">
                  <CardContent className="p-4">
                    <p className="text-xs text-purple-700 uppercase font-medium">Saldo IIBB</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">
                      ${(selectedPeriodo.saldo_iibb || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedPeriodo.saldo_iibb > 0 ? "A pagar" : selectedPeriodo.saldo_iibb < 0 ? "A favor" : "Saldado"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h4 className="font-semibold mb-3">IIBB Ventas del Período</h4>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Comprobante</TableHead>
                      <TableHead className="text-right">Neto Gravado</TableHead>
                      <TableHead className="text-right">Alícuota</TableHead>
                      <TableHead className="text-right">IIBB</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ventasDelPeriodo.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="text-sm">{format(new Date(v.fecha), "dd/MM/yyyy", { locale: es })}</TableCell>
                        <TableCell className="font-medium">{v.cliente_nombre}</TableCell>
                        <TableCell className="text-sm">{v.numero_comprobante || "—"}</TableCell>
                        <TableCell className="text-right">${v.neto_gravado.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{(v.alicuota * 100).toFixed(2)}%</TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          ${v.importe_iibb.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {ventasDelPeriodo.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-slate-500">Sin ventas</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Retenciones Sufridas</h4>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Fecha</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">Retenido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {retencionesDelPeriodo.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">{format(new Date(r.fecha), "dd/MM/yyyy", { locale: es })}</TableCell>
                        <TableCell className="font-medium">{r.proveedor_nombre}</TableCell>
                        <TableCell className="text-right">${(r.neto_base || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          ${r.importe_retenido.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {retencionesDelPeriodo.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-slate-500">Sin retenciones</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setIsDetailDialogOpen(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog Registrar Retención */}
      <Dialog open={isRetencionDialogOpen} onOpenChange={setIsRetencionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Retención de IIBB</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Compra *</Label>
              <Select value={nuevaRetencion.compra_id} onValueChange={(v) => {
                const compra = compras.find(c => c.id === v);
                setNuevaRetencion({ 
                  ...nuevaRetencion, 
                  compra_id: v,
                  neto_base: compra?.neto_gravado?.toString() || ""
                });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar compra" />
                </SelectTrigger>
                <SelectContent>
                  {comprasPendientes.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.proveedor_nombre} - {c.tipo_comprobante} {c.numero_comprobante_proveedor} - ${c.total_compra.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={nuevaRetencion.fecha}
                  onChange={(e) => setNuevaRetencion({ ...nuevaRetencion, fecha: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Base de Retención</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={nuevaRetencion.neto_base}
                  onChange={(e) => setNuevaRetencion({ ...nuevaRetencion, neto_base: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Importe Retenido *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={nuevaRetencion.importe_retenido}
                  onChange={(e) => setNuevaRetencion({ ...nuevaRetencion, importe_retenido: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>N° Comprobante</Label>
                <Input
                  value={nuevaRetencion.numero_comprobante}
                  onChange={(e) => setNuevaRetencion({ ...nuevaRetencion, numero_comprobante: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRetencionDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => crearRetencionMutation.mutate(nuevaRetencion)} className="bg-green-600">
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Proyección */}
      <Dialog open={isProyeccionDialogOpen} onOpenChange={setIsProyeccionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Proyección IIBB</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mes</Label>
                <Select value={String(nuevaProyeccion.mes)} onValueChange={(v) => setNuevaProyeccion({ ...nuevaProyeccion, mes: parseInt(v) })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                      <SelectItem key={m} value={String(m)}>
                        {format(new Date(2000, m - 1), "MMMM", { locale: es })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Año</Label>
                <Input
                  type="number"
                  value={nuevaProyeccion.anio}
                  onChange={(e) => setNuevaProyeccion({ ...nuevaProyeccion, anio: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ventas Estimadas *</Label>
              <Input
                type="number"
                step="0.01"
                value={nuevaProyeccion.ventas_estimadas}
                onChange={(e) => setNuevaProyeccion({ ...nuevaProyeccion, ventas_estimadas: parseFloat(e.target.value) })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Retenciones Estimadas</Label>
              <Input
                type="number"
                step="0.01"
                value={nuevaProyeccion.retenciones_estimadas}
                onChange={(e) => setNuevaProyeccion({ ...nuevaProyeccion, retenciones_estimadas: parseFloat(e.target.value) })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Base de Cálculo</Label>
              <Select value={nuevaProyeccion.base_calculo} onValueChange={(v) => setNuevaProyeccion({ ...nuevaProyeccion, base_calculo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROMEDIO_HISTORICO">Promedio Histórico</SelectItem>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                  <SelectItem value="TENDENCIA">Tendencia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {configuracion && nuevaProyeccion.ventas_estimadas > 0 && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900 mb-2">Proyección Calculada</p>
                <div className="space-y-1 text-sm">
                  <p>IIBB Ventas: <strong>${(nuevaProyeccion.ventas_estimadas * configuracion.alicuota_iibb).toLocaleString()}</strong></p>
                  <p>Retenciones: <strong>${(nuevaProyeccion.retenciones_estimadas || 0).toLocaleString()}</strong></p>
                  <p className="text-lg font-bold text-purple-600 mt-2">
                    Saldo: ${((nuevaProyeccion.ventas_estimadas * configuracion.alicuota_iibb) - (nuevaProyeccion.retenciones_estimadas || 0)).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProyeccionDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => crearProyeccionMutation.mutate(nuevaProyeccion)} className="bg-blue-600">
              Crear Proyección
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Cerrar Período */}
      <Dialog open={isClosePeriodoDialogOpen} onOpenChange={setIsClosePeriodoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-red-600" />
              Cerrar Período IIBB
            </DialogTitle>
          </DialogHeader>
          
          {selectedPeriodo && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                <p className="text-sm font-semibold text-red-900 mb-2">⚠️ Advertencia</p>
                <p className="text-sm text-red-700">
                  Al cerrar el período {format(new Date(selectedPeriodo.anio, selectedPeriodo.mes - 1), "MMMM yyyy", { locale: es })}, 
                  no podrá modificar las ventas ni retenciones de IIBB de ese mes.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Textarea
                  value={observacionesCierre}
                  onChange={(e) => setObservacionesCierre(e.target.value)}
                  placeholder="Notas sobre el cierre..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsClosePeriodoDialogOpen(false);
              setObservacionesCierre("");
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={() => cerrarPeriodoMutation.mutate({ 
                periodoId: selectedPeriodo.id, 
                observaciones: observacionesCierre 
              })}
              className="bg-red-600 hover:bg-red-700"
            >
              <Lock className="h-4 w-4 mr-2" />
              Confirmar Cierre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}