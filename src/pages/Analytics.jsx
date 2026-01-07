import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Users, Package, ShoppingCart,
  AlertTriangle, Award, ArrowUp, ArrowDown, Download, Zap, Target, Activity,
  Clock, Percent, RefreshCw, Bell, Calendar as CalendarIcon
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function Analytics() {
  const [dateRange, setDateRange] = useState("month");
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Cargar todos los datos necesarios
  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-created_date', 1000)
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date', 500)
  });

  const { data: movimientosTesoreria = [] } = useQuery({
    queryKey: ['movimientosTesoreria'],
    queryFn: () => base44.entities.MovimientoTesoreria.list('-created_date', 500)
  });

  const { data: movimientosCC = [] } = useQuery({
    queryKey: ['movimientosCC'],
    queryFn: () => base44.entities.MovimientoCC.list('-created_date', 500)
  });

  const { data: arqueoCaja = [] } = useQuery({
    queryKey: ['arqueoCaja'],
    queryFn: () => base44.entities.ArqueoCaja.list('-fecha', 100)
  });

  // Calcular período anterior para comparaciones
  const daysDiff = differenceInDays(new Date(endDate), new Date(startDate));
  const prevStartDate = format(subDays(new Date(startDate), daysDiff + 1), 'yyyy-MM-dd');
  const prevEndDate = format(subDays(new Date(startDate), 1), 'yyyy-MM-dd');

  // Filtrar ventas confirmadas por período
  const filteredSales = sales.filter(sale => {
    if (!sale.created_date || sale.estado !== "CONFIRMADA") return false;
    const saleDate = new Date(sale.created_date);
    return isWithinInterval(saleDate, {
      start: new Date(startDate),
      end: new Date(endDate + 'T23:59:59')
    });
  });

  const prevSales = sales.filter(sale => {
    if (!sale.created_date || sale.estado !== "CONFIRMADA") return false;
    const saleDate = new Date(sale.created_date);
    return isWithinInterval(saleDate, {
      start: new Date(prevStartDate),
      end: new Date(prevEndDate + 'T23:59:59')
    });
  });

  const filteredExpenses = expenses.filter(exp => {
    if (!exp.date) return false;
    const expDate = new Date(exp.date);
    return isWithinInterval(expDate, {
      start: new Date(startDate),
      end: new Date(endDate)
    });
  });

  const prevExpenses = expenses.filter(exp => {
    if (!exp.date) return false;
    const expDate = new Date(exp.date);
    return isWithinInterval(expDate, {
      start: new Date(prevStartDate),
      end: new Date(prevEndDate)
    });
  });

  // ==================== CÁLCULOS DE KPIs ====================

  // KPI COMERCIALES
  const totalVentas = filteredSales.reduce((acc, s) => acc + (s.total || 0), 0);
  const prevTotalVentas = prevSales.reduce((acc, s) => acc + (s.total || 0), 0);
  const variacionVentas = prevTotalVentas > 0 ? ((totalVentas - prevTotalVentas) / prevTotalVentas) * 100 : 0;

  const ticketPromedio = filteredSales.length > 0 ? totalVentas / filteredSales.length : 0;
  const prevTicketPromedio = prevSales.length > 0 ? prevTotalVentas / prevSales.length : 0;
  const variacionTicket = prevTicketPromedio > 0 ? ((ticketPromedio - prevTicketPromedio) / prevTicketPromedio) * 100 : 0;

  const unidadesTotales = filteredSales.reduce((acc, s) => {
    return acc + (s.items?.reduce((sum, item) => sum + item.quantity, 0) || 0);
  }, 0);
  const unidadesPorTicket = filteredSales.length > 0 ? unidadesTotales / filteredSales.length : 0;

  const margenBrutoTotal = filteredSales.reduce((acc, s) => {
    const costoTotal = s.items?.reduce((sum, item) => sum + (item.costo_unitario * item.quantity), 0) || 0;
    return acc + (s.total - costoTotal);
  }, 0);
  const porcentajeMargen = totalVentas > 0 ? (margenBrutoTotal / totalVentas) * 100 : 0;

  // Margen por categoría
  const margenPorCategoria = {};
  filteredSales.forEach(sale => {
    sale.items?.forEach(item => {
      const producto = products.find(p => p.id === item.item_id);
      const categoria = producto?.category || 'sin_categoria';
      if (!margenPorCategoria[categoria]) {
        margenPorCategoria[categoria] = { ventas: 0, costo: 0 };
      }
      margenPorCategoria[categoria].ventas += item.total || 0;
      margenPorCategoria[categoria].costo += item.costo_unitario * item.quantity;
    });
  });

  const margenCategoriaData = Object.entries(margenPorCategoria).map(([cat, data]) => ({
    categoria: cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' '),
    margen: data.ventas > 0 ? ((data.ventas - data.costo) / data.ventas) * 100 : 0
  }));

  // KPI FINANCIEROS
  const totalGastos = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const prevTotalGastos = prevExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  
  const margenNeto = totalVentas - margenBrutoTotal - totalGastos;
  const porcentajeMargenNeto = totalVentas > 0 ? (margenNeto / totalVentas) * 100 : 0;

  const costoOperativoSobreVentas = totalVentas > 0 ? (totalGastos / totalVentas) * 100 : 0;

  // Cash Flow Operativo
  const ingresosCaja = movimientosTesoreria.filter(m => 
    m.tipo === "INGRESO" && 
    isWithinInterval(new Date(m.fecha), { start: new Date(startDate), end: new Date(endDate) })
  ).reduce((acc, m) => acc + m.importe, 0);

  const egresosCaja = movimientosTesoreria.filter(m => 
    m.tipo === "EGRESO" && 
    isWithinInterval(new Date(m.fecha), { start: new Date(startDate), end: new Date(endDate) })
  ).reduce((acc, m) => acc + m.importe, 0);

  const cashFlow = ingresosCaja - egresosCaja;

  // KPI STOCK
  const valorInventario = products.reduce((acc, p) => acc + (p.stock || 0) * (p.costo_unitario || 0), 0);
  const costoVentas = filteredSales.reduce((acc, s) => {
    return acc + (s.items?.reduce((sum, item) => sum + item.costo_unitario * item.quantity, 0) || 0);
  }, 0);
  const stockPromedio = valorInventario; // Simplificado
  const rotacionStock = stockPromedio > 0 ? costoVentas / stockPromedio : 0;
  const diasInventario = rotacionStock > 0 ? 365 / rotacionStock : 0;

  const productosSinMovimiento = products.filter(p => {
    const ultimaVenta = sales.find(s => s.items?.some(item => item.item_id === p.id));
    if (!ultimaVenta) return true;
    const diasSinVenta = differenceInDays(new Date(), new Date(ultimaVenta.created_date));
    return diasSinVenta > 90;
  }).length;

  const productosStockBajo = products.filter(p => p.stock <= p.min_stock).length;
  const quiebreStock = products.filter(p => p.is_active).length > 0 
    ? (productosStockBajo / products.filter(p => p.is_active).length) * 100 
    : 0;

  // KPI CLIENTES
  const clientesActivos = new Set(filteredSales.map(s => s.client_id).filter(Boolean)).size;
  const prevClientesActivos = new Set(prevSales.map(s => s.client_id).filter(Boolean)).size;
  
  const clientesConCompras = {};
  sales.forEach(sale => {
    if (!sale.client_id) return;
    if (!clientesConCompras[sale.client_id]) {
      clientesConCompras[sale.client_id] = { compras: 0, total: 0, ultimaCompra: sale.created_date };
    }
    clientesConCompras[sale.client_id].compras += 1;
    clientesConCompras[sale.client_id].total += sale.total;
    if (new Date(sale.created_date) > new Date(clientesConCompras[sale.client_id].ultimaCompra)) {
      clientesConCompras[sale.client_id].ultimaCompra = sale.created_date;
    }
  });

  const frecuenciaPromedioCompra = Object.values(clientesConCompras).reduce((acc, c) => acc + c.compras, 0) / Object.keys(clientesConCompras).length || 0;

  const tasaRetencion = prevClientesActivos > 0 
    ? (clientesActivos / prevClientesActivos) * 100 
    : 100;

  // KPI OPERATIVOS
  const ventasPorEmpleado = {};
  filteredSales.forEach(sale => {
    const emp = sale.employee_email || 'sin_asignar';
    if (!ventasPorEmpleado[emp]) {
      ventasPorEmpleado[emp] = { nombre: sale.employee_name || 'Sin asignar', total: 0, cantidad: 0 };
    }
    ventasPorEmpleado[emp].total += sale.total;
    ventasPorEmpleado[emp].cantidad += 1;
  });

  const erroresCaja = arqueoCaja.filter(a => 
    Math.abs(a.diferencia) > 0.01 &&
    isWithinInterval(new Date(a.fecha), { start: new Date(startDate), end: new Date(endDate) })
  ).length;

  // TOP PRODUCTOS (Pareto)
  const productoVentas = {};
  filteredSales.forEach(sale => {
    sale.items?.forEach(item => {
      if (!productoVentas[item.item_id]) {
        productoVentas[item.item_id] = {
          nombre: item.name,
          cantidad: 0,
          total: 0,
          margen: 0
        };
      }
      productoVentas[item.item_id].cantidad += item.quantity;
      productoVentas[item.item_id].total += item.total;
      productoVentas[item.item_id].margen += (item.total - item.costo_unitario * item.quantity);
    });
  });

  const topProductos = Object.entries(productoVentas)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.margen - a.margen)
    .slice(0, 20);

  const topClientes = Object.entries(clientesConCompras)
    .map(([id, data]) => {
      const cliente = clients.find(c => c.id === id);
      return { id, nombre: cliente?.name || 'Sin nombre', ...data };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // ALERTAS
  const alertas = [];
  if (quiebreStock > 10) alertas.push({ tipo: 'warning', mensaje: `${productosStockBajo} productos con stock bajo` });
  if (productosSinMovimiento > 5) alertas.push({ tipo: 'warning', mensaje: `${productosSinMovimiento} productos sin movimiento >90 días` });
  if (porcentajeMargenNeto < 10) alertas.push({ tipo: 'error', mensaje: `Margen neto bajo: ${porcentajeMargenNeto.toFixed(1)}%` });
  if (variacionVentas < -10) alertas.push({ tipo: 'error', mensaje: `Ventas cayeron ${Math.abs(variacionVentas).toFixed(1)}% vs período anterior` });
  if (tasaRetencion < 80) alertas.push({ tipo: 'warning', mensaje: `Tasa de retención: ${tasaRetencion.toFixed(1)}%` });
  if (erroresCaja > 3) alertas.push({ tipo: 'warning', mensaje: `${erroresCaja} diferencias en arqueos` });

  // Cambios de rango de fecha
  const handleDateRangeChange = (value) => {
    setDateRange(value);
    const today = new Date();
    switch(value) {
      case 'week':
        setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'));
        break;
      case 'month':
        setStartDate(format(subDays(today, 30), 'yyyy-MM-dd'));
        break;
      case 'quarter':
        setStartDate(format(subDays(today, 90), 'yyyy-MM-dd'));
        break;
      case 'year':
        setStartDate(format(subDays(today, 365), 'yyyy-MM-dd'));
        break;
    }
    setEndDate(format(today, 'yyyy-MM-dd'));
  };

  const exportData = () => {
    const data = {
      periodo: `${startDate} a ${endDate}`,
      kpis: {
        ventas_totales: totalVentas,
        margen_neto: porcentajeMargenNeto,
        rotacion_stock: rotacionStock,
        cash_flow: cashFlow,
        tasa_retencion: tasaRetencion
      },
      alertas
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analisis_kpi_${startDate}_${endDate}.json`;
    link.click();
  };

  const KPICard = ({ titulo, valor, formato = 'numero', variacion, icono: Icon, color }) => {
    const getColor = () => {
      if (variacion === undefined) return 'slate';
      if (variacion > 0) return 'green';
      if (variacion < 0) return 'red';
      return 'slate';
    };

    const colorClass = color || getColor();

    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <p className="text-xs font-medium text-slate-500 uppercase">{titulo}</p>
            <div className={`w-10 h-10 bg-${colorClass}-50 rounded-xl flex items-center justify-center`}>
              {Icon && <Icon className={`h-5 w-5 text-${colorClass}-600`} />}
            </div>
          </div>
          <p className={`text-3xl font-bold text-${colorClass}-600 mb-2`}>
            {formato === 'moneda' && '$'}
            {typeof valor === 'number' ? valor.toLocaleString(undefined, { maximumFractionDigits: formato === 'porcentaje' ? 1 : 0 }) : valor}
            {formato === 'porcentaje' && '%'}
          </p>
          {variacion !== undefined && (
            <div className="flex items-center gap-1">
              {variacion > 0 ? (
                <ArrowUp className="h-4 w-4 text-green-600" />
              ) : variacion < 0 ? (
                <ArrowDown className="h-4 w-4 text-red-600" />
              ) : null}
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-600" />
            Análisis y KPIs
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Indicadores clave de rendimiento
          </p>
        </div>
        <Button variant="outline" onClick={exportData}>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Filtros de Fecha */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mes</SelectItem>
                  <SelectItem value="quarter">Último trimestre</SelectItem>
                  <SelectItem value="year">Último año</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Desde</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setDateRange('custom'); }}
              />
            </div>
            <div className="space-y-2">
              <Label>Hasta</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setDateRange('custom'); }}
              />
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
                      <AlertTriangle className={`h-4 w-4 ${alerta.tipo === 'error' ? 'text-red-600' : 'text-amber-600'}`} />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            titulo="Ventas Totales"
            valor={totalVentas}
            formato="moneda"
            variacion={variacionVentas}
            icono={DollarSign}
          />
          <KPICard
            titulo="Margen Neto"
            valor={porcentajeMargenNeto}
            formato="porcentaje"
            icono={TrendingUp}
            color={porcentajeMargenNeto > 15 ? 'green' : porcentajeMargenNeto > 10 ? 'amber' : 'red'}
          />
          <KPICard
            titulo="Rotación Stock"
            valor={rotacionStock}
            formato="numero"
            icono={RefreshCw}
            color={rotacionStock > 3 ? 'green' : rotacionStock > 1 ? 'amber' : 'red'}
          />
          <KPICard
            titulo="Cash Flow"
            valor={cashFlow}
            formato="moneda"
            icono={Activity}
            color={cashFlow > 0 ? 'green' : 'red'}
          />
          <KPICard
            titulo="Retención Clientes"
            valor={tasaRetencion}
            formato="porcentaje"
            icono={Users}
            color={tasaRetencion > 80 ? 'green' : tasaRetencion > 60 ? 'amber' : 'red'}
          />
        </div>
      </div>

      <Tabs defaultValue="comerciales" className="space-y-4">
        <TabsList className="bg-white border shadow-sm flex-wrap h-auto">
          <TabsTrigger value="comerciales">KPI Comerciales</TabsTrigger>
          <TabsTrigger value="stock">KPI Stock</TabsTrigger>
          <TabsTrigger value="financieros">KPI Financieros</TabsTrigger>
          <TabsTrigger value="clientes">KPI Clientes</TabsTrigger>
          <TabsTrigger value="operativos">KPI Operativos</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
        </TabsList>

        {/* KPI COMERCIALES */}
        <TabsContent value="comerciales" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard
              titulo="Ticket Promedio"
              valor={ticketPromedio}
              formato="moneda"
              variacion={variacionTicket}
              icono={ShoppingCart}
            />
            <KPICard
              titulo="Unidades por Ticket (UPT)"
              valor={unidadesPorTicket}
              formato="numero"
              icono={Package}
            />
            <KPICard
              titulo="Margen Bruto"
              valor={porcentajeMargen}
              formato="porcentaje"
              icono={Percent}
              color={porcentajeMargen > 30 ? 'green' : 'amber'}
            />
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Margen por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={margenCategoriaData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="categoria" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip formatter={(value) => [`${value.toFixed(1)}%`, 'Margen']} />
                    <Bar dataKey="margen" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KPI STOCK */}
        <TabsContent value="stock" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPICard
              titulo="Rotación de Stock"
              valor={rotacionStock}
              formato="numero"
              icono={RefreshCw}
              color={rotacionStock > 3 ? 'green' : rotacionStock > 1 ? 'amber' : 'red'}
            />
            <KPICard
              titulo="Días de Inventario"
              valor={diasInventario}
              formato="numero"
              icono={Clock}
              color={diasInventario < 120 ? 'green' : diasInventario < 180 ? 'amber' : 'red'}
            />
            <KPICard
              titulo="Stock Inmovilizado"
              valor={productosSinMovimiento}
              formato="numero"
              icono={AlertTriangle}
              color={productosSinMovimiento < 5 ? 'green' : 'amber'}
            />
            <KPICard
              titulo="Quiebre de Stock"
              valor={quiebreStock}
              formato="porcentaje"
              icono={Package}
              color={quiebreStock < 5 ? 'green' : quiebreStock < 10 ? 'amber' : 'red'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-slate-500 mb-2">Valor Total Inventario</p>
                <p className="text-3xl font-bold text-blue-600">${valorInventario.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-1">{products.length} productos activos</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-slate-500 mb-2">Productos Stock Bajo</p>
                <p className="text-3xl font-bold text-amber-600">{productosStockBajo}</p>
                <p className="text-xs text-slate-500 mt-1">Requieren reposición</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* KPI FINANCIEROS */}
        <TabsContent value="financieros" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPICard
              titulo="Margen Neto"
              valor={porcentajeMargenNeto}
              formato="porcentaje"
              icono={TrendingUp}
              color={porcentajeMargenNeto > 15 ? 'green' : porcentajeMargenNeto > 10 ? 'amber' : 'red'}
            />
            <KPICard
              titulo="Costo Operativo / Ventas"
              valor={costoOperativoSobreVentas}
              formato="porcentaje"
              icono={Percent}
              color={costoOperativoSobreVentas < 20 ? 'green' : costoOperativoSobreVentas < 30 ? 'amber' : 'red'}
            />
            <KPICard
              titulo="Cash Flow Operativo"
              valor={cashFlow}
              formato="moneda"
              icono={Activity}
              color={cashFlow > 0 ? 'green' : 'red'}
            />
            <KPICard
              titulo="Gastos Totales"
              valor={totalGastos}
              formato="moneda"
              icono={DollarSign}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-slate-500 mb-2">Ganancia Neta Período</p>
                <p className={`text-3xl font-bold ${margenNeto > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${margenNeto.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">Ventas - Costos - Gastos</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-slate-500 mb-2">Margen Bruto Período</p>
                <p className="text-3xl font-bold text-blue-600">${margenBrutoTotal.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-1">{porcentajeMargen.toFixed(1)}% sobre ventas</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* KPI CLIENTES */}
        <TabsContent value="clientes" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPICard
              titulo="Clientes Activos"
              valor={clientesActivos}
              formato="numero"
              icono={Users}
              color="blue"
            />
            <KPICard
              titulo="Frecuencia Compra"
              valor={frecuenciaPromedioCompra}
              formato="numero"
              icono={RefreshCw}
            />
            <KPICard
              titulo="Tasa de Retención"
              valor={tasaRetencion}
              formato="porcentaje"
              icono={Target}
              color={tasaRetencion > 80 ? 'green' : tasaRetencion > 60 ? 'amber' : 'red'}
            />
            <KPICard
              titulo="Ticket Prom. Cliente"
              valor={ticketPromedio}
              formato="moneda"
              icono={DollarSign}
            />
          </div>

          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">Top 10 Clientes</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-center">Compras</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Promedio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topClientes.map((cliente, idx) => (
                  <TableRow key={cliente.id}>
                    <TableCell>
                      <Badge className={idx < 3 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}>
                        {idx + 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{cliente.nombre}</TableCell>
                    <TableCell className="text-center">{cliente.compras}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      ${cliente.total.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-slate-500">
                      ${Math.round(cliente.total / cliente.compras).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* KPI OPERATIVOS */}
        <TabsContent value="operativos" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard
              titulo="Ventas / Empleado"
              valor={Object.keys(ventasPorEmpleado).length > 0 ? totalVentas / Object.keys(ventasPorEmpleado).length : 0}
              formato="moneda"
              icono={Users}
            />
            <KPICard
              titulo="Errores de Caja"
              valor={erroresCaja}
              formato="numero"
              icono={AlertTriangle}
              color={erroresCaja === 0 ? 'green' : erroresCaja < 3 ? 'amber' : 'red'}
            />
            <KPICard
              titulo="Ventas por Día"
              valor={filteredSales.length > 0 ? filteredSales.length / daysDiff : 0}
              formato="numero"
              icono={CalendarIcon}
            />
          </div>

          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">Desempeño por Empleado</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Empleado</TableHead>
                  <TableHead className="text-center">Ventas</TableHead>
                  <TableHead className="text-right">Total Vendido</TableHead>
                  <TableHead className="text-right">Promedio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(ventasPorEmpleado)
                  .sort(([, a], [, b]) => b.total - a.total)
                  .map(([email, data]) => (
                    <TableRow key={email}>
                      <TableCell className="font-medium">{data.nombre}</TableCell>
                      <TableCell className="text-center">{data.cantidad}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                        ${data.total.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-slate-500">
                        ${Math.round(data.total / data.cantidad).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* RANKINGS */}
        <TabsContent value="rankings" className="space-y-4">
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-600" />
                Top 20 Productos por Margen (Análisis Pareto)
              </CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-center">Unidades</TableHead>
                  <TableHead className="text-right">Ventas</TableHead>
                  <TableHead className="text-right">Margen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProductos.map((prod, idx) => (
                  <TableRow key={prod.id} className={idx < 4 ? 'bg-amber-50' : ''}>
                    <TableCell>
                      <Badge className={
                        idx === 0 ? "bg-amber-100 text-amber-700" :
                        idx === 1 ? "bg-slate-200 text-slate-700" :
                        idx === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-slate-100 text-slate-600"
                      }>
                        {idx + 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{prod.nombre}</TableCell>
                    <TableCell className="text-center">{prod.cantidad}</TableCell>
                    <TableCell className="text-right">${prod.total.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      ${prod.margen.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}