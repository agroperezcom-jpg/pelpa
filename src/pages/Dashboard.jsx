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
  TrendingUp,
  AlertCircle,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card px-3 py-2 rounded-lg border border-border/40 shadow-soft">
        <p className="text-xs text-muted-foreground mb-1">{payload[0]?.payload?.date}</p>
        <p className="text-sm font-medium text-foreground">
          ${payload[0]?.value?.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

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



  // Calculate stats
  const lowStockProducts = products.filter(p => p.stock <= p.min_stock);
  const activeProjects = projects.filter(p => p.status !== 'completado' && p.status !== 'cancelado');
  
  const today = new Date();
  const todaySales = sales.filter(s => s.created_date?.startsWith(todayStr) && s.estado === "CONFIRMADA");
  const totalTodaySales = todaySales.reduce((acc, s) => acc + (s.total || 0), 0);
  const todayIVA = ivaVentas.filter(iv => iv.fecha === todayStr);
  const totalIVAHoy = todayIVA.reduce((acc, iv) => acc + (iv.iva_21 || 0), 0);
  
  const thisMonth = sales.filter(s => {
    const saleDate = new Date(s.created_date);
    return saleDate.getMonth() === today.getMonth() && saleDate.getFullYear() === today.getFullYear() && s.estado === "CONFIRMADA";
  });
  const totalMonthSales = thisMonth.reduce((acc, s) => acc + (s.total || 0), 0);

  // Yesterday comparison
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
  const yesterdaySales = sales.filter(s => s.created_date?.startsWith(yesterdayStr) && s.estado === "CONFIRMADA");
  const totalYesterdaySales = yesterdaySales.reduce((acc, s) => acc + (s.total || 0), 0);
  const salesChange = totalYesterdaySales > 0 ? ((totalTodaySales - totalYesterdaySales) / totalYesterdaySales * 100).toFixed(1) : 0;

  // Sales chart data (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date;
  });

  const salesChartData = last7Days.map(date => {
    const dayStr = format(date, 'yyyy-MM-dd');
    const daySales = sales.filter(s => s.created_date?.startsWith(dayStr) && s.estado === "CONFIRMADA");
    return {
      name: format(date, 'EEE', { locale: es }),
      date: format(date, 'd MMM', { locale: es }),
      ventas: daySales.reduce((acc, s) => acc + (s.total || 0), 0)
    };
  });



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
          </p>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Hola, {user?.full_name?.split(' ')[0] || 'Usuario'}
          </h1>
        </div>
        <Link to={createPageUrl("Projects")}>
          <Button className="bg-primary hover:bg-[hsl(var(--primary-hover))] text-primary-foreground rounded-lg px-5 h-10 text-sm font-medium transition-all duration-200 shadow-subtle">
            <Briefcase className="h-4 w-4 mr-2" />
            Nuevo Proyecto
          </Button>
        </Link>
      </div>

      {/* Alerts */}
      {lowStockProducts.length > 0 && (
        <div className="alert-soft info flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
            <Package className="h-4 w-4 text-sky-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {lowStockProducts.length} producto{lowStockProducts.length > 1 ? 's' : ''} con stock bajo
            </p>
          </div>
          <Link to={createPageUrl("Inventory")}>
            <Button variant="ghost" size="sm" className="text-sky-700 hover:text-sky-800 hover:bg-sky-100/50">
              Ver <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      )}

      {/* Stats Grid - PMS Focused */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-violet-600" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-foreground tracking-tight">
            {activeProjects.length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Proyectos activos · {projects.length} totales
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-foreground tracking-tight">
            {clients.length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Clientes registrados
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-sky-600" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-foreground tracking-tight">
            {projects.filter(p => p.status === "finalizado").length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Proyectos finalizados
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-foreground tracking-tight">
            {products.length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Productos en catálogo
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Activity Chart */}
        <div className="lg:col-span-3 chart-container">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-foreground">Actividad de Proyectos</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Últimos 30 días</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityChartData}>
                <defs>
                  <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="proyectos" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fill="url(#colorActivity)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Projects */}
        <div className="lg:col-span-2 premium-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground">Proyectos recientes</h3>
            <Link to={createPageUrl("Projects")}>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground -mr-2">
                Ver todos
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {projects.slice(0, 5).map((project) => (
              <div
                key={project.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
              >
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  project.priority === 'alta' || project.priority === 'critica' ? 'bg-rose-400' :
                  project.priority === 'media' ? 'bg-amber-400' : 'bg-emerald-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {project.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {project.client_name || 'Sin cliente'}
                  </p>
                </div>
                <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 font-normal ${
                  project.status === 'finalizado' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                  project.status === 'activo' ? 'bg-sky-50 text-sky-700 border border-sky-100' :
                  project.status === 'propuesto' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                  'bg-slate-50 text-slate-600 border border-slate-100'
                }`}>
                  {project.status?.replace('_', ' ')}
                </Badge>
              </div>
            ))}
            {projects.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">
                No hay proyectos
              </p>
            )}
          </div>
        </div>
      </div>



      {/* Quick Actions - PMS Focused */}
      <div className="premium-card p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">Acciones rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link 
            to={createPageUrl("Projects")} 
            className="flex items-center gap-3 p-4 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
              <Briefcase className="h-4 w-4 text-violet-600" />
            </div>
            <span className="text-sm font-medium text-foreground">Nuevo Proyecto</span>
          </Link>

          <Link 
            to={createPageUrl("Clients")} 
            className="flex items-center gap-3 p-4 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-foreground">Nuevo Cliente</span>
          </Link>

          <Link 
            to={createPageUrl("Products")} 
            className="flex items-center gap-3 p-4 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center group-hover:bg-sky-100 transition-colors">
              <Package className="h-4 w-4 text-sky-600" />
            </div>
            <span className="text-sm font-medium text-foreground">Nuevo Producto</span>
          </Link>

          <Link 
            to={createPageUrl("Calendar")} 
            className="flex items-center gap-3 p-4 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
              <TrendingUp className="h-4 w-4 text-amber-600" />
            </div>
            <span className="text-sm font-medium text-foreground">Ver Calendario</span>
          </Link>
        </div>
      </div>
    </div>
  );
}