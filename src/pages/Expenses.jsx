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

const CATEGORIES = [
  { value: "renta", label: "Renta" },
  { value: "servicios", label: "Servicios (Luz, Agua, Internet)" },
  { value: "salarios", label: "Salarios y Nómina" },
  { value: "marketing", label: "Marketing y Publicidad" },
  { value: "suministros", label: "Suministros de Oficina" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "transporte", label: "Transporte" },
  { value: "impuestos", label: "Impuestos" },
  { value: "seguros", label: "Seguros" },
  { value: "tecnologia", label: "Tecnología y Software" },
  { value: "capacitacion", label: "Capacitación" },
  { value: "profesionales", label: "Servicios Profesionales" },
  { value: "otros", label: "Otros" }
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

const categoryColors = {
  renta: "bg-blue-100 text-blue-700",
  servicios: "bg-emerald-100 text-emerald-700",
  salarios: "bg-violet-100 text-violet-700",
  marketing: "bg-pink-100 text-pink-700",
  suministros: "bg-amber-100 text-amber-700",
  mantenimiento: "bg-cyan-100 text-cyan-700",
  transporte: "bg-orange-100 text-orange-700",
  impuestos: "bg-red-100 text-red-700",
  seguros: "bg-indigo-100 text-indigo-700",
  tecnologia: "bg-purple-100 text-purple-700",
  capacitacion: "bg-lime-100 text-lime-700",
  profesionales: "bg-teal-100 text-teal-700",
  otros: "bg-slate-100 text-slate-700"
};

export default function Expenses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState(format(new Date(), 'yyyy-MM'));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    description: "",
    category: "otros",
    amount: "",
    date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: "efectivo",
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

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const expense = await base44.entities.Expense.create(data);
      
      // Buscar medio de pago "Efectivo" o el primero disponible
      const medioEfectivo = mediosPago.find(m => m.nombre?.toLowerCase().includes('efectivo')) || mediosPago[0];
      
      if (medioEfectivo) {
        // Crear movimiento de tesorería como egreso
        await base44.entities.MovimientoTesoreria.create({
          fecha: data.date,
          tipo: "EGRESO",
          medio_pago_id: medioEfectivo.id,
          medio_pago_nombre: medioEfectivo.nombre,
          banco_id: null,
          banco_nombre: "",
          caja_id: null,
          caja_nombre: "",
          importe: data.amount,
          referencia_tipo: "gasto",
          observaciones: `Gasto: ${data.description} (${CATEGORIES.find(c => c.value === data.category)?.label || data.category})`
        });
      }
      
      return expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['movimientosTesoreria'] });
      handleCloseDialog();
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
      // Buscar el gasto primero para obtener la descripción
      const gasto = expenses.find(e => e.id === id);
      
      // Buscar y eliminar el movimiento de tesorería asociado
      const movimientos = await base44.entities.MovimientoTesoreria.list();
      const relacionado = movimientos.find(m => 
        m.referencia_tipo === "gasto" && 
        m.observaciones?.includes(gasto?.description)
      );
      
      if (relacionado) {
        await base44.entities.MovimientoTesoreria.delete(relacionado.id);
      }
      
      await base44.entities.Expense.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['movimientosTesoreria'] });
    }
  });

  const handleOpenDialog = (expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        description: expense.description || "",
        category: expense.category || "otros",
        amount: expense.amount?.toString() || "",
        date: expense.date || format(new Date(), 'yyyy-MM-dd'),
        payment_method: expense.payment_method || "efectivo",
        vendor: expense.vendor || "",
        invoice_number: expense.invoice_number || "",
        is_recurring: expense.is_recurring || false,
        recurring_frequency: expense.recurring_frequency || "",
        notes: expense.notes || "",
        receipt_url: expense.receipt_url || ""
      });
    } else {
      setEditingExpense(null);
      setFormData({
        description: "",
        category: "otros",
        amount: "",
        date: format(new Date(), 'yyyy-MM-dd'),
        payment_method: "efectivo",
        vendor: "",
        invoice_number: "",
        is_recurring: false,
        recurring_frequency: "",
        notes: "",
        receipt_url: ""
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingExpense(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
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
    const cat = expense.category || 'otros';
    if (!acc[cat]) acc[cat] = 0;
    acc[cat] += expense.amount || 0;
    return acc;
  }, {});

  const pieData = Object.entries(categoryData).map(([name, value]) => ({
    name: CATEGORIES.find(c => c.value === name)?.label || name,
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
    const headers = ["Fecha", "Descripción", "Categoría", "Monto", "Proveedor", "Método de Pago"];
    const rows = filteredExpenses.map(e => [
      e.date,
      e.description,
      CATEGORIES.find(c => c.value === e.category)?.label,
      e.amount,
      e.vendor,
      e.payment_method
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
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
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
              <TableHead>Categoría</TableHead>
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
                  <Badge className={categoryColors[expense.category]}>
                    {CATEGORIES.find(c => c.value === expense.category)?.label}
                  </Badge>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                <Label>Método de Pago</Label>
                <Select value={formData.payment_method} onValueChange={(v) => setFormData({ ...formData, payment_method: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700">
                {editingExpense ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}