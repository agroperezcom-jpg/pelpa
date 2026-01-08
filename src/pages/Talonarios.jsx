import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
  FileText,
  Plus,
  Edit,
  Power,
  PowerOff,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

export default function Talonarios() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTalonario, setEditingTalonario] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    tipo_comprobante: "X",
    prefijo: "",
    numero_desde: 1,
    numero_hasta: "",
    permite_reutilizar: false,
    activo: true
  });

  const queryClient = useQueryClient();

  const { data: talonarios = [] } = useQuery({
    queryKey: ['talonarios'],
    queryFn: () => base44.entities.Talonario.list()
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-created_date', 500)
  });

  const createTalonarioMutation = useMutation({
    mutationFn: async (data) => {
      if (!data.nombre || !data.prefijo || !data.numero_desde) {
        throw new Error("Complete todos los campos obligatorios");
      }

      return await base44.entities.Talonario.create({
        ...data,
        ultimo_numero_usado: data.numero_desde - 1,
        numeros_liberados: []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talonarios'] });
      handleCloseDialog();
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const updateTalonarioMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.Talonario.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talonarios'] });
      handleCloseDialog();
    }
  });

  const toggleActivoMutation = useMutation({
    mutationFn: async ({ id, activo }) => {
      return await base44.entities.Talonario.update(id, { activo: !activo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talonarios'] });
    }
  });

  const handleOpenDialog = (talonario = null) => {
    if (talonario) {
      setEditingTalonario(talonario);
      setFormData({
        nombre: talonario.nombre,
        tipo_comprobante: talonario.tipo_comprobante,
        prefijo: talonario.prefijo,
        numero_desde: talonario.numero_desde,
        numero_hasta: talonario.numero_hasta || "",
        permite_reutilizar: talonario.permite_reutilizar,
        activo: talonario.activo
      });
    } else {
      setEditingTalonario(null);
      setFormData({
        nombre: "",
        tipo_comprobante: "X",
        prefijo: "",
        numero_desde: 1,
        numero_hasta: "",
        permite_reutilizar: false,
        activo: true
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTalonario(null);
  };

  const handleSubmit = () => {
    if (editingTalonario) {
      updateTalonarioMutation.mutate({
        id: editingTalonario.id,
        data: formData
      });
    } else {
      createTalonarioMutation.mutate(formData);
    }
  };

  const getVentasPorTalonario = (talonarioId) => {
    return sales.filter(s => s.talonario_id === talonarioId && s.estado === "CONFIRMADA").length;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Talonarios
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestión de numeración de comprobantes
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Talonario
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Talonarios Totales</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{talonarios.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Activos</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {talonarios.filter(t => t.activo).length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Ticket X</p>
            <p className="text-2xl font-bold text-slate-600 mt-1">
              {talonarios.filter(t => t.tipo_comprobante === "X").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Factura B</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {talonarios.filter(t => t.tipo_comprobante === "B").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Talonario</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Rango</TableHead>
              <TableHead>Último Usado</TableHead>
              <TableHead>Próximo</TableHead>
              <TableHead>Ventas</TableHead>
              <TableHead>Opciones</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {talonarios.map((talonario) => {
              const disponibles = talonario.numero_hasta 
                ? talonario.numero_hasta - talonario.ultimo_numero_usado
                : "∞";
              const proximo = talonario.ultimo_numero_usado + 1;
              const ventasEmitidas = getVentasPorTalonario(talonario.id);

              return (
                <TableRow key={talonario.id} className="hover:bg-slate-50">
                  <TableCell>
                    <div>
                      <p className="font-medium">{talonario.nombre}</p>
                      <p className="text-xs text-slate-500">{talonario.prefijo}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      talonario.tipo_comprobante === "B" 
                        ? "bg-blue-100 text-blue-700" 
                        : "bg-slate-100 text-slate-700"
                    }>
                      {talonario.tipo_comprobante === "B" ? "Factura B" : "Ticket X"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {talonario.numero_desde} - {talonario.numero_hasta || "∞"}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {talonario.prefijo}-{String(talonario.ultimo_numero_usado).padStart(6, '0')}
                  </TableCell>
                  <TableCell className="font-mono font-bold text-sm text-blue-600">
                    {talonario.prefijo}-{String(proximo).padStart(6, '0')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{ventasEmitidas}</Badge>
                      {typeof disponibles === 'number' && disponibles < 100 && (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs">
                      {talonario.permite_reutilizar ? (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Reutiliza
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-600">
                          No reutiliza
                        </Badge>
                      )}
                      {talonario.numeros_liberados?.length > 0 && (
                        <Badge className="bg-amber-100 text-amber-700">
                          {talonario.numeros_liberados.length} liberados
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {talonario.activo ? (
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Activo
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(talonario)}
                      >
                        <Edit className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActivoMutation.mutate({ 
                          id: talonario.id, 
                          activo: talonario.activo 
                        })}
                      >
                        {talonario.activo ? (
                          <PowerOff className="h-4 w-4 text-red-500" />
                        ) : (
                          <Power className="h-4 w-4 text-green-500" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {talonarios.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                  No hay talonarios registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTalonario ? "Editar Talonario" : "Nuevo Talonario"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Talonario Principal X"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Comprobante *</Label>
                <Select 
                  value={formData.tipo_comprobante}
                  onValueChange={(v) => setFormData({ ...formData, tipo_comprobante: v })}
                  disabled={!!editingTalonario}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="X">Ticket X (Sin IVA)</SelectItem>
                    <SelectItem value="B">Factura B (Con IVA)</SelectItem>
                    <SelectItem value="A">Factura A</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prefijo *</Label>
                <Input
                  value={formData.prefijo}
                  onChange={(e) => setFormData({ ...formData, prefijo: e.target.value.toUpperCase() })}
                  placeholder="X, B, FAC"
                  disabled={!!editingTalonario}
                />
              </div>

              <div className="space-y-2">
                <Label>Número Desde *</Label>
                <Input
                  type="number"
                  value={formData.numero_desde}
                  onChange={(e) => setFormData({ ...formData, numero_desde: parseInt(e.target.value) || 1 })}
                  disabled={!!editingTalonario}
                />
              </div>

              <div className="space-y-2">
                <Label>Número Hasta (opcional)</Label>
                <Input
                  type="number"
                  value={formData.numero_hasta}
                  onChange={(e) => setFormData({ ...formData, numero_hasta: parseInt(e.target.value) || "" })}
                  placeholder="Dejar vacío para ilimitado"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.permite_reutilizar}
                  onChange={(e) => setFormData({ ...formData, permite_reutilizar: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Permite reutilizar números de ventas anuladas</span>
              </label>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs text-blue-900 font-medium mb-2">Vista previa:</p>
              <p className="font-mono text-lg font-bold text-blue-600">
                {formData.prefijo || "PREFIJO"}-{String(formData.numero_desde || 1).padStart(6, '0')}
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-900">
                ⚠️ Una vez creado el talonario, no se puede modificar el prefijo ni el número inicial.
                La numeración es correlativa y automática.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
              {editingTalonario ? "Actualizar" : "Crear Talonario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}