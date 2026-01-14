import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Receipt,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  TrendingUp,
  DollarSign,
  Calendar,
  FileText,
  Upload,
  RefreshCw
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";



const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];



export default function Expenses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState(format(new Date(), 'yyyy-MM'));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [cuentaSearch, setCuentaSearch] = useState("");
  const [formData, setFormData] = useState({
    description: "",
    category: "",
    cuenta_contable_id: "",
    cuenta_contable_codigo: "",
    cuenta_contable_nombre: "",
    amount: "",
    date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: "efectivo",
    medio_pago_id: "",
    banco_id: "",
    caja_id: "",
    vendor: "",
    invoice_number: "",
    is_recurring: false,
    recurring_frequency: "",
    notes: "",
    receipt_url: ""
  });

  const queryClient = useQueryClient();

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date', 500)
  });

  const { data: mediosPago = [] } = useQuery({
    queryKey: ['mediosPago'],
    queryFn: () => base44.entities.MedioPago.list()
  });

  const { data: bancos = [] } = useQuery({
    queryKey: ['bancos'],
    queryFn: () => base44.entities.Banco.list()
  });

  const { data: cajas = [] } = useQuery({
    queryKey: ['cajas'],
    queryFn: () => base44.entities.Caja.list()
  });

  const { data: cuentasContables = [] } = useQuery({
    queryKey: ['cuentasContables'],
    queryFn: async () => {
      const allCuentas = await base44.entities.CuentaContable.list('codigo', 500);
      return allCuentas.filter(c => 
        c.imputable === true && 
        c.activa !== false &&
        (c.tipo_resultado === 'Costo' || c.tipo_resultado === 'Gasto')
      );
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const medio = mediosPago.find(m => m.id === data.medio_pago_id);
      
      if (!medio) {
        throw new Error("Debe seleccionar un medio de pago");
      }
      
      // Validaciones
      if (medio.requiere_banco && !data.banco_id) {
        throw new Error("Este medio de pago requiere seleccionar un banco");
      }
      if (medio.requiere_caja && !data.caja_id) {
        throw new Error("Este medio de pago requiere seleccionar una caja");
      }

      const banco = bancos.find(b => b.id === data.banco_id);
      const caja = cajas.find(c => c.id === data.caja_id);

      // Validar saldo suficiente
      if (data.banco_id && banco && banco.saldo_actual < data.amount) {
        throw new Error(`Saldo insuficiente en ${banco.nombre}. Saldo disponible: $${banco.saldo_actual}`);
      }
      if (data.caja_id && caja && caja.saldo_actual < data.amount) {
        throw new Error(`Saldo insuficiente en ${caja.nombre}. Saldo disponible: $${caja.saldo_actual}`);
      }

      // Crear gasto con toda la información
      const expense = await base44.entities.Expense.create({
        ...data,
        medio_pago_nombre: medio.nombre,
        banco_nombre: banco?.nombre || "",
        caja_nombre: caja?.nombre || ""
      });
      
      // Crear movimiento de tesorería
      const movimiento = await base44.entities.MovimientoTesoreria.create({
        fecha: data.date,
        tipo: "EGRESO",
        medio_pago_id: medio.id,
        medio_pago_nombre: medio.nombre,
        banco_id: data.banco_id || null,
        banco_nombre: banco?.nombre || "",
        caja_id: data.caja_id || null,
        caja_nombre: caja?.nombre || "",
        importe: data.amount,
        referencia_tipo: "gasto",
        referencia_id: expense.id,
        observaciones: `Gasto: ${data.description} (${data.cuenta_contable_nombre || data.category})`
        });

      // Actualizar expense con el ID del movimiento
      await base44.entities.Expense.update(expense.id, {
        movimiento_tesoreria_id: movimiento.id
      });

      // Actualizar saldos
      if (data.banco_id && banco) {
        await base44.entities.Banco.update(data.banco_id, {
          saldo_actual: banco.saldo_actual - data.amount
        });
      }

      if (data.caja_id && caja) {
        await base44.entities.Caja.update(data.caja_id, {
          saldo_actual: caja.saldo_actual - data.amount
        });
      }
      
      return expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['movimientosTesoreria'] });
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['cajas'] });
      handleCloseDialog();
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      handleCloseDialog();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const gasto = expenses.find(e => e.id === id);
      
      if (!gasto) {
        throw new Error("Gasto no encontrado");
      }

      // Si tiene movimiento vinculado, eliminarlo y revertir saldos
      if (gasto.movimiento_tesoreria_id) {
        const movimiento = await base44.entities.MovimientoTesoreria.list();
        const mov = movimiento.find(m => m.id === gasto.movimiento_tesoreria_id);
        
        if (mov) {
          // Revertir saldo del banco
          if (mov.banco_id) {
            const banco = bancos.find(b => b.id === mov.banco_id);
            if (banco) {
              await base44.entities.Banco.update(mov.banco_id, {
                saldo_actual: banco.saldo_actual + mov.importe
              });
            }
          }

          // Revertir saldo de la caja
          if (mov.caja_id) {
            const caja = cajas.find(c => c.id === mov.caja_id);
            if (caja) {
              await base44.entities.Caja.update(mov.caja_id, {
                saldo_actual: caja.saldo_actual + mov.importe
              });
            }
          }

          // Eliminar movimiento
          await base44.entities.MovimientoTesoreria.delete(mov.id);
        }
      }
      
      // Eliminar gasto
      await base44.entities.Expense.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['movimientosTesoreria'] });
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['cajas'] });
    }
  });

  const handleOpenDialog = (expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        description: expense.description || "",
        category: expense.category || "",
        cuenta_contable_id: expense.cuenta_contable_id || "",
        cuenta_contable_codigo: expense.cuenta_contable_codigo || "",
        cuenta_contable_nombre: expense.cuenta_contable_nombre || "",
        amount: expense.amount?.toString() || "",
        date: expense.date || format(new Date(), 'yyyy-MM-dd'),
        payment_method: expense.payment_method || "efectivo",
        medio_pago_id: expense.medio_pago_id || "",
        banco_id: expense.banco_id || "",
        caja_id: expense.caja_id || "",
        vendor: expense.vendor || "",
        invoice_number: expense.invoice_number || "",
        is_recurring: expense.is_recurring || false,
        recurring_frequency: expense.recurring_frequency || "",
        notes: expense.notes || "",
        receipt_url: expense.receipt_url || ""
      });
      setCuentaSearch(expense.cuenta_contable_nombre || "");
    } else {
      setEditingExpense(null);
      setFormData({
        description: "",
        category: "",
        cuenta_contable_id: "",
        cuenta_contable_codigo: "",
        cuenta_contable_nombre: "",
        amount: "",
        date: format(new Date(), 'yyyy-MM-dd'),
        payment_method: "efectivo",
        medio_pago_id: "",
        banco_id: "",
        caja_id: "",
        vendor: "",
        invoice_number: "",
        is_recurring: false,
        recurring_frequency: "",
        notes: "",
        receipt_url: ""
      });
      setCuentaSearch("");
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingExpense(null);
  };

  const handleSubmit = (e) => {
     e.preventDefault();

     // Evitar múltiples clics
     if (createMutation.isPending || updateMutation.isPending) {
       return;
     }

     const data = {
       ...formData,
       amount: parseFloat(formData.amount) || 0
     };

     if (editingExpense) {
       updateMutation.mutate({ id: editingExpense.id, data });
     } else {
       createMutation.mutate(data);
     }
   };

  const uploadReceipt = async (file) => {
    try {
      const { data } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, receipt_url: data.file_url });
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  // Filter expenses
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = 
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
    const matchesMonth = expense.date?.startsWith(monthFilter);
    return matchesSearch && matchesCategory && matchesMonth;
  });

  // Calculate stats
  const monthExpenses = expenses.filter(e => e.date?.startsWith(monthFilter));
  const totalMonth = monthExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const recurringExpenses = monthExpenses.filter(e => e.is_recurring);
  const totalRecurring = recurringExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  // Previous month comparison
  const prevMonth = format(subMonths(new Date(monthFilter + '-01'), 1), 'yyyy-MM');
  const prevMonthExpenses = expenses.filter(e => e.date?.startsWith(prevMonth));
  const totalPrevMonth = prevMonthExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const percentChange = totalPrevMonth > 0 ? ((totalMonth - totalPrevMonth) / totalPrevMonth * 100) : 0;

  // Chart data by category
  const categoryData = monthExpenses.reduce((acc, expense) => {
    const cat = expense.cuenta_contable_nombre || expense.category || 'Sin categoría';
    if (!acc[cat]) acc[cat] = 0;
    acc[cat] += expense.amount || 0;
    return acc;
  }, {});

  const pieData = Object.entries(categoryData).map(([name, value]) => ({
    name,
    value
  }));

  // Monthly trend (last 6 months)
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(monthFilter + '-01'), 5 - i);
    return format(date, 'yyyy-MM');
  });

  const trendData = last6Months.map(month => {
    const monthExp = expenses.filter(e => e.date?.startsWith(month));
    return {
      month: format(new Date(month + '-01'), 'MMM', { locale: es }),
      total: monthExp.reduce((acc, e) => acc + (e.amount || 0), 0)
    };
  });

  const exportToCSV = () => {
    const headers = ["Fecha", "Descripción", "Cuenta", "Código", "Monto", "Proveedor", "Medio Pago"];
    const rows = filteredExpenses.map(e => [
      e.date,
      e.description,
      e.cuenta_contable_nombre || e.category,
      e.cuenta_contable_codigo || "",
      e.amount,
      e.vendor,
      e.medio_pago_nombre
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gastos_${monthFilter}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-red-600" />
            Gastos y Costos
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestión de gastos operativos mensuales
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={() => handleOpenDialog()} className="bg-red-600 hover:bg-red-700">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Gasto
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Total del Mes</p>
                <p className="text-2xl font-bold text-red-600 mt-1">${totalMonth.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  {percentChange !== 0 && (
                    <>
                      <TrendingUp className={`h-3 w-3 ${percentChange > 0 ? 'text-red-500' : 'text-green-500'} ${percentChange < 0 ? 'rotate-180' : ''}`} />
                      <span className={`text-xs ${percentChange > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {Math.abs(percentChange).toFixed(1)}% vs mes anterior
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Gastos Recurrentes</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">${totalRecurring.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-1">{recurringExpenses.length} conceptos</p>
              </div>
              <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Promedio Diario</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  ${Math.round(totalMonth / new Date().getDate()).toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Registros</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{monthExpenses.length}</p>
              </div>
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Tendencia - Últimos 6 Meses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [`$${value.toLocaleString()}`, 'Gastos']}
                  />
                  <Bar dataKey="total" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Distribución por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
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

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por descripción o proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Cuenta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las cuentas</SelectItem>
                {cuentasContables.map(cuenta => (
                  <SelectItem key={cuenta.id} value={cuenta.id}>
                    {cuenta.codigo} - {cuenta.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full sm:w-40"
            />
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Fecha</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Cuenta Contable</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-center">Recurrente</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExpenses.map((expense) => (
              <TableRow key={expense.id} className="hover:bg-slate-50">
                <TableCell className="text-slate-500">
                  {format(new Date(expense.date), "d MMM yyyy", { locale: es })}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{expense.description}</p>
                    {expense.invoice_number && (
                      <p className="text-xs text-slate-400">#{expense.invoice_number}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {expense.cuenta_contable_codigo || expense.cuenta_contable_nombre ? (
                    <div>
                      <p className="font-medium text-sm">{expense.cuenta_contable_nombre}</p>
                      <p className="text-xs text-slate-500">{expense.cuenta_contable_codigo}</p>
                    </div>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </TableCell>
                <TableCell className="text-slate-600">{expense.vendor || '-'}</TableCell>
                <TableCell className="text-right font-bold text-red-600">
                  ${expense.amount?.toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  {expense.is_recurring && (
                    <Badge variant="secondary" className="bg-violet-100 text-violet-700">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      {expense.recurring_frequency}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenDialog(expense)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      {expense.receipt_url && (
                        <DropdownMenuItem onClick={() => window.open(expense.receipt_url, '_blank')}>
                          <FileText className="h-4 w-4 mr-2" />
                          Ver Comprobante
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => deleteMutation.mutate(expense.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filteredExpenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No hay gastos registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Descripción *</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del gasto"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Cuenta Contable *</Label>
              <div className="relative">
                <Input
                  placeholder="Buscar cuenta..."
                  value={cuentaSearch}
                  onChange={(e) => setCuentaSearch(e.target.value)}
                  className="mb-2"
                />
              </div>
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {cuentasContables
                  .filter(c => 
                    c.nombre.toLowerCase().includes(cuentaSearch.toLowerCase()) ||
                    c.codigo.toLowerCase().includes(cuentaSearch.toLowerCase())
                  )
                  .slice(0, 10)
                  .map(cuenta => (
                    <button
                      key={cuenta.id}
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          cuenta_contable_id: cuenta.id,
                          cuenta_contable_codigo: cuenta.codigo,
                          cuenta_contable_nombre: cuenta.nombre,
                          category: cuenta.nombre
                        });
                        setCuentaSearch(cuenta.nombre);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-slate-50 border-b last:border-b-0 transition-colors ${
                        formData.cuenta_contable_id === cuenta.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{cuenta.nombre}</p>
                          <p className="text-xs text-slate-500">{cuenta.codigo}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {cuenta.tipo_resultado}
                        </Badge>
                      </div>
                    </button>
                  ))}
                {cuentasContables.length === 0 && (
                  <div className="text-center py-4 text-sm text-slate-500">
                    No hay cuentas de Costos/Gastos con imputable=true. <br />
                    Importa un plan de cuentas en Configuración.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Monto *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Medio de Pago *</Label>
              <Select 
                value={formData.medio_pago_id} 
                onValueChange={(v) => setFormData({ ...formData, medio_pago_id: v, banco_id: "", caja_id: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar medio" />
                </SelectTrigger>
                <SelectContent>
                  {mediosPago.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mediosPago.find(m => m.id === formData.medio_pago_id)?.requiere_banco && (
              <div className="space-y-2">
                <Label>Banco *</Label>
                <Select value={formData.banco_id} onValueChange={(v) => setFormData({ ...formData, banco_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {bancos.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.nombre} (Saldo: ${b.saldo_actual?.toLocaleString() || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {mediosPago.find(m => m.id === formData.medio_pago_id)?.requiere_caja && (
              <div className="space-y-2">
                <Label>Caja *</Label>
                <Select value={formData.caja_id} onValueChange={(v) => setFormData({ ...formData, caja_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar caja" />
                  </SelectTrigger>
                  <SelectContent>
                    {cajas.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre} (Saldo: ${c.saldo_actual?.toLocaleString() || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Input
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  placeholder="Nombre del proveedor"
                />
              </div>
              <div className="space-y-2">
                <Label>Número de Factura</Label>
                <Input
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  placeholder="Número de factura"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
                />
                <Label className="cursor-pointer">Gasto recurrente</Label>
              </div>
              {formData.is_recurring && (
                <Select value={formData.recurring_frequency} onValueChange={(v) => setFormData({ ...formData, recurring_frequency: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Frecuencia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensual">Mensual</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Comprobante</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  onChange={(e) => e.target.files[0] && uploadReceipt(e.target.files[0])}
                  accept="image/*,application/pdf"
                />
                {formData.receipt_url && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => window.open(formData.receipt_url, '_blank')}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionales"
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={createMutation.isPending || updateMutation.isPending}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : (editingExpense ? 'Actualizar' : 'Crear')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}