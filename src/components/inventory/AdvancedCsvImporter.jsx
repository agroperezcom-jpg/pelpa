import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { AlertCircle, CheckCircle2, Upload, FileText, AlertTriangle, BarChart3, CheckCheck, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const SEPARATORS = [
  { value: ",", label: "Coma (,)" },
  { value: ";", label: "Punto y coma (;)" },
  { value: "\t", label: "Tabulación" }
];

const PRODUCT_FIELDS = [
  { key: "name", label: "Nombre del producto", required: true, type: "string" },
  { key: "description", label: "Descripción", required: false, type: "string" },
  { key: "tipo_articulo_nombre", label: "Tipo de artículo", required: false, type: "string" },
  { key: "costo_unitario", label: "Costo unitario", required: false, type: "number" },
  { key: "category", label: "Categoría", required: false, type: "string" },
  { key: "supplier", label: "Proveedor", required: false, type: "string" },
  { key: "stock", label: "Stock actual", required: false, type: "number" },
  { key: "min_stock", label: "Stock mínimo", required: false, type: "number" },
  { key: "barcode", label: "Código de barras", required: false, type: "string" }
];

export default function AdvancedCsvImporter({ isOpen, onClose, tiposArticulo, products = [] }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [separator, setSeparator] = useState(",");
  const [csvData, setCsvData] = useState(null);
  const [fieldMapping, setFieldMapping] = useState({});
  const [duplicateStrategy, setDuplicateStrategy] = useState("create");
  const [importProgress, setImportProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState({});
  const [importLog, setImportLog] = useState(null);
  const queryClient = useQueryClient();

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
    }
  };

  const detectSeparator = (text) => {
    const lines = text.split("\n").slice(0, 5);
    const candidates = { ",": 0, ";": 0, "\t": 0 };
    lines.forEach(line => {
      candidates[","] += (line.match(/,/g) || []).length;
      candidates[";"] += (line.match(/;/g) || []).length;
      candidates["\t"] += (line.match(/\t/g) || []).length;
    });
    const [detected] = Object.entries(candidates).sort(([, a], [, b]) => b - a);
    return detected[0];
  };

  const parseCSV = async () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const detectedSep = detectSeparator(text);
      setSeparator(detectedSep);

      const lines = text.split("\n").filter(line => line.trim());
      const headers = lines[0].split(detectedSep).map(h => h.trim());
      const rows = lines.slice(1).map(line => line.split(detectedSep).map(v => v.trim()));

      setCsvData({ headers, rows });

      // Auto-mapeo
      const autoMapping = {};
      headers.forEach(header => {
        const matched = PRODUCT_FIELDS.find(f =>
          f.label.toLowerCase().includes(header.toLowerCase()) ||
          header.toLowerCase().includes(f.label.toLowerCase())
        );
        if (matched) autoMapping[header] = matched.key;
      });
      setFieldMapping(autoMapping);
      setStep(2);
    };
    reader.readAsText(file);
  };

  const validateAndTransform = () => {
    if (!csvData) return [];
    const transformed = [];
    const errors = {};

    csvData.rows.forEach((row, rowIdx) => {
      const product = {};
      let hasName = false;

      csvData.headers.forEach((header, colIdx) => {
        const fieldKey = fieldMapping[header];
        if (!fieldKey) return;

        const value = row[colIdx];
        if (!value) return;

        if (fieldKey === "name") hasName = true;

        if (fieldKey === "tipo_articulo_nombre") {
          const tipo = tiposArticulo.find(t =>
            t.nombre?.toLowerCase().includes(value.toLowerCase()) ||
            value.toLowerCase().includes(t.nombre?.toLowerCase())
          );
          if (tipo) {
            product.tipo_articulo_id = tipo.id;
            product.tipo_articulo_nombre = tipo.nombre;
          }
        } else if (fieldKey === "costo_unitario" || fieldKey === "stock" || fieldKey === "min_stock") {
          const num = parseFloat(value);
          if (!isNaN(num)) product[fieldKey] = num;
        } else {
          product[fieldKey] = value;
        }
      });

      if (hasName) {
        product.is_active = true;
        product.category = product.category || "otros";
        product.stock = product.stock || 0;
        product.min_stock = product.min_stock || 5;
        product.costo_unitario = product.costo_unitario || 0;

        if (!product.tipo_articulo_id) {
          product.tipo_articulo_id = tiposArticulo[0]?.id || "";
          product.tipo_articulo_nombre = tiposArticulo[0]?.nombre || "Sin especificar";
        }

        // Calcular precios
        if (product.tipo_articulo_id && product.costo_unitario > 0) {
          const tipo = tiposArticulo.find(t => t.id === product.tipo_articulo_id);
          if (tipo) {
            const costo = product.costo_unitario;
            product.precio_minimo_minorista = costo * (1 + tipo.margen_minorista);
            product.precio_lista_minorista = product.precio_minimo_minorista * (1 + tipo.descuento_efectivo);
            product.precio_minimo_mayorista = costo * (1 + tipo.margen_mayorista);
            product.precio_lista_mayorista = product.precio_minimo_mayorista * (1 + tipo.descuento_efectivo);
          }
        }

        transformed.push(product);
      } else {
        errors[rowIdx + 2] = "Nombre de producto es obligatorio";
      }
    });

    setValidationErrors(errors);
    return transformed;
  };

  const transformedData = useMemo(() => validateAndTransform(), [csvData, fieldMapping, tiposArticulo]);

  const importMutation = useMutation({
    mutationFn: async (dataToImport) => {
      const results = { created: 0, updated: 0, skipped: 0, errors: [] };
      
      for (let i = 0; i < dataToImport.length; i++) {
        const product = dataToImport[i];
        const existingProduct = products.find(p => p.name.toLowerCase() === product.name.toLowerCase());

        try {
          if (existingProduct) {
            if (duplicateStrategy === "update") {
              await base44.entities.Product.update(existingProduct.id, product);
              results.updated++;
            } else if (duplicateStrategy === "skip") {
              results.skipped++;
            } else {
              await base44.entities.Product.create(product);
              results.created++;
            }
          } else {
            await base44.entities.Product.create(product);
            results.created++;
          }
        } catch (err) {
          results.errors.push(`${product.name}: ${err.message}`);
        }
        setImportProgress(((i + 1) / dataToImport.length) * 100);
      }

      // Guardar auditoría
      await base44.entities.SessionLog.create({
        user_email: (await base44.auth.me()).email,
        user_name: (await base44.auth.me()).full_name,
        login_time: new Date().toISOString(),
        date: new Date().toISOString().split("T")[0]
      }).catch(() => {});

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setImportLog(results);
      setStep(7);
    }
  });

  const handleImport = () => {
    setStep(6);
    setImportProgress(0);
    importMutation.mutate(transformedData);
  };

  const resetImporter = () => {
    setStep(1);
    setFile(null);
    setSeparator(",");
    setCsvData(null);
    setFieldMapping({});
    setDuplicateStrategy("create");
    setImportProgress(0);
    setValidationErrors({});
    setImportLog(null);
    onClose();
  };

  const duplicatesCount = transformedData.filter(p =>
    products.some(existing => existing.name.toLowerCase() === p.name.toLowerCase())
  ).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importador de Productos CSV
          </DialogTitle>
          <div className="flex gap-1 mt-3">
            {[1, 2, 3, 4, 5, 6, 7].map(s => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  step >= s ? "bg-blue-600" : "bg-slate-200"
                }`}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* STEP 1: Upload */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="font-medium mb-2">Carga tu archivo CSV</p>
                <p className="text-sm text-slate-500 mb-4">Formatos soportados: .csv con separador coma, punto y coma o tabulación</p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload">
                  <Button asChild variant="outline">
                    <span className="cursor-pointer">Seleccionar archivo</span>
                  </Button>
                </label>
                {file && (
                  <p className="text-sm text-emerald-600 mt-3">✓ {file.name}</p>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Preview */}
          {step === 2 && csvData && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900">
                  📊 Se detectaron <strong>{csvData.rows.length}</strong> filas y <strong>{csvData.headers.length}</strong> columnas
                </p>
              </div>
              <div className="border rounded-lg overflow-auto max-h-48">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow>
                      {csvData.headers.map(h => (
                        <TableHead key={h} className="min-w-24">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.rows.slice(0, 3).map((row, i) => (
                      <TableRow key={i}>
                        {row.map((cell, j) => (
                          <TableCell key={j} className="truncate">{cell || "—"}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setStep(1); setCsvData(null); }}>
                  ← Volver
                </Button>
                <Button onClick={() => setStep(3)} className="bg-blue-600 hover:bg-blue-700">
                  Siguiente →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Field Mapping */}
          {step === 3 && csvData && (
            <div className="space-y-4">
              <p className="text-sm font-medium">Mapea las columnas del CSV a los campos del sistema</p>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {csvData.headers.map(header => (
                  <div key={header} className="flex items-center gap-3">
                    <span className="text-xs font-medium min-w-32 truncate bg-slate-100 px-2 py-1 rounded">{header}</span>
                    <Select
                      value={fieldMapping[header] || ""}
                      onValueChange={(value) =>
                        setFieldMapping(prev => ({ ...prev, [header]: value || undefined }))
                      }
                    >
                      <SelectTrigger className="flex-1 h-8">
                        <SelectValue placeholder="No importar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>No importar</SelectItem>
                        {PRODUCT_FIELDS.map(f => (
                          <SelectItem key={f.key} value={f.key}>
                            {f.label} {f.required && <span className="text-red-600">*</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>← Volver</Button>
                <Button onClick={() => setStep(4)} className="bg-blue-600 hover:bg-blue-700">
                  Siguiente →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Validation & Duplicates */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <p className="text-xs text-emerald-600 font-medium">Productos válidos</p>
                  <p className="text-2xl font-bold text-emerald-700">{transformedData.length}</p>
                </div>
                {duplicatesCount > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-xs text-orange-600 font-medium">Duplicados detectados</p>
                    <p className="text-2xl font-bold text-orange-700">{duplicatesCount}</p>
                  </div>
                )}
                {Object.keys(validationErrors).length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-xs text-red-600 font-medium">Errores</p>
                    <p className="text-2xl font-bold text-red-700">{Object.keys(validationErrors).length}</p>
                  </div>
                )}
              </div>

              {duplicatesCount > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Si hay duplicados, ¿qué hacer?</p>
                  <Select value={duplicateStrategy} onValueChange={setDuplicateStrategy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="create">Crear nuevo (ignorar duplicado)</SelectItem>
                      <SelectItem value="update">Actualizar existente</SelectItem>
                      <SelectItem value="skip">Saltar duplicado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {Object.keys(validationErrors).length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <p className="text-xs font-medium text-orange-900 mb-2">⚠️ Filas con errores (se saltarán):</p>
                  {Object.entries(validationErrors).map(([row, err]) => (
                    <p key={row} className="text-xs text-orange-700">Fila {row}: {err}</p>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(3)}>← Volver</Button>
                <Button onClick={() => setStep(5)} className="bg-blue-600 hover:bg-blue-700">
                  Siguiente →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: Confirmation */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="bg-slate-50 border rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Total a procesar:</span>
                  <span className="font-bold">{transformedData.length} productos</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Nuevos:</span>
                  <span>{transformedData.filter(p => !products.some(ex => ex.name.toLowerCase() === p.name.toLowerCase())).length}</span>
                </div>
                {duplicatesCount > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Duplicados:</span>
                      <span className="text-orange-600">{duplicatesCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Estrategia:</span>
                      <span className="font-medium">
                        {duplicateStrategy === "create" && "Crear nuevo"}
                        {duplicateStrategy === "update" && "Actualizar"}
                        {duplicateStrategy === "skip" && "Saltar"}
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  ✓ Estás a punto de importar <strong>{transformedData.length}</strong> producto{transformedData.length !== 1 ? "s" : ""}. Esta acción se registrará en auditoría.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(4)}>← Volver</Button>
                <Button onClick={handleImport} className="bg-emerald-600 hover:bg-emerald-700">
                  ✓ Confirmar importación
                </Button>
              </div>
            </div>
          )}

          {/* STEP 6: Progress */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <p className="font-medium">Importando productos...</p>
              </div>
              <Progress value={importProgress} className="h-2" />
              <p className="text-xs text-slate-500 text-center">{Math.round(importProgress)}%</p>
            </div>
          )}

          {/* STEP 7: Results */}
          {step === 7 && importLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mb-1" />
                  <p className="text-xs text-emerald-600 font-medium">Creados</p>
                  <p className="text-2xl font-bold text-emerald-700">{importLog.created}</p>
                </div>
                {importLog.updated > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <CheckCheck className="h-5 w-5 text-blue-600 mb-1" />
                    <p className="text-xs text-blue-600 font-medium">Actualizados</p>
                    <p className="text-2xl font-bold text-blue-700">{importLog.updated}</p>
                  </div>
                )}
                {importLog.skipped > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <AlertTriangle className="h-5 w-5 text-slate-600 mb-1" />
                    <p className="text-xs text-slate-600 font-medium">Saltados</p>
                    <p className="text-2xl font-bold text-slate-700">{importLog.skipped}</p>
                  </div>
                )}
              </div>

              {importLog.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <p className="text-xs font-medium text-red-900 mb-2">⚠️ Errores durante la importación:</p>
                  {importLog.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-700">{err}</p>
                  ))}
                </div>
              )}

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-sm font-medium text-emerald-900">
                  ✓ Importación completada exitosamente. {importLog.created + importLog.updated} productos procesados.
                </p>
              </div>

              <Button onClick={resetImporter} className="w-full bg-emerald-600 hover:bg-emerald-700">
                ✓ Cerrar y volver al inventario
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}