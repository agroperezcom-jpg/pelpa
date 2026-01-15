import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EstadoResultadosWidget from "@/components/analytics/EstadoResultadosWidget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle, ArrowRight, 
  Wallet, Receipt, FileText, Users, Package, 
  Target, Calendar, CheckCircle2, XCircle, Landmark
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, differenceInDays, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function DashboardEjecutivo() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Fetch all data
  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-created_date', 1000)
  });

  const { data: compras = [] } = useQuery({
    queryKey: ['compras'],
    queryFn: () => base44.entities.Compra.list('-created_date', 500)
  });

  const { data: movimientosTesoreria = [] } = useQuery({
    queryKey: ['movimientosTesoreria'],
    queryFn: () => base44.entities.MovimientoTesoreria.list('-created_date', 500)
  });

  const { data: cajas = [] } = useQuery({
    queryKey: ['cajas'],
    queryFn: () => base44.entities.Caja.list()
  });

  const { data: bancos = [] } = useQuery({
    queryKey: ['bancos'],
    queryFn: () => base44.entities.Banco.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: proveedores = [] } = useQuery({
    queryKey: ['proveedores'],
    queryFn: () => base44.entities.Proveedor.list()
  });

  const { data: ivaVentas = [] } = useQuery({
    queryKey: ['ivaVentas'],
    queryFn: () => base44.entities.IVAVenta.list('-created_date', 500)
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: periodosIVA = [] } = useQuery({
    queryKey: ['periodosIVA'],
    queryFn: () => base44.entities.PeriodoIVA.list('-anio,-mes', 12)
  });

  const { data: periodosIIBB = [] } = useQuery({
    queryKey: ['periodosIIBB'],
    queryFn: () => base44.entities.PeriodoIIBB.list('-anio,-mes', 12)
  });

  const { data: proyeccionesIIBB = [] } = useQuery({
    queryKey: ['proyeccionesIIBB'],
    queryFn: () => base44.entities.ProyeccionIIBB.list('-anio,-mes', 12)
  });

  const { data: pagosVenta = [] } = useQuery({
    queryKey: ['pagosVenta'],
    queryFn: () => base44.entities.PagoVenta.list('', 1000)
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-created_date', 1000)
  });

  // ==================== CÁLCULOS ====================

  const today = format(new Date(), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date(selectedMonth)), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date(selectedMonth)), 'yyyy-MM-dd');

  // 1️⃣ RESUMEN GENERAL
  const ventasHoy = sales.filter(s => {
    const fecha = s.created_date?.split('T')[0];
    return fecha === today && s.estado === "CONFIRMADA";
  });
  const totalVentasHoy = ventasHoy.reduce((acc, s) => acc + (s.total || 0), 0);

  // Filtrar ventas del mes seleccionado
  const ventasMes = sales.filter(s => {
    if (!s.created_date || s.estado !== "CONFIRMADA") return false;
    const fecha = s.created_date.split('T')[0]; // YYYY-MM-DD
    const mesVenta = fecha.substring(0, 7); // YYYY-MM
    return mesVenta === selectedMonth;
  });
  const totalVentasMes = ventasMes.reduce((acc, s) => acc + (s.total || 0), 0);

  const comprasMes = compras.filter(c => 
    c.fecha >= monthStart && 
    c.fecha <= monthEnd && 
    c.estado === "CONFIRMADA"
  );
  const totalComprasMes = comprasMes.reduce((acc, c) => acc + c.total_compra, 0);

  const costoVentasMes = ventasMes.reduce((acc, s) => {
    return acc + (s.items?.reduce((sum, item) => sum + item.costo_unitario * item.quantity, 0) || 0);
  }, 0);

  const resultadoBrutoMes = totalVentasMes - costoVentasMes;

  // 2️⃣ TESORERÍA
  // Calcular saldos reales desde movimientos de tesorería
  const saldoCajas = movimientosTesoreria.reduce((acc, mov) => {
    if (!mov.caja_id) return acc;
    if (mov.tipo === "INGRESO") return acc + mov.importe;
    if (mov.tipo === "EGRESO") return acc - mov.importe;
    return acc;
  }, 0);

  const saldoBancos = movimientosTesoreria.reduce((acc, mov) => {
    if (!mov.banco_id) return acc;
    if (mov.tipo === "INGRESO") return acc + mov.importe;
    if (mov.tipo === "EGRESO") return acc - mov.importe;
    return acc;
  }, 0);

  const saldoTotal = saldoCajas + saldoBancos;

  const ingresosMes = movimientosTesoreria.filter(m => 
    m.tipo === "INGRESO" && m.fecha >= monthStart && m.fecha <= monthEnd
  ).reduce((acc, m) => acc + m.importe, 0);

  const egresosMes = movimientosTesoreria.filter(m => 
    m.tipo === "EGRESO" && m.fecha >= monthStart && m.fecha <= monthEnd
  ).reduce((acc, m) => acc + m.importe, 0);

  const flujoMes = ingresosMes - egresosMes;

  // 3️⃣ IVA e IIBB
  const mesActual = new Date().getMonth() + 1;
  const anioActual = new Date().getFullYear();
  const periodoActual = `${anioActual}-${String(mesActual).padStart(2, '0')}`;
  const periodoIVAActual = periodosIVA.find(p => p.periodo === periodoActual);
  const periodoIIBBActual = periodosIIBB.find(p => p.periodo === periodoActual);
  const proyeccionIIBBActual = proyeccionesIIBB.find(p => p.periodo === periodoActual);

  const ivaVentasMes = ivaVentas.filter(iv => 
    iv.fecha >= monthStart && iv.fecha <= monthEnd
  );
  const totalIVADebito = ivaVentasMes.reduce((acc, iv) => acc + (iv.iva_21 || 0), 0);

  const comprasConIVA = comprasMes.filter(c => c.tipo_comprobante === "A" || c.tipo_comprobante === "B");
  const totalIVACredito = comprasConIVA.reduce((acc, c) => acc + (c.iva_21 || 0), 0);

  const saldoIVAReal = totalIVADebito - totalIVACredito;

  // IVA Proyectado (asumiendo mismo ritmo hasta fin de mes)
  const diasTranscurridos = differenceInDays(new Date(), new Date(monthStart)) + 1;
  const diasMes = differenceInDays(new Date(monthEnd), new Date(monthStart)) + 1;
  const factorProyeccion = diasMes / diasTranscurridos;
  const ivaDebitoProyectado = totalIVADebito * factorProyeccion;
  const ivaCreditoProyectado = totalIVACredito * factorProyeccion;
  const saldoIVAProyectado = ivaDebitoProyectado - ivaCreditoProyectado;

  // 4️⃣ CUENTAS CORRIENTES
  const deudaClientes = clients.reduce((acc, c) => acc + (c.saldo_cc || 0), 0);
  const deudaProveedores = proveedores.reduce((acc, p) => acc + (p.saldo_cc || 0), 0);
  const clientesConDeuda = clients.filter(c => (c.saldo_cc || 0) > 0)
    .sort((a, b) => b.saldo_cc - a.saldo_cc)
    .slice(0, 5);

  // 5️⃣ VENTAS Y RENTABILIDAD
  const ventasPorMedioPago = {};
  ventasMes.forEach(venta => {
    const pagos = pagosVenta.filter(p => p.venta_id === venta.id);
    pagos.forEach(pago => {
      const medio = pago.medio_pago_nombre || "Sin especificar";
      if (!ventasPorMedioPago[medio]) {
        ventasPorMedioPago[medio] = 0;
      }
      ventasPorMedioPago[medio] += pago.importe;
    });
  });

  const margenPromedioMes = totalVentasMes > 0 ? (resultadoBrutoMes / totalVentasMes) * 100 : 0;

  const productosMasVendidos = {};
  ventasMes.forEach(venta => {
    venta.items?.forEach(item => {
      if (!productosMasVendidos[item.item_id]) {
        productosMasVendidos[item.item_id] = {
          nombre: item.name,
          cantidad: 0,
          total: 0
        };
      }
      productosMasVendidos[item.item_id].cantidad += item.quantity;
      productosMasVendidos[item.item_id].total += item.total;
    });
  });

  const topProductos = Object.values(productosMasVendidos)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // 6️⃣ PROYECCIONES MES PRÓXIMO
  const mesProximo = format(addMonths(new Date(selectedMonth), 1), 'yyyy-MM');
  const ventasMesAnterior = sales.filter(s => 
    s.created_date?.startsWith(format(subMonths(new Date(selectedMonth), 1), 'yyyy-MM')) && 
    s.estado === "CONFIRMADA"
  );
  const promedioVentasMes = (totalVentasMes + ventasMesAnterior.reduce((acc, s) => acc + s.total, 0)) / 2;
  const ventasProyectadas = promedioVentasMes;
  
  // Incluir gastos futuros (recurrentes) en proyecciones
  const gastosFuturos = expenses.filter(e => !e.movimiento_tesoreria_id && e.is_recurring);
  const totalGastosFuturos = gastosFuturos.reduce((acc, e) => acc + (e.amount || 0), 0);
  
  const comprasProyectadas = totalComprasMes * 1.1; // 10% buffer
  const ivaProyectadoProximo = (ventasProyectadas / 1.21) * 0.21 * 0.7; // Estimado 70% con IVA
  const flujoProyectado = (ventasProyectadas * 0.8 - comprasProyectadas) - totalGastosFuturos;

  // 7️⃣ ALERTAS
  const alertas = [];
  const umbralCajaMinimo = 50000;
  const umbralMargenBajo = 20;
  const umbralIVAAlto = 100000;

  if (saldoCajas < umbralCajaMinimo) {
    alertas.push({
      tipo: 'error',
      titulo: 'Caja Baja',
      mensaje: `Saldo en cajas: $${saldoCajas.toLocaleString()} (mínimo: $${umbralCajaMinimo.toLocaleString()})`,
      accion: 'TesoreriaV2'
    });
  }

  if (saldoIVAProyectado > umbralIVAAlto) {
    alertas.push({
      tipo: 'warning',
      titulo: 'IVA Alto Proyectado',
      mensaje: `IVA a pagar proyectado: $${saldoIVAProyectado.toLocaleString()}`,
      accion: 'IVAMensual'
    });
  }

  if (margenPromedioMes < umbralMargenBajo) {
    alertas.push({
      tipo: 'warning',
      titulo: 'Margen Bajo',
      mensaje: `Margen promedio: ${margenPromedioMes.toFixed(1)}% (objetivo: >${umbralMargenBajo}%)`,
      accion: 'Finance'
    });
  }

  const stockCritico = products.filter(p => p.stock === 0 && p.is_active).length;
  // 🆕 Alertas IIBB
  if (periodoIIBBActual && periodoIIBBActual.saldo_iibb > 50000) {
    alertas.push({
      tipo: 'warning',
      titulo: '⚠️ IIBB Elevado',
      mensaje: `$${periodoIIBBActual.saldo_iibb.toLocaleString()} de IIBB a pagar este mes`,
      accion: 'IngresosBrutos'
    });
  }

  const mesAnteriorNum = mesActual === 1 ? 12 : mesActual - 1;
  const anioAnteriorNum = mesActual === 1 ? anioActual - 1 : anioActual;
  const periodoAnterior = `${anioAnteriorNum}-${String(mesAnteriorNum).padStart(2, '0')}`;
  const periodoIIBBAnterior = periodosIIBB.find(p => p.periodo === periodoAnterior);
  
  if (periodoIIBBAnterior && periodoIIBBAnterior.estado === "ABIERTO") {
    alertas.push({
      tipo: 'error',
      titulo: '🔴 Período IIBB Abierto',
      mensaje: `El período ${periodoAnterior} de Ingresos Brutos debe cerrarse`,
      accion: 'IngresosBrutos'
    });
  }

  if (stockCritico > 5) {
    alertas.push({
      tipo: 'warning',
      titulo: 'Stock Crítico',
      mensaje: `${stockCritico} productos agotados`,
      accion: 'Inventory'
    });
  }

  if (deudaClientes > deudaProveedores * 1.5) {
    alertas.push({
      tipo: 'info',
      titulo: 'Deuda Clientes Alta',
      mensaje: `Deuda clientes $${deudaClientes.toLocaleString()} vs proveedores $${deudaProveedores.toLocaleString()}`,
      accion: 'TesoreriaV2'
    });
  }

  // Tendencia tesorería últimos 30 días
  const ultimos30Dias = Array.from({ length: 30 }, (_, i) => {
    const fecha = format(new Date(new Date().setDate(new Date().getDate() - (29 - i))), 'yyyy-MM-dd');
    const ingresos = movimientosTesoreria.filter(m => m.tipo === "INGRESO" && m.fecha === fecha).reduce((acc, m) => acc + m.importe, 0);
    const egresos = movimientosTesoreria.filter(m => m.tipo === "EGRESO" && m.fecha === fecha).reduce((acc, m) => acc + m.importe, 0);
    return {
      fecha: format(new Date(fecha), 'dd/MM', { locale: es }),
      ingresos,
      egresos,
      neto: ingresos - egresos
    };
  });

  const KPICard = ({ titulo, valor, subtitulo, icon: Icon, color = "blue", trend, onClick }) => (
    <Card 
      className={`border-0 shadow-sm hover:shadow-md transition-all ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              {titulo}
            </p>
            <p className={`text-3xl font-bold text-${color}-600`}>
              {typeof valor === 'number' && valor >= 1000 
                ? `$${valor.toLocaleString()}` 
                : typeof valor === 'number' 
                ? `$${valor.toFixed(0)}` 
                : valor
              }
            </p>
            {subtitulo && (
              <p className="text-xs text-slate-500 mt-1">{subtitulo}</p>
            )}
          </div>
          <div className={`w-12 h-12 bg-${color}-50 rounded-xl flex items-center justify-center`}>
            <Icon className={`h-6 w-6 text-${color}-600`} />
          </div>
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 pt-3 border-t">
            {trend > 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : trend < 0 ? (
              <TrendingDown className="h-4 w-4 text-red-600" />
            ) : null}
            <span className={`text-sm font-medium ${
              trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-slate-500'
            }`}>
              {trend > 0 && '+'}{trend?.toFixed(1)}% vs mes anterior
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Cálculo de tendencias
  const mesAnterior = format(subMonths(new Date(selectedMonth), 1), 'yyyy-MM');
  const ventasMesAnteriorData = sales.filter(s => 
    s.created_date?.startsWith(mesAnterior) && s.estado === "CONFIRMADA"
  );
  const totalVentasMesAnterior = ventasMesAnteriorData.reduce((acc, s) => acc + s.total, 0);
  const tendenciaVentas = totalVentasMesAnterior > 0 
    ? ((totalVentasMes - totalVentasMesAnterior) / totalVentasMesAnterior) * 100 
    : 0;

  const comprasMesAnterior = compras.filter(c => 
    c.fecha?.startsWith(mesAnterior) && c.estado === "CONFIRMADA"
  );
  const totalComprasMesAnterior = comprasMesAnterior.reduce((acc, c) => acc + c.total_compra, 0);
  const tendenciaCompras = totalComprasMesAnterior > 0 
    ? ((totalComprasMes - totalComprasMesAnterior) / totalComprasMesAnterior) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Target className="h-8 w-8 text-blue-600" />
            Dashboard Ejecutivo
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Vista consolidada del negocio - {format(new Date(), "d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Label className="text-sm">Período:</Label>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {/* 7️⃣ ALERTAS */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((alerta, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border-2 flex items-center gap-3 ${
                alerta.tipo === 'error' ? 'bg-red-50 border-red-200' :
                alerta.tipo === 'warning' ? 'bg-amber-50 border-amber-200' :
                'bg-blue-50 border-blue-200'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                alerta.tipo === 'error' ? 'bg-red-100' :
                alerta.tipo === 'warning' ? 'bg-amber-100' :
                'bg-blue-100'
              }`}>
                <AlertTriangle className={`h-5 w-5 ${
                  alerta.tipo === 'error' ? 'text-red-600' :
                  alerta.tipo === 'warning' ? 'text-amber-600' :
                  'text-blue-600'
                }`} />
              </div>
              <div className="flex-1">
                <p className={`font-semibold text-sm ${
                  alerta.tipo === 'error' ? 'text-red-900' :
                  alerta.tipo === 'warning' ? 'text-amber-900' :
                  'text-blue-900'
                }`}>
                  {alerta.titulo}
                </p>
                <p className={`text-xs mt-1 ${
                  alerta.tipo === 'error' ? 'text-red-700' :
                  alerta.tipo === 'warning' ? 'text-amber-700' :
                  'text-blue-700'
                }`}>
                  {alerta.mensaje}
                </p>
              </div>
              {alerta.accion && (
                <Link to={createPageUrl(alerta.accion)}>
                  <Button size="sm" variant="ghost" className={
                    alerta.tipo === 'error' ? 'text-red-600' :
                    alerta.tipo === 'warning' ? 'text-amber-600' :
                    'text-blue-600'
                  }>
                    Ver <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 1️⃣ RESUMEN GENERAL */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          Resumen General
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            titulo="Ventas Hoy"
            valor={totalVentasHoy}
            subtitulo={`${ventasHoy.length} operaciones`}
            icon={DollarSign}
            color="emerald"
            onClick={() => window.location.href = createPageUrl("Sales")}
          />
          <KPICard
            titulo="Ventas del Mes"
            valor={totalVentasMes}
            subtitulo={`${ventasMes.length} ventas`}
            icon={TrendingUp}
            color="blue"
            trend={tendenciaVentas}
            onClick={() => window.location.href = createPageUrl("Sales")}
          />
          <KPICard
            titulo="Compras del Mes"
            valor={totalComprasMes}
            subtitulo={`${comprasMes.length} compras`}
            icon={Receipt}
            color="purple"
            trend={tendenciaCompras}
            onClick={() => window.location.href = createPageUrl("Purchases")}
          />
          <KPICard
            titulo="Resultado Bruto"
            valor={resultadoBrutoMes}
            subtitulo={`Margen: ${margenPromedioMes.toFixed(1)}%`}
            icon={Target}
            color={resultadoBrutoMes > 0 ? "green" : "red"}
            onClick={() => window.location.href = createPageUrl("Finance")}
          />
          <KPICard
            titulo="Flujo de Caja"
            valor={flujoMes}
            subtitulo={`${ingresosMes > 0 ? 'Positivo' : 'Negativo'}`}
            icon={Wallet}
            color={flujoMes > 0 ? "green" : "red"}
            onClick={() => window.location.href = createPageUrl("TesoreriaV2")}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Estado de Resultados */}
        <EstadoResultadosWidget mesInicio={monthStart} mesFin={monthEnd} />

        {/* 2️⃣ TESORERÍA */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Landmark className="h-5 w-5 text-blue-600" />
              Tesorería
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700 font-medium uppercase mb-1">Cajas</p>
                <p className="text-2xl font-bold text-blue-600">${saldoCajas.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-xs text-emerald-700 font-medium uppercase mb-1">Bancos</p>
                <p className="text-2xl font-bold text-emerald-600">${saldoBancos.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-xs text-purple-700 font-medium uppercase mb-1">Total</p>
                <p className="text-2xl font-bold text-purple-600">${saldoTotal.toLocaleString()}</p>
              </div>
            </div>

            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ultimos30Dias}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={2} name="Ingresos" dot={false} />
                  <Line type="monotone" dataKey="egresos" stroke="#ef4444" strokeWidth={2} name="Egresos" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t">
              <div>
                <p className="text-xs text-slate-500">Ingresos Mes</p>
                <p className="text-lg font-bold text-emerald-600">${ingresosMes.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Egresos Mes</p>
                <p className="text-lg font-bold text-red-600">${egresosMes.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3️⃣ IVA */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              Posición IVA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-xs text-red-700 font-medium uppercase mb-1">IVA Débito (Ventas)</p>
                <p className="text-2xl font-bold text-red-600">${totalIVADebito.toLocaleString()}</p>
                <p className="text-xs text-red-600 mt-1">{ivaVentasMes.length} fact. B</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-xs text-emerald-700 font-medium uppercase mb-1">IVA Crédito (Compras)</p>
                <p className="text-2xl font-bold text-emerald-600">${totalIVACredito.toLocaleString()}</p>
                <p className="text-xs text-emerald-600 mt-1">{comprasConIVA.length} facturas</p>
              </div>
            </div>

            <div className={`p-6 rounded-xl border-2 ${
              saldoIVAReal > 0 ? 'bg-red-50 border-red-300' : 'bg-emerald-50 border-emerald-300'
            }`}>
              <p className="text-sm font-medium text-slate-700 uppercase mb-2">Saldo IVA Real</p>
              <p className={`text-4xl font-bold ${saldoIVAReal > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                ${Math.abs(saldoIVAReal).toLocaleString()}
              </p>
              <p className={`text-sm mt-1 ${saldoIVAReal > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                {saldoIVAReal > 0 ? 'A Pagar' : 'A Favor'}
              </p>
            </div>

            <div className={`p-4 rounded-lg border ${
              saldoIVAProyectado > 0 ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600 uppercase mb-1">IVA Proyectado (Fin Mes)</p>
                  <p className={`text-2xl font-bold ${saldoIVAProyectado > 0 ? 'text-amber-600' : 'text-blue-600'}`}>
                    ${Math.abs(saldoIVAProyectado).toLocaleString()}
                  </p>
                </div>
                <Badge className={saldoIVAProyectado > umbralIVAAlto ? 'bg-red-600' : 'bg-blue-600'}>
                  {saldoIVAProyectado > 0 ? 'A Pagar' : 'A Favor'}
                </Badge>
              </div>
            </div>

            {/* 🆕 Posición IIBB */}
            {periodoIIBBActual && (
              <div className={`p-4 rounded-lg border-2 ${
                periodoIIBBActual.saldo_iibb > 0 ? 'bg-purple-50 border-purple-300' : 'bg-emerald-50 border-emerald-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-700 uppercase mb-1">IIBB Actual</p>
                    <p className={`text-2xl font-bold ${
                      periodoIIBBActual.saldo_iibb > 0 ? 'text-purple-600' : 'text-emerald-600'
                    }`}>
                      ${Math.abs(periodoIIBBActual.saldo_iibb).toLocaleString()}
                    </p>
                  </div>
                  <Badge className={periodoIIBBActual.saldo_iibb > 50000 ? 'bg-red-600' : 'bg-purple-600'}>
                    {periodoIIBBActual.saldo_iibb > 0 ? 'A Pagar' : 'A Favor'}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4️⃣ CUENTAS CORRIENTES */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            Cuentas Corrientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700 font-medium uppercase mb-1">Clientes Deben</p>
                <p className="text-3xl font-bold text-blue-600">${deudaClientes.toLocaleString()}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {clients.filter(c => c.saldo_cc > 0).length} clientes
                </p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-xs text-red-700 font-medium uppercase mb-1">Debemos a Proveedores</p>
                <p className="text-3xl font-bold text-red-600">${deudaProveedores.toLocaleString()}</p>
                <p className="text-xs text-red-600 mt-1">
                  {proveedores.filter(p => p.saldo_cc > 0).length} proveedores
                </p>
              </div>
              <div className={`p-4 rounded-lg border-2 ${
                deudaClientes - deudaProveedores > 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'
              }`}>
                <p className="text-xs font-medium text-slate-700 uppercase mb-1">Balance Neto</p>
                <p className={`text-2xl font-bold ${
                  deudaClientes - deudaProveedores > 0 ? 'text-emerald-600' : 'text-amber-600'
                }`}>
                  ${Math.abs(deudaClientes - deudaProveedores).toLocaleString()}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {deudaClientes - deudaProveedores > 0 ? 'A favor' : 'En contra'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-600 mb-3">Top 5 Clientes con Mayor Deuda</p>
              <div className="space-y-2">
                {clientesConDeuda.map((cliente, idx) => (
                  <div key={cliente.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge className={idx === 0 ? "bg-red-600" : "bg-slate-600"}>{idx + 1}</Badge>
                      <span className="text-sm font-medium">{cliente.name}</span>
                    </div>
                    <span className="font-bold text-red-600">${cliente.saldo_cc?.toLocaleString()}</span>
                  </div>
                ))}
                {clientesConDeuda.length === 0 && (
                  <div className="text-center py-6 text-slate-500">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm">Sin deudas de clientes</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 5️⃣ VENTAS Y RENTABILIDAD */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Ventas y Rentabilidad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(ventasPorMedioPago)
                      .filter(([, valor]) => valor > 0)
                      .map(([medio, valor]) => ({
                        name: medio,
                        value: valor
                      }))
                      .sort((a, b) => b.value - a.value)
                    }
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
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

            <div className="pt-3 border-t">
              <p className="text-sm font-medium text-slate-600 mb-3">Productos Más Vendidos</p>
              <div className="space-y-2">
                {topProductos.map((prod, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <div className="flex items-center gap-2">
                      <Badge className={idx === 0 ? "bg-amber-600" : "bg-slate-600"}>{idx + 1}</Badge>
                      <span className="text-sm">{prod.nombre}</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">${prod.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 6️⃣ PROYECCIONES */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Proyecciones Próximo Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-700 font-medium uppercase">Ventas Proyectadas</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">${ventasProyectadas.toLocaleString()}</p>
                  </div>
                  <Badge className="bg-blue-600">
                    {totalVentasMes > 0 ? ((ventasProyectadas / totalVentasMes - 1) * 100).toFixed(0) : 0}% vs actual
                  </Badge>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-700 font-medium uppercase">Compras Proyectadas</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">${comprasProyectadas.toLocaleString()}</p>
                  </div>
                  <Badge className="bg-purple-600">
                    {totalComprasMes > 0 ? ((comprasProyectadas / totalComprasMes - 1) * 100).toFixed(0) : 0}% vs actual
                  </Badge>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg border border-amber-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-amber-700 font-medium uppercase">IVA Proyectado</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">${ivaProyectadoProximo.toLocaleString()}</p>
                  </div>
                  <Badge className="bg-amber-600">A pagar</Badge>
                </div>
              </div>

              <div className={`p-4 rounded-lg border-2 ${
                flujoProyectado > 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-700 uppercase">Flujo de Caja Proyectado</p>
                    <p className={`text-3xl font-bold mt-1 ${
                      flujoProyectado > 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      ${Math.abs(flujoProyectado).toLocaleString()}
                    </p>
                  </div>
                  {flujoProyectado > 0 ? (
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-600" />
                  )}
                </div>
              </div>

              <div className="pt-3 border-t">
                <p className="text-xs text-slate-500 text-center">
                  💡 Proyecciones basadas en promedio últimos 2 meses
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real vs Proyectado */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Comparación: Real vs Proyectado (Mes Actual)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { 
                  categoria: 'Ventas', 
                  real: totalVentasMes, 
                  proyectado: promedioVentasMes 
                },
                { 
                  categoria: 'Compras', 
                  real: totalComprasMes, 
                  proyectado: totalComprasMesAnterior 
                },
                { 
                  categoria: 'IVA', 
                  real: saldoIVAReal, 
                  proyectado: saldoIVAProyectado 
                },
                { 
                  categoria: 'Flujo Caja', 
                  real: flujoMes, 
                  proyectado: flujoProyectado 
                }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="categoria" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="real" fill="#3b82f6" name="Real" radius={[4, 4, 0, 0]} />
                <Bar dataKey="proyectado" fill="#8b5cf6" name="Proyectado" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Estado de Períodos Fiscales */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Períodos IVA
              </span>
              <Link to={createPageUrl("IVAMensual")}>
                <Button size="sm" variant="outline">
                  Ver Detalle <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {periodosIVA.slice(0, 4).map((periodo) => (
                <div
                  key={periodo.id}
                  className={`p-3 rounded-lg border-2 ${
                    periodo.estado === "ABIERTO" ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold">
                      {format(new Date(periodo.anio, periodo.mes - 1), 'MMM yyyy', { locale: es })}
                    </p>
                    <Badge className={periodo.estado === "ABIERTO" ? "bg-emerald-600" : "bg-slate-600"}>
                      {periodo.estado}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Saldo:</span>
                      <span className={`font-bold ${periodo.saldo_iva > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        ${Math.abs(periodo.saldo_iva || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-purple-600" />
                Períodos IIBB
              </span>
              <Link to={createPageUrl("IngresosBrutos")}>
                <Button size="sm" variant="outline">
                  Ver Detalle <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {periodosIIBB.slice(0, 4).map((periodo) => (
                <div
                  key={periodo.id}
                  className={`p-3 rounded-lg border-2 ${
                    periodo.estado === "ABIERTO" ? 'bg-purple-50 border-purple-300' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold">
                      {format(new Date(periodo.anio, periodo.mes - 1), 'MMM yyyy', { locale: es })}
                    </p>
                    <Badge className={periodo.estado === "ABIERTO" ? "bg-purple-600" : "bg-slate-600"}>
                      {periodo.estado}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Saldo:</span>
                      <span className={`font-bold ${periodo.saldo_iibb > 0 ? 'text-purple-600' : 'text-emerald-600'}`}>
                        ${Math.abs(periodo.saldo_iibb || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-slate-500 pt-4 border-t">
        <p>📊 Dashboard de solo lectura - Última actualización: {format(new Date(), "HH:mm", { locale: es })}</p>
        <p className="mt-1">Para modificar datos, accede a los módulos operativos desde el menú lateral</p>
      </div>
    </div>
  );
}