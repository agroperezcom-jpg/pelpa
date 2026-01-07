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
  Settings,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  ArrowLeft,
  Info
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";

export default function TiposArticulo() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    margen_minorista: "",
    margen_mayorista: "",
    descuento_efectivo: ""
  });

  const queryClient = useQueryClient();

  const { data: tipos = [] } = useQuery({
    queryKey: ['tiposArticulo'],
    queryFn: () => base44.entities.TipoArticulo.list('-created_date')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TipoArticulo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiposArticulo'] });
      handleCloseDialog();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TipoArticulo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiposArticulo'] });
      handleCloseDialog();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TipoArticulo.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tiposArticulo'] })
  });

  const handleOpenDialog = (tipo = null) => {
    if (tipo) {
      setEditingTipo(tipo);
      setFormData({
        nombre: tipo.nombre || "",
        margen_minorista: (tipo.margen_minorista * 100).toString() || "",
        margen_mayorista: (tipo.margen_mayorista * 100).toString() || "",
        descuento_efectivo: (tipo.descuento_efectivo * 100).toString() || ""
      });
    } else {
      setEditingTipo(null);
      setFormData({
        nombre: "",
        margen_minorista: "",
        margen_mayorista: "",
        descuento_efectivo: ""
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTipo(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      nombre: formData.nombre,
      margen_minorista: parseFloat(formData.margen_minorista) / 100,
      margen_mayorista: parseFloat(formData.margen_mayorista) / 100,
      descuento_efectivo: parseFloat(formData.descuento_efectivo) / 100,
      is_active: true
    };

    if (editingTipo) {
      updateMutation.mutate({ id: editingTipo.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Ejemplo de cálculo para demostración
  const calcularEjemplo = (tipo, costo = 100) => {
    const precioMinimoMinorista = costo * (1 + tipo.margen_minorista);
    const precioListaMinorista = precioMinimoMinorista / (1 - tipo.descuento_efectivo);
    const precioVentaEfectivoMinorista = precioListaMinorista * (1 - tipo.descuento_efectivo);
    
    const precioMinimoMayorista = costo * (1 + tipo.margen_mayorista);
    const precioListaMayorista = precioMinimoMayorista / (1 - tipo.descuento_efectivo);

    return {
      minorista: {
        minimo: precioMinimoMinorista.toFixed(2),
        lista: precioListaMinorista.toFixed(2),
        efectivo: precioVentaEfectivoMinorista.toFixed(2)
      },
      mayorista: {
        minimo: precioMinimoMayorista.toFixed(2),
        lista: precioListaMayorista.toFixed(2)
      }
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to={createPageUrl("Products")}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-600" />
            Tipos de Artículo
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestión de márgenes y descuentos por tipo
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Tipo
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900">¿Cómo funcionan los tipos de artículo?</p>
              <p className="text-xs text-blue-700">
                Cada tipo define márgenes mínimos y descuentos automáticos. El sistema calcula precios protegiendo siempre el margen mínimo.
                Los precios de lista incluyen un colchón para aplicar descuentos sin romper el margen.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tipos Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Nombre</TableHead>
              <TableHead className="text-center">Margen Minorista</TableHead>
              <TableHead className="text-center">Margen Mayorista</TableHead>
              <TableHead className="text-center">Desc. Efectivo</TableHead>
              <TableHead>Ejemplo (Costo $100)</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tipos.map((tipo) => {
              const ejemplo = calcularEjemplo(tipo);
              return (
                <TableRow key={tipo.id} className="hover:bg-slate-50">
                  <TableCell className="font-semibold">{tipo.nombre}</TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-blue-100 text-blue-700">
                      {(tipo.margen_minorista * 100).toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-emerald-100 text-emerald-700">
                      {(tipo.margen_mayorista * 100).toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-amber-100 text-amber-700">
                      {(tipo.descuento_efectivo * 100).toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Min. Lista:</span>
                        <span className="font-medium">${ejemplo.minorista.lista}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">May. Lista:</span>
                        <span className="font-medium">${ejemplo.mayorista.lista}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Min. Efectivo:</span>
                        <span className="font-medium text-green-600">${ejemplo.minorista.efectivo}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(tipo)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteMutation.mutate(tipo.id)} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {tipos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  No hay tipos de artículo configurados. Crea el primero para empezar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTipo ? 'Editar Tipo de Artículo' : 'Nuevo Tipo de Artículo'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Útiles Escolares, Libros, Mochilas"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="margen_minorista">Margen Minorista (%) *</Label>
              <Input
                id="margen_minorista"
                type="number"
                step="0.1"
                value={formData.margen_minorista}
                onChange={(e) => setFormData({ ...formData, margen_minorista: e.target.value })}
                placeholder="Ej: 45"
                required
              />
              <p className="text-xs text-slate-500">Margen mínimo para venta minorista</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="margen_mayorista">Margen Mayorista (%) *</Label>
              <Input
                id="margen_mayorista"
                type="number"
                step="0.1"
                value={formData.margen_mayorista}
                onChange={(e) => setFormData({ ...formData, margen_mayorista: e.target.value })}
                placeholder="Ej: 30"
                required
              />
              <p className="text-xs text-slate-500">Margen mínimo para venta mayorista</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="descuento_efectivo">Descuento Efectivo (%) *</Label>
              <Input
                id="descuento_efectivo"
                type="number"
                step="0.1"
                value={formData.descuento_efectivo}
                onChange={(e) => setFormData({ ...formData, descuento_efectivo: e.target.value })}
                placeholder="Ej: 10"
                required
              />
              <p className="text-xs text-slate-500">Descuento aplicado al pagar en efectivo</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingTipo ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}