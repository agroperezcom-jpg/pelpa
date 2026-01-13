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
import { Upload, FileSpreadsheet, Trash2, Plus, Download, AlertCircle, Edit } from "lucide-react";
import toast from "react-hot-toast";

export default function PlanDeCuentas() {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingCuenta, setEditingCuenta] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [formData, setFormData] = useState({
    codigo: "",
    codigo_contable: "",
    nombre: "",
    descripcion: "",
    rubro_contable: "Gastos",
    tipo_resultado: null,
    nivel: 1,
    imputable: true,
    usa_en_gastos: false,
    usa_en_ingresos: false
  });
  const [importErrors, setImportErrors] = useState([]);

  const queryClient = useQueryClient();

  const { data: cuentas = [] } = useQuery({
    queryKey: ['cuentasContables'],
    queryFn: () => base44.entities.CuentaContable.list('codigo', 500)
  });

  const importMutation = useMutation({
    mutationFn: async (file) => {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      
      const separator = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(separator).map(h => h.trim().toLowerCase().replace(/_/g, ''));
      
      const cuentasData = [];
      const errors = [];
      const codigosExistentes = cuentas.map(c => c.codigo_contable || c.codigo);
      
      const rubrosValidos = [
        "Activo Corriente", "Activo No Corriente", "Pasivo Corriente", 
        "Pasivo No Corriente", "Patrimonio Neto", "Ingresos", "Costos", "Gastos"
      ];
      const tiposResultado = ["Ingreso", "Costo", "Gasto"];
      const rubrosConTipoResultado = ["Ingresos", "Costos", "Gastos"];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(separator).map(v => v.trim());
        if (values.length < 2) continue;

        const row = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || "";
        });

        const codigo = row.codigo || row.codigocontable || row.code || "";
        const nombre = row.nombre || row.name || "";
        const rubro = row.rubrocontable || row.rubro || "Gastos";
        const tipoRes = row.tiporesultado || row.tipo || null;
        const imputable = row.imputable !== "false" && row.imputable !== "0" && row.imputable !== "no";
        const usaGastos = row.usaengastos === "true" || row.usaengastos === "1" || row.usaengastos === "si";
        const usaIngresos = row.usaeningresos === "true" || row.usaeningresos === "1" || row.usaeningresos === "si";

        // Validaciones
        if (!codigo) {
          errors.push(`Fila ${i + 1}: Falta código`);
          continue;
        }
        if (!nombre) {
          errors.push(`Fila ${i + 1}: Falta nombre`);
          continue;
        }
        if (codigosExistentes.includes(codigo)) {
          errors.push(`Fila ${i + 1}: Código "${codigo}" duplicado`);
          continue;
        }
        if (!rubrosValidos.includes(rubro)) {
          errors.push(`Fila ${i + 1}: Rubro "${rubro}" inválido`);
          continue;
        }
        if (rubrosConTipoResultado.includes(rubro) && (!tipoRes || !tiposResultado.includes(tipoRes))) {
          errors.push(`Fila ${i + 1}: Tipo resultado requerido y válido para rubro "${rubro}"`);
          continue;
        }
        if (!rubrosConTipoResultado.includes(rubro) && tipoRes) {
          errors.push(`Fila ${i + 1}: Tipo resultado no debe tener valor para rubro "${rubro}"`);
          continue;
        }

        codigosExistentes.push(codigo);
        cuentasData.push({
          codigo,
          codigo_contable: codigo,
          nombre,
          descripcion: row.descripcion || row.description || "",
          rubro_contable: rubro,
          tipo_resultado: rubrosConTipoResultado.includes(rubro) ? tipoRes : null,
          nivel: parseInt(row.nivel || row.level || "1"),
          imputable,
          usa_en_gastos: usaGastos,
          usa_en_ingresos: usaIngresos,
          is_active: true
        });
      }

      if (errors.length > 0) {
        throw new Error(`Errores de validación:\n${errors.join('\n')}`);
      }

      if (cuentasData.length > 0) {
        await base44.entities.CuentaContable.bulkCreate(cuentasData);
      }

      return cuentasData.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['cuentasContables'] });
      setImportDialogOpen(false);
      setCsvFile(null);
      setImportErrors([]);
      toast.success(`Se importaron ${count} cuentas correctamente`);
    },
    onError: (error) => {
      const errMsg = error.message || "Error desconocido";
      setImportErrors(errMsg.split('\n'));
      toast.error("Error al importar el plan de cuentas");
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CuentaContable.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentasContables'] });
      setAddDialogOpen(false);
      setEditingCuenta(null);
      setFormData({
        codigo: "",
        codigo_contable: "",
        nombre: "",
        descripcion: "",
        rubro_contable: "Gastos",
        tipo_resultado: null,
        nivel: 1,
        imputable: true,
        usa_en_gastos: false,
        usa_en_ingresos: false
      });
      toast.success("Cuenta agregada correctamente");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CuentaContable.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentasContables'] });
      setAddDialogOpen(false);
      setEditingCuenta(null);
      setFormData({
        codigo: "",
        codigo_contable: "",
        nombre: "",
        descripcion: "",
        rubro_contable: "Gastos",
        tipo_resultado: null,
        nivel: 1,
        imputable: true,
        usa_en_gastos: false,
        usa_en_ingresos: false
      });
      toast.success("Cuenta actualizada correctamente");
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

  const handleOpenDialog = (cuenta = null) => {
    if (cuenta) {
      setEditingCuenta(cuenta);
      setFormData({
        codigo: cuenta.codigo_contable || cuenta.codigo,
        codigo_contable: cuenta.codigo_contable || cuenta.codigo,
        nombre: cuenta.nombre,
        descripcion: cuenta.descripcion || "",
        rubro_contable: cuenta.rubro_contable || "Gastos",
        tipo_resultado: cuenta.tipo_resultado || null,
        nivel: cuenta.nivel || 1,
        imputable: cuenta.imputable !== false,
        usa_en_gastos: cuenta.usa_en_gastos || false,
        usa_en_ingresos: cuenta.usa_en_ingresos || false
      });
    } else {
      setEditingCuenta(null);
      setFormData({
        codigo: "",
        codigo_contable: "",
        nombre: "",
        descripcion: "",
        rubro_contable: "Gastos",
        tipo_resultado: null,
        nivel: 1,
        imputable: true,
        usa_en_gastos: false,
        usa_en_ingresos: false
      });
    }
    setAddDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingCuenta) {
      updateMutation.mutate({ id: editingCuenta.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const exportTemplate = () => {
    const csv = "codigo,nombre,rubro_contable,tipo_resultado,imputable,usa_en_gastos,usa_en_ingresos\n" +
                "1.1.01,Caja,Activo Corriente,,true,false,false\n" +
                "4.1.01,Ventas,Ingresos,Ingreso,true,false,true\n" +
                "5.1.01,Costo Mercaderías,Costos,Costo,true,false,false\n" +
                "5.2.01,Alquileres,Gastos,Gasto,true,true,false\n" +
                "5.2.02,Sueldos y Jornales,Gastos,Gasto,true,true,false";
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla_plan_cuentas.csv';
    link.click();
  };

  const rubroColors = {
    "Activo Corriente": "bg-blue-100 text-blue-700",
    "Activo No Corriente": "bg-blue-200 text-blue-800",
    "Pasivo Corriente": "bg-red-100 text-red-700",
    "Pasivo No Corriente": "bg-red-200 text-red-800",
    "Patrimonio Neto": "bg-purple-100 text-purple-700",
    "Ingresos": "bg-green-100 text-green-700",
    "Costos": "bg-orange-100 text-orange-700",
    "Gastos": "bg-amber-100 text-amber-700"
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
              <Button variant="outline" size="sm" onClick={() => handleOpenDialog()}>
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Código</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Rubro</TableHead>
                        <TableHead>Tipo Resultado</TableHead>
                        <TableHead className="text-center">Imputable</TableHead>
                        <TableHead className="text-center">Usa en Gastos</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cuentas.map((cuenta) => (
                        <TableRow key={cuenta.id}>
                          <TableCell className="font-mono text-sm">
                            {cuenta.codigo_contable || cuenta.codigo}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{cuenta.nombre}</p>
                              {cuenta.descripcion && (
                                <p className="text-xs text-slate-500">{cuenta.descripcion}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {cuenta.rubro_contable ? (
                              <Badge className={rubroColors[cuenta.rubro_contable]}>
                                {cuenta.rubro_contable}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {cuenta.tipo_resultado ? (
                              <Badge variant="outline" className="text-xs">
                                {cuenta.tipo_resultado}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {cuenta.imputable ? (
                              <Badge className="bg-green-100 text-green-700 text-xs">Sí</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">No</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {cuenta.usa_en_gastos ? (
                              <Badge className="bg-blue-100 text-blue-700 text-xs">Sí</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">No</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {cuenta.is_active !== false ? (
                              <Badge className="bg-green-100 text-green-700 text-xs">Activa</Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-600 text-xs">Inactiva</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(cuenta)}
                              >
                                <Edit className="h-4 w-4 text-blue-600" />
                              </Button>
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
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
                  <p className="text-xs mb-2">Columnas requeridas: <code className="bg-white px-1 rounded">codigo, nombre, rubro_contable</code></p>
                  <p className="text-xs">Columnas opcionales: <code className="bg-white px-1 rounded">tipo_resultado, imputable, usa_en_gastos, usa_en_ingresos</code></p>
                </div>
              </div>
            </div>

            {importErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                <p className="font-medium text-red-800 text-sm mb-2">Errores encontrados:</p>
                <ul className="text-xs text-red-700 space-y-1">
                  {importErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

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

      {/* Dialog Agregar/Editar Cuenta */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCuenta ? "Editar Cuenta" : "Agregar Cuenta Manual"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value, codigo_contable: e.target.value })}
                  placeholder="1.1.01"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Rubro Contable *</Label>
                <Select 
                  value={formData.rubro_contable} 
                  onValueChange={(v) => {
                    const needsTipoRes = ["Ingresos", "Costos", "Gastos"].includes(v);
                    setFormData({ 
                      ...formData, 
                      rubro_contable: v,
                      tipo_resultado: needsTipoRes ? (formData.tipo_resultado || "Gasto") : null
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Activo Corriente">Activo Corriente</SelectItem>
                    <SelectItem value="Activo No Corriente">Activo No Corriente</SelectItem>
                    <SelectItem value="Pasivo Corriente">Pasivo Corriente</SelectItem>
                    <SelectItem value="Pasivo No Corriente">Pasivo No Corriente</SelectItem>
                    <SelectItem value="Patrimonio Neto">Patrimonio Neto</SelectItem>
                    <SelectItem value="Ingresos">Ingresos</SelectItem>
                    <SelectItem value="Costos">Costos</SelectItem>
                    <SelectItem value="Gastos">Gastos</SelectItem>
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
            {["Ingresos", "Costos", "Gastos"].includes(formData.rubro_contable) && (
              <div className="space-y-2">
                <Label>Tipo de Resultado *</Label>
                <Select 
                  value={formData.tipo_resultado || ""} 
                  onValueChange={(v) => setFormData({ ...formData, tipo_resultado: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ingreso">Ingreso</SelectItem>
                    <SelectItem value="Costo">Costo</SelectItem>
                    <SelectItem value="Gasto">Gasto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.imputable}
                  onChange={(e) => setFormData({ ...formData, imputable: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Imputable</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.usa_en_gastos}
                  onChange={(e) => setFormData({ ...formData, usa_en_gastos: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Usa en Gastos</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.usa_en_ingresos}
                  onChange={(e) => setFormData({ ...formData, usa_en_ingresos: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Usa en Ingresos</span>
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingCuenta ? "Guardar" : "Agregar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}