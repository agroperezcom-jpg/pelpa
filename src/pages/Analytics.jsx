import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Package,
  Calendar,
  Award,
  ArrowUp,
  ArrowDown,
  Download
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
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
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function Analytics() {
  const [dateRange, setDateRange] = useState("month");
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-created_date', 500)
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => base44.entities.Campaign.list()
  });

  // Filter sales by date range
  const filteredSales = sales.filter(sale => {
    if (!sale.created_date) return false;
    const saleDate = new Date(sale.created_date);
    return isWithinInterval(saleDate, {
      start: new Date(startDate),
      end: new Date(endDate + 'T23:59:59')
    });
  });

  // Calculate metrics
  const totalRevenue = filteredSales.reduce((acc, s) => acc + (s.total || 0), 0);
  const avgSale = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;
  const totalItems = filteredSales.reduce((acc, s) => acc + (s.items?.length || 0), 0);

  // Max/Min sales
  const maxSale = filteredSales.length > 0 ? Math.max(...filteredSales.map(s => s.total || 0)) : 0;
  const minSale = filteredSales.length > 0 ? Math.min(...filteredSales.map(s => s.total || 0)) : 0;

  // Sales by day
  const salesByDay = filteredSales.reduce((acc, sale) => {
    const day = sale.created_date?.split('T')[0];
    if (!acc[day]) acc[day] = 0;
    acc[day] += sale.total || 0;
    return acc;
  }, {});

  const salesChartData = Object.entries(salesByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, total]) => ({
      date: format(new Date(date), 'dd MMM', { locale: es }),
      ventas: total
    }));

  // Top clients
  const clientSales = filteredSales.reduce((acc, sale) => {
    if (!sale.client_id) return acc;
    if (!acc[sale.client_id]) {
      acc[sale.client_id] = { name: sale.client_name, total: 0, count: 0 };
    }
    acc[sale.client_id].total += sale.total || 0;
    acc[sale.client_id].count += 1;
    return acc;
  }, {});

  const topClients = Object.entries(clientSales)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Top employees
  const employeeSales = filteredSales.reduce((acc, sale) => {
    if (!sale.employee_email) return acc;
    if (!acc[sale.employee_email]) {
      acc[sale.employee_email] = { name: sale.employee_name, total: 0, count: 0 };
    }
    acc[sale.employee_email].total += sale.total || 0;
    acc[sale.employee_email].count += 1;
    return acc;
  }, {});

  const topEmployees = Object.entries(employeeSales)
    .map(([email, data]) => ({ email, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Sales by payment method
  const salesByMethod = filteredSales.reduce((acc, sale) => {
    const method = sale.payment_method || 'otro';
    if (!acc[method]) acc[method] = 0;
    acc[method] += sale.total || 0;
    return acc;
  }, {});

  const methodChartData = Object.entries(salesByMethod).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));

  // Products by category
  const productsByCategory = products.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = { count: 0, stock: 0, value: 0 };
    acc[p.category].count += 1;
    acc[p.category].stock += p.stock || 0;
    acc[p.category].value += (p.stock || 0) * (p.price || 0);
    return acc;
  }, {});

  const categoryChartData = Object.entries(productsByCategory).map(([name, data]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
    stock: data.stock,
    valor: data.value
  }));

  // Stock value
  const totalStockValue = products.reduce((acc, p) => acc + (p.stock || 0) * (p.price || 0), 0);
  const lowStockCount = products.filter(p => p.stock <= p.min_stock).length;

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
      ventas_totales: totalRevenue,
      numero_ventas: filteredSales.length,
      promedio_venta: avgSale,
      venta_maxima: maxSale,
      venta_minima: minSale,
      top_clientes: topClients,
      top_empleados: topEmployees
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analisis_${startDate}_${endDate}.json`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-600" />
            Análisis de Datos
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Métricas e insights del negocio
          </p>
        </div>
        <Button variant="outline" onClick={exportData}>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Date Filters */}
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

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Ingresos Totales</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">${totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">{filteredSales.length} ventas</p>
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
                <p className="text-xs font-medium text-slate-500 uppercase">Promedio por Venta</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">${avgSale.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Venta Máxima</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">${maxSale.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUp className="h-3 w-3 text-emerald-500" />
                  <span className="text-xs text-emerald-600">Máximo histórico</span>
                </div>
              </div>
              <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                <Award className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Valor Inventario</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">${totalStockValue.toLocaleString()}</p>
                <p className="text-xs text-amber-600 mt-1">{lowStockCount} productos bajos</p>
              </div>
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Package className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="sales">Ventas</TabsTrigger>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="employees">Empleados</TabsTrigger>
          <TabsTrigger value="inventory">Inventario</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Sales Trend */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Tendencia de Ventas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value) => [`$${value.toLocaleString()}`, 'Ventas']}
                      />
                      <Line type="monotone" dataKey="ventas" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Sales by Payment Method */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Ventas por Método de Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={methodChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {methodChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="clients">
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Top 10 Clientes
              </CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-center">Compras</TableHead>
                  <TableHead className="text-right">Total Gastado</TableHead>
                  <TableHead className="text-right">Promedio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topClients.map((client, index) => (
                  <TableRow key={client.id} className="hover:bg-slate-50">
                    <TableCell>
                      <Badge className={
                        index === 0 ? "bg-amber-100 text-amber-700" :
                        index === 1 ? "bg-slate-200 text-slate-700" :
                        index === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-slate-100 text-slate-600"
                      }>
                        {index + 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{client.name || 'Sin nombre'}</TableCell>
                    <TableCell className="text-center">{client.count}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      ${client.total.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-slate-500">
                      ${Math.round(client.total / client.count).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {topClients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      No hay datos de clientes
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="employees">
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-5 w-5 text-violet-600" />
                Desempeño de Empleados
              </CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead className="text-center">Ventas Realizadas</TableHead>
                  <TableHead className="text-right">Total Vendido</TableHead>
                  <TableHead className="text-right">Promedio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topEmployees.map((employee, index) => (
                  <TableRow key={employee.email} className="hover:bg-slate-50">
                    <TableCell>
                      <Badge className={
                        index === 0 ? "bg-amber-100 text-amber-700" :
                        index === 1 ? "bg-slate-200 text-slate-700" :
                        index === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-slate-100 text-slate-600"
                      }>
                        {index + 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell className="text-center">{employee.count}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      ${employee.total.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-slate-500">
                      ${Math.round(employee.total / employee.count).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {topEmployees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      No hay datos de empleados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Stock por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend />
                    <Bar dataKey="stock" fill="#3b82f6" name="Unidades" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="valor" fill="#10b981" name="Valor $" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}