import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, DollarSign, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function CobrosView() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    cliente_id: "",
    monto: "",
    forma_cobro: "efectivo",
    cuenta_destino_id: "",
    aplicar_a_deuda: false,
    monto_aplicado: "",
    comprobante: "",
    notas: ""
  });

  const queryClient = useQueryClient();

  const { data: cobros = [] } = useQuery({
    queryKey: ['cobros'],
    queryFn: () => base44.entities.Cobro.list('-created_date')
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // 1. Crear el cobro
      const cobro = await base44.entities.Cobro.create(data);

      // 2. Actualizar cuenta destino (donde ingresa el dinero)
      if (data.cuenta_destino_id) {
        const cuenta = accounts.find(a => a.id === data.cuenta_destino_id);
        if (cuenta) {
          await base44.entities.Account.update(cuenta.id, {
            saldo: cuenta.saldo + data.monto
          });
        }
      }

      // 3. Si se aplicó a deuda, actualizar cuenta corriente del cliente
      if (data.aplicado_a_deuda && data.monto_aplicado > 0) {
        const cuentaCliente = accounts.find(a => 
          a.tipo === 'cliente' && a.cliente_id === data.cliente_id
        );
        
        if (cuentaCliente) {
          await base44.entities.Account.update(cuentaCliente.id, {
            saldo: cuentaCliente.saldo - data.monto_aplicado
          });
        }

        // Actualizar deuda del cliente
        const client = clients.find(c => c.id === data.cliente_id);
        if (client) {
          await base44.entities.Client.update(client.id, {
            total_purchases: (client.total_purchases || 0) - data.monto_aplicado
          });
        }
      }

      // 4. Crear movimiento interno vinculado
      const cuentaDestino = accounts.find(a => a.id === data.cuenta_destino_id);
      const client = clients.find(c => c.id === data.cliente_id);

      const movimiento = await base44.entities.Transaction.create({
        tipo: 'cobro',
        fecha: data.fecha,
        monto: data.monto,
        cuenta_destino_id: data.cuenta_destino_id,
        cuenta_destino_nombre: cuentaDestino?.nombre || "",
        cliente_id: data.cliente_id,
        cliente_nombre: client?.name || "",
        concepto: `Cobro - ${data.forma_cobro}${data.aplicado_a_deuda ? ' (Aplicado a deuda)' : ''}`,
        comprobante: data.comprobante,
        referencia_cobro_id: cobro.id,
        notas: data.notas
      });

      // 5. Vincular el movimiento al cobro
      await base44.entities.Cobro.update(cobro.id, {
        movimiento_interno_id: movimiento.id
      });

      return cobro;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cobros'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      handleCloseDialog();
    }
  });

  const handleOpenDialog = () => {
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      cliente_id: "",
      monto: "",
      forma_cobro: "efectivo",
      cuenta_destino_id: "",
      aplicar_a_deuda: false,
      monto_aplicado: "",
      comprobante: "",
      notas: ""
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const client = clients.find(c => c.id === formData.cliente_id);
    const cuenta = accounts.find(a => a.id === formData.cuenta_destino_id);

    const data = {
      ...formData,
      cliente_nombre: client?.name || "",
      cuenta_destino_nombre: cuenta?.nombre || "",
      monto: parseFloat(formData.monto) || 0,
      monto_aplicado: formData.aplicar_a_deuda ? parseFloat(formData.monto_aplicado) || 0 : 0,
      aplicado_a_deuda: formData.aplicar_a_deuda
    };

    createMutation.mutate(data);
  };

  const cuentasDestino = accounts.filter(a => a.tipo === 'caja' || a.tipo === 'banco');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Cobros</h3>
        <Button onClick={handleOpenDialog} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cobro
        </Button>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Forma</TableHead>
              <TableHead>Cuenta Destino</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Aplicado</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cobros.map((cobro) => (
              <TableRow key={cobro.id} className="hover:bg-slate-50">
                <TableCell className="text-sm text-slate-500">
                  {format(new Date(cobro.fecha), "d MMM yyyy", { locale: es })}
                </TableCell>
                <TableCell className="font-medium">{cobro.cliente_nombre}</TableCell>
                <TableCell>
                  <Badge className="bg-blue-100 text-blue-700 capitalize">
                    {cobro.forma_cobro?.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-slate-600">{cobro.cuenta_destino_nombre}</TableCell>
                <TableCell className="text-right font-bold text-emerald-600">
                  ${cobro.monto?.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {cobro.monto_aplicado > 0 ? `$${cobro.monto_aplicado.toLocaleString()}` : '-'}
                </TableCell>
                <TableCell className="text-center">
                  {cobro.aplicado_a_deuda && (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                  )}
                </TableCell>
              </TableRow>
            ))}
            {cobros.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No hay cobros registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              Nuevo Cobro
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
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
            <div className="space-y-2">
              <Label>Cliente *</Label>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Forma de Cobro *</Label>
                <Select value={formData.forma_cobro} onValueChange={(v) => setFormData({ ...formData, forma_cobro: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="cuenta_corriente">Cuenta Corriente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cuenta Destino *</Label>
                <Select value={formData.cuenta_destino_id} onValueChange={(v) => setFormData({ ...formData, cuenta_destino_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {cuentasDestino.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.aplicar_a_deuda}
                  onCheckedChange={(checked) => setFormData({ ...formData, aplicar_a_deuda: checked })}
                />
                <Label className="cursor-pointer">Aplicar a deuda de cuenta corriente</Label>
              </div>
              {formData.aplicar_a_deuda && (
                <div className="space-y-2">
                  <Label>Monto a aplicar</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.monto_aplicado}
                    onChange={(e) => setFormData({ ...formData, monto_aplicado: e.target.value })}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-blue-600">
                    Este monto se descontará de la deuda del cliente
                  </p>
                </div>
              )}
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
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                Registrar Cobro
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}