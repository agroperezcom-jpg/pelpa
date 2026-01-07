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
import { Plus, MoreVertical, Edit, Trash2, Wallet, Building2, Users, Package } from "lucide-react";

const TIPO_ICONS = {
  caja: Wallet,
  banco: Building2,
  cliente: Users,
  proveedor: Package
};

const TIPO_COLORS = {
  caja: "bg-green-100 text-green-700",
  banco: "bg-blue-100 text-blue-700",
  cliente: "bg-purple-100 text-purple-700",
  proveedor: "bg-amber-100 text-amber-700"
};

export default function CuentasView() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    tipo: "caja",
    saldo: "0",
    cliente_id: "",
    moneda: "ARS"
  });

  const queryClient = useQueryClient();

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Account.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      handleCloseDialog();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Account.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      handleCloseDialog();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Account.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] })
  });

  const handleOpenDialog = (account = null) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        nombre: account.nombre || "",
        tipo: account.tipo || "caja",
        saldo: account.saldo?.toString() || "0",
        cliente_id: account.cliente_id || "",
        moneda: account.moneda || "ARS"
      });
    } else {
      setEditingAccount(null);
      setFormData({
        nombre: "",
        tipo: "caja",
        saldo: "0",
        cliente_id: "",
        moneda: "ARS"
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAccount(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const client = clients.find(c => c.id === formData.cliente_id);
    const data = {
      ...formData,
      cliente_nombre: client?.name || "",
      saldo: parseFloat(formData.saldo) || 0,
      is_active: true
    };

    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Cuentas</h3>
        <Button onClick={() => handleOpenDialog()} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Cuenta
        </Button>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Cuenta</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => {
              const Icon = TIPO_ICONS[account.tipo];
              return (
                <TableRow key={account.id} className="hover:bg-slate-50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Icon className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-medium">{account.nombre}</p>
                        {account.cliente_nombre && (
                          <p className="text-xs text-slate-500">{account.cliente_nombre}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={TIPO_COLORS[account.tipo]}>
                      {account.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    ${account.saldo?.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(account)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteMutation.mutate(account.id)} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {accounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                  No hay cuentas registradas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Nombre de la cuenta"
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
                  <SelectItem value="caja">Caja</SelectItem>
                  <SelectItem value="banco">Banco</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="proveedor">Proveedor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.tipo === 'cliente' && (
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={formData.cliente_id} onValueChange={(v) => setFormData({ ...formData, cliente_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Saldo Inicial</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.saldo}
                onChange={(e) => setFormData({ ...formData, saldo: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                {editingAccount ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}