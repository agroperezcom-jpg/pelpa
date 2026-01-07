import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Plus, MoreVertical, Edit, Trash2, CreditCard, Check, X } from "lucide-react";

export default function MediosPagoView() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMedio, setEditingMedio] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    tipo: "INMEDIATO",
    requiere_banco: false,
    requiere_caja: false
  });

  const queryClient = useQueryClient();

  const { data: medios = [] } = useQuery({
    queryKey: ['mediosPago'],
    queryFn: () => base44.entities.MedioPago.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MedioPago.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediosPago'] });
      handleCloseDialog();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MedioPago.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediosPago'] });
      handleCloseDialog();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MedioPago.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mediosPago'] })
  });

  const handleOpenDialog = (medio = null) => {
    if (medio) {
      setEditingMedio(medio);
      setFormData({
        nombre: medio.nombre || "",
        tipo: medio.tipo || "INMEDIATO",
        requiere_banco: medio.requiere_banco || false,
        requiere_caja: medio.requiere_caja || false
      });
    } else {
      setEditingMedio(null);
      setFormData({
        nombre: "",
        tipo: "INMEDIATO",
        requiere_banco: false,
        requiere_caja: false
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingMedio(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...formData, is_active: true };

    if (editingMedio) {
      updateMutation.mutate({ id: editingMedio.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Medios de Pago</h3>
        <Button onClick={() => handleOpenDialog()} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Medio
        </Button>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-center">Banco</TableHead>
              <TableHead className="text-center">Caja</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {medios.map((medio) => (
              <TableRow key={medio.id} className="hover:bg-slate-50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-purple-600" />
                    </div>
                    <span className="font-medium">{medio.nombre}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={medio.tipo === "INMEDIATO" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                    {medio.tipo}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {medio.requiere_banco ? (
                    <Check className="h-5 w-5 text-green-600 mx-auto" />
                  ) : (
                    <X className="h-5 w-5 text-slate-300 mx-auto" />
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {medio.requiere_caja ? (
                    <Check className="h-5 w-5 text-green-600 mx-auto" />
                  ) : (
                    <X className="h-5 w-5 text-slate-300 mx-auto" />
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
                      <DropdownMenuItem onClick={() => handleOpenDialog(medio)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => deleteMutation.mutate(medio.id)} className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {medios.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  No hay medios de pago registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMedio ? 'Editar Medio de Pago' : 'Nuevo Medio de Pago'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Efectivo, Débito, Crédito"
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
                  <SelectItem value="INMEDIATO">Inmediato</SelectItem>
                  <SelectItem value="DIFERIDO">Diferido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Requiere Banco</Label>
              <Switch
                checked={formData.requiere_banco}
                onCheckedChange={(v) => setFormData({ ...formData, requiere_banco: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Requiere Caja</Label>
              <Switch
                checked={formData.requiere_caja}
                onCheckedChange={(v) => setFormData({ ...formData, requiere_caja: v })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                {editingMedio ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}