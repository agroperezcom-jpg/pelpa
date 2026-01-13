import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
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
import { Upload, FileSpreadsheet, Trash2, Plus, Download, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function PlanDeCuentas() {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    tipo: "egreso",
    nivel: 1,
    imputable: true
  });

  const queryClient = useQueryClient();

  const { data: cuentas = [] } = useQuery({
    queryKey: ['cuentasContables'],
    queryFn: () => base44.entities.CuentaContable.list('codigo', 500)
  });

  const importMutation = useMutation({
    mutationFn: async (file) => {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      
      // Detectar separador (coma o punto y coma)
      const separator = lines[0].includes(';') ? ';' : ',';
      
      // Parsear CSV
      const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
      const cuentasData = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(separator).map(v => v.trim());
        if (values.length < 2) continue;

        const cuenta = {};
        headers.forEach((header, idx) => {
          cuenta[header] = values[idx] || "";
        });

        // Mapear campos comunes
        cuentasData.push({
          codigo: cuenta.codigo || cuenta.code || "",
          nombre: cuenta.nombre || cuenta.name || cuenta.descripcion || "",
          descripcion: cuenta.descripcion || cuenta.description || "",
          tipo: cuenta.tipo || cuenta.type || "egreso",
          nivel: parseInt(cuenta.nivel || cuenta.level || "1"),
          imputable: cuenta.imputable !== "false" && cuenta.imputable !== "0",
          is_active: true
        });
      }

      // Crear cuentas en bulk
      if (cuentasData.length > 0) {
        await base44.entities.CuentaContable.bulkCreate(cuentasData);
      }

      return cuentasData.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['cuentasContables'] });
      setImportDialogOpen(false);
      setCsvFile(null);
      toast.success(`Se importaron ${count} cuentas correctamente`);
    },
    onError: (error) => {
      toast.error("Error al importar el plan de cuentas: " + error.message);
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CuentaContable.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentasContables'] });
      setAddDialogOpen(false);
      setFormData({
        codigo: "",
        nombre: "",
        descripcion: "",
        tipo: "egreso",
        nivel: 1,
        imputable: true
      });
      toast.success("Cuenta agregada correctamente");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CuentaContable.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentasContables'] });
      toast.success("Cuenta eliminada");
    }
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      for (const cuenta of cuentas) {
        await base44.entities.CuentaContable.delete(cuenta.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentasContables'] });
      toast.success("Plan de cuentas eliminado");
    }
  });

  const handleImport = () => {
    if (!csvFile) {
      toast.error("Selecciona un archivo CSV");
      return;
    }
    importMutation.mutate(csvFile);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const exportTemplate = () => {
    const csv = "codigo,nombre,descripcion,tipo,nivel,imputable\n" +
                "1.1.01,Caja,Caja principal,activo,3,true\n" +
                "4.1.01,Ventas,Ingresos por ventas,ingreso,3,true\n" +
                "5.1.01,Alquileres,Gasto de alquiler,egreso,3,true\n" +
                "5.1.02,Servicios,Gastos de servicios,egreso,3,true";
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla_plan_cuentas.csv';
    link.click();
  };

  const tipoColors = {
    activo: "bg-blue-100 text-blue-700",
    pasivo: "bg-red-100 text-red-700",
    patrimonio: "bg-purple-100 text-purple-700",
    ingreso: "bg-green-100 text-green-700",
    egreso: "bg-orange-100 text-orange-700"
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              Plan de Cuentas Contable
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Descargar Plantilla
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Cuenta
              </Button>
              <Button size="sm" onClick={() => setImportDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importar CSV
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cuentas.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
              <FileSpreadsheet className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600 font-medium mb-2">No hay plan de cuentas cargado</p>
              <p className="text-sm text-slate-500 mb-4">Importa un archivo CSV con tu plan de cuentas</p>
              <Button onClick={() => setImportDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importar Plan de Cuentas
              </Button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-600">
                  Total de cuentas: <span className="font-bold">{cuentas.length}</span>
                </p>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => {
                    if (confirm('¿Eliminar todo el plan de cuentas?')) {
                      deleteAllMutation.mutate();
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Todo
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nivel</TableHead>
                      <TableHead className="text-center">Imputable</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cuentas.map((cuenta) => (
                      <TableRow key={cuenta.id}>
                        <TableCell className="font-mono text-sm">{cuenta.codigo}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{cuenta.nombre}</p>
                            {cuenta.descripcion && (
                              <p className="text-xs text-slate-500">{cuenta.descripcion}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={tipoColors[cuenta.tipo]}>
                            {cuenta.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell>{cuenta.nivel}</TableCell>
                        <TableCell className="text-center">
                          {cuenta.imputable ? (
                            <Badge className="bg-green-100 text-green-700">Sí</Badge>
                          ) : (
                            <Badge variant="secondary">No</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('¿Eliminar esta cuenta?')) {
                                deleteMutation.mutate(cuenta.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Importar CSV */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Plan de Cuentas desde CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Formato del CSV:</p>
                  <p className="text-xs mb-2">El archivo debe contener las columnas: <code className="bg-white px-1 rounded">codigo, nombre, tipo</code></p>
                  <p className="text-xs">Columnas opcionales: <code className="bg-white px-1 rounded">descripcion, nivel, imputable</code></p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Archivo CSV</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files[0])}
              />
            </div>

            {csvFile && (
              <div className="text-sm text-slate-600">
                Archivo seleccionado: <span className="font-medium">{csvFile.name}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={importMutation.isPending}>
              {importMutation.isPending ? "Importando..." : "Importar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Agregar Cuenta */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Cuenta Manual</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  placeholder="1.1.01"
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
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="pasivo">Pasivo</SelectItem>
                    <SelectItem value="patrimonio">Patrimonio</SelectItem>
                    <SelectItem value="ingreso">Ingreso</SelectItem>
                    <SelectItem value="egreso">Egreso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
              <Label>Descripción</Label>
              <Input
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción opcional"
              />
            </div>
            <div className="space-y-2">
              <Label>Nivel</Label>
              <Input
                type="number"
                value={formData.nivel}
                onChange={(e) => setFormData({ ...formData, nivel: parseInt(e.target.value) || 1 })}
                min="1"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Agregar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}