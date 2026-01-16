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
import { Plus, MoreVertical, Edit, Trash2, Wallet, History, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/components/utils/formatCurrency";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function CajasView() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCaja, setEditingCaja] = useState(null);
  const [formData, setFormData] = useState({ nombre: "" });
  const [historialCaja, setHistorialCaja] = useState(null);

  const queryClient = useQueryClient();

  const { data: cajas = [] } = useQuery({
    queryKey: ['cajas'],
    queryFn: () => base44.entities.Caja.list()
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

  const getMovimientosCaja = (cajaId) => {
    const movimientos = [];

    // Gastos con esta caja
    gastos.forEach(g => {
      if (g.caja_id === cajaId) {
        const medio = mediosPago.find(m => m.id === g.medio_pago_id);
        movimientos.push({
          id: `gasto-${g.id}`,
          fecha: g.date,
          tipo: 'EGRESO',
          importe: g.amount,
          descripcion: g.description || 'Gasto',
          categoria: medio?.categoria || 'EFECTIVO',
          medio_pago: g.medio_pago_nombre
        });
      }
    });

    // Ventas en efectivo (asumiendo que van a caja)
    ventas.filter(v => v.estado === "CONFIRMADA" && v.tipo_venta === "CONTADO").forEach(v => {
      movimientos.push({
        id: `venta-${v.id}`,
        fecha: v.created_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        tipo: 'INGRESO',
        importe: v.total,
        descripcion: `Venta a ${v.client_name || 'Cliente'}`,
        categoria: 'EFECTIVO',
        medio_pago: 'Venta'
      });
    });

    return movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Caja.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cajas'] });
      handleCloseDialog();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Caja.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cajas'] });
      handleCloseDialog();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Caja.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cajas'] })
  });

  const handleOpenDialog = (caja = null) => {
    if (caja) {
      setEditingCaja(caja);
      setFormData({ nombre: caja.nombre || "" });
    } else {
      setEditingCaja(null);
      setFormData({ nombre: "" });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCaja(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...formData, saldo_actual: 0, is_active: true };

    if (editingCaja) {
      updateMutation.mutate({ id: editingCaja.id, data: { nombre: formData.nombre } });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Cajas</h3>
        <Button onClick={() => handleOpenDialog()} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Caja
        </Button>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Nombre</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cajas.map((caja) => (
              <TableRow key={caja.id} className="hover:bg-slate-50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Wallet className="h-5 w-5 text-emerald-600" />
                    </div>
                    <span className="font-medium">{caja.nombre}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-bold text-lg text-emerald-600">
                    {formatCurrency(caja.saldo_actual || 0)}
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
                      <DropdownMenuItem onClick={() => setHistorialCaja(caja)}>
                        <History className="h-4 w-4 mr-2" />
                        Ver Movimientos
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenDialog(caja)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => deleteMutation.mutate(caja.id)} className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {cajas.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                  No hay cajas registradas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCaja ? 'Editar Caja' : 'Nueva Caja'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Caja Principal"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                {editingCaja ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historialCaja} onOpenChange={() => setHistorialCaja(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-emerald-600" />
              Historial de Movimientos - {historialCaja?.nombre}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 p-4 bg-emerald-50 rounded-lg">
                <p className="text-sm text-emerald-700">Saldo Actual</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(historialCaja?.saldo_actual || 0)}
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
                  {historialCaja && getMovimientosCaja(historialCaja.id).map((mov) => (
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
                  {historialCaja && getMovimientosCaja(historialCaja.id).length === 0 && (
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
            <Button onClick={() => setHistorialCaja(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}