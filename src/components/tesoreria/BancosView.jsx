import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Plus, MoreVertical, Edit, Trash2, Building2, Wallet, History, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/components/utils/formatCurrency";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function BancosView() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanco, setEditingBanco] = useState(null);
  const [formData, setFormData] = useState({ nombre: "", tipo: "BANCO" });
  const [historialBanco, setHistorialBanco] = useState(null);

  const queryClient = useQueryClient();

  const { data: bancos = [] } = useQuery({
    queryKey: ['bancos'],
    queryFn: () => base44.entities.Banco.list()
  });

  const { data: gastos = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date', 1000)
  });

  const { data: ventas = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-created_date', 1000)
  });

  const { data: compras = [] } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => base44.entities.Compra.list('-fecha', 1000)
  });

  const { data: presupuestos = [] } = useQuery({
    queryKey: ['presupuestos'],
    queryFn: () => base44.entities.Presupuesto.list('-created_date', 1000)
  });

  const { data: mediosPago = [] } = useQuery({
    queryKey: ['mediosPago'],
    queryFn: () => base44.entities.MedioPago.list()
  });

  const getMovimientosBanco = (bancoId) => {
    const movimientos = [];

    // Gastos con este banco
    gastos.forEach(g => {
      if (g.banco_id === bancoId) {
        const medio = mediosPago.find(m => m.id === g.medio_pago_id);
        movimientos.push({
          id: `gasto-${g.id}`,
          fecha: g.date,
          tipo: 'EGRESO',
          importe: g.amount,
          descripcion: g.description || 'Gasto',
          categoria: medio?.categoria || 'TRANSFERENCIA',
          medio_pago: g.medio_pago_nombre
        });
      }
    });

    // Compras
    compras.forEach(c => {
      movimientos.push({
        id: `compra-${c.id}`,
        fecha: c.fecha,
        tipo: 'EGRESO',
        importe: c.total,
        descripcion: `Compra a ${c.proveedor_nombre || 'Proveedor'}`,
        categoria: 'TRANSFERENCIA',
        medio_pago: 'Compra'
      });
    });

    // Presupuestos aprobados
    presupuestos.filter(p => p.estado === "aprobado" || p.estado === "confirmado").forEach(p => {
      movimientos.push({
        id: `presupuesto-${p.id}`,
        fecha: p.created_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        tipo: 'INGRESO',
        importe: p.total,
        descripcion: `Presupuesto para ${p.cliente_nombre || 'Cliente'}`,
        categoria: 'TRANSFERENCIA',
        medio_pago: 'Presupuesto'
      });
    });

    return movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Banco.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      handleCloseDialog();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Banco.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      handleCloseDialog();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Banco.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bancos'] })
  });

  const handleOpenDialog = (banco = null) => {
    if (banco) {
      setEditingBanco(banco);
      setFormData({ nombre: banco.nombre || "", tipo: banco.tipo || "BANCO" });
    } else {
      setEditingBanco(null);
      setFormData({ nombre: "", tipo: "BANCO" });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingBanco(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...formData, saldo_actual: 0, is_active: true };

    if (editingBanco) {
      updateMutation.mutate({ id: editingBanco.id, data: formData });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Bancos y Billeteras</h3>
        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Banco
        </Button>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bancos.map((banco) => (
              <TableRow key={banco.id} className="hover:bg-slate-50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      {banco.tipo === "BANCO" ? (
                        <Building2 className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Wallet className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <span className="font-medium">{banco.nombre}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={banco.tipo === "BANCO" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}>
                    {banco.tipo}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-bold text-lg text-blue-600">
                    {formatCurrency(banco.saldo_actual || 0)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setHistorialBanco(banco)}>
                        <History className="h-4 w-4 mr-2" />
                        Ver Movimientos
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenDialog(banco)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => deleteMutation.mutate(banco.id)} className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {bancos.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                  No hay bancos registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBanco ? 'Editar Banco' : 'Nuevo Banco'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Banco Nación"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANCO">Banco</SelectItem>
                  <SelectItem value="BILLETERA">Billetera Digital</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingBanco ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historialBanco} onOpenChange={() => setHistorialBanco(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-600" />
              Historial de Movimientos - {historialBanco?.nombre}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">Saldo Actual</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(historialBanco?.saldo_actual || 0)}
                </p>
              </div>
            </div>
            <div className="overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Medio</TableHead>
                    <TableHead className="text-right">Tipo</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historialBanco && getMovimientosBanco(historialBanco.id).map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell className="text-sm">
                        {mov.fecha ? format(new Date(mov.fecha), 'dd/MM/yyyy', { locale: es }) : '-'}
                      </TableCell>
                      <TableCell className="text-sm">{mov.descripcion}</TableCell>
                      <TableCell className="text-sm">
                        <Badge variant="outline" className="text-xs">
                          {mov.medio_pago}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {mov.tipo === 'INGRESO' ? (
                          <Badge className="bg-green-100 text-green-700">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Ingreso
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">
                            <TrendingDown className="h-3 w-3 mr-1" />
                            Egreso
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold ${mov.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                          {mov.tipo === 'INGRESO' ? '+' : '-'}{formatCurrency(mov.importe)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {historialBanco && getMovimientosBanco(historialBanco.id).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        No hay movimientos registrados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setHistorialBanco(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}