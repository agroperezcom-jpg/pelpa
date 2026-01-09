import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Users, Activity,
  AlertTriangle, ArrowUp, ArrowDown, Download, Target, Bell
} from "lucide-react";
import { format, subDays } from "date-fns";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from "recharts";

export default function Analytics() {
  const [dateRange, setDateRange] = useState("month");
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Cargar datos
  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-created_date', 500),
    staleTime: 5 * 60 * 1000
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date', 300),
    staleTime: 5 * 60 * 1000
  });

  // Filtrar ventas en el rango de fechas
  const filteredSales = sales.filter(sale => {
    if (!sale.created_date || sale.estado !== "CONFIRMADA") return false;
    const saleDate = new Date(sale.created_date).toISOString().split('T')[0];
    return saleDate >= startDate && saleDate <= endDate;
  });

  const filteredExpenses = expenses.filter(exp => {
    if (!exp.date) return false;
    return exp.date >= startDate && exp.date <= endDate;
  });

  // Cálculos
  const totalVentas = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const cantidadVentas = filteredSales.length;
  const ticketPromedio = cantidadVentas > 0 ? totalVentas / cantidadVentas : 0;

  const margenBruto = filteredSales.reduce((sum, s) => {
    const costo = s.items?.reduce((c, item) => c + (item.costo_unitario || 0) * (item.quantity || 0), 0) || 0;
    return sum + (s.total - costo);
  }, 0);
  const porcentajeMargen = totalVentas > 0 ? (margenBruto / totalVentas) * 100 : 0;

  const totalGastos = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const margenNeto = totalVentas - margenBruto - totalGastos;
  const porcentajeMargenNeto = totalVentas > 0 ? (margenNeto / totalVentas) * 100 : 0;

  const clientesUnicos = new Set(filteredSales.map(s => s.client_id).filter(Boolean)).size;

  // Alertas
  const alertas = [];
  if (porcentajeMargenNeto < 10) {
    alertas.push(`Margen neto bajo: ${porcentajeMargenNeto.toFixed(1)}%`);
  }

  const handleDateRangeChange = (value) => {
    setDateRange(value);
    const today = new Date();
    const ranges = {
      week: 7,
      month: 30,
      quarter: 90,
      year: 365
    };
    if (ranges[value]) {
      setStartDate(format(subDays(today, ranges[value]), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    }
  };

  const exportData = () => {
    const data = {
      periodo: `${startDate} a ${endDate}`,
      ventas_totales: totalVentas,
      cantidad_ventas: cantidadVentas,
      ticket_promedio: ticketPromedio,
      margen_neto_porcentaje: porcentajeMargenNeto,
      clientes_activos: clientesUnicos,
      gastos: totalGastos
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const KPICard = ({ titulo, valor, formato, variacion, icono: Icon, colorKey }) => {
    const colorStyles = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      red: 'bg-red-50 text-red-600',
      purple: 'bg-purple-50 text-purple-600',
      amber: 'bg-amber-50 text-amber-600'
    };

    const style = colorStyles[colorKey] || colorStyles.blue;

    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <p className="text-xs font-medium text-slate-500 uppercase">{titulo}</p>
            <div className={`w-10 h-10 ${style} rounded-lg flex items-center justify-center`}>
              {Icon && <Icon className="h-5 w-5" />}
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800 mb-2">
            {formato === 'moneda' && '$'}
            {typeof valor === 'number' ? valor.toLocaleString(undefined, { maximumFractionDigits: formato === 'porcentaje' ? 1 : 0 }) : '0'}
            {formato === 'porcentaje' && '%'}
          </p>
          {variacion !== undefined && (
            <div className="flex items-center gap-1 text-sm">
              {variacion > 0 && <ArrowUp className="h-4 w-4 text-green-600" />}
              {variacion < 0 && <ArrowDown className="h-4 w-4 text-red-600" />}
              <span className={variacion > 0 ? 'text-green-600' : variacion < 0 ? 'text-red-600' : 'text-slate-500'}>
                {variacion > 0 && '+'}{variacion?.toFixed(1)}%
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (salesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-500">Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Analytics
          </h1>
          <p className="text-slate-500 text-sm mt-1">Indicadores de rendimiento</p>
        </div>
        <Button variant="outline" onClick={exportData} className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Filtros */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-3 flex-wrap">
            <div className="space-y-2 flex-1 min-w-max">
              <label className="text-xs font-medium text-slate-700">Período</label>
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mes</SelectItem>
                  <SelectItem value="quarter">Último trimestre</SelectItem>
                  <SelectItem value="year">Último año</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1 min-w-max">
              <label className="text-xs font-medium text-slate-700">Desde</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2 flex-1 min-w-max">
              <label className="text-xs font-medium text-slate-700">Hasta</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {alertas.length > 0 && (
        <Card className="border-0 shadow-sm bg-amber-50 border-l-4 border-amber-400">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-amber-900 mb-2">Alertas ({alertas.length})</p>
                <ul className="space-y-1">
                  {alertas.map((alerta, idx) => (
                    <li key={idx} className="text-sm text-amber-800">{alerta}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Métricas Clave</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard titulo="Ventas" valor={totalVentas} formato="moneda" icono={DollarSign} colorKey="blue" />
          <KPICard titulo="Ticket Prom." valor={ticketPromedio} formato="moneda" icono={TrendingUp} colorKey="blue" />
          <KPICard titulo="Margen" valor={porcentajeMargenNeto} formato="porcentaje" icono={Activity} colorKey={porcentajeMargenNeto > 15 ? 'green' : 'amber'} />
          <KPICard titulo="Clientes" valor={clientesUnicos} formato="numero" icono={Users} colorKey="purple" />
          <KPICard titulo="Transacciones" valor={cantidadVentas} formato="numero" icono={Target} colorKey="blue" />
        </div>
      </div>

      {/* Gráficos */}
      <Tabs defaultValue="ventas" className="space-y-4">
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="ventas">Tendencia</TabsTrigger>
          <TabsTrigger value="detalles">Resumen</TabsTrigger>
        </TabsList>

        <TabsContent value="ventas">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Ventas Diarias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={Array.from({ length: 30 }, (_, i) => {
                      const fecha = format(subDays(new Date(endDate), 29 - i), 'yyyy-MM-dd');
                      const ventasDia = filteredSales.filter(s => new Date(s.created_date).toISOString().split('T')[0] === fecha);
                      return {
                        fecha: format(new Date(fecha), 'dd/MM'),
                        ventas: ventasDia.reduce((sum, v) => sum + v.total, 0)
                      };
                    })}
                  >
                    <defs>
                      <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Area type="monotone" dataKey="ventas" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVentas)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detalles">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Resumen Financiero</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Ventas Totales</span>
                  <span className="font-bold text-blue-600">${totalVentas.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Margen Bruto</span>
                  <span className="font-bold text-green-600">${margenBruto.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Gastos</span>
                  <span className="font-bold text-red-600">${totalGastos.toLocaleString()}</span>
                </div>
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">Margen Neto</span>
                  <span className="font-bold text-lg text-slate-800">${margenNeto.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Estadísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Total Transacciones</span>
                  <Badge className="bg-blue-100 text-blue-700">{cantidadVentas}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Ticket Promedio</span>
                  <span className="font-bold">${ticketPromedio.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">% Margen Neto</span>
                  <span className={`font-bold ${porcentajeMargenNeto > 15 ? 'text-green-600' : porcentajeMargenNeto > 10 ? 'text-amber-600' : 'text-red-600'}`}>
                    {porcentajeMargenNeto.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Clientes Únicos</span>
                  <Badge className="bg-purple-100 text-purple-700">{clientesUnicos}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}