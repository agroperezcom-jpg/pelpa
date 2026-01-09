import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardList,
  Barcode,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Save,
  X,
  TrendingUp,
  TrendingDown,
  Scan
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ControlStockDialog({ isOpen, onClose, products, controlEnCurso = null }) {
  const [step, setStep] = useState(1); // 1: Crear, 2: Contar, 3: Comparar, 4: Confirmar
  const [currentControl, setCurrentControl] = useState(null);
  const [conteo, setConteo] = useState({}); // { product_id: cantidad_contada }
  const [searchTerm, setSearchTerm] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [lastScanned, setLastScanned] = useState(null);
  const [user, setUser] = useState(null);
  const barcodeInputRef = useRef(null);
  const inputsRef = useRef({});
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Cargar control en curso si existe
  const { data: detallesEnCurso = [] } = useQuery({
    queryKey: ['controlStockDetalle', controlEnCurso?.id],
    queryFn: () => base44.entities.ControlStockDetalle.filter({
      control_stock_id: controlEnCurso.id
    }),
    enabled: !!controlEnCurso && isOpen
  });

  useEffect(() => {
    if (controlEnCurso && isOpen) {
      setCurrentControl(controlEnCurso);
      setStep(2);
      
      // Cargar conteo previo
      const conteoInicial = {};
      detallesEnCurso.forEach(det => {
        conteoInicial[det.product_id] = det.stock_contado;
      });
      setConteo(conteoInicial);
    }
  }, [controlEnCurso, detallesEnCurso, isOpen]);

  // Auto-focus en input de código de barras
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    }
    return () => {
      inputsRef.current = {};
    };
  }, [step]);

  const createControlMutation = useMutation({
    mutationFn: async (data) => {
      const control = await base44.entities.ControlStock.create({
        ...data,
        fecha_inicio: new Date().toISOString(),
        estado: "EN_CURSO",
        usuario_responsable: user.email,
        usuario_nombre: user.full_name,
        total_productos_contados: 0,
        total_diferencias: 0,
        valor_diferencias: 0
      });
      return control;
    },
    onSuccess: (control) => {
      setCurrentControl(control);
      setStep(2);
    }
  });

  const finalizarControlMutation = useMutation({
    mutationFn: async ({ controlId, ajustes, observaciones }) => {
      // 1. Aplicar ajustes de stock
      for (const ajuste of ajustes) {
        if (ajuste.diferencia !== 0) {
          const product = products.find(p => p.id === ajuste.product_id);
          if (product) {
            // Actualizar stock
            await base44.entities.Product.update(ajuste.product_id, {
              stock: ajuste.stock_contado
            });

            // Crear movimiento de inventario
            await base44.entities.InventoryMovement.create({
              product_id: ajuste.product_id,
              product_name: ajuste.product_name,
              type: "ajuste",
              quantity: ajuste.diferencia,
              previous_stock: ajuste.stock_teorico,
              new_stock: ajuste.stock_contado,
              reason: `Control de stock: ${currentControl.nombre}`,
              reference: `control-${controlId}`
            });

            // Marcar detalle como aplicado
            await base44.entities.ControlStockDetalle.update(ajuste.id, {
              ajuste_aplicado: true
            });
          }
        }
      }

      // 2. Finalizar control
      const totalDiferencias = ajustes.filter(a => a.diferencia !== 0).length;
      const valorDiferencias = ajustes.reduce((acc, a) => acc + Math.abs(a.valor_diferencia), 0);

      await base44.entities.ControlStock.update(controlId, {
        estado: "FINALIZADO",
        fecha_finalizacion: new Date().toISOString(),
        total_productos_contados: ajustes.length,
        total_diferencias: totalDiferencias,
        valor_diferencias: valorDiferencias,
        observaciones: observaciones || ""
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['controlStock'] });
      handleClose();
    }
  });

  const handleCreateControl = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    createControlMutation.mutate({
      nombre: formData.get('nombre'),
      deposito: formData.get('deposito'),
      observaciones: formData.get('observaciones')
    });
  };

  const handleBarcodeInput = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = barcodeInput.trim();
      if (!code) return;

      // Buscar producto por código de barras
      const product = products.find(p => p.barcode === code);
      
      if (product) {
        // Incrementar cantidad
        setConteo(prev => ({
          ...prev,
          [product.id]: (prev[product.id] || 0) + 1
        }));
        
        setLastScanned({
          name: product.name,
          cantidad: (conteo[product.id] || 0) + 1
        });
        
        // Sonido de éxito (opcional)
        // new Audio('/beep.mp3').play();
      } else {
        alert(`⚠️ Código de barras no encontrado: ${code}`);
      }
      
      setBarcodeInput("");
      barcodeInputRef.current?.focus();
    }
  };

  const updateConteo = (productId, cantidad) => {
    setConteo(prev => ({
      ...prev,
      [productId]: Math.max(0, cantidad)
    }));
  };

  const handleGuardarParcial = async () => {
    // Guardar progreso parcial sin finalizar
    for (const product of products) {
      const cantidad = conteo[product.id];
      if (cantidad === undefined) continue; // Solo guardar productos contados
      
      const diferencia = cantidad - (product.stock || 0);
      const valorDif = diferencia * (product.costo_unitario || 0);

      // Verificar si ya existe detalle
      const detalleExistente = detallesEnCurso.find(d => d.product_id === product.id);
      
      if (detalleExistente) {
        await base44.entities.ControlStockDetalle.update(detalleExistente.id, {
          stock_contado: cantidad,
          diferencia: diferencia,
          valor_diferencia: valorDif
        });
      } else {
        await base44.entities.ControlStockDetalle.create({
          control_stock_id: currentControl.id,
          product_id: product.id,
          product_name: product.name,
          barcode: product.barcode,
          stock_teorico: product.stock || 0,
          stock_contado: cantidad,
          diferencia: diferencia,
          costo_unitario: product.costo_unitario || 0,
          valor_diferencia: valorDif,
          ajuste_aplicado: false
        });
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ['controlStock'] });
    handleClose();
  };

  const handleGuardarConteo = async () => {
    // Guardar todos los detalles del conteo para revisión
    for (const product of products) {
      const cantidad = conteo[product.id] || 0;
      const diferencia = cantidad - (product.stock || 0);
      const valorDif = diferencia * (product.costo_unitario || 0);

      // Verificar si ya existe detalle
      const detalleExistente = detallesEnCurso.find(d => d.product_id === product.id);
      
      if (detalleExistente) {
        await base44.entities.ControlStockDetalle.update(detalleExistente.id, {
          stock_contado: cantidad,
          diferencia: diferencia,
          valor_diferencia: valorDif
        });
      } else {
        await base44.entities.ControlStockDetalle.create({
          control_stock_id: currentControl.id,
          product_id: product.id,
          product_name: product.name,
          barcode: product.barcode,
          stock_teorico: product.stock || 0,
          stock_contado: cantidad,
          diferencia: diferencia,
          costo_unitario: product.costo_unitario || 0,
          valor_diferencia: valorDif,
          ajuste_aplicado: false
        });
      }
    }
    
    setStep(3);
  };

  const { data: detalles = [] } = useQuery({
    queryKey: ['controlStockDetalle', currentControl?.id],
    queryFn: () => base44.entities.ControlStockDetalle.filter({
      control_stock_id: currentControl.id
    }),
    enabled: !!currentControl && step === 3
  });

  const handleConfirmarAjustes = (observaciones) => {
    finalizarControlMutation.mutate({
      controlId: currentControl.id,
      ajustes: detalles,
      observaciones
    });
  };

  const handleClose = () => {
    setStep(1);
    setCurrentControl(null);
    setConteo({});
    setSearchTerm("");
    setBarcodeInput("");
    setLastScanned(null);
    onClose();
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode?.includes(searchTerm)
  );

  const productosContados = Object.keys(conteo).filter(id => conteo[id] > 0).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-blue-600" />
            Control de Stock - {
              step === 1 ? "Iniciar" :
              step === 2 ? "Conteo en curso" :
              step === 3 ? "Revisión de diferencias" : ""
            }
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* PASO 1: Crear control */}
          {step === 1 && (
            <form onSubmit={handleCreateControl} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Control de Stock Profesional:</strong> Este proceso te permitirá contar el inventario físico, 
                  comparar con el stock teórico y ajustar las diferencias de forma controlada y auditable.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del Control *</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  placeholder="Ej: Inventario Enero 2026"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deposito">Depósito / Ubicación</Label>
                <Input
                  id="deposito"
                  name="deposito"
                  placeholder="Ej: Depósito Principal"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  name="observaciones"
                  placeholder="Notas adicionales..."
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Iniciar Control
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* PASO 2: Conteo */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Header con info del control */}
              <div className="bg-slate-100 rounded-lg p-4 border-2 border-slate-300">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-lg">{currentControl.nombre}</p>
                    <p className="text-sm text-slate-600">
                      {currentControl.deposito && `${currentControl.deposito} • `}
                      Iniciado: {format(new Date(currentControl.fecha_inicio), "d MMM yyyy HH:mm", { locale: es })}
                    </p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">
                    {productosContados} / {products.length} productos contados
                  </Badge>
                </div>
              </div>

              <Tabs defaultValue="barcode" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="barcode" className="flex items-center gap-2">
                    <Scan className="h-4 w-4" />
                    Lector de Código
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Carga Manual
                  </TabsTrigger>
                </TabsList>

                {/* Modo Lector de Código de Barras */}
                <TabsContent value="barcode" className="space-y-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                        <Barcode className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-lg">Modo Escáner Activo</p>
                        <p className="text-sm text-slate-600">Escanea productos para incrementar automáticamente</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Escanear Código de Barras</Label>
                      <Input
                        ref={barcodeInputRef}
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyDown={handleBarcodeInput}
                        placeholder="Escanea el código o escríbelo manualmente..."
                        className="h-14 text-lg font-mono bg-white"
                        autoFocus
                      />
                      <p className="text-xs text-slate-500">
                        💡 Tip: Escanea el mismo producto varias veces para incrementar la cantidad
                      </p>
                    </div>

                    {lastScanned && (
                      <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
                        <p className="text-sm font-medium text-green-800">
                          ✓ {lastScanned.name} - Cantidad: {lastScanned.cantidad}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Resumen de productos escaneados */}
                  <div className="border rounded-lg max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0">
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-center">Contado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products
                          .filter(p => conteo[p.id] > 0)
                          .map(product => (
                            <TableRow key={product.id}>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-blue-100 text-blue-700 text-lg px-3">
                                  {conteo[product.id]}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => updateConteo(product.id, conteo[product.id] + 1)}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => updateConteo(product.id, conteo[product.id] - 1)}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        {Object.keys(conteo).filter(id => conteo[id] > 0).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                              Escanea productos para comenzar el conteo
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* Modo Manual */}
                <TabsContent value="manual" className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Buscar producto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="border rounded-lg max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0">
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-center">Stock Teórico</TableHead>
                          <TableHead className="text-center">Cantidad Contada</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((product, index) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                {product.barcode && (
                                  <p className="text-xs text-slate-400">{product.barcode}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="px-3 py-1 bg-slate-100 rounded-lg inline-block">
                                <p className="text-sm font-semibold text-slate-700">{product.stock || 0}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-center gap-1 items-center">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-7 w-7"
                                  onClick={() => updateConteo(product.id, (conteo[product.id] || 0) - 1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                   ref={(el) => {
                                     if (el) inputsRef.current[product.id] = el;
                                   }}
                                   type="number"
                                   min="0"
                                   value={conteo[product.id] !== undefined ? conteo[product.id] : ""}
                                   onChange={(e) => {
                                     const val = e.target.value;
                                     if (val === "") {
                                       setConteo(prev => {
                                         const newConteo = { ...prev };
                                         delete newConteo[product.id];
                                         return newConteo;
                                       });
                                     } else {
                                       const num = parseInt(val, 10);
                                       if (!isNaN(num) && num >= 0) {
                                         setConteo(prev => ({ ...prev, [product.id]: num }));
                                       }
                                     }
                                   }}
                                   onKeyDown={(e) => {
                                     if (e.key === 'Enter') {
                                       e.preventDefault();
                                       const nextProduct = filteredProducts[index + 1];
                                       if (nextProduct) {
                                         setTimeout(() => {
                                           inputsRef.current[nextProduct.id]?.focus();
                                           inputsRef.current[nextProduct.id]?.select();
                                         }, 0);
                                       }
                                     }
                                   }}
                                   className="w-20 text-center"
                                   placeholder="0"
                                 />
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-7 w-7"
                                  onClick={() => updateConteo(product.id, (conteo[product.id] || 0) + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  variant="outline"
                  onClick={handleGuardarParcial}
                  disabled={productosContados === 0}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Parcial
                </Button>
                <Button
                  onClick={handleGuardarConteo}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={productosContados === 0}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Finalizar Conteo ({productosContados} productos)
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* PASO 3: Comparación */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Revisión de Diferencias:</strong> Verifica los resultados antes de confirmar los ajustes.
                  Los cambios se aplicarán al stock real una vez que confirmes.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white border rounded-lg p-4">
                  <p className="text-sm text-slate-500">Productos Contados</p>
                  <p className="text-2xl font-bold">{detalles.length}</p>
                </div>
                <div className="bg-white border rounded-lg p-4">
                  <p className="text-sm text-slate-500">Con Diferencias</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {detalles.filter(d => d.diferencia !== 0).length}
                  </p>
                </div>
                <div className="bg-white border rounded-lg p-4">
                  <p className="text-sm text-slate-500">Valor Diferencias</p>
                  <p className="text-2xl font-bold text-red-600">
                    ${detalles.reduce((acc, d) => acc + Math.abs(d.valor_diferencia), 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="border rounded-lg max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0">
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Stock Teórico</TableHead>
                      <TableHead className="text-center">Stock Contado</TableHead>
                      <TableHead className="text-center">Diferencia</TableHead>
                      <TableHead className="text-right">Valor Dif.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalles
                      .filter(d => d.diferencia !== 0)
                      .map(detalle => (
                        <TableRow key={detalle.id} className={
                          detalle.diferencia > 0 ? "bg-green-50" : "bg-red-50"
                        }>
                          <TableCell className="font-medium">{detalle.product_name}</TableCell>
                          <TableCell className="text-center">{detalle.stock_teorico}</TableCell>
                          <TableCell className="text-center font-bold">
                            {detalle.stock_contado}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={
                              detalle.diferencia > 0
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }>
                              {detalle.diferencia > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                              {detalle.diferencia > 0 ? '+' : ''}{detalle.diferencia}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${Math.abs(detalle.valor_diferencia).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    {detalles.filter(d => d.diferencia !== 0).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                          <p className="font-medium">¡Inventario perfecto!</p>
                          <p className="text-sm">No hay diferencias entre el stock teórico y el contado</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-2">
                <Label>Observaciones finales (opcional)</Label>
                <Textarea
                  id="observaciones-finales"
                  placeholder="Comentarios sobre el control de stock..."
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setStep(2)}>
                  Volver al Conteo
                </Button>
                <Button
                  onClick={() => {
                    const obs = document.getElementById('observaciones-finales').value;
                    handleConfirmarAjustes(obs);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={finalizarControlMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {finalizarControlMutation.isPending ? "Aplicando..." : "Confirmar y Aplicar Ajustes"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}