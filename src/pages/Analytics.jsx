import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Users, Package, ShoppingCart,
  AlertTriangle, Award, ArrowUp, ArrowDown, Download, Zap, Target, Activity,
  Clock, Percent, RefreshCw, Bell, Calendar as CalendarIcon, Brain, Star, CheckCircle, AlertCircle
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, differenceInDays, addDays, getMonth, getDay } from "date-fns";
import { es } from "date-fns/locale";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const COLOR_MAP = {
  slate: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
  green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' }
};

const getColorClass = (colorKey) => COLOR_MAP[colorKey] || COLOR_MAP.slate;

export default function Analytics() {
  const [dateRange, setDateRange] = useState("month");
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroEmpleado, setFiltroEmpleado] = useState("todos");
  const [activeView, setActiveView] = useState("dashboard");

  // Cargar datos
  const { data: sales = [] } = useQuery({ queryKey: ['sales'], queryFn: () => base44.entities.Sale.list('-created_date', 1000) });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => base44.entities.Product.list() });
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.Client.list() });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses'], queryFn: () => base44.entities.Expense.list('-date', 500) });
  const { data: movimientosTesoreria = [] } = useQuery({ queryKey: ['movimientosTesoreria'], queryFn: () => base44.entities.MovimientoTesoreria.list('-created_date', 500) });

  // Calcular períodos
  const daysDiff = differenceInDays(new Date(endDate), new Date(startDate));
  const prevStartDate = format(subDays(new Date(startDate), daysDiff + 1), 'yyyy-MM-dd');
  const prevEndDate = format(subDays(new Date(startDate), 1), 'yyyy-MM-dd');

  // Filtrar datos
  const filteredSales = useMemo(() => sales.filter(sale => {
    if (!sale.created_date || sale.estado !== "CONFIRMADA") return false;
    const saleDate = new Date(sale.created_date);
    if (!isWithinInterval(saleDate, { start: new Date(startDate), end: new Date(endDate + 'T23:59:59') })) return false;
    
    if (filtroCategoria !== "todas") {
      const tieneCategoria = sale.items?.some(item => {
        const producto = products.find(p => p.id === item.item_id);
        return producto?.category === filtroCategoria;
      });
      if (!tieneCategoria) return false;
    }
    
    if (filtroEmpleado !== "todos" && sale.employee_email !== filtroEmpleado) return false;
    return true;
  }), [sales, startDate, endDate, filtroCategoria, filtroEmpleado, products]);

  const prevSales = useMemo(() => sales.filter(sale => {
    if (!sale.created_date || sale.estado !== "CONFIRMADA") return false;
    const saleDate = new Date(sale.created_date);
    return isWithinInterval(saleDate, { start: new Date(prevStartDate), end: new Date(prevEndDate + 'T23:59:59') });
  }), [sales, prevStartDate, prevEndDate]);

  const filteredExpenses = useMemo(() => expenses.filter(exp => {
    if (!exp.date) return false;
    return isWithinInterval(new Date(exp.date), { start: new Date(startDate), end: new Date(endDate) });
  }), [expenses, startDate, endDate]);

  // KPIs
  const totalVentas = filteredSales.reduce((acc, s) => acc + (s.total || 0), 0);
  const prevTotalVentas = prevSales.reduce((acc, s) => acc + (s.total || 0), 0);
  const variacionVentas = prevTotalVentas > 0 ? ((totalVentas - prevTotalVentas) / prevTotalVentas) * 100 : 0;
  
  const ticketPromedio = filteredSales.length > 0 ? totalVentas / filteredSales.length : 0;
  const prevTicketPromedio = prevSales.length > 0 ? prevTotalVentas / prevSales.length : 0;
  const variacionTicket = prevTicketPromedio > 0 ? ((ticketPromedio - prevTicketPromedio) / prevTicketPromedio) * 100 : 0;

  const margenBrutoTotal = filteredSales.reduce((acc, s) => {
    const costoTotal = s.items?.reduce((sum, item) => sum + (item.costo_unitario * item.quantity), 0) || 0;
    return acc + (s.total - costoTotal);
  }, 0);
  const porcentajeMargen = totalVentas > 0 ? (margenBrutoTotal / totalVentas) * 100 : 0;

  const totalGastos = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const margenNeto = totalVentas - margenBrutoTotal - totalGastos;
  const porcentajeMargenNeto = totalVentas > 0 ? (margenNeto / totalVentas) * 100 : 0;

  const ingresosCaja = movimientosTesoreria.filter(m => m.tipo === "INGRESO" && isWithinInterval(new Date(m.fecha), { start: new Date(startDate), end: new Date(endDate) })).reduce((acc, m) => acc + m.importe, 0);
  const egresosCaja = movimientosTesoreria.filter(m => m.tipo === "EGRESO" && isWithinInterval(new Date(m.fecha), { start: new Date(startDate), end: new Date(endDate) })).reduce((acc, m) => acc + m.importe, 0);
  const cashFlow = ingresosCaja - egresosCaja;

  const clientesActivos = new Set(filteredSales.map(s => s.client_id).filter(Boolean)).size;
  const prevClientesActivos = new Set(prevSales.map(s => s.client_id).filter(Boolean)).size;
  const tasaRetencion = prevClientesActivos > 0 ? (clientesActivos / prevClientesActivos) * 100 : 100;

  // Alertas
  const alertas = [];
  if (porcentajeMargenNeto < 10) alertas.push({ tipo: 'error', mensaje: `Margen neto bajo: ${porcentajeMargenNeto.toFixed(1)}%` });
  if (variacionVentas < -10) alertas.push({ tipo: 'error', mensaje: `Ventas cayeron ${Math.abs(variacionVentas).toFixed(1)}%` });

  const handleDateRangeChange = (value) => {
    setDateRange(value);
    const today = new Date();
    const ranges = {
      week: 7, month: 30, quarter: 90, year: 365
    };
    if (ranges[value]) {
      setStartDate(format(subDays(today, ranges[value]), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    }
  };

  const exportData = () => {
    const data = {
      periodo: `${startDate} a ${endDate}`,
      ventas: totalVentas,
      margen_neto: porcentajeMargenNeto,
      cash_flow: cashFlow,
      clientes: clientesActivos
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${startDate}_${endDate}.json`;
    a.click();
  };

  const KPICard = ({ titulo, valor, formato = 'numero', variacion, icono: Icon, colorKey = 'slate' }) => {
    const styles = getColorClass(colorKey);
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <p className="text-xs font-medium text-slate-500 uppercase">{titulo}</p>
            <div className={`w-10 h-10 ${styles.bg} rounded-xl flex items-center justify-center`}>
              {Icon && <Icon className={`h-5 w-5 ${styles.text}`} />}
            </div>
          </div>
          <p className={`text-3xl font-bold ${styles.text} mb-2`}>
            {formato === 'moneda' && '$'}
            {typeof valor === 'number' ? valor.toLocaleString(undefined, { maximumFractionDigits: formato === 'porcentaje' ? 1 : 0 }) : valor}
            {formato === 'porcentaje' && '%'}
          </p>
          {variacion !== undefined && (
            <div className="flex items-center gap-1">
              {variacion > 0 ? <ArrowUp className="h-4 w-4 text-green-600" /> : variacion < 0 ? <ArrowDown className="h-4 w-4 text-red-600" /> : null}
              <span className={`text-sm font-medium ${variacion > 0 ? 'text-green-600' : variacion < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                {variacion > 0 && '+'}{variacion.toFixed(1)}% vs anterior
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-600" />
            Análisis y KPIs
          </h1>
          <p className="text-slate-500 text-sm mt-1">Indicadores clave de rendimiento</p>
        </div>
        <Button variant="outline" onClick={exportData} className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Filtros */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 w-full flex-wrap">
            <div className="space-y-2 w-full sm:w-auto">
              <span className="text-xs font-medium text-slate-700">Período</span>
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger className="w-full sm:w-40">
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
            <div className="space-y-2 w-full sm:w-auto">
              <span className="text-xs font-medium text-slate-700">Desde</span>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-2 w-full sm:w-auto">
              <span className="text-xs font-medium text-slate-700">Hasta</span>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-2 w-full sm:w-auto">
              <span className="text-xs font-medium text-slate-700">Categoría</span>
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {[...new Set(products.map(p => p.category))].filter(Boolean).map(cat => (
                    <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {alertas.length > 0 && (
        <Card className="border-0 shadow-sm bg-gradient-to-r from-amber-50 to-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-slate-800 mb-2">Alertas Activas ({alertas.length})</p>
                <div className="space-y-1">
                  {alertas.map((alerta, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-slate-700">{alerta.mensaje}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Ejecutivo */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-indigo-600" />
          Dashboard Ejecutivo
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
          <KPICard titulo="Ventas Totales" valor={totalVentas} formato="moneda" variacion={variacionVentas} icono={DollarSign} colorKey="blue" />
          <KPICard titulo="Margen Neto" valor={porcentajeMargenNeto} formato="porcentaje" icono={TrendingUp} colorKey={porcentajeMargenNeto > 15 ? 'green' : porcentajeMargenNeto > 10 ? 'amber' : 'red'} />
          <KPICard titulo="Cash Flow" valor={cashFlow} formato="moneda" icono={Activity} colorKey={cashFlow > 0 ? 'green' : 'red'} />
          <KPICard titulo="Clientes Activos" valor={clientesActivos} formato="numero" icono={Users} colorKey="purple" />
          <KPICard titulo="Retención" valor={tasaRetencion} formato="porcentaje" icono={Target} colorKey={tasaRetencion > 80 ? 'green' : 'amber'} />
        </div>
      </div>

      {/* Vista de Tendencias */}
      <Tabs defaultValue="tendencias" className="space-y-4">
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="tendencias">Tendencias</TabsTrigger>
          <TabsTrigger value="detalles">Detalles</TabsTrigger>
        </TabsList>

        <TabsContent value="tendencias">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Tendencia de Ventas (Últimos 30 días)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={Array.from({ length: 30 }, (_, i) => {
                    const fecha = format(subDays(new Date(), 29 - i), 'yyyy-MM-dd');
                    const ventasDia = sales.filter(s => s.created_date?.startsWith(fecha) && s.estado === "CONFIRMADA");
                    return {
                      fecha: format(new Date(fecha), 'dd/MM', { locale: es }),
                      ventas: ventasDia.reduce((acc, v) => acc + v.total, 0)
                    };
                  })}>
                    <defs>
                      <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Area type="monotone" dataKey="ventas" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorVentas)" />
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
                <CardTitle className="text-base">Ventas por Categoría</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({ set: new Set(products.map(p => p.category)) }).map(cat => {
                    const ventasCat = filteredSales.filter(s => s.items?.some(i => products.find(p => p.id === i.item_id)?.category === cat)).reduce((acc, s) => acc + s.total, 0);
                    return (
                      <div key={cat} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded">
                        <span className="text-sm font-medium capitalize">{cat}</span>
                        <span className="font-bold text-blue-600">${ventasCat.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Top 5 Productos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(() => {
                    const prod = {};
                    filteredSales.forEach(s => {
                      s.items?.forEach(i => {
                        if (!prod[i.item_id]) prod[i.item_id] = { nombre: i.name, total: 0 };
                        prod[i.item_id].total += i.total;
                      });
                    });
                    return Object.entries(prod).sort((a, b) => b[1].total - a[1].total).slice(0, 5).map(([id, p], idx) => (
                      <div key={id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-slate-100 text-slate-600">{idx + 1}</Badge>
                          <span className="text-sm font-medium">{p.nombre}</span>
                        </div>
                        <span className="text-sm font-bold text-green-600">${p.total.toLocaleString()}</span>
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}