import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, MoreVertical, Edit, Trash2, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const ESTADO_COLORS = {
  pendiente: "bg-amber-100 text-amber-700",
  cobrado: "bg-green-100 text-green-700",
  depositado: "bg-blue-100 text-blue-700",
  rechazado: "bg-red-100 text-red-700",
  anulado: "bg-slate-100 text-slate-700"
};

export default function ChequesView() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCheck, setEditingCheck] = useState(null);
  const [formData, setFormData] = useState({
    numero: "",
    tipo: "recibido",
    banco: "",
    monto: "",
    fecha_emision: new Date().toISOString().split('T')[0],
    fecha_pago: "",
    estado: "pendiente",
    librador: "",
    beneficiario: "",
    cliente_id: "",
    notas: ""
  });

  const queryClient = useQueryClient();

  const { data: checks = [] } = useQuery({
    queryKey: ['checks'],
    queryFn: () => base44.entities.Check.list('-created_date')
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Check.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checks'] });
      handleCloseDialog();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Check.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checks'] });
      handleCloseDialog();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Check.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checks'] })
  });

  const handleOpenDialog = (check = null) => {
    if (check) {
      setEditingCheck(check);
      setFormData({
        numero: check.numero || "",
        tipo: check.tipo || "recibido",
        banco: check.banco || "",
        monto: check.monto?.toString() || "",
        fecha_emision: check.fecha_emision || new Date().toISOString().split('T')[0],
        fecha_pago: check.fecha_pago || "",
        estado: check.estado || "pendiente",
        librador: check.librador || "",
        beneficiario: check.beneficiario || "",
        cliente_id: check.cliente_id || "",
        notas: check.notas || ""
      });
    } else {
      setEditingCheck(null);
      setFormData({
        numero: "",
        tipo: "recibido",
        banco: "",
        monto: "",
        fecha_emision: new Date().toISOString().split('T')[0],
        fecha_pago: "",
        estado: "pendiente",
        librador: "",
        beneficiario: "",
        cliente_id: "",
        notas: ""
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCheck(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const client = clients.find(c => c.id === formData.cliente_id);
    const data = {
      ...formData,
      cliente_nombre: client?.name || "",
      monto: parseFloat(formData.monto) || 0
    };

    if (editingCheck) {
      updateMutation.mutate({ id: editingCheck.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Cheques</h3>
        <Button onClick={() => handleOpenDialog()} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cheque
        </Button>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Número</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Banco</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>F. Emisión</TableHead>
              <TableHead>F. Pago</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {checks.map((check) => (
              <TableRow key={check.id} className="hover:bg-slate-50">
                <TableCell className="font-medium">{check.numero}</TableCell>
                <TableCell>
                  <Badge className={check.tipo === 'emitido' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                    {check.tipo}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{check.banco}</TableCell>
                <TableCell className="font-bold">${check.monto?.toLocaleString()}</TableCell>
                <TableCell className="text-sm text-slate-500">
                  {format(new Date(check.fecha_emision), "d MMM yy", { locale: es })}
                </TableCell>
                <TableCell className="text-sm text-slate-500">
                  {check.fecha_pago ? format(new Date(check.fecha_pago), "d MMM yy", { locale: es }) : '-'}
                </TableCell>
                <TableCell>
                  <Badge className={ESTADO_COLORS[check.estado]}>
                    {check.estado}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenDialog(check)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => deleteMutation.mutate(check.id)} className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {checks.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                  No hay cheques registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCheck ? 'Editar Cheque' : 'Nuevo Cheque'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número *</Label>
                <Input
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  placeholder="Número de cheque"
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
                    <SelectItem value="recibido">Recibido</SelectItem>
                    <SelectItem value="emitido">Emitido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Banco *</Label>
                <Input
                  value={formData.banco}
                  onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                  placeholder="Nombre del banco"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Monto *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Emisión *</Label>
                <Input
                  type="date"
                  value={formData.fecha_emision}
                  onChange={(e) => setFormData({ ...formData, fecha_emision: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Pago</Label>
                <Input
                  type="date"
                  value={formData.fecha_pago}
                  onChange={(e) => setFormData({ ...formData, fecha_pago: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Librador</Label>
                <Input
                  value={formData.librador}
                  onChange={(e) => setFormData({ ...formData, librador: e.target.value })}
                  placeholder="Quien emite"
                />
              </div>
              <div className="space-y-2">
                <Label>Beneficiario</Label>
                <Input
                  value={formData.beneficiario}
                  onChange={(e) => setFormData({ ...formData, beneficiario: e.target.value })}
                  placeholder="A favor de"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={formData.estado} onValueChange={(v) => setFormData({ ...formData, estado: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="cobrado">Cobrado</SelectItem>
                    <SelectItem value="depositado">Depositado</SelectItem>
                    <SelectItem value="rechazado">Rechazado</SelectItem>
                    <SelectItem value="anulado">Anulado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={formData.cliente_id} onValueChange={(v) => setFormData({ ...formData, cliente_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Sin cliente</SelectItem>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Notas adicionales"
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                {editingCheck ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}