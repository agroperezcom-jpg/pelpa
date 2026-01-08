import React, { useState, useMemo } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function CsvImportMapperDialog({
  isOpen,
  onClose,
  csvData,
  tiposArticulo,
  onConfirm
}) {
  const [fieldMapping, setFieldMapping] = useState({});
  const [errors, setErrors] = useState([]);
  const [rowErrors, setRowErrors] = useState({});
  const [importOnlyValid, setImportOnlyValid] = useState(true);

  // Campos disponibles en Product
  const PRODUCT_FIELDS = [
    { key: "name", label: "Nombre *", required: true, type: "string" },
    { key: "description", label: "Descripción", required: false, type: "string" },
    { key: "tipo_articulo_nombre", label: "Tipo Artículo *", required: true, type: "string" },
    { key: "costo_unitario", label: "Costo Unitario *", required: true, type: "number" },
    { key: "category", label: "Categoría", required: false, type: "string" },
    { key: "supplier", label: "Proveedor", required: false, type: "string" },
    { key: "stock", label: "Stock", required: false, type: "number" },
    { key: "min_stock", label: "Stock Mínimo", required: false, type: "number" },
    { key: "barcode", label: "Código de Barras", required: false, type: "string" }
  ];

  const headers = csvData?.headers || [];
  const rows = csvData?.rows || [];

  // Inicializar mapeo automático cuando se abre el diálogo
  React.useEffect(() => {
    if (isOpen && headers.length > 0 && Object.keys(fieldMapping).length === 0) {
      const autoMapping = {};
      headers.forEach(header => {
        const matched = PRODUCT_FIELDS.find(
          f => f.label.toLowerCase().includes(header.toLowerCase()) ||
               header.toLowerCase().includes(f.label.toLowerCase())
        );
        if (matched) {
          autoMapping[header] = matched.key;
        }
      });
      setFieldMapping(autoMapping);
    }
  }, [isOpen]);

  // Validar mapeo
  const validateMapping = () => {
    setErrors([]);
    return true; // Permitir continuar incluso sin mapear todos los campos obligatorios
  };

  // Transformar datos según mapeo con manejo de errores por fila
  const transformData = (skipErrors = false) => {
    const transformedProducts = [];
    const newRowErrors = {};

    rows.forEach((row, rowIndex) => {
      try {
        const product = {};
        let hasData = false;

        headers.forEach((header, colIndex) => {
          const fieldKey = fieldMapping[header];
          if (!fieldKey) return;

          const value = row[colIndex];
          if (!value) return;

          hasData = true;

          // Buscar el tipo de dato del campo
          const fieldDef = PRODUCT_FIELDS.find(f => f.key === fieldKey);

          if (fieldKey === "tipo_articulo_nombre") {
            // Buscar el ID del tipo artículo por nombre
            const tipo = tiposArticulo.find(t => 
              t.nombre?.toLowerCase() === value.toString().toLowerCase()
            );
            if (!tipo) {
              throw new Error(`Tipo Artículo "${value}" no encontrado en el sistema`);
            }
            product.tipo_articulo_id = tipo.id;
            product.tipo_articulo_nombre = tipo.nombre;
          } else if (fieldDef?.type === "number") {
            const num = parseFloat(value);
            if (isNaN(num)) {
              throw new Error(`Campo "${fieldDef.label}" debe ser un número, recibió "${value}"`);
            }
            product[fieldKey] = num;
          } else {
            product[fieldKey] = value.toString();
          }
        });

        // Validar solo el nombre como obligatorio
                if (hasData) {
                  if (!product.name) {
                    throw new Error(`El nombre del producto es obligatorio`);
                  }

          // Calcular precios según tipo artículo si está disponible
          if (product.tipo_articulo_id && product.costo_unitario) {
            const tipo = tiposArticulo.find(t => t.id === product.tipo_articulo_id);
            if (tipo) {
              const costo = product.costo_unitario;

              // Minorista
              product.precio_minimo_minorista = costo * (1 + tipo.margen_minorista);
              product.precio_lista_minorista = product.precio_minimo_minorista * 
                (1 + tipo.descuento_efectivo);

              // Mayorista
              product.precio_minimo_mayorista = costo * (1 + tipo.margen_mayorista);
              product.precio_lista_mayorista = product.precio_minimo_mayorista * 
                (1 + tipo.descuento_efectivo);
            }
          }

          // Asignar defaults
          product.is_active = true;
          product.category = product.category || "otros";
          product.stock = product.stock || 0;
          product.min_stock = product.min_stock || 5;
          // Valores por defecto si faltan campos críticos
          if (!product.costo_unitario) {
            product.costo_unitario = 0;
          }
          if (!product.tipo_articulo_id) {
            product.tipo_articulo_id = tiposArticulo[0]?.id || "";
            product.tipo_articulo_nombre = tiposArticulo[0]?.nombre || "Sin especificar";
          }
          
          transformedProducts.push(product);
        }
      } catch (error) {
        newRowErrors[rowIndex + 2] = error.message;
      }
    });

    setRowErrors(newRowErrors);

    if (!skipErrors && Object.keys(newRowErrors).length > 0) {
      return [];
    }

    return transformedProducts;
  };

  const handleConfirm = () => {
    validateMapping();

    const transformedData = transformData(importOnlyValid);
    
    if (transformedData.length === 0) {
      setErrors(["No hay datos válidos para importar"]);
      return;
    }

    onConfirm(transformedData);
  };

  // Vista previa de datos transformados
  const previewData = useMemo(() => {
    if (!validateMapping() || headers.length === 0) return [];
    return transformData(true).slice(0, 3);
  }, [fieldMapping, rows]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mapear Columnas CSV a Campos de Producto</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Errores */}
          {errors.length > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <div className="flex gap-2 items-start">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 mb-2">Errores de validación:</p>
                  <ul className="text-sm text-red-800 space-y-1">
                    {errors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Errores por fila */}
          {Object.keys(rowErrors).length > 0 && (
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
              <div className="flex gap-2 items-start">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-orange-900 mb-2">
                    {Object.keys(rowErrors).length} fila{Object.keys(rowErrors).length !== 1 ? 's' : ''} con errores:
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {Object.entries(rowErrors).map(([rowNum, error]) => (
                      <p key={rowNum} className="text-sm text-orange-800">
                        <span className="font-medium">Fila {rowNum}:</span> {error}
                      </p>
                    ))}
                  </div>
                  <p className="text-sm font-medium text-orange-900 mt-3">
                    El sistema importará {previewData.length} productos válidos. Puedes editar los campos incompletos después de la importación.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mapeo de columnas */}
          <div className="space-y-3">
            <h3 className="font-semibold">Selecciona a qué campo corresponde cada columna</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
              {headers.map((header) => (
                <div key={header} className="flex items-center gap-3">
                  <span className="text-sm font-medium min-w-32 truncate">{header}</span>
                  <Select 
                    value={fieldMapping[header] || ""}
                    onValueChange={(value) => 
                      setFieldMapping(prev => ({
                        ...prev,
                        [header]: value || undefined
                      }))
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="No importar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>No importar</SelectItem>
                      {PRODUCT_FIELDS.map(field => (
                        <SelectItem key={field.key} value={field.key}>
                          {field.label}
                          {field.required && <span className="text-red-600 ml-1">*</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Vista previa */}
          {previewData.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold">Vista previa de datos a importar</h3>
                      </div>
                      <div className="text-xs text-slate-600 bg-blue-50 p-3 rounded-lg mb-2">
                        <p className="font-medium mb-1">✓ Estos {previewData.length} productos se importarán. Puedes editarlos después para completar información faltante.</p>
                      </div>
                      <div className="border rounded-lg overflow-auto max-h-48">
                        <Table className="text-sm">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nombre</TableHead>
                              <TableHead>Tipo Artículo</TableHead>
                              <TableHead className="text-right">Costo</TableHead>
                              <TableHead className="text-right">Stock</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewData.map((product, i) => (
                              <TableRow key={i}>
                                <TableCell className="max-w-32 truncate font-medium">{product.name}</TableCell>
                                <TableCell className="text-slate-600">{product.tipo_articulo_nombre || "—"}</TableCell>
                                <TableCell className="text-right">${(product.costo_unitario || 0).toFixed(2)}</TableCell>
                                <TableCell className="text-right">{product.stock || 0}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <p className="text-xs text-slate-500">Mostrando primeras {Math.min(previewData.length, 3)} de {previewData.length} productos a importar</p>
                    </div>
                  )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={headers.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Confirmar Importación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}