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
  Clock, Percent, RefreshCw, Bell, Calendar as CalendarIcon, Brain, Star, CheckCircle, AlertCircle
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, differenceInDays, addDays, getMonth, getDay } from "date-fns";
import { es } from "date-fns/locale";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function Analytics() {
  const [dateRange, setDateRange] = useState("month");
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroEmpleado, setFiltroEmpleado] = useState("todos");
  const [activeView, setActiveView] = useState("dashboard");

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

  // Filtrar ventas confirmadas por período y filtros adicionales
  const filteredSales = sales.filter(sale => {
    if (!sale.created_date || sale.estado !== "CONFIRMADA") return false;
    const saleDate = new Date(sale.created_date);
    const dentroRango = isWithinInterval(saleDate, {
      start: new Date(startDate),
      end: new Date(endDate + 'T23:59:59')
    });
    
    if (!dentroRango) return false;
    
    // Filtro por categoría
    if (filtroCategoria !== "todas") {
      const tieneCategoria = sale.items?.some(item => {
        const producto = products.find(p => p.id === item.item_id);
        return producto?.category === filtroCategoria;
      });
      if (!tieneCategoria) return false;
    }
    
    // Filtro por empleado
    if (filtroEmpleado !== "todos" && sale.employee_email !== filtroEmpleado) {
      return false;
    }
    
    return true;
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
      resumen_ejecutivo: {
        ventas_totales: totalVentas,
        margen_neto_porcentaje: porcentajeMargenNeto,
        margen_bruto_porcentaje: porcentajeMargen,
        rotacion_stock: rotacionStock,
        cash_flow: cashFlow,
        tasa_retencion: tasaRetencion,
        ticket_promedio: ticketPromedio,
        clientes_activos: clientesActivos
      },
      comparacion_periodo_anterior: {
        variacion_ventas: variacionVentas,
        variacion_ticket: variacionTicket
      },
      kpis_comerciales: {
        numero_ventas: filteredSales.length,
        unidades_por_ticket: unidadesPorTicket,
        margen_por_categoria: margenCategoriaData
      },
      kpis_stock: {
        dias_inventario: diasInventario,
        productos_sin_movimiento: productosSinMovimiento,
        quiebre_stock_porcentaje: quiebreStock,
        valor_inventario: valorInventario
      },
      kpis_financieros: {
        gastos_totales: totalGastos,
        margen_neto_absoluto: margenNeto,
        costo_operativo_sobre_ventas: costoOperativoSobreVentas
      },
      top_productos: topProductos.slice(0, 10),
      top_clientes: topClientes.slice(0, 10),
      alertas_activas: alertas,
      fecha_generacion: new Date().toISOString()
    };
    
    // Exportar como JSON
    const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = `analisis_completo_${startDate}_${endDate}.json`;
    jsonLink.click();

    // Exportar como CSV resumido
    const csvRows = [
      ['Métrica', 'Valor'],
      ['Período', `${startDate} a ${endDate}`],
      ['Ventas Totales', totalVentas],
      ['Número de Ventas', filteredSales.length],
      ['Ticket Promedio', ticketPromedio.toFixed(2)],
      ['Margen Bruto %', porcentajeMargen.toFixed(2)],
      ['Margen Neto %', porcentajeMargenNeto.toFixed(2)],
      ['Rotación Stock', rotacionStock.toFixed(2)],
      ['Cash Flow', cashFlow],
      ['Clientes Activos', clientesActivos],
      ['Tasa Retención %', tasaRetencion.toFixed(2)]
    ];
    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const csvBlob = new Blob([csvContent], { type: 'text/csv' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement('a');
    csvLink.href = csvUrl;
    csvLink.download = `resumen_kpi_${startDate}_${endDate}.csv`;
    csvLink.click();
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
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2 flex-wrap">
            <BarChart3 className="h-5 sm:h-6 w-5 sm:w-6 text-indigo-600 flex-shrink-0" />
            <span>Análisis y KPIs</span>
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Indicadores clave de rendimiento
          </p>
        </div>
        <Button variant="outline" onClick={exportData} className="w-full sm:w-auto whitespace-nowrap">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Filtros de Fecha */}
      <Card className="border-0 shadow-sm overflow-x-auto">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 items-start sm:flex-row sm:items-end sm:gap-4 w-full">
            <div className="space-y-2 w-full sm:w-auto">
              <Label className="text-xs sm:text-sm">Período</Label>
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger className="w-full sm:w-40">
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
            <div className="space-y-2 w-full sm:w-auto">
              <Label className="text-xs sm:text-sm">Desde</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setDateRange('custom'); }}
                className="text-xs sm:text-sm"
              />
            </div>
            <div className="space-y-2 w-full sm:w-auto">
              <Label className="text-xs sm:text-sm">Hasta</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setDateRange('custom'); }}
                className="text-xs sm:text-sm"
              />
            </div>
            <div className="space-y-2 w-full sm:w-auto">
              <Label className="text-xs sm:text-sm">Categoría</Label>
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {[...new Set(products.map(p => p.category))].filter(Boolean).map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-full sm:w-auto">
              <Label className="text-xs sm:text-sm">Empleado</Label>
              <Select value={filtroEmpleado} onValueChange={setFiltroEmpleado}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {[...new Set(sales.map(s => s.employee_email))].filter(Boolean).map(email => {
                    const venta = sales.find(s => s.employee_email === email);
                    return (
                      <SelectItem key={email} value={email}>
                        {venta?.employee_name || email}
                      </SelectItem>
                    );
                  })}
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
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
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

      <div className="flex items-center gap-4 mb-6">
        <Label className="text-sm font-medium text-slate-700">Vista:</Label>
        <Select value={activeView} onValueChange={setActiveView}>
          <SelectTrigger className="w-80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dashboard">Dashboard Ejecutivo</SelectItem>
            <SelectItem value="comerciales">KPI Comerciales</SelectItem>
            <SelectItem value="stock">KPI Stock</SelectItem>
            <SelectItem value="financieros">KPI Financieros</SelectItem>
            <SelectItem value="clientes">KPI Clientes</SelectItem>
            <SelectItem value="operativos">KPI Operativos</SelectItem>
            <SelectItem value="rankings">Rankings</SelectItem>
            <SelectItem value="tendencias">Tendencias</SelectItem>
            <SelectItem value="comparacion">Comparación</SelectItem>
            <SelectItem value="pronostico">Pronóstico</SelectItem>
            <SelectItem value="segmentacion">Segmentación</SelectItem>
            <SelectItem value="salud">Salud del Negocio</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4 w-full">
        {activeView === "dashboard" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <p className="text-xs font-medium opacity-90 uppercase">Ventas Total</p>
                <p className="text-3xl font-bold mt-2">${(totalVentas / 1000).toFixed(0)}k</p>
                <div className="flex items-center gap-1 mt-2">
                  {variacionVentas > 0 ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">{variacionVentas > 0 && '+'}{variacionVentas.toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
              <CardContent className="p-6">
                <p className="text-xs font-medium opacity-90 uppercase">Margen Neto</p>
                <p className="text-3xl font-bold mt-2">{porcentajeMargenNeto.toFixed(1)}%</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-sm">${margenNeto.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <p className="text-xs font-medium opacity-90 uppercase">Clientes Activos</p>
                <p className="text-3xl font-bold mt-2">{clientesActivos}</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-sm">Tasa retención: {tasaRetencion.toFixed(0)}%</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white">
              <CardContent className="p-6">
                <p className="text-xs font-medium opacity-90 uppercase">Cash Flow</p>
                <p className="text-3xl font-bold mt-2">${(cashFlow / 1000).toFixed(0)}k</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-sm">
                    {cashFlow > 0 ? 'Positivo' : 'Negativo'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
           <Card className="border-0 shadow-sm w-full">
             <CardHeader>
               <CardTitle className="text-sm sm:text-base">Tendencia de Ventas (Últimos 30 días)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={(() => {
                      const ultimos30Dias = Array.from({ length: 30 }, (_, i) => {
                        const fecha = format(subDays(new Date(), 29 - i), 'yyyy-MM-dd');
                        const ventasDia = sales.filter(s => s.created_date?.startsWith(fecha) && s.estado === "CONFIRMADA");
                        return {
                          fecha: format(new Date(fecha), 'dd/MM', { locale: es }),
                          ventas: ventasDia.reduce((acc, v) => acc + v.total, 0)
                        };
                      });
                      return ultimos30Dias;
                    })()}>
                      <defs>
                        <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
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

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Recomendaciones Inteligentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(() => {
                    const recomendaciones = [];

                    // Recomendación por margen bajo
                    if (porcentajeMargenNeto < 15) {
                      recomendaciones.push({
                        tipo: 'warning',
                        titulo: 'Margen Neto Bajo',
                        descripcion: `Tu margen neto es ${porcentajeMargenNeto.toFixed(1)}%. Considera revisar costos operativos o aumentar precios.`,
                        icon: AlertCircle
                      });
                    }

                    // Recomendación por stock
                    if (quiebreStock > 10) {
                      recomendaciones.push({
                        tipo: 'warning',
                        titulo: 'Alto Quiebre de Stock',
                        descripcion: `${quiebreStock.toFixed(0)}% de productos sin stock. Prioriza reposición de productos top.`,
                        icon: Package
                      });
                    }

                    // Recomendación por productos sin movimiento
                    if (productosSinMovimiento > valorInventario * 0.3) {
                      recomendaciones.push({
                        tipo: 'info',
                        titulo: 'Productos Estancados',
                        descripcion: `$${productosSinMovimiento.toLocaleString()} en productos sin venta. Considera promociones.`,
                        icon: TrendingDown
                      });
                    }

                    // Recomendación por retención
                    if (tasaRetencion < 60) {
                      recomendaciones.push({
                        tipo: 'warning',
                        titulo: 'Mejorar Fidelización',
                        descripcion: `Tasa de retención ${tasaRetencion.toFixed(0)}%. Implementa programa de puntos o beneficios.`,
                        icon: Users
                      });
                    }

                    // Recomendación por ventas en baja
                    if (variacionVentas < -10) {
                      recomendaciones.push({
                        tipo: 'alert',
                        titulo: 'Caída de Ventas',
                        descripcion: `Ventas bajaron ${Math.abs(variacionVentas).toFixed(0)}%. Analiza causas y lanza campaña de recuperación.`,
                        icon: ArrowDown
                      });
                    }

                    // Recomendación positiva si todo va bien
                    if (porcentajeMargenNeto > 20 && tasaRetencion > 70 && variacionVentas > 5) {
                      recomendaciones.push({
                        tipo: 'success',
                        titulo: '¡Excelente Desempeño!',
                        descripcion: 'Tu negocio está funcionando muy bien. Mantén el ritmo y considera expandir operaciones.',
                        icon: TrendingUp
                      });
                    }

                    // Recomendación por mejores productos
                    const topProducto = topProductos[0];
                    if (topProducto) {
                      recomendaciones.push({
                        tipo: 'info',
                        titulo: 'Producto Estrella',
                        descripcion: `"${topProducto.nombre}" es tu producto más vendido. Asegura stock suficiente.`,
                        icon: Star
                      });
                    }

                    return recomendaciones.slice(0, 5).map((rec, idx) => {
                      const Icon = rec.icon;
                      const colorClasses = {
                        success: 'bg-green-50 border-green-200 text-green-800',
                        warning: 'bg-amber-50 border-amber-200 text-amber-800',
                        alert: 'bg-red-50 border-red-200 text-red-800',
                        info: 'bg-blue-50 border-blue-200 text-blue-800'
                      };
                      
                      return (
                        <div key={idx} className={`p-3 rounded-lg border ${colorClasses[rec.tipo]}`}>
                          <div className="flex items-start gap-3">
                            <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold text-sm">{rec.titulo}</p>
                              <p className="text-xs mt-1 opacity-90">{rec.descripcion}</p>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
            <Card className="border-0 shadow-sm w-full">
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">Top 5 Productos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topProductos.slice(0, 5).map((producto, idx) => (
                    <div key={producto.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                      <div className="flex items-center gap-2">
                        <Badge className={idx === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}>
                          {idx + 1}
                        </Badge>
                        <span className="text-sm font-medium truncate">{producto.nombre}</span>
                      </div>
                      <span className="text-sm font-bold text-emerald-600">${(producto.total || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Top 5 Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topClientes.slice(0, 5).map((cliente, idx) => (
                    <div key={cliente.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                      <div className="flex items-center gap-2">
                        <Badge className={idx === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}>
                          {idx + 1}
                        </Badge>
                        <span className="text-sm font-medium truncate">{cliente.nombre}</span>
                      </div>
                      <span className="text-sm font-bold text-blue-600">${(cliente.total || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Alertas Críticas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {alertas.slice(0, 5).map((alerta, idx) => (
                    <div key={idx} className={`p-2 rounded border-l-4 ${
                      alerta.nivel === 'critico' ? 'bg-red-50 border-red-500' :
                      alerta.nivel === 'medio' ? 'bg-amber-50 border-amber-500' :
                      'bg-blue-50 border-blue-500'
                    }`}>
                      <p className="text-xs font-medium">{alerta.mensaje}</p>
                    </div>
                  ))}
                  {alertas.length === 0 && (
                    <div className="text-center py-4">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">Sin alertas críticas</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === "comerciales" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 w-full">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
            <Card className="border-0 shadow-sm w-full">
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">Margen por Categoría</CardTitle>
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

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Ventas por Día de Semana</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(() => {
                      const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                      const ventasPorDia = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
                      filteredSales.forEach(s => {
                        const dia = new Date(s.created_date).getDay();
                        ventasPorDia[dia] += s.total;
                      });
                      return dias.map((d, idx) => ({ dia: d, ventas: ventasPorDia[idx] }));
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Ventas']} />
                      <Bar dataKey="ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Ventas por Franja Horaria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(() => {
                    const franjas = {
                      '08-10': 0, '10-12': 0, '12-14': 0, '14-16': 0, 
                      '16-18': 0, '18-20': 0, '20-22': 0
                    };
                    filteredSales.forEach(s => {
                      const hora = new Date(s.created_date).getHours();
                      if (hora >= 8 && hora < 10) franjas['08-10'] += s.total;
                      else if (hora >= 10 && hora < 12) franjas['10-12'] += s.total;
                      else if (hora >= 12 && hora < 14) franjas['12-14'] += s.total;
                      else if (hora >= 14 && hora < 16) franjas['14-16'] += s.total;
                      else if (hora >= 16 && hora < 18) franjas['16-18'] += s.total;
                      else if (hora >= 18 && hora < 20) franjas['18-20'] += s.total;
                      else if (hora >= 20 && hora < 22) franjas['20-22'] += s.total;
                    });
                    return Object.entries(franjas).map(([franja, ventas]) => ({ franja, ventas }));
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="franja" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Ventas']} />
                    <Bar dataKey="ventas" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {activeView === "stock" && (
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
        )}

        {activeView === "financieros" && (
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
        )}

        {activeView === "clientes" && (
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
              <CardTitle className="text-base">Top 10 Clientes con CLV (Customer Lifetime Value)</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-center">Compras</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Frecuencia</TableHead>
                  <TableHead className="text-right">CLV Estimado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topClientes.map((cliente, idx) => {
                  const diasDesdeUltima = differenceInDays(new Date(), new Date(cliente.ultimaCompra));
                  const frecuenciaDias = diasDesdeUltima / cliente.compras;
                  const comprasAnualesEstimadas = frecuenciaDias > 0 ? 365 / frecuenciaDias : 0;
                  const promedioCompra = cliente.total / cliente.compras;
                  const clvAnual = comprasAnualesEstimadas * promedioCompra;
                  const clv3Anios = clvAnual * 3; // Proyección 3 años
                  
                  return (
                    <TableRow key={cliente.id}>
                      <TableCell>
                        <Badge className={idx < 3 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}>
                          {idx + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{cliente.nombre}</TableCell>
                      <TableCell className="text-center">{cliente.compras}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                       ${(cliente.total || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-slate-500 text-xs">
                        {comprasAnualesEstimadas.toFixed(1)}/año
                      </TableCell>
                      <TableCell className="text-right">
                        <div>
                          <p className="font-bold text-purple-600">${clv3Anios.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                          <p className="text-xs text-slate-500">3 años</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          <div className="grid lg:grid-cols-3 gap-4 w-full">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-slate-500 mb-2">CLV Promedio Total</p>
                <p className="text-3xl font-bold text-purple-600">
                  ${(() => {
                    const clvTotal = topClientes.reduce((acc, cliente) => {
                      const diasDesdeUltima = differenceInDays(new Date(), new Date(cliente.ultimaCompra));
                      const frecuenciaDias = diasDesdeUltima / cliente.compras;
                      const comprasAnuales = frecuenciaDias > 0 ? 365 / frecuenciaDias : 0;
                      const promedio = cliente.total / cliente.compras;
                      return acc + (comprasAnuales * promedio * 3);
                    }, 0);
                    return (clvTotal / topClientes.length).toLocaleString(undefined, { maximumFractionDigits: 0 });
                  })()}
                </p>
                <p className="text-xs text-slate-500 mt-1">Valor proyectado 3 años</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-slate-500 mb-2">Clientes Inactivos</p>
                <p className="text-3xl font-bold text-amber-600">
                  {(() => {
                    return Object.values(clientesConCompras).filter(c => {
                      const diasSinCompra = differenceInDays(new Date(), new Date(c.ultimaCompra));
                      return diasSinCompra > 90;
                    }).length;
                  })()}
                </p>
                <p className="text-xs text-slate-500 mt-1">Más de 90 días sin compra</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-slate-500 mb-2">Valor Total Clientes</p>
                <p className="text-3xl font-bold text-blue-600">
                  ${Object.values(clientesConCompras).reduce((acc, c) => acc + c.total, 0).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">Histórico total</p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === "operativos" && (
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
                        ${(data.total || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-slate-500">
                        ${Math.round((data.total || 0) / (data.cantidad || 1)).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {activeView === "rankings" && (
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-600" />
                Top 20 Productos por Margen (Análisis Pareto 80/20)
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
                  <TableHead className="text-right">% Acum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const margenTotal = topProductos.reduce((acc, p) => acc + p.margen, 0);
                  let acumulado = 0;
                  return topProductos.map((prod, idx) => {
                    acumulado += prod.margen;
                    const pctAcum = margenTotal > 0 ? (acumulado / margenTotal) * 100 : 0;
                    return (
                      <TableRow key={prod.id} className={pctAcum <= 80 ? 'bg-amber-50' : ''}>
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
                        ${(prod.margen || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={pctAcum <= 80 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}>
                            {pctAcum.toFixed(0)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()}
              </TableBody>
            </Table>
          </Card>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  Productos Menos Rentables
                </CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Margen</TableHead>
                    <TableHead className="text-right">% Margen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(productoVentas)
                    .map(([id, data]) => ({ id, ...data }))
                    .sort((a, b) => {
                      const margenA = a.total > 0 ? (a.margen / a.total) * 100 : 0;
                      const margenB = b.total > 0 ? (b.margen / b.total) * 100 : 0;
                      return margenA - margenB;
                    })
                    .slice(0, 10)
                    .map((prod) => {
                      const pctMargen = prod.total > 0 ? (prod.margen / prod.total) * 100 : 0;
                      return (
                        <TableRow key={prod.id} className={pctMargen < 15 ? 'bg-red-50' : ''}>
                          <TableCell className="font-medium">{prod.nombre}</TableCell>
                          <TableCell className="text-right text-red-600">
                          ${(prod.margen || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className={
                              pctMargen < 15 ? "bg-red-100 text-red-700" :
                              pctMargen < 25 ? "bg-amber-100 text-amber-700" :
                              "bg-green-100 text-green-700"
                            }>
                              {pctMargen.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </Card>

            <Card className="border-0 shadow-sm overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Análisis por Proveedor
                </CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Proveedor</TableHead>
                    <TableHead className="text-center">Productos</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const proveedorStats = {};
                    filteredSales.forEach(sale => {
                      sale.items?.forEach(item => {
                        const producto = products.find(p => p.id === item.item_id);
                        const proveedor = producto?.supplier || 'Sin proveedor';
                        if (!proveedorStats[proveedor]) {
                          proveedorStats[proveedor] = { productos: new Set(), ventas: 0 };
                        }
                        proveedorStats[proveedor].productos.add(item.item_id);
                        proveedorStats[proveedor].ventas += item.total;
                      });
                    });
                    return Object.entries(proveedorStats)
                      .map(([prov, data]) => ({
                        proveedor: prov,
                        productos: data.productos.size,
                        ventas: data.ventas
                      }))
                      .sort((a, b) => b.ventas - a.ventas)
                      .slice(0, 10)
                      .map((prov, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{prov.proveedor}</TableCell>
                          <TableCell className="text-center">{prov.productos}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">
                            ${(prov.ventas || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ));
                  })()}
                </TableBody>
              </Table>
            </Card>
          </div>

          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Categorías con Mayor/Menor Rotación
              </CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-center">Productos</TableHead>
                  <TableHead className="text-center">Stock Total</TableHead>
                  <TableHead className="text-right">Ventas Período</TableHead>
                  <TableHead className="text-right">Rotación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const categoriaRotacion = {};
                  products.forEach(p => {
                    const cat = p.category || 'sin_categoria';
                    if (!categoriaRotacion[cat]) {
                      categoriaRotacion[cat] = { productos: 0, stock: 0, ventas: 0 };
                    }
                    categoriaRotacion[cat].productos += 1;
                    categoriaRotacion[cat].stock += p.stock || 0;
                  });
                  filteredSales.forEach(sale => {
                    sale.items?.forEach(item => {
                      const producto = products.find(p => p.id === item.item_id);
                      const cat = producto?.category || 'sin_categoria';
                      if (categoriaRotacion[cat]) {
                        categoriaRotacion[cat].ventas += item.quantity;
                      }
                    });
                  });
                  return Object.entries(categoriaRotacion)
                    .map(([cat, data]) => ({
                      categoria: cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' '),
                      ...data,
                      rotacion: data.stock > 0 ? data.ventas / data.stock : 0
                    }))
                    .sort((a, b) => b.rotacion - a.rotacion)
                    .map((cat) => (
                      <TableRow key={cat.categoria}>
                        <TableCell className="font-medium">{cat.categoria}</TableCell>
                        <TableCell className="text-center">{cat.productos}</TableCell>
                        <TableCell className="text-center">{cat.stock}</TableCell>
                        <TableCell className="text-right">{cat.ventas}</TableCell>
                        <TableCell className="text-right">
                          <Badge className={
                            cat.rotacion > 0.5 ? "bg-green-100 text-green-700" :
                            cat.rotacion > 0.2 ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          }>
                            {cat.rotacion.toFixed(2)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ));
                })()}
              </TableBody>
            </Table>
          </Card>
        )}

        {activeView === "tendencias" && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Evolución de Ventas y Margen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={(() => {
                    const ventasPorDia = {};
                    filteredSales.forEach(sale => {
                      const dia = sale.created_date?.split('T')[0];
                      if (!ventasPorDia[dia]) {
                        ventasPorDia[dia] = { ventas: 0, margen: 0 };
                      }
                      ventasPorDia[dia].ventas += sale.total;
                      const costoItems = sale.items?.reduce((acc, item) => acc + item.costo_unitario * item.quantity, 0) || 0;
                      ventasPorDia[dia].margen += (sale.total - costoItems);
                    });
                    return Object.entries(ventasPorDia)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([fecha, data]) => ({
                        fecha: format(new Date(fecha), 'dd/MM', { locale: es }),
                        ventas: data.ventas,
                        margen: data.margen
                      }));
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Line type="monotone" dataKey="ventas" stroke="#3b82f6" strokeWidth={2} name="Ventas" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="margen" stroke="#10b981" strokeWidth={2} name="Margen Bruto" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Ventas por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(() => {
                          const tipos = { 'CONTADO': 0, 'CTA_CTE': 0, 'MIXTA': 0 };
                          filteredSales.forEach(s => {
                            tipos[s.tipo_venta || 'CONTADO'] += s.total;
                          });
                          return Object.entries(tipos)
                            .filter(([, v]) => v > 0)
                            .map(([tipo, valor]) => ({
                              name: tipo === 'CTA_CTE' ? 'Cuenta Corriente' : tipo.charAt(0) + tipo.slice(1).toLowerCase(),
                              value: valor
                            }));
                        })()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {[0, 1, 2].map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Clientes Nuevos vs Recurrentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(() => {
                    const clientesNuevos = new Set();
                    const clientesRecurrentes = new Set();
                    
                    filteredSales.forEach(sale => {
                      if (!sale.client_id) return;
                      const ventasAnteriores = sales.filter(s => 
                        s.client_id === sale.client_id && 
                        new Date(s.created_date) < new Date(sale.created_date)
                      );
                      if (ventasAnteriores.length === 0) {
                        clientesNuevos.add(sale.client_id);
                      } else {
                        clientesRecurrentes.add(sale.client_id);
                      }
                    });

                    const nuevos = clientesNuevos.size;
                    const recurrentes = clientesRecurrentes.size;
                    const total = nuevos + recurrentes;

                    return (
                      <>
                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-green-900">Clientes Nuevos</p>
                            <p className="text-3xl font-bold text-green-600 mt-1">{nuevos}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-700">
                              {total > 0 ? ((nuevos / total) * 100).toFixed(0) : 0}%
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-blue-900">Clientes Recurrentes</p>
                            <p className="text-3xl font-bold text-blue-600 mt-1">{recurrentes}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-blue-700">
                              {total > 0 ? ((recurrentes / total) * 100).toFixed(0) : 0}%
                            </p>
                          </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg">
                          <p className="text-sm text-slate-600">
                            La tasa de recurrencia de <strong>{total > 0 ? ((recurrentes / total) * 100).toFixed(0) : 0}%</strong> indica 
                            {recurrentes / total > 0.7 ? ' excelente fidelización' : 
                             recurrentes / total > 0.5 ? ' buena fidelización' : 
                             ' oportunidad de mejorar fidelización'}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                Clientes con Caída de Consumo
              </CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Período Anterior</TableHead>
                  <TableHead className="text-right">Período Actual</TableHead>
                  <TableHead className="text-right">Variación</TableHead>
                  <TableHead className="text-right">Última Compra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const clientesComparacion = {};
                  
                  // Calcular consumo período actual
                  filteredSales.forEach(sale => {
                    if (!sale.client_id) return;
                    if (!clientesComparacion[sale.client_id]) {
                      clientesComparacion[sale.client_id] = {
                        nombre: sale.client_name,
                        actual: 0,
                        anterior: 0,
                        ultimaCompra: sale.created_date
                      };
                    }
                    clientesComparacion[sale.client_id].actual += sale.total;
                    if (new Date(sale.created_date) > new Date(clientesComparacion[sale.client_id].ultimaCompra)) {
                      clientesComparacion[sale.client_id].ultimaCompra = sale.created_date;
                    }
                  });

                  // Calcular consumo período anterior
                  prevSales.forEach(sale => {
                    if (!sale.client_id || !clientesComparacion[sale.client_id]) return;
                    clientesComparacion[sale.client_id].anterior += sale.total;
                  });

                  return Object.entries(clientesComparacion)
                    .filter(([, data]) => data.anterior > 0 && data.actual < data.anterior)
                    .map(([id, data]) => ({
                      id,
                      ...data,
                      variacion: ((data.actual - data.anterior) / data.anterior) * 100
                    }))
                    .sort((a, b) => a.variacion - b.variacion)
                    .slice(0, 10)
                    .map((cliente) => (
                      <TableRow key={cliente.id} className="bg-red-50">
                        <TableCell className="font-medium">{cliente.nombre}</TableCell>
                        <TableCell className="text-right">${(cliente.anterior || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">${(cliente.actual || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Badge className="bg-red-100 text-red-700">
                            {cliente.variacion.toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-slate-600">
                          {format(new Date(cliente.ultimaCompra), 'dd/MM/yyyy', { locale: es })}
                        </TableCell>
                      </TableRow>
                    ));
                })()}
              </TableBody>
            </Table>
          </Card>
        )}

        {activeView === "comparacion" && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Comparación de Períodos</CardTitle>
              <p className="text-sm text-slate-500">
                Actual: {startDate} a {endDate} vs Anterior: {prevStartDate} a {prevEndDate}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { 
                    titulo: 'Ventas', 
                    actual: totalVentas, 
                    anterior: prevTotalVentas,
                    formato: 'moneda'
                  },
                  { 
                    titulo: 'Número Ventas', 
                    actual: filteredSales.length, 
                    anterior: prevSales.length,
                    formato: 'numero'
                  },
                  { 
                    titulo: 'Ticket Promedio', 
                    actual: ticketPromedio, 
                    anterior: prevTicketPromedio,
                    formato: 'moneda'
                  },
                  { 
                    titulo: 'Gastos', 
                    actual: totalGastos, 
                    anterior: prevTotalGastos,
                    formato: 'moneda'
                  },
                ].map((metrica, idx) => {
                  const variacion = metrica.anterior > 0 
                    ? ((metrica.actual - metrica.anterior) / metrica.anterior) * 100 
                    : 0;
                  
                  return (
                    <div key={idx} className="p-4 border rounded-lg">
                      <p className="text-xs font-medium text-slate-500 uppercase mb-3">{metrica.titulo}</p>
                      <div className="space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-slate-500">Actual</span>
                          <span className="text-lg font-bold text-blue-600">
                            {metrica.formato === 'moneda' && '$'}
                            {metrica.actual.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-slate-500">Anterior</span>
                          <span className="text-lg font-medium text-slate-600">
                            {metrica.formato === 'moneda' && '$'}
                            {metrica.anterior.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500">Variación</span>
                            <div className="flex items-center gap-1">
                              {variacion > 0 ? (
                                <ArrowUp className="h-4 w-4 text-green-600" />
                              ) : variacion < 0 ? (
                                <ArrowDown className="h-4 w-4 text-red-600" />
                              ) : null}
                              <span className={`text-sm font-bold ${
                                variacion > 0 ? 'text-green-600' : 
                                variacion < 0 ? 'text-red-600' : 
                                'text-slate-600'
                              }`}>
                                {variacion > 0 && '+'}{variacion.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Comparación Visual - Ventas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { periodo: 'Anterior', ventas: prevTotalVentas, margen: prevTotalVentas * (porcentajeMargen / 100) },
                      { periodo: 'Actual', ventas: totalVentas, margen: margenBrutoTotal }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="periodo" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="ventas" fill="#3b82f6" name="Ventas Totales" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="margen" fill="#10b981" name="Margen Bruto" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Comparación Visual - Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { periodo: 'Anterior', clientes: prevClientesActivos, promedio: prevTicketPromedio },
                      { periodo: 'Actual', clientes: clientesActivos, promedio: ticketPromedio }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="periodo" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="clientes" fill="#8b5cf6" name="Clientes Activos" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="promedio" fill="#06b6d4" name="Ticket Promedio" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Análisis de Mejora/Deterioro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(() => {
                  const analisis = [
                    {
                      metrica: 'Ventas Totales',
                      variacion: variacionVentas,
                      impacto: Math.abs(totalVentas - prevTotalVentas)
                    },
                    {
                      metrica: 'Ticket Promedio',
                      variacion: variacionTicket,
                      impacto: Math.abs(ticketPromedio - prevTicketPromedio)
                    },
                    {
                      metrica: 'Número de Transacciones',
                      variacion: prevSales.length > 0 ? ((filteredSales.length - prevSales.length) / prevSales.length) * 100 : 0,
                      impacto: Math.abs(filteredSales.length - prevSales.length)
                    },
                    {
                      metrica: 'Clientes Activos',
                      variacion: prevClientesActivos > 0 ? ((clientesActivos - prevClientesActivos) / prevClientesActivos) * 100 : 0,
                      impacto: Math.abs(clientesActivos - prevClientesActivos)
                    }
                  ];

                  return analisis
                    .sort((a, b) => Math.abs(b.variacion) - Math.abs(a.variacion))
                    .map((item, idx) => (
                      <div key={idx} className={`p-4 rounded-lg border-l-4 ${
                        item.variacion > 5 ? 'bg-green-50 border-green-500' :
                        item.variacion < -5 ? 'bg-red-50 border-red-500' :
                        'bg-slate-50 border-slate-300'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-800">{item.metrica}</p>
                            <p className="text-sm text-slate-600 mt-1">
                              Impacto: {item.impacto.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              {item.variacion > 0 ? (
                                <ArrowUp className="h-5 w-5 text-green-600" />
                              ) : item.variacion < 0 ? (
                                <ArrowDown className="h-5 w-5 text-red-600" />
                              ) : null}
                              <span className={`text-2xl font-bold ${
                                item.variacion > 0 ? 'text-green-600' : 
                                item.variacion < 0 ? 'text-red-600' : 
                                'text-slate-600'
                              }`}>
                                {item.variacion > 0 && '+'}{item.variacion.toFixed(1)}%
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              {item.variacion > 10 ? '🚀 Excelente mejora' :
                               item.variacion > 5 ? '✓ Mejora positiva' :
                               item.variacion > -5 ? '≈ Estable' :
                               item.variacion > -10 ? '⚠ Requiere atención' :
                               '🔴 Deterioro significativo'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ));
                })()}
              </div>
            </CardContent>
          </Card>
        )}

        {activeView === "pronostico" && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                Pronóstico de Ventas (Próximos 30 días)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={(() => {
                    // Obtener datos históricos últimos 60 días
                    const historico = Array.from({ length: 60 }, (_, i) => {
                      const fecha = subDays(new Date(), 59 - i);
                      const ventasDia = sales.filter(s => 
                        s.created_date?.startsWith(format(fecha, 'yyyy-MM-dd')) && 
                        s.estado === "CONFIRMADA"
                      );
                      return {
                        dia: i,
                        ventas: ventasDia.reduce((acc, v) => acc + v.total, 0)
                      };
                    });

                    // Calcular tendencia lineal simple
                    const n = historico.length;
                    const sumX = historico.reduce((acc, d) => acc + d.dia, 0);
                    const sumY = historico.reduce((acc, d) => acc + d.ventas, 0);
                    const sumXY = historico.reduce((acc, d) => acc + d.dia * d.ventas, 0);
                    const sumX2 = historico.reduce((acc, d) => acc + d.dia * d.dia, 0);
                    
                    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
                    const intercept = (sumY - slope * sumX) / n;

                    // Generar pronóstico
                    const pronostico = Array.from({ length: 30 }, (_, i) => {
                      const dia = 60 + i;
                      const ventasPronostico = slope * dia + intercept;
                      return {
                        fecha: format(addDays(new Date(), i + 1), 'dd/MM', { locale: es }),
                        pronostico: Math.max(0, ventasPronostico),
                        tipo: 'pronostico'
                      };
                    });

                    // Combinar histórico reciente con pronóstico
                    const historicoReciente = historico.slice(-30).map(d => ({
                      fecha: format(subDays(new Date(), 29 - (d.dia - 30)), 'dd/MM', { locale: es }),
                      historico: d.ventas,
                      tipo: 'historico'
                    }));

                    return [...historicoReciente, ...pronostico];
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip formatter={(value) => value ? `$${value.toLocaleString()}` : ''} />
                    <Legend />
                    <Line type="monotone" dataKey="historico" stroke="#3b82f6" strokeWidth={2} name="Histórico" dot={false} />
                    <Line type="monotone" dataKey="pronostico" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" name="Pronóstico" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-900">
                  📊 <strong>Interpretación:</strong> El pronóstico usa regresión lineal sobre los últimos 60 días. 
                  Tendencia {(() => {
                    const primerDia = sales.filter(s => s.created_date?.startsWith(format(subDays(new Date(), 59), 'yyyy-MM-dd')));
                    const ultimoDia = sales.filter(s => s.created_date?.startsWith(format(new Date(), 'yyyy-MM-dd')));
                    const primerTotal = primerDia.reduce((acc, v) => acc + v.total, 0);
                    const ultimoTotal = ultimoDia.reduce((acc, v) => acc + v.total, 0);
                    return ultimoTotal > primerTotal ? 'creciente' : 'decreciente';
                  })()} detectada.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Estacionalidad por Mes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(() => {
                      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                      const ventasPorMes = meses.map((_, idx) => ({
                        mes: meses[idx],
                        ventas: sales
                          .filter(s => s.estado === "CONFIRMADA" && getMonth(new Date(s.created_date)) === idx)
                          .reduce((acc, v) => acc + v.total, 0)
                      }));
                      return ventasPorMes;
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                      <Bar dataKey="ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Heatmap de Ventas (Día/Hora)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((dia, diaIdx) => (
                    <div key={diaIdx} className="flex items-center gap-2">
                      <span className="text-xs font-medium w-10">{dia}</span>
                      <div className="flex-1 grid grid-cols-8 gap-1">
                        {[9, 11, 13, 15, 17, 19, 21, 23].map((hora, horaIdx) => {
                          const ventasEnHora = sales.filter(s => {
                            if (!s.created_date || s.estado !== "CONFIRMADA") return false;
                            const fecha = new Date(s.created_date);
                            const diaSemana = (getDay(fecha) + 6) % 7; // Ajustar para que lunes sea 0
                            const horaVenta = fecha.getHours();
                            return diaSemana === diaIdx && horaVenta >= hora && horaVenta < hora + 2;
                          });
                          const total = ventasEnHora.reduce((acc, v) => acc + v.total, 0);
                          const maxVentas = 50000; // Ajusta según tu escala
                          const intensidad = Math.min(total / maxVentas, 1);
                          
                          return (
                            <div
                              key={horaIdx}
                              className="h-8 rounded flex items-center justify-center text-xs font-medium cursor-pointer hover:scale-110 transition-transform"
                              style={{
                                backgroundColor: intensidad > 0 
                                  ? `rgba(59, 130, 246, ${0.2 + intensidad * 0.8})` 
                                  : '#f1f5f9',
                                color: intensidad > 0.5 ? 'white' : '#475569'
                              }}
                              title={`${dia} ${hora}h: $${total.toLocaleString()}`}
                            >
                              {hora}h
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  💡 Los colores más intensos indican mayor volumen de ventas
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Proyección Financiera (Próximo Mes)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {(() => {
                  // Calcular promedio diario del último mes
                  const promedioDiario = totalVentas / Math.max(differenceInDays(new Date(endDate), new Date(startDate)), 1);
                  const ventasProyectadas = promedioDiario * 30;
                  const margenProyectado = ventasProyectadas * (porcentajeMargen / 100);
                  const gastosProyectados = (totalGastos / Math.max(filteredSales.length, 1)) * (ventasProyectadas / ticketPromedio);
                  const utilidadProyectada = margenProyectado - gastosProyectados;

                  return [
                    { titulo: 'Ventas Proyectadas', valor: ventasProyectadas, color: 'blue' },
                    { titulo: 'Margen Proyectado', valor: margenProyectado, color: 'green' },
                    { titulo: 'Gastos Proyectados', valor: gastosProyectados, color: 'amber' },
                    { titulo: 'Utilidad Proyectada', valor: utilidadProyectada, color: utilidadProyectada > 0 ? 'purple' : 'red' }
                  ].map((item, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <p className="text-xs font-medium text-slate-500 uppercase">{item.titulo}</p>
                      <p className={`text-2xl font-bold mt-2 text-${item.color}-600`}>
                        ${item.valor.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  ));
                })()}
              </div>
            </CardContent>
          </Card>
        )}

        {activeView === "segmentacion" && (
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Segmentación ABC de Clientes</CardTitle>
                <p className="text-xs text-slate-500">Basado en volumen de compras</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(() => {
                    const clientesOrdenados = topClientes.slice().sort((a, b) => b.total - a.total);
                    const totalGeneral = clientesOrdenados.reduce((acc, c) => acc + c.total, 0);
                    let acumulado = 0;
                    const segmentos = { A: [], B: [], C: [] };
                    
                    clientesOrdenados.forEach(cliente => {
                      acumulado += cliente.total;
                      const pctAcum = (acumulado / totalGeneral) * 100;
                      if (pctAcum <= 80) segmentos.A.push(cliente);
                      else if (pctAcum <= 95) segmentos.B.push(cliente);
                      else segmentos.C.push(cliente);
                    });

                    return Object.entries(segmentos).map(([seg, clientes]) => {
                      const totalSeg = clientes.reduce((acc, c) => acc + c.total, 0);
                      const pctTotal = totalGeneral > 0 ? (totalSeg / totalGeneral) * 100 : 0;
                      const colorClass = {
                        A: 'bg-green-50 border-green-500 text-green-900',
                        B: 'bg-amber-50 border-amber-500 text-amber-900',
                        C: 'bg-slate-50 border-slate-500 text-slate-900'
                      }[seg];

                      return (
                        <div key={seg} className={`p-4 rounded-lg border-l-4 ${colorClass}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-bold text-lg">Segmento {seg}</p>
                              <p className="text-xs opacity-70">
                                {seg === 'A' ? 'Alto valor - 80% ingresos' : 
                                 seg === 'B' ? 'Medio valor - 15% ingresos' : 
                                 'Bajo valor - 5% ingresos'}
                              </p>
                            </div>
                            <Badge className="text-lg px-3 py-1">
                              {clientes.length}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-sm mt-3 pt-3 border-t border-current border-opacity-20">
                            <span>Total facturado</span>
                            <span className="font-bold">${totalSeg.toLocaleString()} ({pctTotal.toFixed(0)}%)</span>
                          </div>
                          <div className="flex justify-between text-sm mt-1">
                            <span>Promedio por cliente</span>
                            <span className="font-bold">
                              ${clientes.length > 0 ? (totalSeg / clientes.length).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Análisis RFM Simplificado</CardTitle>
                <p className="text-xs text-slate-500">Recencia, Frecuencia, Monto</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(() => {
                    const rfmClientes = topClientes.slice(0, 10).map(cliente => {
                      const recencia = differenceInDays(new Date(), new Date(cliente.ultimaCompra));
                      const frecuencia = cliente.compras;
                      const monto = cliente.total;

                      // Scoring simple (1-5)
                      const rScore = recencia < 30 ? 5 : recencia < 60 ? 4 : recencia < 90 ? 3 : recencia < 180 ? 2 : 1;
                      const fScore = frecuencia > 10 ? 5 : frecuencia > 7 ? 4 : frecuencia > 4 ? 3 : frecuencia > 2 ? 2 : 1;
                      const mScore = monto > 50000 ? 5 : monto > 30000 ? 4 : monto > 15000 ? 3 : monto > 5000 ? 2 : 1;
                      
                      const rfmScore = rScore + fScore + mScore;
                      
                      let segmento = '';
                      if (rfmScore >= 13) segmento = '🏆 Champions';
                      else if (rfmScore >= 10) segmento = '⭐ Leales';
                      else if (rfmScore >= 7) segmento = '📈 Potenciales';
                      else segmento = '⚠️ En Riesgo';

                      return {
                        nombre: cliente.nombre,
                        recencia: `${recencia}d`,
                        frecuencia,
                        monto: `$${monto.toLocaleString()}`,
                        segmento,
                        score: rfmScore
                      };
                    });

                    return rfmClientes.map((cliente, idx) => (
                      <div key={idx} className="p-3 border rounded-lg hover:bg-slate-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{cliente.nombre}</span>
                          <Badge className={
                            cliente.score >= 13 ? 'bg-purple-100 text-purple-700' :
                            cliente.score >= 10 ? 'bg-blue-100 text-blue-700' :
                            cliente.score >= 7 ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }>
                            {cliente.segmento}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-slate-500">Recencia</p>
                            <p className="font-medium">{cliente.recencia}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Frecuencia</p>
                            <p className="font-medium">{cliente.frecuencia}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Monto</p>
                            <p className="font-medium">{cliente.monto}</p>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Rentabilidad por Lista de Precios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid lg:grid-cols-2 gap-4">
                {['MINORISTA', 'MAYORISTA'].map(lista => {
                  const ventasLista = filteredSales.filter(s => s.tipo_lista === lista);
                  const totalLista = ventasLista.reduce((acc, s) => acc + s.total, 0);
                  const costoLista = ventasLista.reduce((acc, s) => {
                    return acc + (s.items?.reduce((sum, item) => sum + item.costo_unitario * item.quantity, 0) || 0);
                  }, 0);
                  const margenLista = totalLista - costoLista;
                  const pctMargen = totalLista > 0 ? (margenLista / totalLista) * 100 : 0;

                  return (
                    <div key={lista} className="p-6 border-2 rounded-xl bg-gradient-to-br from-white to-slate-50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg">{lista}</h3>
                        <Badge className="text-lg px-3 py-1">
                          {ventasLista.length} ventas
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Ventas totales</span>
                          <span className="font-bold text-blue-600 text-lg">${totalLista.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Margen generado</span>
                          <span className="font-bold text-green-600 text-lg">${margenLista.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between pt-3 border-t">
                          <span className="text-slate-600 font-medium">% Margen</span>
                          <span className={`font-bold text-xl ${
                            pctMargen > 30 ? 'text-green-600' : 
                            pctMargen > 20 ? 'text-amber-600' : 
                            'text-red-600'
                          }`}>
                            {pctMargen.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Distribución de Gastos por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(() => {
                          const gastosPorCat = {};
                          filteredExpenses.forEach(exp => {
                            const cat = exp.category || 'otros';
                            gastosPorCat[cat] = (gastosPorCat[cat] || 0) + exp.amount;
                          });
                          return Object.entries(gastosPorCat)
                            .map(([cat, total]) => ({
                              name: cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' '),
                              value: total
                            }))
                            .sort((a, b) => b.value - a.value);
                        })()}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {(() => {
                    const gastosPorCat = {};
                    filteredExpenses.forEach(exp => {
                      const cat = exp.category || 'otros';
                      gastosPorCat[cat] = (gastosPorCat[cat] || 0) + exp.amount;
                    });
                    return Object.entries(gastosPorCat)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 8)
                      .map(([cat, total], idx) => (
                        <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                            <span className="text-sm font-medium capitalize">
                              {cat.replace('_', ' ')}
                            </span>
                          </div>
                          <span className="font-bold text-slate-700">${total.toLocaleString()}</span>
                        </div>
                      ));
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Productos por Nivel de Inventario</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {(() => {
                  const stockCritico = products.filter(p => p.stock === 0 && p.is_active);
                  const stockBajo = products.filter(p => p.stock > 0 && p.stock <= p.min_stock && p.is_active);
                  const stockNormal = products.filter(p => p.stock > p.min_stock && p.is_active);

                  return [
                    { label: 'Stock Crítico', cantidad: stockCritico.length, color: 'red', productos: stockCritico },
                    { label: 'Stock Bajo', cantidad: stockBajo.length, color: 'amber', productos: stockBajo },
                    { label: 'Stock Normal', cantidad: stockNormal.length, color: 'green', productos: stockNormal }
                  ].map((nivel, idx) => (
                    <div key={idx} className={`p-4 border-2 rounded-lg bg-${nivel.color}-50 border-${nivel.color}-200`}>
                      <p className="text-xs font-medium text-slate-600 uppercase">{nivel.label}</p>
                      <p className={`text-4xl font-bold text-${nivel.color}-600 mt-2`}>{nivel.cantidad}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {products.length > 0 ? ((nivel.cantidad / products.length) * 100).toFixed(0) : 0}% del total
                      </p>
                    </div>
                  ));
                })()}
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">Top 10 Gastos del Período</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Descripción</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses
                    .sort((a, b) => b.amount - a.amount)
                    .slice(0, 10)
                    .map((gasto, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{gasto.description}</TableCell>
                        <TableCell>
                          <Badge className="bg-slate-100 text-slate-700 text-xs capitalize">
                            {gasto.category?.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          ${(gasto.amount || 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Eficiencia Operativa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-2">Costo de Adquisición por Cliente (CAC)</p>
                    <p className="text-3xl font-bold text-blue-600">
                      ${(() => {
                        const gastosMarketing = filteredExpenses.filter(e => e.category === 'marketing').reduce((acc, e) => acc + e.amount, 0);
                        return clientesActivos > 0 ? (gastosMarketing / clientesActivos).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0;
                      })()}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">Por cliente adquirido</p>
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-lg">
                    <p className="text-sm font-medium text-emerald-900 mb-2">ROI Marketing</p>
                    <p className="text-3xl font-bold text-emerald-600">
                      {(() => {
                        const gastosMarketing = filteredExpenses.filter(e => e.category === 'marketing').reduce((acc, e) => acc + e.amount, 0);
                        return gastosMarketing > 0 ? ((totalVentas / gastosMarketing)).toFixed(1) : 0;
                      })()}x
                    </p>
                    <p className="text-xs text-emerald-700 mt-1">Retorno por peso invertido</p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm font-medium text-purple-900 mb-2">Punto de Equilibrio</p>
                    <p className="text-3xl font-bold text-purple-600">
                      ${(() => {
                        const costosFijos = filteredExpenses.filter(e => ['renta', 'servicios', 'salarios'].includes(e.category)).reduce((acc, e) => acc + e.amount, 0);
                        const margenContribucion = porcentajeMargen / 100;
                        return margenContribucion > 0 ? (costosFijos / margenContribucion).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0;
                      })()}
                    </p>
                    <p className="text-xs text-purple-700 mt-1">Ventas necesarias para cubrir costos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Cross-Selling: Productos que se Venden Juntos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(() => {
                  const combinaciones = {};
                  filteredSales.forEach(sale => {
                    if (sale.items?.length < 2) return;
                    sale.items.forEach((item1, idx1) => {
                      sale.items.forEach((item2, idx2) => {
                        if (idx1 >= idx2) return;
                        const key = [item1.name, item2.name].sort().join(' + ');
                        if (!combinaciones[key]) {
                          combinaciones[key] = { count: 0, productos: [item1.name, item2.name] };
                        }
                        combinaciones[key].count += 1;
                      });
                    });
                  });

                  return Object.entries(combinaciones)
                    .sort(([, a], [, b]) => b.count - a.count)
                    .slice(0, 10)
                    .map(([combo, data], idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-indigo-600 text-white">{idx + 1}</Badge>
                          <span className="text-sm font-medium">{combo}</span>
                        </div>
                        <Badge className="bg-purple-100 text-purple-700">
                          {data.count} veces
                        </Badge>
                      </div>
                    ));
                })()}
              </div>
            </CardContent>
          </Card>
        )}

        {activeView === "salud" && (
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-6 w-6" />
                Score de Salud del Negocio
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {(() => {
                let score = 0;
                const factores = [];

                if (variacionVentas > 10) { score += 20; factores.push({ nombre: 'Ventas', puntos: 20, max: 20, estado: 'excelente' }); }
                else if (variacionVentas > 0) { score += 15; factores.push({ nombre: 'Ventas', puntos: 15, max: 20, estado: 'bueno' }); }
                else if (variacionVentas > -10) { score += 10; factores.push({ nombre: 'Ventas', puntos: 10, max: 20, estado: 'regular' }); }
                else { score += 5; factores.push({ nombre: 'Ventas', puntos: 5, max: 20, estado: 'critico' }); }

                if (porcentajeMargenNeto > 20) { score += 20; factores.push({ nombre: 'Margen Neto', puntos: 20, max: 20, estado: 'excelente' }); }
                else if (porcentajeMargenNeto > 15) { score += 15; factores.push({ nombre: 'Margen Neto', puntos: 15, max: 20, estado: 'bueno' }); }
                else if (porcentajeMargenNeto > 10) { score += 10; factores.push({ nombre: 'Margen Neto', puntos: 10, max: 20, estado: 'regular' }); }
                else { score += 5; factores.push({ nombre: 'Margen Neto', puntos: 5, max: 20, estado: 'critico' }); }

                const cashFlowRatio = totalVentas > 0 ? (cashFlow / totalVentas) * 100 : 0;
                if (cashFlowRatio > 20) { score += 20; factores.push({ nombre: 'Cash Flow', puntos: 20, max: 20, estado: 'excelente' }); }
                else if (cashFlowRatio > 10) { score += 15; factores.push({ nombre: 'Cash Flow', puntos: 15, max: 20, estado: 'bueno' }); }
                else if (cashFlowRatio > 0) { score += 10; factores.push({ nombre: 'Cash Flow', puntos: 10, max: 20, estado: 'regular' }); }
                else { score += 5; factores.push({ nombre: 'Cash Flow', puntos: 5, max: 20, estado: 'critico' }); }

                if (rotacionStock > 4) { score += 20; factores.push({ nombre: 'Rotación Stock', puntos: 20, max: 20, estado: 'excelente' }); }
                else if (rotacionStock > 2) { score += 15; factores.push({ nombre: 'Rotación Stock', puntos: 15, max: 20, estado: 'bueno' }); }
                else if (rotacionStock > 1) { score += 10; factores.push({ nombre: 'Rotación Stock', puntos: 10, max: 20, estado: 'regular' }); }
                else { score += 5; factores.push({ nombre: 'Rotación Stock', puntos: 5, max: 20, estado: 'critico' }); }

                if (tasaRetencion > 80) { score += 20; factores.push({ nombre: 'Retención', puntos: 20, max: 20, estado: 'excelente' }); }
                else if (tasaRetencion > 60) { score += 15; factores.push({ nombre: 'Retención', puntos: 15, max: 20, estado: 'bueno' }); }
                else if (tasaRetencion > 40) { score += 10; factores.push({ nombre: 'Retención', puntos: 10, max: 20, estado: 'regular' }); }
                else { score += 5; factores.push({ nombre: 'Retención', puntos: 5, max: 20, estado: 'critico' }); }

                const estadoNegocio = score >= 80 ? '🚀 Excelente' : score >= 60 ? '✓ Saludable' : score >= 40 ? '⚠ Regular' : '🔴 Crítico';

                return (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className={`w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl ${
                        score >= 80 ? 'bg-gradient-to-br from-green-400 to-green-600' :
                        score >= 60 ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' :
                        score >= 40 ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                        'bg-gradient-to-br from-red-400 to-red-600'
                      }`}>
                        <div className="text-white">
                          <p className="text-5xl font-bold">{score}</p>
                          <p className="text-xs opacity-90">/ 100</p>
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-800">{estadoNegocio}</h3>
                      <p className="text-slate-600 mt-1">Estado general del negocio</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      {factores.map((factor, idx) => {
                        const pct = (factor.puntos / factor.max) * 100;
                        return (
                          <div key={idx} className="p-4 border-2 rounded-lg bg-white">
                            <p className="text-xs font-medium text-slate-600 mb-2">{factor.nombre}</p>
                            <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                              <div 
                                className={`absolute top-0 left-0 h-full transition-all ${
                                  factor.estado === 'excelente' ? 'bg-green-500' :
                                  factor.estado === 'bueno' ? 'bg-emerald-500' :
                                  factor.estado === 'regular' ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                            <p className="text-sm font-bold text-slate-700">{factor.puntos}/{factor.max}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Liquidez</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(() => {
                    const cuentasPorCobrar = clients.reduce((acc, c) => acc + (c.saldo_cc || 0), 0);
                    const ratioLiquidez = totalGastos > 0 ? (cashFlow + cuentasPorCobrar) / totalGastos : 0;

                    return (
                      <>
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-900">Ratio de Liquidez</p>
                          <p className="text-3xl font-bold text-blue-600 mt-1">{ratioLiquidez.toFixed(2)}</p>
                          <p className="text-xs text-blue-700 mt-1">
                            {ratioLiquidez > 2 ? 'Excelente' : ratioLiquidez > 1 ? 'Buena' : 'Ajustada'}
                          </p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg">
                          <p className="text-sm text-slate-700">Cuentas por Cobrar</p>
                          <p className="text-2xl font-bold text-slate-800 mt-1">${cuentasPorCobrar.toLocaleString()}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Productividad</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 rounded-lg">
                    <p className="text-sm text-emerald-900">Ventas/Hora</p>
                    <p className="text-3xl font-bold text-emerald-600 mt-1">
                      ${(() => {
                        const horasTrabajadas = filteredSales.length * 0.25;
                        return horasTrabajadas > 0 ? (totalVentas / horasTrabajadas).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0;
                      })()}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-700">Conversión</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">
                      {filteredSales.length > 0 ? ((filteredSales.filter(s => s.total > 0).length / filteredSales.length) * 100).toFixed(0) : 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Inventario</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-900">Disponibilidad</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">
                      {products.length > 0 ? ((products.filter(p => p.stock > 0).length / products.length) * 100).toFixed(0) : 0}%
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-700">Cobertura</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">
                      {diasInventario.toFixed(0)} días
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Plan de Acción Recomendado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(() => {
                  const acciones = [];

                  if (quiebreStock > 10) acciones.push({ prioridad: 'alta', accion: 'Reponer stock urgente', detalle: `${productosStockBajo} productos sin stock`, plazo: 'Inmediato' });
                  if (variacionVentas < -10) acciones.push({ prioridad: 'alta', accion: 'Campaña de recuperación', detalle: 'Ventas en caída', plazo: '1 semana' });
                  if (productosSinMovimiento > 10) acciones.push({ prioridad: 'media', accion: 'Promocionar estancados', detalle: `${productosSinMovimiento} productos sin venta`, plazo: '2 semanas' });
                  if (tasaRetencion < 60) acciones.push({ prioridad: 'media', accion: 'Programa de fidelización', detalle: 'Mejorar retención', plazo: '1 mes' });
                  if (porcentajeMargenNeto < 15) acciones.push({ prioridad: 'alta', accion: 'Optimizar costos', detalle: 'Revisar gastos y precios', plazo: '2 semanas' });

                  if (acciones.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <p className="font-semibold text-slate-800">¡Todo en orden!</p>
                        <p className="text-sm text-slate-600 mt-1">No hay acciones críticas</p>
                      </div>
                    );
                  }

                  return acciones.map((accion, idx) => (
                    <div key={idx} className={`p-4 rounded-lg border-l-4 ${
                      accion.prioridad === 'alta' ? 'bg-red-50 border-red-500' : 'bg-amber-50 border-amber-500'
                    }`}>
                      <div className="flex justify-between">
                        <div>
                          <Badge className={accion.prioridad === 'alta' ? 'bg-red-600' : 'bg-amber-600'}>
                            {accion.prioridad.toUpperCase()}
                          </Badge>
                          <p className="font-semibold text-sm mt-2">{accion.accion}</p>
                          <p className="text-xs text-slate-600 mt-1">{accion.detalle}</p>
                        </div>
                        <Badge variant="outline">{accion.plazo}</Badge>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}