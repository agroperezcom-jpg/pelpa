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
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowRightLeft,
  DollarSign,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const TIPO_CONFIG = {
  ingreso: { label: "Ingreso", icon: ArrowUpCircle, color: "bg-green-100 text-green-700" },
  egreso: { label: "Egreso", icon: ArrowDownCircle, color: "bg-red-100 text-red-700" },
  transferencia: { label: "Transferencia", icon: ArrowRightLeft, color: "bg-blue-100 text-blue-700" },
  cobro: { label: "Cobro", icon: DollarSign, color: "bg-emerald-100 text-emerald-700" },
  pago: { label: "Pago", icon: DollarSign, color: "bg-orange-100 text-orange-700" }
};

export default function MovimientosView() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [formData, setFormData] = useState({
    tipo: "ingreso",
    fecha: new Date().toISOString().split('T')[0],
    monto: "",
    cuenta_origen_id: "",
    cuenta_destino_id: "",
    concepto: "",
    comprobante: "",
    notas: ""
  });

  const queryClient = useQueryClient();

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-created_date', 100)
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: cobros = [] } = useQuery({
    queryKey: ['cobros'],
    queryFn: () => base44.entities.Cobro.list()
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const cuentaOrigen = accounts.find(a => a.id === data.cuenta_origen_id);
      const cuentaDestino = accounts.find(a => a.id === data.cuenta_destino_id);

      if (data.tipo === 'egreso' && cuentaOrigen) {
        await base44.entities.Account.update(cuentaOrigen.id, {
          saldo: cuentaOrigen.saldo - data.monto
        });
      } else if (data.tipo === 'ingreso' && cuentaDestino) {
        await base44.entities.Account.update(cuentaDestino.id, {
          saldo: cuentaDestino.saldo + data.monto
        });
      } else if (data.tipo === 'transferencia') {
        if (cuentaOrigen) {
          await base44.entities.Account.update(cuentaOrigen.id, {
            saldo: cuentaOrigen.saldo - data.monto
          });
        }
        if (cuentaDestino) {
          await base44.entities.Account.update(cuentaDestino.id, {
            saldo: cuentaDestino.saldo + data.monto
          });
        }
      }

      return base44.entities.Transaction.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      handleCloseDialog();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (transaction) => {
      // LÓGICA DE REVERSIÓN EN CASCADA
      
      // 1. Si es un cobro, borrar el cobro original
      if (transaction.tipo === 'cobro' && transaction.referencia_cobro_id) {
        const cobro = cobros.find(c => c.id === transaction.referencia_cobro_id);
        
        if (cobro) {
          // 2. Revertir cuenta corriente del cliente
          if (cobro.cliente_id && cobro.aplicado_a_deuda && cobro.monto_aplicado > 0) {
            const cuentaCliente = accounts.find(a => 
              a.tipo === 'cliente' && a.cliente_id === cobro.cliente_id
            );
            
            if (cuentaCliente) {
              // Volver a sumar la deuda que se había cobrado
              await base44.entities.Account.update(cuentaCliente.id, {
                saldo: cuentaCliente.saldo + cobro.monto_aplicado
              });
            }

            // 3. Actualizar el cliente (total_purchases refleja deuda)
            const client = clients.find(c => c.id === cobro.cliente_id);
            if (client) {
              await base44.entities.Client.update(client.id, {
                total_purchases: (client.total_purchases || 0) + cobro.monto_aplicado
              });
            }
          }

          // 4. Revertir saldo de cuenta destino
          if (cobro.cuenta_destino_id) {
            const cuentaDestino = accounts.find(a => a.id === cobro.cuenta_destino_id);
            if (cuentaDestino) {
              await base44.entities.Account.update(cuentaDestino.id, {
                saldo: cuentaDestino.saldo - cobro.monto
              });
            }
          }

          // 5. Borrar el cobro
          await base44.entities.Cobro.delete(cobro.id);
        }
      } else {
        // Reversión normal para movimientos que no son cobros
        const cuentaOrigen = accounts.find(a => a.id === transaction.cuenta_origen_id);
        const cuentaDestino = accounts.find(a => a.id === transaction.cuenta_destino_id);

        if (transaction.tipo === 'egreso' && cuentaOrigen) {
          await base44.entities.Account.update(cuentaOrigen.id, {
            saldo: cuentaOrigen.saldo + transaction.monto
          });
        } else if (transaction.tipo === 'ingreso' && cuentaDestino) {
          await base44.entities.Account.update(cuentaDestino.id, {
            saldo: cuentaDestino.saldo - transaction.monto
          });
        } else if (transaction.tipo === 'transferencia') {
          if (cuentaOrigen) {
            await base44.entities.Account.update(cuentaOrigen.id, {
              saldo: cuentaOrigen.saldo + transaction.monto
            });
          }
          if (cuentaDestino) {
            await base44.entities.Account.update(cuentaDestino.id, {
              saldo: cuentaDestino.saldo - transaction.monto
            });
          }
        }
      }

      // 6. Finalmente borrar el movimiento interno
      return base44.entities.Transaction.delete(transaction.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cobros'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    }
  });

  const handleOpenDialog = (transaction = null) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setFormData({
        tipo: transaction.tipo || "ingreso",
        fecha: transaction.fecha || new Date().toISOString().split('T')[0],
        monto: transaction.monto?.toString() || "",
        cuenta_origen_id: transaction.cuenta_origen_id || "",
        cuenta_destino_id: transaction.cuenta_destino_id || "",
        concepto: transaction.concepto || "",
        comprobante: transaction.comprobante || "",
        notas: transaction.notas || ""
      });
    } else {
      setEditingTransaction(null);
      setFormData({
        tipo: "ingreso",
        fecha: new Date().toISOString().split('T')[0],
        monto: "",
        cuenta_origen_id: "",
        cuenta_destino_id: "",
        concepto: "",
        comprobante: "",
        notas: ""
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTransaction(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cuentaOrigen = accounts.find(a => a.id === formData.cuenta_origen_id);
    const cuentaDestino = accounts.find(a => a.id === formData.cuenta_destino_id);

    const data = {
      ...formData,
      cuenta_origen_nombre: cuentaOrigen?.nombre || "",
      cuenta_destino_nombre: cuentaDestino?.nombre || "",
      monto: parseFloat(formData.monto) || 0
    };

    createMutation.mutate(data);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Movimientos Internos</h3>
        <Button onClick={() => handleOpenDialog()} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Movimiento
        </Button>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const config = TIPO_CONFIG[transaction.tipo];
              const Icon = config?.icon || DollarSign;
              const esCobro = transaction.tipo === 'cobro' && transaction.referencia_cobro_id;
              
              return (
                <TableRow key={transaction.id} className="hover:bg-slate-50">
                  <TableCell className="text-sm text-slate-500">
                    {format(new Date(transaction.fecha), "d MMM yyyy", { locale: es })}
                  </TableCell>
                  <TableCell>
                    <Badge className={config?.color}>
                      <Icon className="h-3 w-3 mr-1" />
                      {config?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{transaction.concepto}</p>
                      {transaction.comprobante && (
                        <p className="text-xs text-slate-400">#{transaction.comprobante}</p>
                      )}
                      {esCobro && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs mt-1">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Vinculado a cobro
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {transaction.cuenta_origen_nombre || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {transaction.cuenta_destino_nombre || '-'}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    ${transaction.monto?.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => deleteMutation.mutate(transaction)} 
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar {esCobro && '(revierte cobro)'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No hay movimientos registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Movimiento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ingreso">Ingreso</SelectItem>
                    <SelectItem value="egreso">Egreso</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  required
                />
              </div>
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
            {(formData.tipo === 'egreso' || formData.tipo === 'transferencia') && (
              <div className="space-y-2">
                <Label>Cuenta Origen *</Label>
                <Select value={formData.cuenta_origen_id} onValueChange={(v) => setFormData({ ...formData, cuenta_origen_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.nombre} (${a.saldo})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(formData.tipo === 'ingreso' || formData.tipo === 'transferencia') && (
              <div className="space-y-2">
                <Label>Cuenta Destino *</Label>
                <Select value={formData.cuenta_destino_id} onValueChange={(v) => setFormData({ ...formData, cuenta_destino_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.nombre} (${a.saldo})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Concepto *</Label>
              <Input
                value={formData.concepto}
                onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                placeholder="Descripción del movimiento"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Comprobante</Label>
              <Input
                value={formData.comprobante}
                onChange={(e) => setFormData({ ...formData, comprobante: e.target.value })}
                placeholder="Número de comprobante"
              />
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
                Crear
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}