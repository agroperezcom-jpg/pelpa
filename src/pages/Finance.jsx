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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Calculator,
  PieChart as PieChartIcon,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart
} from "recharts";

export default function Finance() {
  const [monthFilter, setMonthFilter] = useState(format(new Date(), 'yyyy-MM'));

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-created_date', 500)
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list()
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: ivaVentas = [] } = useQuery({
    queryKey: ['ivaVentas'],
    queryFn: () => base44.entities.IVAVenta.list('-created_date', 500)
  });

  // Calculate financial metrics for selected month
  const calculateMonthMetrics = (month) => {
    // Sales and revenue
    const monthSales = sales.filter(s => s.created_date?.startsWith(month));
    const totalRevenue = monthSales.reduce((acc, s) => acc + (s.total || 0), 0);

    // Cost of goods sold (COGS)
    let cogs = 0;
    monthSales.forEach(sale => {
      sale.items?.forEach(item => {
        if (item.type === 'product') {
          const product = products.find(p => p.id === item.item_id);
          if (product && product.cost) {
            cogs += product.cost * item.quantity;
          }
        }
      });
    });

    // Operating expenses
    const monthExpenses = expenses.filter(e => e.date?.startsWith(month));
    const totalExpenses = monthExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    // Expense breakdown by category
    const expensesByCategory = monthExpenses.reduce((acc, e) => {
      const cat = e.category || 'otros';
      if (!acc[cat]) acc[cat] = 0;
      acc[cat] += e.amount || 0;
      return acc;
    }, {});

    // Calculations
    const grossProfit = totalRevenue - cogs;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue * 100) : 0;
    const operatingProfit = grossProfit - totalExpenses;
    const operatingMargin = totalRevenue > 0 ? (operatingProfit / totalRevenue * 100) : 0;
    const netProfit = operatingProfit; // Simplified (no taxes/interest in this version)
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0;

    return {
      totalRevenue,
      cogs,
      grossProfit,
      grossMargin,
      totalExpenses,
      expensesByCategory,
      operatingProfit,
      operatingMargin,
      netProfit,
      netMargin,
      salesCount: monthSales.length
    };
  };

  const currentMetrics = calculateMonthMetrics(monthFilter);
  
  // Previous month for comparison
  const prevMonth = format(subMonths(new Date(monthFilter + '-01'), 1), 'yyyy-MM');
  const prevMetrics = calculateMonthMetrics(prevMonth);

  // Calculate changes
  const revenueChange = prevMetrics.totalRevenue > 0 
    ? ((currentMetrics.totalRevenue - prevMetrics.totalRevenue) / prevMetrics.totalRevenue * 100) 
    : 0;
  const profitChange = prevMetrics.netProfit > 0 
    ? ((currentMetrics.netProfit - prevMetrics.netProfit) / prevMetrics.netProfit * 100) 
    : 0;

  // Historical data (last 12 months)
  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(monthFilter + '-01'), 11 - i);
    return format(date, 'yyyy-MM');
  });

  const historicalData = last12Months.map(month => {
    const metrics = calculateMonthMetrics(month);
    return {
      month: format(new Date(month + '-01'), 'MMM', { locale: es }),
      ingresos: metrics.totalRevenue,
      costos: metrics.cogs,
      gastos: metrics.totalExpenses,
      utilidadNeta: metrics.netProfit
    };
  });

  // Margin trend
  const marginData = last12Months.map(month => {
    const metrics = calculateMonthMetrics(month);
    return {
      month: format(new Date(month + '-01'), 'MMM', { locale: es }),
      margenBruto: metrics.grossMargin,
      margenOperativo: metrics.operatingMargin,
      margenNeto: metrics.netMargin
    };
  });

  const exportReport = () => {
    const report = {
      periodo: monthFilter,
      ingresos: currentMetrics.totalRevenue,
      costo_ventas: currentMetrics.cogs,
      utilidad_bruta: currentMetrics.grossProfit,
      margen_bruto: currentMetrics.grossMargin,
      gastos_operativos: currentMetrics.totalExpenses,
      utilidad_operativa: currentMetrics.operatingProfit,
      margen_operativo: currentMetrics.operatingMargin,
      utilidad_neta: currentMetrics.netProfit,
      margen_neto: currentMetrics.netMargin
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `estado_resultados_${monthFilter}.json`;
    link.click();
  };

  const categoryLabels = {
    renta: "Renta",
    servicios: "Servicios",
    salarios: "Salarios",
    marketing: "Marketing",
    suministros: "Suministros",
    mantenimiento: "Mantenimiento",
    transporte: "Transporte",
    impuestos: "Impuestos",
    seguros: "Seguros",
    tecnologia: "Tecnología",
    capacitacion: "Capacitación",
    profesionales: "Servicios Profesionales",
    otros: "Otros"
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calculator className="h-6 w-6 text-emerald-600" />
            Finanzas
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Estado de resultados y métricas financieras
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="w-40"
          />
          <Button variant="outline" onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Ingresos</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  ${currentMetrics.totalRevenue.toLocaleString()}
                </p>
                {revenueChange !== 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    {revenueChange > 0 ? (
                      <ArrowUp className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <ArrowDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={`text-xs ${revenueChange > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {Math.abs(revenueChange).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Utilidad Neta</p>
                <p className={`text-2xl font-bold mt-1 ${currentMetrics.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  ${currentMetrics.netProfit.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Margen: {currentMetrics.netMargin.toFixed(1)}%
                </p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${currentMetrics.netProfit >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
                {currentMetrics.netProfit >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Margen Bruto</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {currentMetrics.grossMargin.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  ${currentMetrics.grossProfit.toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                <PieChartIcon className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Gastos Totales</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  ${currentMetrics.totalExpenses.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {currentMetrics.totalRevenue > 0 ? ((currentMetrics.totalExpenses / currentMetrics.totalRevenue * 100).toFixed(1)) : 0}% de ingresos
                </p>
              </div>
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <Minus className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="statement" className="space-y-4">
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="statement">Estado de Resultados</TabsTrigger>
          <TabsTrigger value="trends">Tendencias</TabsTrigger>
          <TabsTrigger value="margins">Márgenes</TabsTrigger>
          <TabsTrigger value="iva">Libro IVA Ventas</TabsTrigger>
        </TabsList>

        <TabsContent value="statement" className="space-y-4">
          {/* Income Statement */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="text-base">
                Estado de Resultados - {format(new Date(monthFilter + '-01'), "MMMM yyyy", { locale: es })}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  {/* Revenue */}
                  <TableRow className="bg-emerald-50">
                    <TableCell className="font-bold">Ingresos por Ventas</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      ${currentMetrics.totalRevenue.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8 text-slate-500">({currentMetrics.salesCount} ventas)</TableCell>
                    <TableCell></TableCell>
                  </TableRow>

                  {/* COGS */}
                  <TableRow className="border-t-2">
                    <TableCell className="font-semibold">Costo de Ventas</TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      -${currentMetrics.cogs.toLocaleString()}
                    </TableCell>
                  </TableRow>

                  {/* Gross Profit */}
                  <TableRow className="bg-blue-50 border-t-2">
                    <TableCell className="font-bold">Utilidad Bruta</TableCell>
                    <TableCell className="text-right font-bold">
                      ${currentMetrics.grossProfit.toLocaleString()}
                      <Badge className="ml-2 bg-blue-100 text-blue-700">
                        {currentMetrics.grossMargin.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>

                  {/* Operating Expenses */}
                  <TableRow className="border-t-2">
                    <TableCell className="font-semibold">Gastos Operativos</TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      -${currentMetrics.totalExpenses.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  {Object.entries(currentMetrics.expensesByCategory).map(([cat, amount]) => (
                    <TableRow key={cat}>
                      <TableCell className="pl-8 text-slate-600">
                        {categoryLabels[cat] || cat}
                      </TableCell>
                      <TableCell className="text-right text-slate-600">
                        ${amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Operating Profit */}
                  <TableRow className="bg-violet-50 border-t-2">
                    <TableCell className="font-bold">Utilidad Operativa</TableCell>
                    <TableCell className="text-right font-bold">
                      ${currentMetrics.operatingProfit.toLocaleString()}
                      <Badge className="ml-2 bg-violet-100 text-violet-700">
                        {currentMetrics.operatingMargin.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>

                  {/* Net Profit */}
                  <TableRow className={`border-t-4 ${currentMetrics.netProfit >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    <TableCell className="font-bold text-lg">Utilidad Neta</TableCell>
                    <TableCell className={`text-right font-bold text-lg ${currentMetrics.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      ${currentMetrics.netProfit.toLocaleString()}
                      <Badge className={`ml-2 ${currentMetrics.netProfit >= 0 ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'}`}>
                        {currentMetrics.netMargin.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          {/* Revenue & Profit Trend */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Tendencia de Ingresos y Utilidad - 12 Meses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="ingresos" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Ingresos" />
                    <Area type="monotone" dataKey="utilidadNeta" stackId="2" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Utilidad Neta" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Cost Breakdown */}
          <Card className="border-0 shadow-sm mt-6">
            <CardHeader>
              <CardTitle className="text-base">Composición de Costos y Gastos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Legend />
                    <Bar dataKey="costos" fill="#f59e0b" name="Costo de Ventas" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gastos" fill="#ef4444" name="Gastos Operativos" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="margins">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Evolución de Márgenes - 12 Meses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={marginData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" unit="%" />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value) => `${value.toFixed(1)}%`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="margenBruto" stroke="#10b981" strokeWidth={2} name="Margen Bruto" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="margenOperativo" stroke="#8b5cf6" strokeWidth={2} name="Margen Operativo" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="margenNeto" stroke="#3b82f6" strokeWidth={2} name="Margen Neto" dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Margin Summary */}
          <Card className="border-0 shadow-sm mt-6">
            <CardHeader>
              <CardTitle className="text-base">Análisis de Márgenes - Mes Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Margen Bruto</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Utilidad antes de gastos operativos
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-600">
                      {currentMetrics.grossMargin.toFixed(1)}%
                    </p>
                    <p className="text-sm text-slate-500">${currentMetrics.grossProfit.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-violet-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Margen Operativo</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Utilidad después de gastos operativos
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-violet-600">
                      {currentMetrics.operatingMargin.toFixed(1)}%
                    </p>
                    <p className="text-sm text-slate-500">${currentMetrics.operatingProfit.toLocaleString()}</p>
                  </div>
                </div>

                <div className={`flex items-center justify-between p-4 rounded-lg ${currentMetrics.netProfit >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Margen Neto</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Utilidad final del negocio
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${currentMetrics.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {currentMetrics.netMargin.toFixed(1)}%
                    </p>
                    <p className="text-sm text-slate-500">${currentMetrics.netProfit.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="iva" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Libro IVA Ventas - {format(new Date(monthFilter + '-01'), "MMMM yyyy", { locale: es })}</span>
                <Button variant="outline" size="sm" onClick={() => {
                  const ivaDelMes = ivaVentas.filter(iv => iv.fecha?.startsWith(monthFilter));
                  const csv = [
                    ['Fecha', 'Comprobante', 'Número', 'Cliente', 'Tipo IVA', 'Neto Gravado', 'IVA 21%', 'Total'],
                    ...ivaDelMes.map(iv => [
                      iv.fecha,
                      iv.tipo_comprobante,
                      iv.numero_comprobante,
                      iv.cliente_nombre,
                      iv.cliente_tipo_iva,
                      iv.neto_gravado?.toFixed(2),
                      iv.iva_21?.toFixed(2),
                      iv.total?.toFixed(2)
                    ])
                  ].map(row => row.join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `libro_iva_ventas_${monthFilter}.csv`;
                  a.click();
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Comprobante</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo IVA</TableHead>
                    <TableHead className="text-right">Neto Gravado</TableHead>
                    <TableHead className="text-right">IVA 21%</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ivaVentas
                    .filter(iv => iv.fecha?.startsWith(monthFilter))
                    .map((iv) => (
                      <TableRow key={iv.id}>
                        <TableCell className="text-sm text-slate-600">
                          {format(new Date(iv.fecha), "dd/MM/yyyy", { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {iv.tipo_comprobante} - {iv.numero_comprobante}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{iv.cliente_nombre}</TableCell>
                        <TableCell>
                          <Badge className={
                            iv.cliente_tipo_iva === "RESP_INSCRIPTO" ? "bg-blue-100 text-blue-700" :
                            iv.cliente_tipo_iva === "MONOTRIBUTO" ? "bg-emerald-100 text-emerald-700" :
                            "bg-slate-100 text-slate-600"
                          }>
                            {iv.cliente_tipo_iva?.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">${iv.neto_gravado?.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-bold text-emerald-600">
                          ${iv.iva_21?.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-blue-600">
                          ${iv.total?.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  {ivaVentas.filter(iv => iv.fecha?.startsWith(monthFilter)).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No hay operaciones con IVA en este período
                      </TableCell>
                    </TableRow>
                  )}
                  {ivaVentas.filter(iv => iv.fecha?.startsWith(monthFilter)).length > 0 && (
                    <TableRow className="bg-emerald-50 border-t-2">
                      <TableCell colSpan={4} className="font-bold">TOTALES DEL PERÍODO</TableCell>
                      <TableCell className="text-right font-bold">
                        ${ivaVentas
                          .filter(iv => iv.fecha?.startsWith(monthFilter))
                          .reduce((acc, iv) => acc + (iv.neto_gravado || 0), 0)
                          .toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                        ${ivaVentas
                          .filter(iv => iv.fecha?.startsWith(monthFilter))
                          .reduce((acc, iv) => acc + (iv.iva_21 || 0), 0)
                          .toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-600">
                        ${ivaVentas
                          .filter(iv => iv.fecha?.startsWith(monthFilter))
                          .reduce((acc, iv) => acc + (iv.total || 0), 0)
                          .toFixed(2)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}