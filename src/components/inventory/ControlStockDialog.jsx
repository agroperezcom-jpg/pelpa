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

export default function ControlStockDialog({ isOpen, onClose, products, existingControl = null }) {
  const [step, setStep] = useState(1); // 1: Crear, 2: Contar, 3: Comparar, 4: Confirmar
  const [currentControl, setCurrentControl] = useState(null);
  const [conteo, setConteo] = useState({}); // { product_id: cantidad_contada }
  const [searchTerm, setSearchTerm] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [lastScanned, setLastScanned] = useState(null);
  const [user, setUser] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const barcodeInputRef = useRef(null);
  const inputsRef = useRef({});
  const queryClient = useQueryClient();

  // Reproducir sonido al escanear
  const audioContextRef = useRef(null);

  const playBeep = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.log("Audio no disponible");
    }
  };

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => console.log("User not authenticated"));
  }, []);

  // Cargar control en curso si existe
  const { data: detallesEnCurso = [] } = useQuery({
    queryKey: ['controlStockDetalle', existingControl?.id],
    queryFn: () => base44.entities.ControlStockDetalle.filter({
      control_stock_id: existingControl.id
    }),
    enabled: !!existingControl && isOpen
  });

  useEffect(() => {
    if (existingControl && isOpen) {
      setCurrentControl(existingControl);
      setStep(2);
      
      // Cargar conteo previo
      const conteoInicial = {};
      detallesEnCurso.forEach(det => {
        conteoInicial[det.product_id] = det.stock_contado;
      });
      setConteo(conteoInicial);
    }
  }, [existingControl, detallesEnCurso, isOpen]);

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
        status: "en_progreso",
        estado: "EN_CURSO",
        usuario_responsable: user.email,
        usuario_nombre: user.full_name,
        total_items: products.length,
        total_productos_contados: 0,
        total_diferencias: 0,
        valor_diferencias: 0,
        detalles: []
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
        status: "completado",
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
      queryClient.invalidateQueries({ queryKey: ['pendingControls'] });
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
        playBeep();
        // Incrementar cantidad
        setConteo(prev => ({
          ...prev,
          [product.id]: (prev[product.id] || 0) + 1
        }));
        
        setLastScanned({
          name: product.name,
          cantidad: (conteo[product.id] || 0) + 1
        });
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

  const saveDetalles = async (detallesData) => {
    for (const { product, cantidad } of detallesData) {
      const diferencia = cantidad - (product.stock || 0);
      const valorDif = diferencia * (product.costo_unitario || 0);
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
  };

  const guardarParcialMutation = useMutation({
    mutationFn: async () => {
      const detallesAGuardar = products
        .filter(p => conteo[p.id] !== undefined && conteo[p.id] >= 0)
        .map(p => ({ product: p, cantidad: conteo[p.id] }));
      
      await saveDetalles(detallesAGuardar);
      
      if (currentControl) {
        await base44.entities.ControlStock.update(currentControl.id, {
          status: "pausado"
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controlStock'] });
      queryClient.invalidateQueries({ queryKey: ['pendingControls'] });
      handleClose();
    }
  });

  const handleGuardarParcial = () => {
    guardarParcialMutation.mutate();
  };

  const guardarConteoMutation = useMutation({
    mutationFn: async () => {
      const detallesAGuardar = products
        .filter(p => conteo[p.id] !== undefined && conteo[p.id] > 0)
        .map(p => ({ 
          product: p, 
          cantidad: conteo[p.id]
        }));
      
      await saveDetalles(detallesAGuardar);
    },
    onSuccess: () => {
      setStep(3);
    }
  });

  const handleGuardarConteo = () => {
    guardarConteoMutation.mutate();
  };

  const { data: detalles = [] } = useQuery({
    queryKey: ['controlStockDetalle', currentControl?.id, step],
    queryFn: () => base44.entities.ControlStockDetalle.filter({
      control_stock_id: currentControl.id
    }),
    enabled: !!currentControl && step === 3,
    staleTime: 0,
    refetchInterval: false
  });

  const handleConfirmarAjustes = (observaciones) => {
    finalizarControlMutation.mutate({
      controlId: currentControl.id,
      ajustes: detalles,
      observaciones
    });
  };

  const deleteControlMutation = useMutation({
    mutationFn: async (controlId) => {
      // Eliminar detalles del control
      const detalles = await base44.entities.ControlStockDetalle.filter({
        control_stock_id: controlId
      });
      
      for (const detalle of detalles) {
        await base44.entities.ControlStockDetalle.delete(detalle.id);
      }
      
      // Eliminar el control
      await base44.entities.ControlStock.delete(controlId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controlStock'] });
      queryClient.invalidateQueries({ queryKey: ['pendingControls'] });
      handleClose();
    }
  });

  const handleDeleteControl = async () => {
    if (!currentControl) {
      alert("No hay control de stock seleccionado");
      return;
    }
    if (confirm("¿Estás seguro? Esto eliminará el control de stock parcial y todos sus datos. Esta acción no se puede deshacer.")) {
      deleteControlMutation.mutate(currentControl.id);
    }
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
                      placeholder="Buscar por nombre o código de barras..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="border rounded-lg max-h-96 overflow-y-auto">
                    <div className="grid gap-0">
                      {/* Header */}
                      <div className="sticky top-0 bg-slate-50 border-b grid grid-cols-3 gap-4 p-3 font-semibold text-sm">
                        <div>Producto</div>
                        <div className="text-center">Stock Teórico</div>
                        <div className="text-center">Cantidad Contada</div>
                      </div>

                      {/* Filas */}
                      {filteredProducts.map((product, index) => (
                        <div
                          key={product.id}
                          className="border-b grid grid-cols-3 gap-4 p-3 items-center hover:bg-slate-50"
                        >
                          {/* Columna 1: Producto */}
                          <div>
                            <p className="font-medium text-sm">{product.name}</p>
                            {product.barcode && (
                              <p className="text-xs text-slate-400">{product.barcode}</p>
                            )}
                          </div>

                          {/* Columna 2: Stock Teórico */}
                          <div className="text-center">
                            <span className="px-3 py-1 bg-slate-100 rounded-lg text-sm font-semibold text-slate-700 inline-block">
                              {product.stock || 0}
                            </span>
                          </div>

                          {/* Columna 3: Input Cantidad */}
                          <div className="flex justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateConteo(product.id, Math.max(0, (conteo[product.id] || 0) - 1))}
                              className="px-2 py-1 border border-slate-300 rounded hover:bg-slate-100"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <input
                              ref={(el) => { if (el) inputsRef.current[product.id] = el; }}
                              type="number"
                              min="0"
                              value={conteo[product.id] ?? ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || val === "-") {
                                  const newConteo = { ...conteo };
                                  delete newConteo[product.id];
                                  setConteo(newConteo);
                                } else {
                                  const num = Math.max(0, parseInt(val, 10));
                                  setConteo({ ...conteo, [product.id]: num });
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const nextIdx = index + 1;
                                  if (nextIdx < filteredProducts.length) {
                                    const nextProduct = filteredProducts[nextIdx];
                                    setTimeout(() => {
                                      const nextEl = inputsRef.current[nextProduct.id];
                                      if (nextEl) {
                                        nextEl.focus();
                                        nextEl.select();
                                      }
                                    }, 0);
                                  }
                                }
                              }}
                              className="w-16 text-center border border-slate-300 rounded px-2 py-1 text-sm"
                              placeholder="0"
                              autoComplete="off"
                            />
                            <button
                              type="button"
                              onClick={() => updateConteo(product.id, (conteo[product.id] || 0) + 1)}
                              className="px-2 py-1 border border-slate-300 rounded hover:bg-slate-100"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {filteredProducts.length === 0 && (
                        <div className="text-center py-8 text-slate-500 text-sm">
                          No se encontraron productos
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex items-center justify-between gap-2 border-t pt-4">
                 <Button 
                   variant="destructive"
                   onClick={handleDeleteControl}
                   disabled={deleteControlMutation.isPending}
                   size="sm"
                 >
                   <X className="h-4 w-4 mr-2" />
                   {deleteControlMutation.isPending ? "Eliminando..." : "Eliminar Control"}
                 </Button>
                 <div className="flex gap-2">
                   <Button variant="outline" onClick={handleClose} size="sm">
                     Cancelar
                   </Button>
                   <Button
                     variant="outline"
                     onClick={handleGuardarParcial}
                     disabled={guardarParcialMutation.isPending}
                     size="sm"
                   >
                     <Save className="h-4 w-4 mr-2" />
                     {guardarParcialMutation.isPending ? "Guardando..." : "Guardar Parcial"}
                   </Button>
                   <Button
                     onClick={handleGuardarConteo}
                     className="bg-blue-600 hover:bg-blue-700"
                     disabled={guardarConteoMutation.isPending}
                     size="sm"
                   >
                     <CheckCircle2 className="h-4 w-4 mr-2" />
                     {guardarConteoMutation.isPending ? "Guardando..." : `Finalizar (${productosContados})`}
                   </Button>
                 </div>
               </div>
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
                  onClick={() => setShowConfirmation(true)}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={finalizarControlMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {finalizarControlMutation.isPending ? "Aplicando..." : "Confirmar y Aplicar Ajustes"}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Confirmation Dialog */}
          {showConfirmation && (
           <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
             <div className="bg-white rounded-lg p-6 max-w-md">
               <h3 className="text-lg font-bold text-slate-800 mb-2">Confirmar ajustes</h3>
               <p className="text-sm text-slate-600 mb-4">
                 Estás a punto de aplicar {detalles.filter(d => d.diferencia !== 0).length} ajustes de stock.
                 Esta acción no se puede deshacer. ¿Deseas continuar?
               </p>
               <div className="flex gap-2 justify-end">
                 <Button
                   variant="outline"
                   onClick={() => setShowConfirmation(false)}
                 >
                   Cancelar
                 </Button>
                 <Button
                   className="bg-green-600 hover:bg-green-700"
                   onClick={() => {
                     const obs = document.getElementById('observaciones-finales').value;
                     handleConfirmarAjustes(obs);
                     setShowConfirmation(false);
                   }}
                 >
                   Confirmar
                 </Button>
               </div>
             </div>
           </div>
          )}
          </div>
          </DialogContent>
          </Dialog>
          );
          }