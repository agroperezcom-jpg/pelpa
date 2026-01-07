import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Package,
  Briefcase,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  MessageSquare,
  ArrowRight,
  ShoppingCart,
  CheckCircle2,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date', 50)
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-created_date', 100)
  });

  const { data: ivaVentas = [] } = useQuery({
    queryKey: ['ivaVentas'],
    queryFn: () => base44.entities.IVAVenta.list('-created_date', 100)
  });

  const { data: periodosIVA = [] } = useQuery({
    queryKey: ['periodosIVA'],
    queryFn: () => base44.entities.PeriodoIVA.list('-anio,-mes', 3)
  });

  const { data: unreadMessages = [] } = useQuery({
    queryKey: ['unreadMessages'],
    queryFn: () => base44.entities.ProjectMessage.filter({ is_read: false })
  });

  // Calculate stats
  const lowStockProducts = products.filter(p => p.stock <= p.min_stock);
  const activeProjects = projects.filter(p => p.status !== 'completado' && p.status !== 'cancelado');
  const pendingTasks = projects.filter(p => p.status === 'pendiente');
  
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const todaySales = sales.filter(s => s.created_date?.startsWith(todayStr) && s.estado === "CONFIRMADA");
  const totalTodaySales = todaySales.reduce((acc, s) => acc + (s.total || 0), 0);
  const todayIVA = ivaVentas.filter(iv => iv.fecha === todayStr);
  const totalIVAHoy = todayIVA.reduce((acc, iv) => acc + (iv.iva_21 || 0), 0);
  
  const thisMonth = sales.filter(s => {
    const saleDate = new Date(s.created_date);
    return saleDate.getMonth() === today.getMonth() && saleDate.getFullYear() === today.getFullYear();
  });
  const totalMonthSales = thisMonth.reduce((acc, s) => acc + (s.total || 0), 0);

  // Sales chart data (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date;
  });

  const salesChartData = last7Days.map(date => {
    const dayStr = format(date, 'yyyy-MM-dd');
    const daySales = sales.filter(s => s.created_date?.startsWith(dayStr));
    return {
      name: format(date, 'EEE', { locale: es }),
      ventas: daySales.reduce((acc, s) => acc + (s.total || 0), 0)
    };
  });

  const stats = [
    {
      title: "Ventas Hoy",
      value: `$${totalTodaySales.toLocaleString()}`,
      subtitle: `${todaySales.length} ventas`,
      icon: ShoppingCart,
      color: "bg-emerald-500",
      lightColor: "bg-emerald-50",
      textColor: "text-emerald-600"
    },
    {
      title: "IVA Hoy",
      value: `$${totalIVAHoy.toLocaleString()}`,
      subtitle: `${todayIVA.length} fact. B`,
      icon: DollarSign,
      color: "bg-blue-500",
      lightColor: "bg-blue-50",
      textColor: "text-blue-600"
    },
    {
      title: "Proyectos Activos",
      value: activeProjects.length,
      subtitle: `${projects.length} totales`,
      icon: Briefcase,
      color: "bg-violet-500",
      lightColor: "bg-violet-50",
      textColor: "text-violet-600"
    },
    {
      title: "Stock Bajo",
      value: lowStockProducts.length,
      subtitle: `${products.length} productos`,
      icon: AlertTriangle,
      color: lowStockProducts.length > 0 ? "bg-amber-500" : "bg-green-500",
      lightColor: lowStockProducts.length > 0 ? "bg-amber-50" : "bg-green-50",
      textColor: lowStockProducts.length > 0 ? "text-amber-600" : "text-green-600"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Bienvenido, {user?.full_name?.split(' ')[0] || 'Usuario'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <Link to={createPageUrl("Sales")}>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Nueva Venta
          </Button>
        </Link>
      </div>

      {/* Notifications */}
      {(() => {
        const mesActual = new Date().getMonth() + 1;
        const anioActual = new Date().getFullYear();
        const mesAnterior = mesActual === 1 ? 12 : mesActual - 1;
        const anioAnterior = mesActual === 1 ? anioActual - 1 : anioActual;
        const periodoAnterior = `${anioAnterior}-${String(mesAnterior).padStart(2, '0')}`;
        const periodoAnteriorRecord = periodosIVA.find(p => p.periodo === periodoAnterior);
        const tienePeriodoAbierto = periodoAnteriorRecord && periodoAnteriorRecord.estado === "ABIERTO";
        
        if (unreadMessages.length > 0 || lowStockProducts.length > 0 || tienePeriodoAbierto) {
          return (
            <div className="space-y-2">
              {tienePeriodoAbierto && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">
                      Período fiscal {format(new Date(anioAnterior, mesAnterior - 1), 'MMMM yyyy', { locale: es })} está ABIERTO
                    </p>
                    <p className="text-xs text-red-600 mt-1">Ciérralo para continuar operando correctamente</p>
                  </div>
                  <Link to={createPageUrl("IVAMensual")}>
                    <Button variant="ghost" size="sm" className="text-red-600">
                      Cerrar <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              )}
              {unreadMessages.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">
                  Tienes {unreadMessages.length} mensaje{unreadMessages.length > 1 ? 's' : ''} sin leer
                </p>
              </div>
              <Link to={createPageUrl("Projects")}>
                <Button variant="ghost" size="sm" className="text-red-600">
                  Ver <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
              )}
              {lowStockProducts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">
                  {lowStockProducts.length} producto{lowStockProducts.length > 1 ? 's' : ''} con stock bajo
                </p>
              </div>
              <Link to={createPageUrl("Inventory")}>
                <Button variant="ghost" size="sm" className="text-amber-600">
                  Ver <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
              )}
            </div>
          );
        }
        return null;
      })()}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">
                      {stat.value}
                    </p>
                    {stat.subtitle && (
                      <p className="text-xs text-slate-500 mt-1">{stat.subtitle}</p>
                    )}
                  </div>
                  <div className={`w-10 h-10 ${stat.lightColor} rounded-xl flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${stat.textColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* IVA del Día */}
      {todayIVA.length > 0 && (
        <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  IVA Débito Fiscal Hoy
                </p>
                <div className="flex items-baseline gap-3 mt-2">
                  <p className="text-3xl font-bold text-emerald-600">${totalIVAHoy.toFixed(2)}</p>
                  <Badge className="bg-blue-100 text-blue-700">{todayIVA.length} Facturas B</Badge>
                </div>
              </div>
              <Link to={createPageUrl("Finance")}>
                <Button variant="outline" size="sm">
                  Ver Libro IVA <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-800">
              Ventas - Últimos 7 días
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '8px', 
                      border: 'none', 
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                    }}
                    formatter={(value) => [`$${value.toLocaleString()}`, 'Ventas']}
                  />
                  <Bar dataKey="ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Projects */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-800">
              Proyectos Recientes
            </CardTitle>
            <Link to={createPageUrl("Projects")}>
              <Button variant="ghost" size="sm" className="text-blue-600">
                Ver todos
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {projects.slice(0, 5).map((project) => (
                <div
                  key={project.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full ${
                    project.priority === 'alta' ? 'bg-red-500' :
                    project.priority === 'media' ? 'bg-amber-500' : 'bg-green-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {project.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {project.client_name || 'Sin cliente'}
                    </p>
                  </div>
                  <Badge variant="secondary" className={`text-xs ${
                    project.status === 'completado' ? 'bg-green-100 text-green-700' :
                    project.status === 'en_progreso' ? 'bg-blue-100 text-blue-700' :
                    project.status === 'pendiente' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {project.status?.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
              {projects.length === 0 && (
                <p className="text-center text-slate-500 py-8">No hay proyectos</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-800">
            Acciones Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link to={createPageUrl("Clients")} className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
              <Users className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Nuevo Cliente</span>
            </Link>
            <Link to={createPageUrl("Products")} className="flex flex-col items-center gap-2 p-4 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors">
              <Package className="h-6 w-6 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">Nuevo Producto</span>
            </Link>
            <Link to={createPageUrl("Projects")} className="flex flex-col items-center gap-2 p-4 bg-violet-50 rounded-xl hover:bg-violet-100 transition-colors">
              <Briefcase className="h-6 w-6 text-violet-600" />
              <span className="text-sm font-medium text-violet-700">Nuevo Proyecto</span>
            </Link>
            <Link to={createPageUrl("Inventory")} className="flex flex-col items-center gap-2 p-4 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors">
              <TrendingUp className="h-6 w-6 text-amber-600" />
              <span className="text-sm font-medium text-amber-700">Ajustar Stock</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}