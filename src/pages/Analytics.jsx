import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Users, Activity, Download } from "lucide-react";
import { format, subDays } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Analytics() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-created_date', 500)
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date', 300)
  });

  const filteredSales = sales.filter(s => {
    if (!s.created_date || s.estado !== "CONFIRMADA") return false;
    const saleDate = s.created_date.split('T')[0];
    return saleDate >= startDate && saleDate <= endDate;
  });

  const filteredExpenses = expenses.filter(e => {
    if (!e.date) return false;
    return e.date >= startDate && e.date <= endDate;
  });

  const totalVentas = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const margenBruto = filteredSales.reduce((sum, s) => {
    const costo = s.items?.reduce((c, item) => c + (item.costo_unitario || 0) * (item.quantity || 0), 0) || 0;
    return sum + (s.total - costo);
  }, 0);
  const porcentajeMargen = totalVentas > 0 ? (margenBruto / totalVentas) * 100 : 0;
  const totalGastos = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const margenNeto = totalVentas - margenBruto - totalGastos;
  const clientesActivos = new Set(filteredSales.map(s => s.client_id).filter(Boolean)).size;

  const chartData = Array.from({ length: 30 }, (_, i) => {
    const fecha = format(subDays(new Date(endDate), 29 - i), 'yyyy-MM-dd');
    const ventasDia = filteredSales.filter(s => s.created_date?.startsWith(fecha));
    return {
      fecha: format(new Date(fecha), 'dd/MM'),
      ventas: ventasDia.reduce((sum, v) => sum + v.total, 0)
    };
  });

  if (isLoading) {
    return <div className="p-4">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Analytics
          </h1>
          <p className="text-slate-500 text-sm mt-1">Indicadores de rendimiento</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-3 flex-wrap">
            <div className="space-y-2 flex-1 min-w-max">
              <label className="text-xs font-medium">Desde</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2 flex-1 min-w-max">
              <label className="text-xs font-medium">Hasta</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium text-slate-500">Ventas Totales</p>
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold">${totalVentas.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium text-slate-500">Margen</p>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold">{porcentajeMargen.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium text-slate-500">Margen Neto</p>
              <Activity className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold">${margenNeto.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium text-slate-500">Clientes</p>
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold">{clientesActivos}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium text-slate-500">Transacciones</p>
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold">{filteredSales.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ventas Diarias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen Financiero</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span>Ventas Totales</span>
            <span className="font-bold">${totalVentas.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Margen Bruto</span>
            <span className="font-bold">${margenBruto.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Gastos</span>
            <span className="font-bold">${totalGastos.toLocaleString()}</span>
          </div>
          <div className="border-t pt-3 flex justify-between">
            <span className="font-medium">Margen Neto</span>
            <span className="font-bold text-lg">${margenNeto.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}