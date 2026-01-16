import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  FileText,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  DollarSign,
  ArrowRight
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

export default function EstadoResultados() {
  const [mesInicio, setMesInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [mesFin, setMesFin] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const { data: ventas = [] } = useQuery({
    queryKey: ['ventas'],
    queryFn: () => base44.entities.Sale.list('-created_date', 1000)
  });

  const { data: gastos = [] } = useQuery({
    queryKey: ['gastos'],
    queryFn: () => base44.entities.Expense.list('-date', 1000)
  });

  const { data: cuentasContables = [] } = useQuery({
    queryKey: ['cuentasContables'],
    queryFn: () => base44.entities.CuentaContable.list('codigo', 500)
  });

  // Filtrar por rango de fechas
  const ventasPeriodo = ventas.filter(v => 
    v.estado === 'CONFIRMADA' &&
    v.created_date >= mesInicio && 
    v.created_date <= mesFin + 'T23:59:59'
  );

  const gastosPeriodo = gastos.filter(g => 
    g.date >= mesInicio && 
    g.date <= mesFin
  );

  // INGRESOS - desde ventas con cuenta contable asignada
  const ventasConCuenta = ventasPeriodo.filter(v => v.cuenta_contable_id);
  const ingresosPorCuenta = ventasConCuenta.reduce((acc, venta) => {
    const key = venta.cuenta_contable_id;
    if (!acc[key]) {
      acc[key] = {
        cuenta_id: venta.cuenta_contable_id,
        cuenta_codigo: venta.cuenta_contable_codigo,
        cuenta_nombre: venta.cuenta_contable_nombre,
        total: 0
      };
    }
    acc[key].total += venta.total || 0;
    return acc;
  }, {});

  const totalIngresos = Object.values(ingresosPorCuenta).reduce((sum, item) => sum + item.total, 0);

  // COSTOS - gastos con tipo_resultado = "Costo"
  const costosPorCuenta = gastosPeriodo
    .filter(g => g.cuenta_contable_id)
    .reduce((acc, gasto) => {
      const cuenta = cuentasContables.find(c => c.id === gasto.cuenta_contable_id);
      if (cuenta?.tipo_resultado === 'Costo') {
        const key = gasto.cuenta_contable_id;
        if (!acc[key]) {
          acc[key] = {
            cuenta_id: gasto.cuenta_contable_id,
            cuenta_codigo: gasto.cuenta_contable_codigo,
            cuenta_nombre: gasto.cuenta_contable_nombre,
            total: 0
          };
        }
        acc[key].total += gasto.amount || 0;
      }
      return acc;
    }, {});

  const totalCostos = Object.values(costosPorCuenta).reduce((sum, item) => sum + item.total, 0);

  // UTILIDAD BRUTA
  const utilidadBruta = totalIngresos - totalCostos;
  const margenBruto = totalIngresos > 0 ? (utilidadBruta / totalIngresos * 100) : 0;

  // GASTOS - gastos con tipo_resultado = "Gasto"
  const gastosPorCuenta = gastosPeriodo
    .filter(g => g.cuenta_contable_id)
    .reduce((acc, gasto) => {
      const cuenta = cuentasContables.find(c => c.id === gasto.cuenta_contable_id);
      if (cuenta?.tipo_resultado === 'Gasto') {
        const key = gasto.cuenta_contable_id;
        if (!acc[key]) {
          acc[key] = {
            cuenta_id: gasto.cuenta_contable_id,
            cuenta_codigo: gasto.cuenta_contable_codigo,
            cuenta_nombre: gasto.cuenta_contable_nombre,
            total: 0
          };
        }
        acc[key].total += gasto.amount || 0;
      }
      return acc;
    }, {});

  const totalGastos = Object.values(gastosPorCuenta).reduce((sum, item) => sum + item.total, 0);

  // UTILIDAD OPERATIVA
  const utilidadOperativa = utilidadBruta - totalGastos;
  const margenOperativo = totalIngresos > 0 ? (utilidadOperativa / totalIngresos * 100) : 0;

  const exportToCSV = () => {
    const rows = [
      ['ESTADO DE RESULTADOS'],
      [`Período: ${format(new Date(mesInicio), 'dd/MM/yyyy', { locale: es })} - ${format(new Date(mesFin), 'dd/MM/yyyy', { locale: es })}`],
      [''],
      ['INGRESOS'],
      ...Object.values(ingresosPorCuenta).map(item => [item.cuenta_codigo, item.cuenta_nombre, item.total]),
      ['', 'TOTAL INGRESOS', totalIngresos],
      [''],
      ['COSTOS'],
      ...Object.values(costosPorCuenta).map(item => [item.cuenta_codigo, item.cuenta_nombre, item.total]),
      ['', 'TOTAL COSTOS', totalCostos],
      [''],
      ['', 'UTILIDAD BRUTA', utilidadBruta],
      [''],
      ['GASTOS OPERATIVOS'],
      ...Object.values(gastosPorCuenta).map(item => [item.cuenta_codigo, item.cuenta_nombre, item.total]),
      ['', 'TOTAL GASTOS', totalGastos],
      [''],
      ['', 'UTILIDAD OPERATIVA', utilidadOperativa]
    ];

    const csvContent = rows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `estado_resultados_${mesInicio}_${mesFin}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Estado de Resultados
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Análisis de rentabilidad según modelo contable argentino
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filtros de Fecha */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-slate-700">Fecha Inicio</label>
              <Input
                type="date"
                value={mesInicio}
                onChange={(e) => setMesInicio(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-slate-700">Fecha Fin</label>
              <Input
                type="date"
                value={mesFin}
                onChange={(e) => setMesFin(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Ingresos</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  ${totalIngresos.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-5 w-5 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Utilidad Bruta</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  ${utilidadBruta.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">Margen: {margenBruto.toFixed(1)}%</p>
              </div>
              <DollarSign className="h-5 w-5 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Gastos Operativos</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  ${totalGastos.toLocaleString()}
                </p>
              </div>
              <TrendingDown className="h-5 w-5 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Utilidad Operativa</p>
                <p className={`text-2xl font-bold mt-1 ${utilidadOperativa >= 0 ? 'text-slate-900' : 'text-slate-600'}`}>
                  ${utilidadOperativa.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">Margen: {margenOperativo.toFixed(1)}%</p>
              </div>
              <FileText className="h-5 w-5 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estado de Resultados Detallado */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="text-base">Estado de Resultados - Detalle</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-32">Código</TableHead>
              <TableHead>Cuenta</TableHead>
              <TableHead className="text-right">Importe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* INGRESOS */}
            <TableRow className="bg-slate-50 border-b-2">
              <TableCell colSpan={3} className="font-bold text-slate-800 uppercase text-sm py-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  INGRESOS
                </div>
              </TableCell>
            </TableRow>
            {Object.values(ingresosPorCuenta).map((item, idx) => (
              <TableRow key={idx}>
                <TableCell className="text-slate-600 font-mono text-sm">{item.cuenta_codigo}</TableCell>
                <TableCell className="text-slate-700">{item.cuenta_nombre}</TableCell>
                <TableCell className="text-right font-medium text-slate-900">
                  ${item.total.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-slate-100 font-bold border-t">
              <TableCell colSpan={2} className="text-slate-900">TOTAL INGRESOS</TableCell>
              <TableCell className="text-right text-slate-900">${totalIngresos.toLocaleString()}</TableCell>
            </TableRow>

            {/* COSTOS */}
            <TableRow className="bg-slate-50 border-b-2">
              <TableCell colSpan={3} className="font-bold text-slate-800 uppercase text-sm pt-6 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  COSTOS
                </div>
              </TableCell>
            </TableRow>
            {Object.values(costosPorCuenta).map((item, idx) => (
              <TableRow key={idx}>
                <TableCell className="text-slate-600 font-mono text-sm">{item.cuenta_codigo}</TableCell>
                <TableCell className="text-slate-700">{item.cuenta_nombre}</TableCell>
                <TableCell className="text-right font-medium text-slate-900">
                  ${item.total.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            {Object.values(costosPorCuenta).length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-slate-400 text-sm py-3">
                  No hay costos registrados en el período
                </TableCell>
              </TableRow>
            )}
            <TableRow className="bg-slate-100 font-bold border-t">
              <TableCell colSpan={2} className="text-slate-900">TOTAL COSTOS</TableCell>
              <TableCell className="text-right text-slate-900">${totalCostos.toLocaleString()}</TableCell>
            </TableRow>

            {/* UTILIDAD BRUTA */}
            <TableRow className="bg-slate-200 font-bold border-t-2 border-slate-400">
              <TableCell colSpan={2} className="text-slate-900 text-base py-3">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  UTILIDAD BRUTA
                </div>
              </TableCell>
              <TableCell className="text-right text-slate-900 text-base">
                ${utilidadBruta.toLocaleString()} ({margenBruto.toFixed(1)}%)
              </TableCell>
            </TableRow>

            {/* GASTOS OPERATIVOS */}
            <TableRow className="bg-slate-50 border-b-2">
              <TableCell colSpan={3} className="font-bold text-slate-800 uppercase text-sm pt-6 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  GASTOS OPERATIVOS
                </div>
              </TableCell>
            </TableRow>
            {Object.values(gastosPorCuenta).map((item, idx) => (
              <TableRow key={idx}>
                <TableCell className="text-slate-600 font-mono text-sm">{item.cuenta_codigo}</TableCell>
                <TableCell className="text-slate-700">{item.cuenta_nombre}</TableCell>
                <TableCell className="text-right font-medium text-slate-900">
                  ${item.total.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            {Object.values(gastosPorCuenta).length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-slate-400 text-sm py-3">
                  No hay gastos operativos registrados en el período
                </TableCell>
              </TableRow>
            )}
            <TableRow className="bg-slate-100 font-bold border-t">
              <TableCell colSpan={2} className="text-slate-900">TOTAL GASTOS OPERATIVOS</TableCell>
              <TableCell className="text-right text-slate-900">${totalGastos.toLocaleString()}</TableCell>
            </TableRow>

            {/* UTILIDAD OPERATIVA */}
            <TableRow className="bg-slate-800 text-white font-bold border-t-4 border-slate-900">
              <TableCell colSpan={2} className="text-lg py-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  UTILIDAD OPERATIVA
                </div>
              </TableCell>
              <TableCell className="text-right text-lg">
                ${utilidadOperativa.toLocaleString()} ({margenOperativo.toFixed(1)}%)
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>

      {/* Alertas */}
      {(Object.values(ingresosPorCuenta).length === 0 || Object.values(costosPorCuenta).length === 0 || Object.values(gastosPorCuenta).length === 0) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-amber-900 text-sm">Datos Incompletos</p>
                <p className="text-amber-700 text-sm mt-1">
                  {Object.values(ingresosPorCuenta).length === 0 && "• No hay ventas con cuenta contable asignada en el período.\n"}
                  {Object.values(costosPorCuenta).length === 0 && "• No hay costos registrados en el período.\n"}
                  {Object.values(gastosPorCuenta).length === 0 && "• No hay gastos operativos registrados en el período.\n"}
                </p>
                <p className="text-amber-600 text-xs mt-2">
                  Asegurate de tener el Plan de Cuentas importado y las ventas/gastos con cuentas asignadas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}