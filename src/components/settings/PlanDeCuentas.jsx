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
import { Upload, FileSpreadsheet, Trash2, Plus, Download, AlertCircle, Edit, CheckSquare, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

export default function PlanDeCuentas() {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingCuenta, setEditingCuenta] = useState(null);
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [selectedCuentas, setSelectedCuentas] = useState([]);
  const [bulkFormData, setBulkFormData] = useState({
    imputable: null,
    usa_en_gastos: null,
    usa_en_ingresos: null
  });
  const [csvFile, setCsvFile] = useState(null);
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    rubro_contable: "Gastos",
    tipo_resultado: "Gasto",
    imputable: false,
    usa_en_gastos: false,
    usa_en_ingresos: false,
    activa: true
  });
  const [importErrors, setImportErrors] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const queryClient = useQueryClient();

  const { data: cuentas = [] } = useQuery({
    queryKey: ['cuentasContables', currentPage, pageSize],
    queryFn: () => base44.entities.CuentaContable.list('codigo', pageSize, (currentPage - 1) * pageSize)
  });

  const { data: totalCuentas = [] } = useQuery({
    queryKey: ['cuentasContablesTotal'],
    queryFn: () => base44.entities.CuentaContable.list('codigo', 10000)
  });

  const totalPages = Math.ceil(totalCuentas.length / pageSize);
  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalCuentas.length);

  const importMutation = useMutation({
    mutationFn: async (file) => {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      
      const separator = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(separator).map(h => h.trim().toLowerCase().replace(/_/g, '').replace(/\s/g, ''));
      
      const cuentasData = [];
      const errors = [];
      // Obtener TODAS las cuentas existentes para validar duplicados
      const todasLasCuentas = await base44.entities.CuentaContable.list('codigo', 10000);
      const codigosExistentes = todasLasCuentas.map(c => c.codigo);
      
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

        const codigo = row.codigo || row.code || "";
        const nombre = row.nombre || row.name || "";
        const rubro = row.rubrocontable || row.rubro || "";
        const tipoRes = row.tiporesultado || row.tipo || "";
        const imputable = row.imputable === "true" || row.imputable === "1" || row.imputable === "si";
        const usaGastos = row.usaengastos === "true" || row.usaengastos === "1" || row.usaengastos === "si";
        const usaIngresos = row.usaeningresos === "true" || row.usaeningresos === "1" || row.usaeningresos === "si";

        // Validaciones obligatorias
        if (!codigo) {
          errors.push(`Fila ${i + 1}: Código obligatorio`);
          continue;
        }
        if (!nombre) {
          errors.push(`Fila ${i + 1}: Nombre obligatorio`);
          continue;
        }
        if (codigosExistentes.includes(codigo)) {
          errors.push(`Fila ${i + 1}: Código "${codigo}" duplicado`);
          continue;
        }
        if (!rubro || !rubrosValidos.includes(rubro)) {
          errors.push(`Fila ${i + 1}: Rubro "${rubro}" inválido. Use: ${rubrosValidos.join(', ')}`);
          continue;
        }

        // Validación tipo_resultado según rubro
        if (rubrosConTipoResultado.includes(rubro)) {
          if (!tipoRes || !tiposResultado.includes(tipoRes)) {
            errors.push(`Fila ${i + 1}: Tipo resultado obligatorio para rubro "${rubro}". Use: Ingreso, Costo o Gasto`);
            continue;
          }
        } else {
          if (tipoRes && tipoRes !== "") {
            errors.push(`Fila ${i + 1}: Tipo resultado debe estar vacío para rubro "${rubro}"`);
            continue;
          }
        }

        codigosExistentes.push(codigo);
        cuentasData.push({
          codigo,
          nombre,
          rubro_contable: rubro,
          tipo_resultado: rubrosConTipoResultado.includes(rubro) ? tipoRes : null,
          imputable,
          usa_en_gastos: usaGastos,
          usa_en_ingresos: usaIngresos,
          activa: true
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
        nombre: "",
        rubro_contable: "Gastos",
        tipo_resultado: "Gasto",
        imputable: false,
        usa_en_gastos: false,
        usa_en_ingresos: false,
        activa: true
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
        nombre: "",
        rubro_contable: "Gastos",
        tipo_resultado: "Gasto",
        imputable: false,
        usa_en_gastos: false,
        usa_en_ingresos: false,
        activa: true
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
        codigo: cuenta.codigo,
        nombre: cuenta.nombre,
        rubro_contable: cuenta.rubro_contable || "Gastos",
        tipo_resultado: cuenta.tipo_resultado || (["Ingresos", "Costos", "Gastos"].includes(cuenta.rubro_contable) ? "Gasto" : null),
        imputable: cuenta.imputable || false,
        usa_en_gastos: cuenta.usa_en_gastos || false,
        usa_en_ingresos: cuenta.usa_en_ingresos || false,
        activa: cuenta.activa !== false
      });
    } else {
      setEditingCuenta(null);
      setFormData({
        codigo: "",
        nombre: "",
        rubro_contable: "Gastos",
        tipo_resultado: "Gasto",
        imputable: false,
        usa_en_gastos: false,
        usa_en_ingresos: false,
        activa: true
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

  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates) => {
      for (const cuentaId of selectedCuentas) {
        await base44.entities.CuentaContable.update(cuentaId, updates);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentasContables'] });
      setBulkEditDialogOpen(false);
      setSelectedCuentas([]);
      setBulkFormData({ imputable: null, usa_en_gastos: null, usa_en_ingresos: null });
      toast.success(`${selectedCuentas.length} cuentas actualizadas`);
    }
  });

  const handleBulkEdit = () => {
    const updates = {};
    if (bulkFormData.imputable !== null) updates.imputable = bulkFormData.imputable;
    if (bulkFormData.usa_en_gastos !== null) updates.usa_en_gastos = bulkFormData.usa_en_gastos;
    if (bulkFormData.usa_en_ingresos !== null) updates.usa_en_ingresos = bulkFormData.usa_en_ingresos;
    
    if (Object.keys(updates).length === 0) {
      toast.error("Selecciona al menos un campo para actualizar");
      return;
    }
    
    bulkUpdateMutation.mutate(updates);
  };

  const toggleSelectCuenta = (cuentaId) => {
    setSelectedCuentas(prev => 
      prev.includes(cuentaId) ? prev.filter(id => id !== cuentaId) : [...prev, cuentaId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCuentas.length === cuentas.length) {
      setSelectedCuentas([]);
    } else {
      setSelectedCuentas(cuentas.map(c => c.id));
    }
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    setSelectedCuentas([]);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(Number(newSize));
    setCurrentPage(1);
    setSelectedCuentas([]);
  };

  const exportTemplate = () => {
    const csv = "codigo,nombre,rubro_contable,tipo_resultado,imputable,usa_en_gastos,usa_en_ingresos\n" +
                "1.1.01,Caja,Activo Corriente,,false,false,false\n" +
                "4.1.01,Ventas,Ingresos,Ingreso,true,false,true\n" +
                "5.1.01,Costo de Mercaderías Vendidas,Costos,Costo,true,true,false\n" +
                "5.1.02,Sueldos Producción,Costos,Costo,true,true,false\n" +
                "5.2.01,Alquileres,Gastos,Gasto,true,true,false\n" +
                "5.2.02,Sueldos Administración,Gastos,Gasto,true,true,false\n" +
                "5.2.03,Servicios Públicos,Gastos,Gasto,true,true,false";
    
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
                <div className="flex items-center gap-4">
                  <p className="text-sm text-slate-600">
                    Total de cuentas: <span className="font-bold">{totalCuentas.length}</span>
                    {selectedCuentas.length > 0 && (
                      <span className="ml-3 text-blue-600">
                        ({selectedCuentas.length} seleccionadas)
                      </span>
                    )}
                  </p>
                  <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 por página</SelectItem>
                      <SelectItem value="20">20 por página</SelectItem>
                      <SelectItem value="50">50 por página</SelectItem>
                      <SelectItem value="100">100 por página</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  {selectedCuentas.length > 0 && (
                    <Button 
                      size="sm" 
                      onClick={() => setBulkEditDialogOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Editar Selección
                    </Button>
                  )}
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
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectedCuentas.length === cuentas.length}
                            onChange={toggleSelectAll}
                            className="rounded"
                          />
                        </TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Rubro</TableHead>
                        <TableHead>Tipo Resultado</TableHead>
                        <TableHead className="text-center">Imputable</TableHead>
                        <TableHead className="text-center">En Gastos</TableHead>
                        <TableHead className="text-center">En Ingresos</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cuentas.map((cuenta) => (
                        <TableRow key={cuenta.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedCuentas.includes(cuenta.id)}
                              onChange={() => toggleSelectCuenta(cuenta.id)}
                              className="rounded"
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm font-medium">
                            {cuenta.codigo}
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{cuenta.nombre}</p>
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
                            {cuenta.usa_en_ingresos ? (
                              <Badge className="bg-green-100 text-green-700 text-xs">Sí</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">No</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {cuenta.activa !== false ? (
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

              {/* Paginación */}
              {totalCuentas.length > 0 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-slate-600">
                    Mostrando {startRecord} - {endRecord} de {totalCuentas.length} cuentas
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm px-3">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
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
                <div className="text-sm text-blue-800 space-y-2">
                  <p className="font-medium">Formato del CSV:</p>
                  <p className="text-xs">Columnas: <code className="bg-white px-1 rounded">codigo,nombre,rubro_contable,tipo_resultado,imputable,usa_en_gastos,usa_en_ingresos</code></p>
                  <div className="text-xs space-y-1">
                    <p><strong>Reglas:</strong></p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>codigo y nombre son obligatorios</li>
                      <li>rubro_contable debe ser: Activo Corriente, Activo No Corriente, Pasivo Corriente, Pasivo No Corriente, Patrimonio Neto, Ingresos, Costos, Gastos</li>
                      <li>tipo_resultado solo para Ingresos/Costos/Gastos (Ingreso, Costo, Gasto)</li>
                      <li>imputable, usa_en_gastos, usa_en_ingresos: true/false</li>
                    </ul>
                  </div>
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
            <div className="space-y-2">
              <Label>Código *</Label>
              <Input
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                placeholder="5.2.01"
                required
              />
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
                    <SelectItem value="Ingreso">Ingreso (afecta Utilidad Bruta)</SelectItem>
                    <SelectItem value="Costo">Costo (afecta Utilidad Bruta)</SelectItem>
                    <SelectItem value="Gasto">Gasto (afecta Utilidad Operativa)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {["Ingresos", "Costos", "Gastos"].includes(formData.rubro_contable) && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
                <p><strong>Importante:</strong></p>
                <p>• <strong>Costos</strong>: Relacionados con producción/mercadería (afectan Utilidad Bruta)</p>
                <p>• <strong>Gastos</strong>: Operativos y administrativos (afectan Utilidad Operativa)</p>
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

      {/* Dialog Edición en Masa */}
      <Dialog open={bulkEditDialogOpen} onOpenChange={setBulkEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar {selectedCuentas.length} Cuentas en Masa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              Solo se actualizarán los campos que selecciones. Los demás mantendrán sus valores actuales.
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm font-medium">Imputable</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={bulkFormData.imputable === true ? "default" : "outline"}
                    onClick={() => setBulkFormData({ ...bulkFormData, imputable: true })}
                  >
                    Sí
                  </Button>
                  <Button
                    size="sm"
                    variant={bulkFormData.imputable === false ? "default" : "outline"}
                    onClick={() => setBulkFormData({ ...bulkFormData, imputable: false })}
                  >
                    No
                  </Button>
                  <Button
                    size="sm"
                    variant={bulkFormData.imputable === null ? "default" : "outline"}
                    onClick={() => setBulkFormData({ ...bulkFormData, imputable: null })}
                  >
                    Sin cambio
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm font-medium">Usa en Gastos</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={bulkFormData.usa_en_gastos === true ? "default" : "outline"}
                    onClick={() => setBulkFormData({ ...bulkFormData, usa_en_gastos: true })}
                  >
                    Sí
                  </Button>
                  <Button
                    size="sm"
                    variant={bulkFormData.usa_en_gastos === false ? "default" : "outline"}
                    onClick={() => setBulkFormData({ ...bulkFormData, usa_en_gastos: false })}
                  >
                    No
                  </Button>
                  <Button
                    size="sm"
                    variant={bulkFormData.usa_en_gastos === null ? "default" : "outline"}
                    onClick={() => setBulkFormData({ ...bulkFormData, usa_en_gastos: null })}
                  >
                    Sin cambio
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm font-medium">Usa en Ingresos</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={bulkFormData.usa_en_ingresos === true ? "default" : "outline"}
                    onClick={() => setBulkFormData({ ...bulkFormData, usa_en_ingresos: true })}
                  >
                    Sí
                  </Button>
                  <Button
                    size="sm"
                    variant={bulkFormData.usa_en_ingresos === false ? "default" : "outline"}
                    onClick={() => setBulkFormData({ ...bulkFormData, usa_en_ingresos: false })}
                  >
                    No
                  </Button>
                  <Button
                    size="sm"
                    variant={bulkFormData.usa_en_ingresos === null ? "default" : "outline"}
                    onClick={() => setBulkFormData({ ...bulkFormData, usa_en_ingresos: null })}
                  >
                    Sin cambio
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBulkEdit} disabled={bulkUpdateMutation.isPending}>
              {bulkUpdateMutation.isPending ? "Actualizando..." : "Aplicar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}