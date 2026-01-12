import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText, Plus, Search, Trash2, Eye, Send, CheckCircle2,
  XCircle, Clock, AlertTriangle, Package, Briefcase, Download,
  Edit, Ban, Printer, X
} from "lucide-react";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import PresupuestoPDF from "../components/presupuestos/PresupuestoPDF";
import CobroPresupuestoDialog from "../components/presupuestos/CobroPresupuestoDialog";
import CancelacionPresupuestoDialog from "../components/presupuestos/CancelacionPresupuestoDialog";

export default function Presupuestos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState("TODOS");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isConfirmAceptarOpen, setIsConfirmAceptarOpen] = useState(false);
  const [selectedPresupuesto, setSelectedPresupuesto] = useState(null);
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [currentPresupuesto, setCurrentPresupuesto] = useState({
    fecha: format(new Date(), 'yyyy-MM-dd'),
    cliente_id: "",
    validez_hasta: format(addDays(new Date(), 15), 'yyyy-MM-dd'),
    observaciones: "",
    descuento: 0
  });
  const [productSearch, setProductSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [activeTab, setActiveTab] = useState("products");
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isCobroDialogOpen, setIsCobroDialogOpen] = useState(false);
  const [isCancelacionDialogOpen, setIsCancelacionDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: presupuestos = [] } = useQuery({
    queryKey: ['presupuestos'],
    queryFn: () => base44.entities.Presupuesto.list('-created_date', 200)
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.Service.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: tiposComprobante = [] } = useQuery({
    queryKey: ['tiposComprobante'],
    queryFn: () => base44.entities.TipoComprobante.list()
  });

  const { data: bancos = [] } = useQuery({
    queryKey: ['bancos'],
    queryFn: () => base44.entities.Banco.list()
  });

  const { data: cajas = [] } = useQuery({
    queryKey: ['cajas'],
    queryFn: () => base44.entities.Caja.list()
  });

  const { data: configuracionIIBB = [] } = useQuery({
    queryKey: ['configuracionIIBB'],
    queryFn: () => base44.entities.ConfiguracionIIBB.list()
  });

  const { data: projectTemplates = [] } = useQuery({
    queryKey: ['projectTemplates'],
    queryFn: () => base44.entities.ProjectTemplate.list()
  });

  const createPresupuestoMutation = useMutation({
    mutationFn: async ({ presupuestoData, nuevoEstado }) => {
      const cliente = clients.find(c => c.id === presupuestoData.cliente_id);
      
      // Generar número de presupuesto
      let tipoPresupuesto = tiposComprobante.find(tc => tc.codigo === "P");
      
      if (!tipoPresupuesto) {
        tipoPresupuesto = await base44.entities.TipoComprobante.create({
          codigo: "P",
          descripcion: "Presupuesto",
          prefijo: "P",
          longitud_numero: 6,
          ultimo_numero: 0,
          is_active: true
        });
      }

      const nuevoNumero = tipoPresupuesto.ultimo_numero + 1;
      const numeroFormateado = String(nuevoNumero).padStart(tipoPresupuesto.longitud_numero, '0');
      const numeroPresupuesto = `${tipoPresupuesto.prefijo}-${numeroFormateado}`;

      await base44.entities.TipoComprobante.update(tipoPresupuesto.id, {
        ultimo_numero: nuevoNumero
      });

      const presupuesto = await base44.entities.Presupuesto.create({
        ...presupuestoData,
        cliente_name: cliente?.name || "",
        cliente_tipo_iva: cliente?.tipo_iva || "",
        numero_presupuesto: numeroPresupuesto,
        estado: nuevoEstado || "BORRADOR",
        usuario_creador: user.email,
        usuario_creador_nombre: user.full_name
      });

      return presupuesto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      queryClient.invalidateQueries({ queryKey: ['tiposComprobante'] });
      handleCloseDialog();
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const cambiarEstadoMutation = useMutation({
    mutationFn: async ({ presupuestoId, nuevoEstado, pagos, generaIVA, generaIIBB }) => {
      const presupuesto = presupuestos.find(p => p.id === presupuestoId);
      
      // Validaciones
      if (nuevoEstado === "ACEPTADO") {
        if (!presupuesto.cliente_id) {
          throw new Error("No se puede aceptar un presupuesto sin cliente");
        }
        if (!presupuesto.items || presupuesto.items.length === 0) {
          throw new Error("No se puede aceptar un presupuesto sin items");
        }
        if (new Date(presupuesto.validez_hasta) < new Date()) {
          throw new Error("No se puede aceptar un presupuesto vencido");
        }
        if (!pagos || pagos.length === 0) {
          throw new Error("Debe registrar el cobro del presupuesto");
        }

        const totalCobrado = pagos.reduce((acc, p) => acc + p.importe, 0);
        if (Math.abs(totalCobrado - presupuesto.total_presupuesto) > 0.01) {
          throw new Error("Debe cobrarse el 100% del presupuesto para aceptarlo");
        }

        // CONVERSIÓN AUTOMÁTICA CON COBRO
        
        // 1) Crear VENTA con número de comprobante
        const netoGravado = generaIVA ? presupuesto.total_presupuesto / 1.21 : presupuesto.total_presupuesto;
        const ivaCalculado = generaIVA ? presupuesto.total_presupuesto - netoGravado : 0;
        
        // Determinar tipo de comprobante
        let tipoComprobante;
        if (generaIVA) {
          const cliente = clients.find(c => c.id === presupuesto.cliente_id);
          tipoComprobante = cliente?.tipo_iva === "RESP_INSCRIPTO" ? "A" : "B";
        } else {
          tipoComprobante = "X";
        }
        
        // Buscar o crear tipo de comprobante
        let tipoComprobanteRecord = tiposComprobante.find(tc => tc.codigo === tipoComprobante);
        
        if (!tipoComprobanteRecord) {
          tipoComprobanteRecord = await base44.entities.TipoComprobante.create({
            codigo: tipoComprobante,
            descripcion: tipoComprobante === "B" ? "Factura B - Con IVA" : "Ticket X - Sin IVA",
            prefijo: tipoComprobante,
            longitud_numero: 4,
            ultimo_numero: 0,
            is_active: true
          });
        }

        // Incrementar número
        const nuevoNumero = tipoComprobanteRecord.ultimo_numero + 1;
        const numeroFormateado = String(nuevoNumero).padStart(tipoComprobanteRecord.longitud_numero, '0');
        const numeroComprobante = `${tipoComprobanteRecord.prefijo}-${numeroFormateado}`;

        await base44.entities.TipoComprobante.update(tipoComprobanteRecord.id, {
          ultimo_numero: nuevoNumero
        });
        
        const venta = await base44.entities.Sale.create({
          client_id: presupuesto.cliente_id,
          client_name: presupuesto.cliente_name,
          client_tipo_iva: presupuesto.cliente_tipo_iva,
          employee_email: user.email,
          employee_name: user.full_name,
          origen: "PRESUPUESTO",
          presupuesto_origen_id: presupuestoId,
          tipo_lista: "MINORISTA",
          tipo_venta: "CONTADO",
          estado: "CONFIRMADA",
          genera_iva: generaIVA,
          tipo_comprobante: tipoComprobante,
          numero_comprobante: numeroComprobante,
          items: presupuesto.items,
          subtotal: presupuesto.subtotal,
          discount: presupuesto.descuento || 0,
          neto_gravado: netoGravado,
          iva_21: ivaCalculado,
          total: presupuesto.total_presupuesto,
          notes: `Generada automáticamente desde presupuesto ${presupuesto.numero_presupuesto} - COBRADO`,
          project_id: null
        });

        // 2) Generar IVA Ventas si corresponde
        if (generaIVA) {
          await base44.entities.IVAVenta.create({
            venta_id: venta.id,
            fecha: format(new Date(), 'yyyy-MM-dd'),
            tipo_comprobante: tipoComprobante,
            numero_comprobante: numeroComprobante,
            cliente_nombre: venta.client_name,
            cliente_tipo_iva: venta.client_tipo_iva,
            neto_gravado: netoGravado,
            iva_21: ivaCalculado,
            total: presupuesto.total_presupuesto,
            periodo: format(new Date(), 'yyyy-MM')
          });
        }

        // Generar IIBB Ventas si corresponde
        if (generaIIBB) {
          const configIIBB = configuracionIIBB[0];
          if (configIIBB) {
            const netoGravadoIIBB = generaIVA ? netoGravado : presupuesto.total_presupuesto;
            const importeIIBB = netoGravadoIIBB * configIIBB.alicuota_iibb;

            await base44.entities.IIBBVenta.create({
              venta_id: venta.id,
              fecha: format(new Date(), 'yyyy-MM-dd'),
              periodo: format(new Date(), 'yyyy-MM'),
              cliente_nombre: venta.client_name,
              neto_gravado: netoGravadoIIBB,
              alicuota: configIIBB.alicuota_iibb,
              importe_iibb: importeIIBB,
              numero_comprobante: numeroComprobante
            });
          }
        }

        // 3) Registrar COBROS en TESORERÍA (NO cuenta corriente)
        for (const pago of pagos) {
          await base44.entities.MovimientoTesoreria.create({
            fecha: format(new Date(), 'yyyy-MM-dd'),
            tipo: "INGRESO",
            medio_pago_id: pago.medio_pago_id,
            medio_pago_nombre: pago.medio_pago_nombre,
            banco_id: pago.banco_id,
            banco_nombre: pago.banco_nombre,
            caja_id: pago.caja_id,
            caja_nombre: pago.caja_nombre,
            importe: pago.importe,
            referencia_tipo: "presupuesto",
            referencia_id: presupuestoId,
            observaciones: `Cobro presupuesto ${presupuesto.numero_presupuesto} - ${presupuesto.cliente_name}`
          });

          // Actualizar saldos de bancos/cajas
          if (pago.banco_id) {
            const banco = bancos.find(b => b.id === pago.banco_id);
            await base44.entities.Banco.update(pago.banco_id, {
              saldo_actual: (banco?.saldo_actual || 0) + pago.importe
            });
          }
          if (pago.caja_id) {
            const caja = cajas.find(c => c.id === pago.caja_id);
            await base44.entities.Caja.update(pago.caja_id, {
              saldo_actual: (caja?.saldo_actual || 0) + pago.importe
            });
          }
        }

        // 4) Crear PROYECTO PMS
        const proyecto = await base44.entities.Project.create({
          name: `Proyecto - ${presupuesto.numero_presupuesto}`,
          description: presupuesto.observaciones || `Proyecto generado automáticamente desde presupuesto ${presupuesto.numero_presupuesto}`,
          client_id: presupuesto.cliente_id,
          client_name: presupuesto.cliente_name,
          type: "venta_especial",
          status: "activo",
          priority: "media",
          start_date: format(new Date(), 'yyyy-MM-dd'),
          responsible_email: user.email,
          responsible_name: user.full_name,
          estimated_budget: presupuesto.total_presupuesto,
          actual_budget: 0
        });

        // Actualizar venta con proyecto_id
        await base44.entities.Sale.update(venta.id, {
          project_id: proyecto.id
        });

        // 5) Actualizar presupuesto
        await base44.entities.Presupuesto.update(presupuestoId, {
          estado: "ACEPTADO",
          venta_id: venta.id,
          proyecto_id: proyecto.id,
          fecha_aceptacion: new Date().toISOString(),
          aceptado_por: user.email,
          genera_iva: generaIVA,
          genera_iibb: generaIIBB,
          neto_gravado: netoGravado,
          iva_21: ivaCalculado
        });

        return { venta, proyecto };
      } else {
        // Cambio simple de estado
        await base44.entities.Presupuesto.update(presupuestoId, {
          estado: nuevoEstado
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['movimientosTesoreria'] });
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['cajas'] });
      queryClient.invalidateQueries({ queryKey: ['ivaVentas'] });
      setIsCobroDialogOpen(false);
      setSelectedPresupuesto(null);
      setIsDetailDialogOpen(false);
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const handleOpenDialog = () => {
    setCart([]);
    setCurrentPresupuesto({
      fecha: format(new Date(), 'yyyy-MM-dd'),
      cliente_id: "",
      validez_hasta: format(addDays(new Date(), 15), 'yyyy-MM-dd'),
      observaciones: "",
      descuento: 0
    });
    setProductSearch("");
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setCart([]);
  };

  const addToCart = (item, type) => {
    const existingIndex = cart.findIndex(c => c.item_id === item.id && c.type === type);
    
    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].cantidad += 1;
      newCart[existingIndex].subtotal = newCart[existingIndex].precio_unitario * newCart[existingIndex].cantidad;
      setCart(newCart);
    } else {
      const precio = type === 'product' ? (item.precio_lista_minorista || 0) : (item.price || 0);
      setCart([...cart, {
        type,
        item_id: item.id,
        name: item.name,
        descripcion: item.description || "",
        cantidad: 1,
        precio_unitario: precio,
        subtotal: precio
      }]);
    }
  };

  const updateCartQuantity = (index, cantidad) => {
    if (cantidad <= 0) {
      removeFromCart(index);
      return;
    }
    const newCart = [...cart];
    newCart[index].cantidad = cantidad;
    newCart[index].subtotal = newCart[index].precio_unitario * cantidad;
    setCart(newCart);
  };

  const updateCartPrice = (index, precio) => {
    const newCart = [...cart];
    newCart[index].precio_unitario = precio;
    newCart[index].subtotal = precio * newCart[index].cantidad;
    setCart(newCart);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const subtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const total = subtotal - (currentPresupuesto.descuento || 0);

  const handleSubmit = (enviar = false) => {
    if (cart.length === 0) {
      alert("Debe agregar al menos un ítem");
      return;
    }
    if (!currentPresupuesto.cliente_id) {
      alert("Debe seleccionar un cliente");
      return;
    }

    createPresupuestoMutation.mutate({
      presupuestoData: {
        fecha: currentPresupuesto.fecha,
        cliente_id: currentPresupuesto.cliente_id,
        validez_hasta: currentPresupuesto.validez_hasta,
        observaciones: currentPresupuesto.observaciones,
        items: cart,
        subtotal: subtotal,
        descuento: currentPresupuesto.descuento || 0,
        total_presupuesto: total
      },
      nuevoEstado: enviar ? "ENVIADO" : "BORRADOR"
    });
  };

  const handleAceptarPresupuesto = (pagos, generaIVA, generaIIBB) => {
    cambiarEstadoMutation.mutate({
      presupuestoId: selectedPresupuesto.id,
      nuevoEstado: "ACEPTADO",
      pagos,
      generaIVA,
      generaIIBB
    });
  };

  const handleCambiarEstado = (presupuestoId, nuevoEstado) => {
    cambiarEstadoMutation.mutate({ presupuestoId, nuevoEstado });
  };

  const cancelarPresupuestoMutation = useMutation({
    mutationFn: async ({ presupuestoId, tipoCancelacion, motivo, devoluciones }) => {
      const presupuesto = presupuestos.find(p => p.id === presupuestoId);
      
      if (!presupuesto) {
        throw new Error("Presupuesto no encontrado");
      }

      if (presupuesto.estado !== "ACEPTADO") {
        throw new Error("Solo se pueden cancelar presupuestos aceptados");
      }

      // 1) Crear registro de cancelación
      const cancelacion = await base44.entities.CancelacionPresupuesto.create({
        presupuesto_id: presupuestoId,
        presupuesto_numero: presupuesto.numero_presupuesto,
        venta_id: presupuesto.venta_id,
        proyecto_id: presupuesto.proyecto_id,
        fecha: new Date().toISOString(),
        motivo,
        tipo_cancelacion: tipoCancelacion,
        usuario_email: user.email,
        usuario_nombre: user.full_name,
        total_original: presupuesto.total_presupuesto,
        total_devuelto: tipoCancelacion === "CON_DEVOLUCION" ? presupuesto.total_presupuesto : 0,
        genero_iva: presupuesto.genera_iva || false,
        iva_revertido: presupuesto.genera_iva ? presupuesto.iva_21 || 0 : 0,
        estado: "CONFIRMADA"
      });

      // 2) Procesar devoluciones si aplica
      if (tipoCancelacion === "CON_DEVOLUCION") {
        for (const dev of devoluciones) {
          // Registrar devolución
          await base44.entities.DevolucionCobro.create({
            cancelacion_id: cancelacion.id,
            presupuesto_id: presupuestoId,
            medio_pago_id: dev.medio_pago_id,
            medio_pago_nombre: dev.medio_pago_nombre,
            importe: dev.importe,
            banco_id: dev.banco_id,
            banco_nombre: dev.banco_nombre,
            caja_id: dev.caja_id,
            caja_nombre: dev.caja_nombre,
            fecha: new Date().toISOString()
          });

          // Generar movimiento de tesorería (EGRESO)
          await base44.entities.MovimientoTesoreria.create({
            fecha: format(new Date(), 'yyyy-MM-dd'),
            tipo: "EGRESO",
            medio_pago_id: dev.medio_pago_id,
            medio_pago_nombre: dev.medio_pago_nombre,
            banco_id: dev.banco_id,
            banco_nombre: dev.banco_nombre,
            caja_id: dev.caja_id,
            caja_nombre: dev.caja_nombre,
            importe: dev.importe,
            referencia_tipo: "cancelacion_presupuesto",
            referencia_id: cancelacion.id,
            observaciones: `Devolución cancelación ${presupuesto.numero_presupuesto} - ${presupuesto.cliente_name}`
          });

          // Actualizar saldos (restar)
          if (dev.banco_id) {
            const banco = bancos.find(b => b.id === dev.banco_id);
            await base44.entities.Banco.update(dev.banco_id, {
              saldo_actual: (banco?.saldo_actual || 0) - dev.importe
            });
          }
          if (dev.caja_id) {
            const caja = cajas.find(c => c.id === dev.caja_id);
            await base44.entities.Caja.update(dev.caja_id, {
              saldo_actual: (caja?.saldo_actual || 0) - dev.importe
            });
          }
        }
      }

      // 3) Revertir IVA si corresponde
      if (presupuesto.genera_iva) {
        const netoGravado = presupuesto.neto_gravado || (presupuesto.total_presupuesto / 1.21);
        const iva21 = presupuesto.iva_21 || (presupuesto.total_presupuesto - netoGravado);

        await base44.entities.IVAVenta.create({
          venta_id: presupuesto.venta_id,
          fecha: format(new Date(), 'yyyy-MM-dd'),
          tipo_comprobante: "NC",
          numero_comprobante: `NC-${presupuesto.venta_id?.slice(0, 8)}`,
          cliente_nombre: presupuesto.cliente_name,
          cliente_tipo_iva: presupuesto.cliente_tipo_iva,
          neto_gravado: -netoGravado,
          iva_21: -iva21,
          total: -presupuesto.total_presupuesto,
          periodo: format(new Date(), 'yyyy-MM')
        });
      }

      // Revertir IIBB si corresponde
      if (presupuesto.genera_iibb) {
        const configIIBB = configuracionIIBB[0];
        if (configIIBB) {
          const netoGravadoIIBB = presupuesto.genera_iva 
            ? (presupuesto.neto_gravado || presupuesto.total_presupuesto / 1.21)
            : presupuesto.total_presupuesto;
          const importeIIBB = netoGravadoIIBB * configIIBB.alicuota_iibb;

          await base44.entities.IIBBVenta.create({
            venta_id: presupuesto.venta_id,
            fecha: format(new Date(), 'yyyy-MM-dd'),
            periodo: format(new Date(), 'yyyy-MM'),
            cliente_nombre: presupuesto.cliente_name,
            neto_gravado: -netoGravadoIIBB,
            alicuota: configIIBB.alicuota_iibb,
            importe_iibb: -importeIIBB,
            numero_comprobante: `NC-${presupuesto.numero_presupuesto}`
          });
        }
      }

      // 4) Anular venta
      if (presupuesto.venta_id) {
        await base44.entities.Sale.update(presupuesto.venta_id, {
          estado: "ANULADA",
          notes: `${presupuesto.notes || ''}\n\n[ANULADA] ${motivo}`
        });
      }

      // 5) Cancelar proyecto
      if (presupuesto.proyecto_id) {
        await base44.entities.Project.update(presupuesto.proyecto_id, {
          status: "cancelado",
          description: `${presupuesto.observaciones || ''}\n\n[CANCELADO] ${motivo}`
        });
      }

      // 6) Actualizar presupuesto
      await base44.entities.Presupuesto.update(presupuestoId, {
        estado: "CANCELADO"
      });

      return cancelacion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['movimientosTesoreria'] });
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['cajas'] });
      queryClient.invalidateQueries({ queryKey: ['ivaVentas'] });
      queryClient.invalidateQueries({ queryKey: ['iibbVentas'] });
      queryClient.invalidateQueries({ queryKey: ['cancelaciones'] });
      setIsCancelacionDialogOpen(false);
      setSelectedPresupuesto(null);
      setIsDetailDialogOpen(false);
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const handleCancelarPresupuesto = (datos) => {
    cancelarPresupuestoMutation.mutate({
      presupuestoId: selectedPresupuesto.id,
      ...datos
    });
  };

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.barcode?.includes(productSearch)
  );

  const filteredServices = services.filter(s =>
    s.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredClients = clients.filter(c =>
    c.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const filteredPresupuestos = presupuestos.filter(p => {
    const matchSearch = p.cliente_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.numero_presupuesto?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEstado = filterEstado === "TODOS" || p.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  const estadoConfig = {
    BORRADOR: { color: "bg-slate-100 text-slate-700", icon: Edit },
    ENVIADO: { color: "bg-blue-100 text-blue-700", icon: Send },
    ACEPTADO: { color: "bg-green-100 text-green-700", icon: CheckCircle2 },
    RECHAZADO: { color: "bg-red-100 text-red-700", icon: XCircle },
    VENCIDO: { color: "bg-amber-100 text-amber-700", icon: Clock },
    CANCELADO: { color: "bg-red-100 text-red-700", icon: Ban }
  };

  // Estadísticas
  const totalBorradores = presupuestos.filter(p => p.estado === "BORRADOR").length;
  const totalEnviados = presupuestos.filter(p => p.estado === "ENVIADO").length;
  const totalAceptados = presupuestos.filter(p => p.estado === "ACEPTADO").length;
  const totalRechazados = presupuestos.filter(p => p.estado === "RECHAZADO").length;
  const tasaAceptacion = (totalEnviados + totalAceptados) > 0 
    ? (totalAceptados / (totalEnviados + totalAceptados) * 100) 
    : 0;

  const montoTotal = presupuestos.reduce((acc, p) => acc + (p.total_presupuesto || 0), 0);
  const montoAceptado = presupuestos.filter(p => p.estado === "ACEPTADO").reduce((acc, p) => acc + (p.total_presupuesto || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Presupuestos
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestión y conversión automática a ventas y proyectos
          </p>
        </div>
        <Button onClick={handleOpenDialog} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Presupuesto
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Total</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{presupuestos.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Enviados</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{totalEnviados}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Aceptados</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{totalAceptados}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Tasa Aceptación</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{tasaAceptacion.toFixed(0)}%</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Monto Aceptado</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">${(montoAceptado || 0).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por cliente o número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los estados</SelectItem>
                <SelectItem value="BORRADOR">Borradores</SelectItem>
                <SelectItem value="ENVIADO">Enviados</SelectItem>
                <SelectItem value="ACEPTADO">Aceptados</SelectItem>
                <SelectItem value="RECHAZADO">Rechazados</SelectItem>
                <SelectItem value="VENCIDO">Vencidos</SelectItem>
                <SelectItem value="CANCELADO">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Número</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Validez</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPresupuestos.map((presupuesto) => {
              const config = estadoConfig[presupuesto.estado] || estadoConfig.BORRADOR;
              const Icon = config.icon;
              const vencido = new Date(presupuesto.validez_hasta) < new Date() && presupuesto.estado === "ENVIADO";
              
              return (
                <TableRow key={presupuesto.id} className="hover:bg-slate-50">
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {presupuesto.numero_presupuesto}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {format(new Date(presupuesto.fecha), "d MMM yyyy", { locale: es })}
                  </TableCell>
                  <TableCell className="font-medium">{presupuesto.cliente_name}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(presupuesto.validez_hasta), "d MMM yyyy", { locale: es })}
                    {vencido && (
                      <Badge className="ml-2 bg-red-100 text-red-700 text-xs">Vencido</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={config.color}>
                      <Icon className="h-3 w-3 mr-1" />
                      {presupuesto.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-blue-600">
                    ${(presupuesto.total_presupuesto || 0).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedPresupuesto(presupuesto);
                          setIsDetailDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {presupuesto.estado === "ENVIADO" && !vencido && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            setSelectedPresupuesto(presupuesto);
                            setIsCobroDialogOpen(true);
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Aceptar y Cobrar
                        </Button>
                      )}
                      {presupuesto.estado === "ENVIADO" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleCambiarEstado(presupuesto.id, "RECHAZADO")}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredPresupuestos.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No hay presupuestos
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog Nuevo Presupuesto */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Nuevo Presupuesto
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Products/Services */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar o escanear código..."
                  value={productSearch}
                  onChange={(e) => {
                    const value = e.target.value;
                    setProductSearch(value);
                    
                    // Auto-agregar si coincide exactamente con un código de barras
                    if (value.length >= 8) {
                      const productByBarcode = products.find(p => p.barcode === value);
                      if (productByBarcode && productByBarcode.stock > 0) {
                        addToCart(productByBarcode, 'product');
                        setProductSearch("");
                      }
                    }
                  }}
                  className="pl-10"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  variant={activeTab === 'products' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('products')}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Productos
                </Button>
                <Button 
                  variant={activeTab === 'services' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('services')}
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  Servicios
                </Button>
              </div>

              <div className="h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
                {activeTab === 'products' && filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer"
                    onClick={() => addToCart(product, 'product')}
                  >
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-slate-500">Stock: {product.stock}</p>
                    </div>
                    <p className="font-bold text-blue-600 text-sm">
                     ${(product.precio_lista_minorista || 0).toFixed(2)}
                    </p>
                  </div>
                ))}
                {activeTab === 'services' && filteredServices.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer"
                    onClick={() => addToCart(service, 'service')}
                  >
                    <div>
                      <p className="font-medium text-sm">{service.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{service.category?.replace('_', ' ')}</p>
                    </div>
                    <p className="font-bold text-blue-600">${service.price?.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Cart & Details */}
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Cliente *</Label>
                  <Select 
                    value={currentPresupuesto.cliente_id} 
                    onValueChange={(v) => {
                      const cliente = clients.find(c => c.id === v);
                      setCurrentPresupuesto({ 
                        ...currentPresupuesto, 
                        cliente_id: v
                      });
                      setClientSearch("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="sticky top-0 bg-white p-2 border-b">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-slate-400" />
                          <Input
                            placeholder="Buscar cliente..."
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            className="pl-7 h-8 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      {filteredClients.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.email && <span className="text-xs text-slate-400">({c.email})</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Fecha</Label>
                    <Input
                      type="date"
                      value={currentPresupuesto.fecha}
                      onChange={(e) => setCurrentPresupuesto({ ...currentPresupuesto, fecha: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Válido hasta</Label>
                    <Input
                      type="date"
                      value={currentPresupuesto.validez_hasta}
                      onChange={(e) => setCurrentPresupuesto({ ...currentPresupuesto, validez_hasta: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="h-48 overflow-y-auto border rounded-lg">
                {cart.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    Carrito vacío
                  </div>
                ) : (
                  <div className="divide-y">
                    {cart.map((item, index) => (
                      <div key={index} className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-sm flex-1">{item.name}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500"
                            onClick={() => removeFromCart(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs">Cantidad</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.cantidad}
                              onChange={(e) => updateCartQuantity(index, parseInt(e.target.value))}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Precio Unit.</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.precio_unitario}
                              onChange={(e) => updateCartPrice(index, parseFloat(e.target.value))}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Subtotal</Label>
                            <Input
                              value={`$${(item.subtotal || 0).toFixed(2)}`}
                              disabled
                              className="h-8 text-sm font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border-2">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Subtotal:</span>
                    <span className="font-bold">${(subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <Label className="text-sm">Descuento:</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentPresupuesto.descuento || ""}
                      onChange={(e) => setCurrentPresupuesto({ ...currentPresupuesto, descuento: parseFloat(e.target.value) || 0 })}
                      className="w-28 h-8 text-right"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-bold text-lg">Total:</span>
                    <span className="font-bold text-2xl text-blue-600">${(total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Observaciones</Label>
                <Textarea
                  value={currentPresupuesto.observaciones}
                  onChange={(e) => setCurrentPresupuesto({ ...currentPresupuesto, observaciones: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
            <Button onClick={() => handleSubmit(false)} variant="outline">
              Guardar Borrador
            </Button>
            <Button onClick={() => handleSubmit(true)} className="bg-blue-600 hover:bg-blue-700">
              <Send className="h-4 w-4 mr-2" />
              Guardar y Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalle Presupuesto */}
      {selectedPresupuesto && (
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Presupuesto {selectedPresupuesto.numero_presupuesto}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-600">Estado</p>
                  <Badge className={`${estadoConfig[selectedPresupuesto.estado]?.color} mt-1`}>
                    {selectedPresupuesto.estado}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-600">Total</p>
                  <p className="text-2xl font-bold text-blue-600">${(selectedPresupuesto.total_presupuesto || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Cliente:</p>
                  <p className="font-medium">{selectedPresupuesto.cliente_name}</p>
                </div>
                <div>
                  <p className="text-slate-500">Fecha:</p>
                  <p className="font-medium">{format(new Date(selectedPresupuesto.fecha), "d 'de' MMMM yyyy", { locale: es })}</p>
                </div>
                <div>
                  <p className="text-slate-500">Válido hasta:</p>
                  <p className="font-medium">{format(new Date(selectedPresupuesto.validez_hasta), "d 'de' MMMM yyyy", { locale: es })}</p>
                </div>
                <div>
                  <p className="text-slate-500">Creado por:</p>
                  <p className="font-medium">{selectedPresupuesto.usuario_creador_nombre}</p>
                </div>
              </div>

              {selectedPresupuesto.estado === "ACEPTADO" && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-semibold text-green-900 mb-2">✓ Presupuesto Aceptado</p>
                  <div className="space-y-1 text-xs text-green-700">
                    <p>• Venta generada: ID {selectedPresupuesto.venta_id}</p>
                    <p>• Proyecto creado: ID {selectedPresupuesto.proyecto_id}</p>
                    <p>• Aceptado el: {format(new Date(selectedPresupuesto.fecha_aceptacion), "d/MM/yyyy HH:mm", { locale: es })}</p>
                  </div>
                </div>
              )}

              {selectedPresupuesto.estado === "CANCELADO" && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-semibold text-red-900 mb-2">✗ Presupuesto Cancelado</p>
                  <p className="text-xs text-red-700">Este presupuesto fue cancelado. La venta fue anulada y el proyecto cancelado.</p>
                </div>
              )}

              <div>
                <p className="font-semibold mb-3">Detalle de Items</p>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">Cantidad</TableHead>
                      <TableHead className="text-right">Precio Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPresupuesto.items?.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <p className="font-medium text-sm">{item.name}</p>
                          {item.descripcion && (
                            <p className="text-xs text-slate-500">{item.descripcion}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{item.cantidad || 0}</TableCell>
                        <TableCell className="text-right">${(item.precio_unitario || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-bold">${(item.subtotal || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-50 border-t-2">
                      <TableCell colSpan={3} className="font-semibold">TOTAL</TableCell>
                      <TableCell className="text-right font-bold text-lg text-blue-600">
                        ${(selectedPresupuesto.total_presupuesto || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {selectedPresupuesto.observaciones && (
                <div>
                  <p className="font-semibold mb-2">Observaciones</p>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                    {selectedPresupuesto.observaciones}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsPrintDialogOpen(true);
                }}
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimir/PDF
              </Button>
              <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                Cerrar
              </Button>
              {selectedPresupuesto.estado === "BORRADOR" && (
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    handleCambiarEstado(selectedPresupuesto.id, "ENVIADO");
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar a Cliente
                </Button>
              )}
              {selectedPresupuesto.estado === "ACEPTADO" && user?.role === "admin" && (
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => {
                    setIsCancelacionDialogOpen(true);
                  }}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Cancelar Presupuesto
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog Imprimir PDF */}
      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-blue-600" />
                Imprimir Presupuesto
              </span>
              <Button variant="ghost" size="icon" onClick={() => setIsPrintDialogOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <PresupuestoPDF presupuesto={selectedPresupuesto} />
        </DialogContent>
      </Dialog>

      {/* Dialog Cobro de Presupuesto */}
      <CobroPresupuestoDialog
        isOpen={isCobroDialogOpen}
        onClose={() => {
          setIsCobroDialogOpen(false);
          setSelectedPresupuesto(null);
        }}
        total={selectedPresupuesto?.total_presupuesto || 0}
        presupuesto={selectedPresupuesto}
        onConfirm={handleAceptarPresupuesto}
      />

      {/* Dialog Cancelación de Presupuesto */}
      <CancelacionPresupuestoDialog
        isOpen={isCancelacionDialogOpen}
        onClose={() => {
          setIsCancelacionDialogOpen(false);
          setSelectedPresupuesto(null);
        }}
        presupuesto={selectedPresupuesto}
        user={user}
        onConfirm={handleCancelarPresupuesto}
      />
    </div>
  );
}