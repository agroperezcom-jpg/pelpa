import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Receipt,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Calendar,
  BarChart3,
  Download,
  ArrowRight,
  Lock,
  Unlock
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";

export default function TableroFiscal() {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(format(new Date(), 'yyyy-MM'));
  const [activeView, setActiveView] = useState("resumen");

  const { data: periodosIVA = [] } = useQuery({
    queryKey: ['periodosIVA'],
    queryFn: () => base44.entities.PeriodoIVA.list('-anio,-mes', 24)
  });

  const { data: periodosIIBB = [] } = useQuery({
    queryKey: ['periodosIIBB'],
    queryFn: () => base44.entities.PeriodoIIBB.list('-anio,-mes', 24)
  });

  const { data: iibbVentas = [] } = useQuery({
    queryKey: ['iibbVentas'],
    queryFn: () => base44.entities.IIBBVenta.list('-fecha', 500)
  });

  const { data: ivaVentas = [] } = useQuery({
    queryKey: ['ivaVentas'],
    queryFn: () => base44.entities.IVAVenta.list('-fecha', 500)
  });

  const { data: compras = [] } = useQuery({
    queryKey: ['compras'],
    queryFn: () => base44.entities.Compra.list('-fecha', 500)
  });

  const { data: proyeccionesIIBB = [] } = useQuery({
    queryKey: ['proyeccionesIIBB'],
    queryFn: () => base44.entities.ProyeccionIIBB.list('anio,mes', 12)
  });

  const { data: configuracionIIBB = [] } = useQuery({
    queryKey: ['configuracionIIBB'],
    queryFn: () => base44.entities.ConfiguracionIIBB.list()
  });

  const periodoIVA = periodosIVA.find(p => p.periodo === periodoSeleccionado);
  const periodoIIBB = periodosIIBB.find(p => p.periodo === periodoSeleccionado);
  const configIIBB = configuracionIIBB[0];

  // Cálculo de variaciones
  const [anio, mes] = periodoSeleccionado.split('-').map(Number);
  const mesAnterior = mes === 1 ? 12 : mes - 1;
  const anioAnterior = mes === 1 ? anio - 1 : anio;
  const periodoAnterior = `${anioAnterior}-${String(mesAnterior).padStart(2, '0')}`;
  
  const periodoIVAAnterior = periodosIVA.find(p => p.periodo === periodoAnterior);
  const periodoIIBBAnterior = periodosIIBB.find(p => p.periodo === periodoAnterior);

  const variacionIVA = periodoIVA && periodoIVAAnterior 
    ? ((periodoIVA.saldo_iva - periodoIVAAnterior.saldo_iva) / Math.abs(periodoIVAAnterior.saldo_iva || 1)) * 100
    : 0;

  const variacionIIBB = periodoIIBB && periodoIIBBAnterior
    ? ((periodoIIBB.saldo_iibb - periodoIIBBAnterior.saldo_iibb) / Math.abs(periodoIIBBAnterior.saldo_iibb || 1)) * 100
    : 0;

  // Proyecciones
  const proyeccionMes = proyeccionesIIBB.find(p => p.periodo === periodoSeleccionado);

  // Alertas
  const alertas = [];

  if (periodoIVA && periodoIVA.saldo_iva > 100000) {
    alertas.push({
      tipo: "IVA_ALTO",
      mensaje: `IVA a pagar muy alto: $${periodoIVA.saldo_iva.toLocaleString()}`,
      severidad: "alta"
    });
  }

  if (periodoIIBB && configIIBB && periodoIIBB.saldo_iibb > (configIIBB.umbral_alerta || 50000)) {
    alertas.push({
      tipo: "IIBB_ALTO",
      mensaje: `IIBB proyectado supera umbral: $${periodoIIBB.saldo_iibb.toLocaleString()}`,
      severidad: "alta"
    });
  }

  if (variacionIVA > 50) {
    alertas.push({
      tipo: "IVA_AUMENTO",
      mensaje: `IVA aumentó ${variacionIVA.toFixed(0)}% respecto al mes anterior`,
      severidad: "media"
    });
  }

  if (variacionIIBB > 50) {
    alertas.push({
      tipo: "IIBB_AUMENTO",
      mensaje: `IIBB aumentó ${variacionIIBB.toFixed(0)}% respecto al mes anterior`,
      severidad: "media"
    });
  }

  const periodosAbiertos = [...periodosIVA.filter(p => p.estado === "ABIERTO"), ...periodosIIBB.filter(p => p.estado === "ABIERTO")];
  const periodosViejos = periodosAbiertos.filter(p => {
    const [a, m] = p.periodo.split('-').map(Number);
    const fechaPeriodo = new Date(a, m - 1);
    const hoy = new Date();
    const diff = (hoy - fechaPeriodo) / (1000 * 60 * 60 * 24 * 30);
    return diff > 2;
  });

  if (periodosViejos.length > 0) {
    alertas.push({
      tipo: "PERIODOS_ABIERTOS",
      mensaje: `Hay ${periodosViejos.length} período(s) fiscal(es) sin cerrar`,
      severidad: "media"
    });
  }

  // Histórico últimos 6 meses
  const ultimosPeriodos = periodosIVA.slice(0, 6).reverse();
  const chartData = ultimosPeriodos.map(p => {
    const pIIBB = periodosIIBB.find(pi => pi.periodo === p.periodo);
    return {
      periodo: format(new Date(p.anio, p.mes - 1), "MMM yy", { locale: es }),
      IVA: p.saldo_iva || 0,
      IIBB: pIIBB?.saldo_iibb || 0,
      Total: (p.saldo_iva || 0) + (pIIBB?.saldo_iibb || 0)
    };
  });

  const handleExport = () => {
    const data = [
      ['Período', 'IVA Débito', 'IVA Crédito', 'IVA Saldo', 'IIBB Ventas', 'IIBB Retenciones', 'IIBB Saldo', 'Total Impuestos'],
      ...ultimosPeriodos.map(p => {
        const pIIBB = periodosIIBB.find(pi => pi.periodo === p.periodo);
        return [
          p.periodo,
          p.total_iva_debito,
          p.total_iva_credito,
          p.saldo_iva,
          pIIBB?.iibb_ventas || 0,
          pIIBB?.iibb_retenido || 0,
          pIIBB?.saldo_iibb || 0,
          (p.saldo_iva || 0) + (pIIBB?.saldo_iibb || 0)
        ];
      })
    ];
    const csv = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tablero_fiscal_${periodoSeleccionado}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-600" />
            Tablero Fiscal Unificado
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Control integral IVA e IIBB - Solo informativo
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            type="month"
            value={periodoSeleccionado}
            onChange={(e) => setPeriodoSeleccionado(e.target.value)}
            className="w-48"
          />
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <Card className="border-2 border-red-300 bg-red-50">
          <CardContent className="p-4">
            <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertas Fiscales ({alertas.length})
            </h3>
            <div className="space-y-2">
              {alertas.map((alerta, idx) => (
                <div key={idx} className={`flex items-start gap-2 p-3 rounded-lg ${
                  alerta.severidad === "alta" ? "bg-red-100 border border-red-300" :
                  "bg-amber-100 border border-amber-300"
                }`}>
                  <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                    alerta.severidad === "alta" ? "text-red-600" : "text-amber-600"
                  }`} />
                  <p className="text-sm font-medium">{alerta.mensaje}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-4 mb-6">
        <Label className="text-sm font-medium text-slate-700">Vista:</Label>
        <Select value={activeView} onValueChange={setActiveView}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="resumen">Resumen Mensual</SelectItem>
            <SelectItem value="iva">Detalle IVA</SelectItem>
            <SelectItem value="iibb">Detalle IIBB</SelectItem>
            <SelectItem value="proyecciones">Proyecciones</SelectItem>
            <SelectItem value="historico">Histórico</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {activeView === "resumen" && (
          <>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* IVA */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-blue-600" />
                    IVA - Impuesto al Valor Agregado
                  </h3>
                  {periodoIVA && (
                    <Badge className={periodoIVA.estado === "CERRADO" ? "bg-slate-100 text-slate-700" : "bg-amber-100 text-amber-700"}>
                      {periodoIVA.estado === "CERRADO" ? <Lock className="h-3 w-3 mr-1" /> : <Unlock className="h-3 w-3 mr-1" />}
                      {periodoIVA.estado}
                    </Badge>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-white rounded-lg border">
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-medium">IVA Ventas (Débito)</p>
                      <p className="text-2xl font-bold text-red-600 mt-1">
                        ${(periodoIVA?.total_iva_debito || 0).toLocaleString()}
                      </p>
                    </div>
                    <Receipt className="h-8 w-8 text-red-300" />
                  </div>

                  <div className="flex justify-between items-center p-4 bg-white rounded-lg border">
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-medium">IVA Compras (Crédito)</p>
                      <p className="text-2xl font-bold text-green-600 mt-1">
                        ${(periodoIVA?.total_iva_credito || 0).toLocaleString()}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-300" />
                  </div>

                  <div className="p-5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg border-2 border-blue-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-blue-100 uppercase font-medium">Saldo IVA del Mes</p>
                        <p className="text-3xl font-bold text-white mt-2">
                          ${(periodoIVA?.saldo_iva || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-blue-200 mt-1">
                          {(periodoIVA?.saldo_iva || 0) > 0 ? "A pagar" : (periodoIVA?.saldo_iva || 0) < 0 ? "A favor" : "Saldado"}
                        </p>
                      </div>
                      {variacionIVA !== 0 && (
                        <div className="text-right">
                          <Badge className="bg-white/20 text-white">
                            {variacionIVA > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                            {Math.abs(variacionIVA).toFixed(0)}%
                          </Badge>
                          <p className="text-xs text-blue-200 mt-1">vs mes anterior</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Link to={createPageUrl("IVAMensual")}>
                    <Button variant="outline" className="w-full">
                      Ver detalle IVA
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* IIBB */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-purple-600" />
                    IIBB - Ingresos Brutos
                  </h3>
                  {periodoIIBB && (
                    <Badge className={periodoIIBB.estado === "CERRADO" ? "bg-slate-100 text-slate-700" : "bg-amber-100 text-amber-700"}>
                      {periodoIIBB.estado === "CERRADO" ? <Lock className="h-3 w-3 mr-1" /> : <Unlock className="h-3 w-3 mr-1" />}
                      {periodoIIBB.estado}
                    </Badge>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-white rounded-lg border">
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-medium">IIBB Ventas</p>
                      <p className="text-2xl font-bold text-red-600 mt-1">
                        ${(periodoIIBB?.iibb_ventas || 0).toLocaleString()}
                      </p>
                    </div>
                    <Receipt className="h-8 w-8 text-red-300" />
                  </div>

                  <div className="flex justify-between items-center p-4 bg-white rounded-lg border">
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-medium">Retenciones Sufridas</p>
                      <p className="text-2xl font-bold text-green-600 mt-1">
                        ${(periodoIIBB?.iibb_retenido || 0).toLocaleString()}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-300" />
                  </div>

                  <div className="p-5 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg border-2 border-purple-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-purple-100 uppercase font-medium">Saldo IIBB del Mes</p>
                        <p className="text-3xl font-bold text-white mt-2">
                          ${(periodoIIBB?.saldo_iibb || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-purple-200 mt-1">
                          {(periodoIIBB?.saldo_iibb || 0) > 0 ? "A pagar" : (periodoIIBB?.saldo_iibb || 0) < 0 ? "A favor" : "Saldado"}
                        </p>
                      </div>
                      {variacionIIBB !== 0 && (
                        <div className="text-right">
                          <Badge className="bg-white/20 text-white">
                            {variacionIIBB > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                            {Math.abs(variacionIIBB).toFixed(0)}%
                          </Badge>
                          <p className="text-xs text-purple-200 mt-1">vs mes anterior</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Link to={createPageUrl("IngresosBrutos")}>
                    <Button variant="outline" className="w-full">
                      Ver detalle IIBB
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resumen Consolidado */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-600 to-indigo-700">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Carga Fiscal Total del Mes
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white/10 rounded-lg">
                  <p className="text-xs text-indigo-200 uppercase">IVA</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    ${(periodoIVA?.saldo_iva || 0).toLocaleString()}
                  </p>
                </div>
                <div className="text-center p-4 bg-white/10 rounded-lg">
                  <p className="text-xs text-indigo-200 uppercase">IIBB</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    ${(periodoIIBB?.saldo_iibb || 0).toLocaleString()}
                  </p>
                </div>
                <div className="text-center p-4 bg-white/20 rounded-lg border-2 border-white/30">
                  <p className="text-xs text-indigo-100 uppercase font-bold">TOTAL</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    ${((periodoIVA?.saldo_iva || 0) + (periodoIIBB?.saldo_iibb || 0)).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          </>
        )}

        {activeView === "iva" && (
          <>
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <p className="text-xs font-medium text-slate-500 uppercase">Facturas B Emitidas</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{periodoIVA?.cantidad_facturas_emitidas || 0}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <p className="text-xs font-medium text-slate-500 uppercase">Neto Gravado Ventas</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  ${ivaVentas.filter(v => v.periodo === periodoSeleccionado).reduce((acc, v) => acc + (v.neto_gravado || 0), 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <p className="text-xs font-medium text-slate-500 uppercase">Facturas Compra Recibidas</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{periodoIVA?.cantidad_facturas_recibidas || 0}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <h4 className="font-semibold mb-4">Composición IVA</h4>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-red-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">IVA Débito Fiscal (Ventas)</span>
                  <span className="font-bold text-red-600">${(periodoIVA?.total_iva_debito || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">IVA Crédito Fiscal (Compras)</span>
                  <span className="font-bold text-green-600">-${(periodoIVA?.total_iva_credito || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-4 bg-blue-600 text-white rounded-lg">
                  <span className="font-bold">SALDO IVA</span>
                  <span className="font-bold text-xl">${(periodoIVA?.saldo_iva || 0).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          </>
        )}

        {activeView === "iibb" && (
          <>
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <p className="text-xs font-medium text-slate-500 uppercase">Ventas con IIBB</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{periodoIIBB?.cantidad_ventas || 0}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <p className="text-xs font-medium text-slate-500 uppercase">Retenciones Sufridas</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{periodoIIBB?.cantidad_retenciones || 0}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <p className="text-xs font-medium text-slate-500 uppercase">Alícuota IIBB</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">
                  {configIIBB ? `${(configIIBB.alicuota_iibb * 100).toFixed(2)}%` : "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <h4 className="font-semibold mb-4">Composición IIBB</h4>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-red-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">IIBB Ventas</span>
                  <span className="font-bold text-red-600">${(periodoIIBB?.iibb_ventas || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">Retenciones a Favor</span>
                  <span className="font-bold text-green-600">-${(periodoIIBB?.iibb_retenido || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-4 bg-purple-600 text-white rounded-lg">
                  <span className="font-bold">SALDO IIBB</span>
                  <span className="font-bold text-xl">${(periodoIIBB?.saldo_iibb || 0).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {configIIBB && (
            <Card className="border-0 shadow-sm bg-purple-50">
              <CardContent className="p-4">
                <p className="text-sm font-semibold text-purple-900 mb-2">ℹ️ Configuración Actividad</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-purple-700">Actividad:</p>
                    <p className="font-bold">{configIIBB.nombre_actividad}</p>
                  </div>
                  <div>
                    <p className="text-purple-700">Jurisdicción:</p>
                    <p className="font-bold">{configIIBB.jurisdiccion}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          </>
        )}

        {activeView === "proyecciones" && (
          <>
          {proyeccionMes && (
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardContent className="p-6">
                <h3 className="font-bold text-blue-900 mb-4">
                  Proyección - {format(new Date(proyeccionMes.anio, proyeccionMes.mes - 1), "MMMM yyyy", { locale: es })}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-blue-700 uppercase">Ventas Estimadas</p>
                    <p className="text-2xl font-bold text-blue-900">${proyeccionMes.ventas_estimadas.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700 uppercase">IIBB Proyectado</p>
                    <p className="text-2xl font-bold text-purple-600">${proyeccionMes.iibb_ventas_proyectado.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700 uppercase">Retenciones Estimadas</p>
                    <p className="text-2xl font-bold text-green-600">${(proyeccionMes.retenciones_estimadas || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700 uppercase">Saldo Proyectado</p>
                    <p className="text-2xl font-bold text-purple-600">${proyeccionMes.saldo_iibb_proyectado.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {periodoIIBB && proyeccionMes && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <h4 className="font-semibold mb-4">Comparación: Real vs Proyectado</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium">IIBB Proyectado</span>
                    <span className="font-bold text-blue-600">${proyeccionMes.saldo_iibb_proyectado.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium">IIBB Real</span>
                    <span className="font-bold text-purple-600">${periodoIIBB.saldo_iibb.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-100 rounded-lg border-2">
                    <span className="font-bold">Diferencia</span>
                    <span className={`font-bold text-lg ${
                      (periodoIIBB.saldo_iibb - proyeccionMes.saldo_iibb_proyectado) > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      ${Math.abs(periodoIIBB.saldo_iibb - proyeccionMes.saldo_iibb_proyectado).toLocaleString()}
                      {(periodoIIBB.saldo_iibb - proyeccionMes.saldo_iibb_proyectado) > 0 ? ' ↑' : ' ↓'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Link to={createPageUrl("IngresosBrutos")}>
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              Gestionar Proyecciones
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          </>
        )}

        {activeView === "historico" && (
          <>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <h4 className="font-semibold mb-4">Evolución Últimos 6 Meses</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="periodo" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="IVA" fill="#3b82f6" name="IVA" />
                  <Bar dataKey="IIBB" fill="#a855f7" name="IIBB" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <h4 className="font-semibold mb-4">Carga Fiscal Total</h4>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="periodo" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="Total" stroke="#4f46e5" fill="#818cf8" name="Total Impuestos" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          </>
        )}
      </div>
    </div>
  );
}