import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import PagosDialog from "../components/pos/PagosDialog";
import ReportesDialog from "../components/pos/ReportesDialog";
import TicketPrint from "../components/pos/TicketPrint";
import SaleDetailDialog from "../components/sales/SaleDetailDialog";
import AsignarCuentaDialog from "../components/sales/AsignarCuentaDialog";

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
  ShoppingCart,
  Plus,
  Search,
  Trash2,
  Package,
  Briefcase,
  DollarSign,
  Receipt,
  X,
  Minus,
  AlertTriangle,
  TrendingUp,
  FileText,
  FileCheck,
  MessageCircle,
  Smartphone,
  Printer,
  Download,
  Eye,
  Mail
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import toast from "react-hot-toast";

export default function Sales() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPagosDialogOpen, setIsPagosDialogOpen] = useState(false);
  const [isReportesDialogOpen, setIsReportesDialogOpen] = useState(false);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [ventaConfirmada, setVentaConfirmada] = useState(null);
  const [pagosConfirmados, setPagosConfirmados] = useState([]);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [selectedSalePagos, setSelectedSalePagos] = useState([]);
  const [isAsignarCuentaDialogOpen, setIsAsignarCuentaDialogOpen] = useState(false);
  const [ventaParaCuenta, setVentaParaCuenta] = useState(null);
  const [downloadingTicket, setDownloadingTicket] = useState(null);
  const [previewTicketType, setPreviewTicketType] = useState(null);
  const [showEmailTicketDialog, setShowEmailTicketDialog] = useState(false);
  const [emailTicketRecipient, setEmailTicketRecipient] = useState("");
  const [emailTicketType, setEmailTicketType] = useState("a4");
  const [sendingTicketEmail, setSendingTicketEmail] = useState(false);
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [currentSale, setCurrentSale] = useState({
    client_id: "",
    client_name: "",
    client_tipo_iva: "",
    tipo_lista: "MINORISTA",
    genera_iva: false,
    genera_iibb: false,
    discount: 0,
    notes: "",
    talonario_id: "",
    total_manual: null
  });
  const [productSearch, setProductSearch] = useState("");
  const [activeTab, setActiveTab] = useState("products");
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [dialogKey, setDialogKey] = useState(0);

  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    phone: "",
    tipo_iva: "CONSUMIDOR_FINAL",
    cuit_cuil: ""
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-created_date', 100)
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

  const { data: tiposArticulo = [] } = useQuery({
    queryKey: ['tiposArticulo'],
    queryFn: () => base44.entities.TipoArticulo.list()
  });

  const { data: mediosPago = [] } = useQuery({
    queryKey: ['mediosPago'],
    queryFn: () => base44.entities.MedioPago.list()
  });

  const { data: cajas = [] } = useQuery({
    queryKey: ['cajas'],
    queryFn: () => base44.entities.Caja.list()
  });

  const { data: bancos = [] } = useQuery({
    queryKey: ['bancos'],
    queryFn: () => base44.entities.Banco.list()
  });

  const { data: talonarios = [] } = useQuery({
    queryKey: ['talonarios'],
    queryFn: async () => {
      const allTalonarios = await base44.entities.Talonario.list();
      // Filter by current company - requires company context
      // For now, return all (will be updated when CompanyProvider is integrated)
      return allTalonarios;
    }
  });

  const calcularPrecioYMargen = (product, quantity) => {
    if (!product.tipo_articulo_id) {
      return {
        precio_lista: product.price || 0,
        precio_venta: product.price || 0,
        margen_real: 0,
        valido: true
      };
    }

    const tipo = tiposArticulo.find(t => t.id === product.tipo_articulo_id);
    if (!tipo) return { precio_lista: 0, precio_venta: 0, margen_real: 0, valido: false };

    let precio_lista, precio_minimo;
    
    if (currentSale.tipo_lista === "MINORISTA") {
      precio_lista = product.precio_lista_minorista;
      precio_minimo = product.precio_minimo_minorista;
    } else {
      precio_lista = product.precio_lista_mayorista;
      precio_minimo = product.precio_minimo_mayorista;
    }

    const precio_venta = precio_lista;
    const margen_real = (precio_venta - product.costo_unitario) / product.costo_unitario;
    const valido = precio_venta >= precio_minimo;

    return {
      precio_lista,
      precio_venta,
      margen_real,
      valido,
      precio_minimo
    };
  };

  const { data: pagosPorVenta = [] } = useQuery({
    queryKey: ['pagosPorVenta', ventaConfirmada?.id],
    queryFn: async () => {
      if (!ventaConfirmada?.id) return [];
      const allPagos = await base44.entities.PagoVenta.list();
      return allPagos.filter(p => p.venta_id === ventaConfirmada.id);
    },
    enabled: !!ventaConfirmada?.id
  });

  const { data: periodosIVA = [] } = useQuery({
    queryKey: ['periodosIVA'],
    queryFn: () => base44.entities.PeriodoIVA.list('-anio,-mes', 12)
  });

  const { data: periodosIIBB = [] } = useQuery({
    queryKey: ['periodosIIBB'],
    queryFn: () => base44.entities.PeriodoIIBB.list('-anio,-mes', 12)
  });

  const { data: configuracionIIBB = [] } = useQuery({
    queryKey: ['configuracionIIBB'],
    queryFn: () => base44.entities.ConfiguracionIIBB.list()
  });

  const createClientMutation = useMutation({
    mutationFn: async (clientData) => {
      if (!clientData.name) {
        throw new Error("El nombre del cliente es obligatorio");
      }
      return await base44.entities.Client.create({
        ...clientData,
        status: "active",
        saldo_cc: 0
      });
    },
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      const shouldGenerateIVA = newClient.tipo_iva === "RESP_INSCRIPTO" || newClient.tipo_iva === "MONOTRIBUTO";
      setCurrentSale({
        ...currentSale,
        client_id: newClient.id,
        client_name: newClient.name,
        client_tipo_iva: newClient.tipo_iva,
        genera_iva: shouldGenerateIVA
      });
      setIsClientDialogOpen(false);
      setNewClient({
        name: "",
        email: "",
        phone: "",
        tipo_iva: "CONSUMIDOR_FINAL",
        cuit_cuil: ""
      });
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const anularVentaMutation = useMutation({
    mutationFn: async ({ ventaId, motivo }) => {
      const venta = sales.find(s => s.id === ventaId);
      if (!venta) throw new Error("Venta no encontrada");

      if (venta.estado === "ANULADA") {
        throw new Error("La venta ya está anulada");
      }

      // Verificar período fiscal si generó IVA o IIBB
      const periodoVenta = venta.created_date.substring(0, 7);
      
      if (venta.genera_iva) {
        const periodoCerradoIVA = periodosIVA.find(p => p.periodo === periodoVenta && p.estado === "CERRADO");
        if (periodoCerradoIVA) {
          throw new Error(`No se puede anular: el período IVA ${periodoVenta} está cerrado`);
        }
      }

      if (venta.genera_iibb) {
        const periodoCerradoIIBB = periodosIIBB.find(p => p.periodo === periodoVenta && p.estado === "CERRADO");
        if (periodoCerradoIIBB) {
          throw new Error(`No se puede anular: el período IIBB ${periodoVenta} está cerrado`);
        }
      }

      // Revertir stock
      for (const item of venta.items.filter(i => i.type === 'product')) {
        const product = products.find(p => p.id === item.item_id);
        if (product) {
          await base44.entities.Product.update(product.id, {
            stock: product.stock + item.quantity
          });

          await base44.entities.InventoryMovement.create({
            product_id: product.id,
            product_name: product.name,
            type: 'ingreso',
            quantity: item.quantity,
            previous_stock: product.stock,
            new_stock: product.stock + item.quantity,
            reason: 'Anulación de venta',
            reference: `Anulación venta ${venta.numero_comprobante}`
          });
        }
      }

      // Revertir movimientos de tesorería y CC
      const pagosVenta = await base44.entities.PagoVenta.filter({ venta_id: ventaId });
      
      for (const pago of pagosVenta) {
        if (pago.medio_pago_nombre === "Cuenta Corriente") {
          const client = clients.find(c => c.id === venta.client_id);
          await base44.entities.Client.update(venta.client_id, {
            saldo_cc: (client?.saldo_cc || 0) - pago.importe
          });

          await base44.entities.MovimientoCC.create({
            tipo_entidad: "CLIENTE",
            entidad_id: venta.client_id,
            entidad_nombre: venta.client_name,
            fecha: new Date().toISOString().split('T')[0],
            concepto: `Anulación venta ${venta.numero_comprobante}`,
            debe: 0,
            haber: pago.importe,
            saldo: (client?.saldo_cc || 0) - pago.importe,
            referencia_tipo: "anulacion_venta",
            referencia_id: ventaId
          });
        } else if (!pago.es_cheque) {
          await base44.entities.MovimientoTesoreria.create({
            fecha: new Date().toISOString().split('T')[0],
            tipo: "EGRESO",
            medio_pago_id: pago.medio_pago_id,
            medio_pago_nombre: pago.medio_pago_nombre,
            banco_id: pago.banco_id,
            banco_nombre: pago.banco_nombre,
            caja_id: pago.caja_id,
            caja_nombre: pago.caja_nombre,
            importe: pago.importe,
            referencia_tipo: "anulacion_venta",
            referencia_id: ventaId,
            observaciones: `Anulación venta ${venta.numero_comprobante}`
          });

          if (pago.banco_id) {
            const banco = bancos.find(b => b.id === pago.banco_id);
            await base44.entities.Banco.update(pago.banco_id, {
              saldo_actual: banco.saldo_actual - pago.importe
            });
          }
          if (pago.caja_id) {
            const caja = cajas.find(c => c.id === pago.caja_id);
            await base44.entities.Caja.update(pago.caja_id, {
              saldo_actual: caja.saldo_actual - pago.importe
            });
          }
        }
      }

      // Eliminar registros fiscales
      if (venta.genera_iva) {
        const ivaVentasRelacionados = await base44.entities.IVAVenta.filter({ venta_id: ventaId });
        for (const iv of ivaVentasRelacionados) {
          await base44.entities.IVAVenta.delete(iv.id);
        }
      }

      if (venta.genera_iibb) {
        const iibbVentasRelacionados = await base44.entities.IIBBVenta.filter({ venta_id: ventaId });
        for (const iiv of iibbVentasRelacionados) {
          await base44.entities.IIBBVenta.delete(iiv.id);
        }
      }

      // Liberar número si corresponde
      const talonario = talonarios.find(t => t.id === venta.talonario_id);
      if (talonario?.permite_reutilizar && !venta.genera_iva) {
        const numeroComprobante = parseInt(venta.numero_comprobante.split('-')[1]);
        const numerosLiberados = talonario.numeros_liberados || [];

        await base44.entities.Talonario.update(talonario.id, {
          numeros_liberados: [...numerosLiberados, numeroComprobante].sort((a, b) => a - b),
          ultimo_numero: Math.max(talonario.ultimo_numero, numeroComprobante - 1)
        });
      }

      // Actualizar venta
      return await base44.entities.Sale.update(ventaId, {
        estado: "ANULADA",
        fecha_anulacion: new Date().toISOString(),
        motivo_anulacion: motivo,
        usuario_anulacion: user?.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['movimientosTesoreria'] });
      queryClient.invalidateQueries({ queryKey: ['movimientosCC'] });
      queryClient.invalidateQueries({ queryKey: ['cajas'] });
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['talonarios'] });
      queryClient.invalidateQueries({ queryKey: ['ivaVentas'] });
      queryClient.invalidateQueries({ queryKey: ['iibbVentas'] });
    }
  });

  const createSaleMutation = useMutation({
    mutationFn: async ({ saleData, pagos, tipoVenta }) => {
      // PROTECCIÓN FISCAL: Verificar que el período no esté cerrado
      const periodoVenta = format(new Date(), 'yyyy-MM');
      const periodoCerradoIVA = periodosIVA.find(p => p.periodo === periodoVenta && p.estado === "CERRADO");
      const periodoCerradoIIBB = periodosIIBB.find(p => p.periodo === periodoVenta && p.estado === "CERRADO");
      
      if (periodoCerradoIVA) {
        throw new Error(`⚠️ NO SE PUEDE VENDER: El período IVA ${periodoVenta} está CERRADO. No se pueden registrar más ventas en este período.`);
      }
      
      if (saleData.genera_iibb && periodoCerradoIIBB) {
        throw new Error(`⚠️ NO SE PUEDE VENDER: El período IIBB ${periodoVenta} está CERRADO. No se pueden registrar ventas con IIBB en este período.`);
      }

      // Validar márgenes antes de crear la venta
      for (const item of saleData.items.filter(i => i.type === 'product')) {
        const product = products.find(p => p.id === item.item_id);
        if (product && product.tipo_articulo_id) {
          const calc = calcularPrecioYMargen(product, item.quantity);
          if (!calc.valido) {
            throw new Error(`El artículo "${product.name}" rompe el margen mínimo. Precio mínimo: $${calc.precio_minimo.toFixed(2)}`);
          }
        }
      }

      // Update product stock
      for (const item of saleData.items.filter(i => i.type === 'product')) {
        const product = products.find(p => p.id === item.item_id);
        if (product) {
          const newStock = product.stock - item.quantity;
          await base44.entities.Product.update(product.id, { stock: newStock });
          
          await base44.entities.InventoryMovement.create({
            product_id: product.id,
            product_name: product.name,
            type: 'salida',
            quantity: item.quantity,
            previous_stock: product.stock,
            new_stock: newStock,
            reason: 'Venta',
            reference: `Venta ${format(new Date(), 'dd/MM/yyyy HH:mm')}`
          });
        }
      }

      // Validar talonario
      if (!saleData.talonario_id) {
        throw new Error("Debe seleccionar un talonario para emitir el comprobante");
      }

      const talonario = talonarios.find(t => t.id === saleData.talonario_id);
      if (!talonario) {
        throw new Error("Talonario no encontrado");
      }

      if (!talonario.is_active) {
         throw new Error("El talonario seleccionado está inactivo");
       }

      // Determinar tipo de comprobante
      let tipoComprobante;
      if (saleData.genera_iva) {
        // Factura A solo para Responsables Inscriptos
        if (saleData.client_tipo_iva === "RESP_INSCRIPTO") {
          tipoComprobante = "A";
        } else {
          tipoComprobante = "B";
        }
      } else {
        tipoComprobante = "X";
      }
      
      if (talonario.tipo_comprobante !== tipoComprobante) {
        throw new Error(`El talonario seleccionado es para comprobantes tipo ${talonario.tipo_comprobante}, pero la venta requiere tipo ${tipoComprobante}`);
      }

      // Generar número de comprobante usando backend function
      let numeroComprobante;
      let tipo_comprobante;
      let punto_venta;
      
      try {
        const result = await base44.functions.invoke('generateDocumentNumber', {
          talonario_id: talonario.id,
          company_id: saleData.company_id
        });
        
        numeroComprobante = result.numero_comprobante;
        tipo_comprobante = result.tipo_comprobante;
        punto_venta = result.punto_venta;
      } catch (error) {
        throw new Error(`Error generando número de comprobante: ${error.message}`);
      }

      // Crear venta confirmada con número de comprobante asignado
      const sale = await base44.entities.Sale.create({
        ...saleData,
        tipo_venta: tipoVenta,
        estado: "CONFIRMADA",
        tipo_comprobante: tipo_comprobante,
        talonario_nombre: talonario.name,
        numero_comprobante: numeroComprobante
      });

      // Generar IVA Ventas si corresponde
      if (saleData.genera_iva) {
        await base44.entities.IVAVenta.create({
          venta_id: sale.id,
          fecha: format(new Date(), 'yyyy-MM-dd'),
          tipo_comprobante: tipoComprobante,
          numero_comprobante: numeroComprobante,
          cliente_nombre: saleData.client_name,
          cliente_tipo_iva: saleData.client_tipo_iva,
          neto_gravado: saleData.neto_gravado,
          iva_21: saleData.iva_21,
          total: saleData.total,
          periodo: format(new Date(), 'yyyy-MM')
        });
      }

      // Generar IIBB Ventas si corresponde
      if (saleData.genera_iibb) {
        const configIIBB = configuracionIIBB[0];
        if (configIIBB) {
          const netoGravadoIIBB = saleData.genera_iva ? saleData.neto_gravado : saleData.total;
          const importeIIBB = netoGravadoIIBB * configIIBB.alicuota_iibb;

          await base44.entities.IIBBVenta.create({
            venta_id: sale.id,
            fecha: format(new Date(), 'yyyy-MM-dd'),
            periodo: format(new Date(), 'yyyy-MM'),
            cliente_nombre: saleData.client_name,
            neto_gravado: netoGravadoIIBB,
            alicuota: configIIBB.alicuota_iibb,
            importe_iibb: importeIIBB,
            numero_comprobante: numeroComprobante
          });
        }
      }

      // Registrar cheques de terceros recibidos
      for (const pago of pagos) {
        if (pago.es_cheque) {
          const bancoNombre = bancos.find(b => b.id === pago.cheque_banco_id)?.nombre || "";
          
          await base44.entities.Check.create({
            tipo_origen: "TERCERO",
            tipo_soporte: "FISICO",
            numero_cheque: pago.cheque_numero,
            banco_id: pago.cheque_banco_id,
            banco_nombre: bancoNombre,
            fecha_emision: format(new Date(), 'yyyy-MM-dd'),
            fecha_vencimiento: pago.cheque_fecha_vencimiento || "",
            importe: pago.importe,
            estado: "EN_CARTERA",
            titular_tipo: "CLIENTE",
            titular_id: saleData.client_id || "",
            titular_nombre: saleData.client_name || "Consumidor Final",
            referencia_origen_tipo: "VENTA",
            referencia_origen_id: sale.id,
            usuario_registro: user?.email || "",
            fecha_ultimo_cambio: new Date().toISOString(),
            usuario_ultimo_cambio: user?.email || "",
            observaciones: `Recibido en venta ${numeroComprobante}`
          });
        }
      }

      // Procesar cada pago
      for (const pago of pagos) {
        // Guardar registro de pago
        await base44.entities.PagoVenta.create({
          venta_id: sale.id,
          ...pago
        });

        // Generar movimientos según tipo de pago
        if (pago.medio_pago_nombre === "Cuenta Corriente") {
          // Movimiento CC
          const client = clients.find(c => c.id === saleData.client_id);
          const nuevoSaldo = (client?.saldo_cc || 0) + pago.importe;

          await base44.entities.MovimientoCC.create({
            tipo_entidad: "CLIENTE",
            entidad_id: saleData.client_id,
            entidad_nombre: saleData.client_name,
            fecha: new Date().toISOString().split('T')[0],
            concepto: `Venta #${sale.id}`,
            debe: pago.importe,
            haber: 0,
            saldo: nuevoSaldo,
            referencia_tipo: "venta",
            referencia_id: sale.id
          });

          await base44.entities.Client.update(saleData.client_id, {
            saldo_cc: nuevoSaldo
          });
        } else if (!pago.es_cheque) {
          // Movimiento Tesorería (solo si no es cheque)
          await base44.entities.MovimientoTesoreria.create({
            fecha: new Date().toISOString().split('T')[0],
            tipo: "INGRESO",
            medio_pago_id: pago.medio_pago_id,
            medio_pago_nombre: pago.medio_pago_nombre,
            banco_id: pago.banco_id,
            banco_nombre: pago.banco_nombre,
            caja_id: pago.caja_id,
            caja_nombre: pago.caja_nombre,
            importe: pago.importe,
            referencia_tipo: "venta",
            referencia_id: sale.id,
            observaciones: `Venta #${sale.id} - ${saleData.client_name}`
          });

          // Actualizar saldos
          if (pago.banco_id) {
            const banco = bancos.find(b => b.id === pago.banco_id);
            await base44.entities.Banco.update(pago.banco_id, {
              saldo_actual: banco.saldo_actual + pago.importe
            });
          }
          if (pago.caja_id) {
            const caja = cajas.find(c => c.id === pago.caja_id);
            await base44.entities.Caja.update(pago.caja_id, {
              saldo_actual: caja.saldo_actual + pago.importe
            });
          }
        }
      }

      // Actualizar último contacto
      if (saleData.client_id) {
        await base44.entities.Client.update(saleData.client_id, {
          last_contact: new Date().toISOString().split('T')[0]
        });
      }

      return sale;
    },
    onSuccess: (sale, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['movimientosTesoreria'] });
      queryClient.invalidateQueries({ queryKey: ['movimientosCC'] });
      queryClient.invalidateQueries({ queryKey: ['cajas'] });
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['talonarios'] });
      queryClient.invalidateQueries({ queryKey: ['ivaVentas'] });
      queryClient.invalidateQueries({ queryKey: ['iibbVentas'] });
      queryClient.invalidateQueries({ queryKey: ['cheques'] });
      setIsPagosDialogOpen(false);
      toast.success(`✓ Venta confirmada - ${sale.numero_comprobante}`, {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#10b981',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: '16px'
        }
      });
      setVentaConfirmada(sale);
      setPagosConfirmados(variables.pagos);
      setIsTicketDialogOpen(true);
      
      // Abrir diálogo de asignación de cuenta si no tiene cuenta asignada
      if (!sale.cuenta_contable_asignada) {
        setVentaParaCuenta(sale);
        setIsAsignarCuentaDialogOpen(true);
      }
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const handleOpenDialog = () => {
    setCart([]);
    setCurrentSale({
      client_id: "",
      client_name: "",
      client_tipo_iva: "",
      tipo_lista: "MINORISTA",
      genera_iva: false,
      genera_iibb: false,
      discount: 0,
      notes: "",
      talonario_id: "",
      total_manual: null
    });
    setProductSearch("");
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setCart([]);
    setCurrentSale({
      client_id: "",
      client_name: "",
      client_tipo_iva: "",
      tipo_lista: "MINORISTA",
      genera_iva: false,
      genera_iibb: false,
      discount: 0,
      notes: "",
      talonario_id: "",
      total_manual: null
    });
    setProductSearch("");
  };

  const handleDownloadTicket = async (type) => {
    setDownloadingTicket(type);
    try {
      const response = await base44.functions.invoke('generateSaleTicket', {
        sale_id: ventaConfirmada.id,
        type: type
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket_${type}_${ventaConfirmada.numero_comprobante || ventaConfirmada.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success("PDF descargado");
    } catch (error) {
      toast.error("Error al generar PDF");
    } finally {
      setDownloadingTicket(null);
    }
  };

  const handleSendTicketEmail = async () => {
    if (!emailTicketRecipient) {
      toast.error("Ingrese un email");
      return;
    }

    setSendingTicketEmail(true);
    try {
      await base44.functions.invoke('sendSaleTicketEmail', {
        sale_id: ventaConfirmada.id,
        recipient_email: emailTicketRecipient,
        ticket_type: emailTicketType
      });
      toast.success(`Comprobante enviado a ${emailTicketRecipient}`);
      setShowEmailTicketDialog(false);
      setEmailTicketRecipient("");
    } catch (error) {
      toast.error("Error al enviar email");
    } finally {
      setSendingTicketEmail(false);
    }
  };

  const handleCloseTicket = () => {
    setIsTicketDialogOpen(false);
    setVentaConfirmada(null);
    setPagosConfirmados([]);
    
    // Cerrar todo primero y resetear
    setIsDialogOpen(false);
    setCart([]);
    setCurrentSale({
      client_id: "",
      client_name: "",
      client_tipo_iva: "",
      tipo_lista: "MINORISTA",
      genera_iva: false,
      genera_iibb: false,
      discount: 0,
      notes: "",
      talonario_id: "",
      total_manual: null
    });
    setProductSearch("");
    setClientSearch("");
    
    // Reabrir limpio después de un momento con nueva key para forzar re-render
    setTimeout(() => {
      setDialogKey(prev => prev + 1);
      setIsDialogOpen(true);
    }, 100);
  };

  const addToCart = (item, type) => {
    const existingIndex = cart.findIndex(c => c.item_id === item.id && c.type === type);
    
    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      updateCartItemPricing(newCart[existingIndex]);
      setCart(newCart);
    } else {
      const newItem = {
        type,
        item_id: item.id,
        name: item.name,
        quantity: 1,
        costo_unitario: item.costo_unitario || 0
      };
      updateCartItemPricing(newItem);
      setCart([...cart, newItem]);
    }
  };

  const updateCartItemPricing = (cartItem) => {
    if (cartItem.type === 'product') {
      const product = products.find(p => p.id === cartItem.item_id);
      if (product) {
        const calc = calcularPrecioYMargen(product, cartItem.quantity);
        cartItem.precio_lista = calc.precio_lista;
        cartItem.precio_venta = calc.precio_venta;
        cartItem.margen_real = calc.margen_real;
        cartItem.valido = calc.valido;
        cartItem.total = calc.precio_venta * cartItem.quantity;
      }
    } else {
      const service = services.find(s => s.id === cartItem.item_id);
      if (service) {
        cartItem.precio_lista = service.price;
        cartItem.precio_venta = service.price;
        cartItem.margen_real = 0;
        cartItem.valido = true;
        cartItem.total = service.price * cartItem.quantity;
      }
    }
  };

  // Recalcular precios cuando cambia tipo de lista
  useEffect(() => {
    if (cart.length === 0) return;
    
    let hasChanges = false;
    const newCart = cart.map(item => {
      const updatedItem = { ...item };
      if (updatedItem.type === 'product') {
        const product = products.find(p => p.id === updatedItem.item_id);
        if (product) {
          const calc = calcularPrecioYMargen(product, updatedItem.quantity);
          if (updatedItem.precio_venta !== calc.precio_venta) {
            hasChanges = true;
            updatedItem.precio_lista = calc.precio_lista;
            updatedItem.precio_venta = calc.precio_venta;
            updatedItem.margen_real = calc.margen_real;
            updatedItem.valido = calc.valido;
            updatedItem.total = calc.precio_venta * updatedItem.quantity;
          }
        }
      }
      return updatedItem;
    });
    
    if (hasChanges) {
      setCart(newCart);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSale.tipo_lista]);

  const updateCartQuantity = (index, quantity) => {
    if (quantity <= 0) {
      removeFromCart(index);
      return;
    }

    const item = cart[index];
    if (item.type === 'product') {
      const product = products.find(p => p.id === item.item_id);
      if (product && quantity > product.stock) {
        return;
      }
    }

    const newCart = [...cart];
    newCart[index].quantity = quantity;
    updateCartItemPricing(newCart[index]);
    setCart(newCart);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const subtotal = cart.reduce((acc, item) => acc + item.total, 0);
  const totalWithDiscount = subtotal - (currentSale.discount || 0);
  
  // Cálculo de IVA
  const neto_gravado = currentSale.genera_iva ? totalWithDiscount / 1.21 : totalWithDiscount;
  const iva_21 = currentSale.genera_iva ? neto_gravado * 0.21 : 0;
  const total_final = neto_gravado + iva_21;

  const tieneItemsInvalidos = cart.some(item => item.valido === false);

  const handleSubmit = () => {
    if (cart.length === 0) return;
    if (tieneItemsInvalidos) {
      alert("Hay artículos que rompen el margen mínimo. Por favor revisa el carrito.");
      return;
    }

    // Validación IVA: no permitir Factura B sin cliente con tipo IVA válido
    if (currentSale.genera_iva && !currentSale.client_id) {
      alert("Para emitir Factura B con IVA debe seleccionar un cliente con CUIT/CUIL válido.");
      return;
    }

    if (currentSale.genera_iva && currentSale.client_tipo_iva === "CONSUMIDOR_FINAL") {
      alert("No se puede emitir Factura B a un Consumidor Final. Seleccione un cliente Responsable Inscripto o Monotributista.");
      return;
    }

    setIsPagosDialogOpen(true);
  };

  const handleConfirmarPagos = (pagos, tipoVenta) => {
     const cliente = clients.find(c => c.id === currentSale.client_id);
     const finalTotal = currentSale.total_manual !== null ? currentSale.total_manual : total_final;

     createSaleMutation.mutate({
       saleData: {
         client_id: currentSale.client_id || null,
         client_name: cliente?.name || "Consumidor Final",
         client_tipo_iva: cliente?.tipo_iva || "CONSUMIDOR_FINAL",
         employee_email: user?.email,
         employee_name: user?.full_name,
         company_id: user?.id,
         tipo_lista: currentSale.tipo_lista,
         items: cart,
         subtotal: subtotal,
         discount: currentSale.discount || 0,
         genera_iva: currentSale.genera_iva,
         genera_iibb: currentSale.genera_iibb,
         neto_gravado: neto_gravado,
         iva_21: iva_21,
         total: finalTotal,
         notes: currentSale.notes,
         talonario_id: currentSale.talonario_id
       },
       pagos,
       tipoVenta
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

  const filteredSales = sales.filter(sale => 
    sale.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.employee_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const today = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.created_date?.startsWith(today));
  const todayTotal = todaySales.reduce((acc, s) => acc + (s.total || 0), 0);

  const handleViewSaleDetail = async (sale) => {
    setSelectedSale(sale);
    // Cargar pagos de la venta
    const allPagos = await base44.entities.PagoVenta.list();
    const ventaPagos = allPagos.filter(p => p.venta_id === sale.id);
    setSelectedSalePagos(ventaPagos);
    setIsDetailDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2 flex-wrap">
            <ShoppingCart className="h-5 sm:h-6 w-5 sm:w-6 text-emerald-600 flex-shrink-0" />
            Ventas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Hoy: ${todayTotal.toLocaleString()} ({todaySales.length} ventas)
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-col sm:flex-row">
          <Button onClick={() => setIsReportesDialogOpen(true)} variant="outline" className="w-full sm:w-auto whitespace-nowrap">
            <FileText className="h-4 w-4 mr-2" />
            Reportes X/Z
          </Button>
          <Button onClick={handleOpenDialog} className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto whitespace-nowrap">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Venta
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase">Ventas Hoy</p>
            <p className="text-2xl font-bold text-foreground mt-1">{todaySales.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase">Ingresos Hoy</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">${todayTotal.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase">Promedio</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              ${todaySales.length > 0 ? Math.round(todayTotal / todaySales.length).toLocaleString() : 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase">Total Histórico</p>
            <p className="text-2xl font-bold text-foreground mt-1">{sales.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por cliente o empleado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Fecha</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>IVA</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Cuenta</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSales.map((sale) => (
              <TableRow 
                key={sale.id} 
                className={sale.estado === "ANULADA" ? "bg-red-50 opacity-60 cursor-pointer" : "hover:bg-slate-50 cursor-pointer"}
                onClick={() => handleViewSaleDetail(sale)}
              >
                <TableCell className="text-slate-500 text-sm">
                  {format(new Date(sale.created_date), "d MMM HH:mm", { locale: es })}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono">
                    {sale.numero_comprobante || "—"}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{sale.client_name || 'General'}</TableCell>
                <TableCell>
                  {sale.genera_iva ? (
                    <Badge className="bg-blue-100 text-blue-700">
                      <FileCheck className="h-3 w-3 mr-1" />
                      Con IVA
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-600">Sin IVA</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {sale.estado === "ANULADA" ? (
                    <Badge className="bg-red-100 text-red-700">Anulada</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-700">Confirmada</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {sale.cuenta_contable_asignada ? (
                    <div className="text-xs">
                      <p className="font-medium">{sale.cuenta_contable_nombre}</p>
                      <p className="text-slate-500">{sale.cuenta_contable_codigo}</p>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVentaParaCuenta(sale);
                        setIsAsignarCuentaDialogOpen(true);
                      }}
                    >
                      Asignar
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{sale.items?.length || 0}</Badge>
                </TableCell>
                <TableCell className="text-right font-bold text-emerald-600">
                  ${sale.total?.toLocaleString()}
                </TableCell>
                <TableCell>
                  {sale.estado === "CONFIRMADA" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        const motivo = prompt("Motivo de anulación:");
                        if (motivo) {
                          anularVentaMutation.mutate({ ventaId: sale.id, motivo });
                        }
                      }}
                    >
                      Anular
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filteredSales.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                  No hay ventas registradas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </Card>

      {/* New Sale Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen} key={dialogKey}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden p-0 flex flex-col w-[95vw]">
          <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4">
            <DialogTitle className="flex items-center gap-2 sm:gap-3 text-slate-800 m-0">
              <ShoppingCart className="h-5 sm:h-6 w-5 sm:w-6 text-slate-600" />
              <span className="text-base sm:text-lg font-semibold">Nueva Venta</span>
            </DialogTitle>
          </div>

          <div className="flex flex-col lg:flex-row flex-1 overflow-hidden gap-0">
            {/* Left: Products */}
            <div className="flex-1 flex flex-col lg:border-r border-slate-200 bg-white min-h-[200px] lg:min-h-0">
              <div className="p-4 space-y-3 border-b border-slate-200">
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
                    className="pl-10 h-10" 
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant={activeTab === 'products' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('products')} className="flex-1 h-8 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border-0">
                    <Package className="h-3 w-3 mr-1" />
                    Productos
                  </Button>
                  <Button variant={activeTab === 'services' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('services')} className="flex-1 h-8 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border-0">
                    <Briefcase className="h-3 w-3 mr-1" />
                    Servicios
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="p-2 space-y-1">
                  {activeTab === 'products' && filteredProducts.map((product) => {
                    const calc = calcularPrecioYMargen(product, 1);
                    return (
                      <div key={product.id} onClick={() => product.stock > 0 && addToCart(product, 'product')} className={`p-3 rounded-lg cursor-pointer transition-colors ${product.stock === 0 ? 'opacity-40 bg-slate-100' : 'bg-slate-50 hover:bg-emerald-50 border border-slate-200'}`}>
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-medium text-sm text-slate-800">{product.name}</p>
                          <p className="text-emerald-600 font-bold text-sm">${calc.precio_venta?.toFixed(2)}</p>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-500">
                          <span>Stock: {product.stock}</span>
                          <span className="text-emerald-600">{(calc.margen_real * 100).toFixed(0)}% margen</span>
                        </div>
                      </div>
                    );
                  })}
                  {activeTab === 'services' && filteredServices.map((service) => (
                    <div key={service.id} onClick={() => addToCart(service, 'service')} className="p-3 bg-slate-50 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors border border-slate-200">
                      <div className="flex justify-between items-center">
                        <p className="font-medium text-sm text-slate-800">{service.name}</p>
                        <p className="text-emerald-600 font-bold text-sm">${service.price?.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Center: Cart */}
            <div className="lg:w-80 w-full flex flex-col lg:border-r border-slate-200 bg-gradient-to-b from-slate-50 to-white">
              <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-slate-200 bg-white">
                <h3 className="font-semibold text-xs sm:text-sm flex items-center gap-2 text-slate-800">
                  <Receipt className="h-3 sm:h-4 w-3 sm:w-4 text-emerald-600" />
                  Carrito ({cart.length})
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm text-center px-4">
                    Selecciona productos para comenzar
                  </div>
                ) : (
                  <div className="divide-y">
                    {cart.map((item, index) => (
                      <div key={index} className={`p-3 ${!item.valido ? 'bg-red-50' : 'bg-white hover:bg-slate-50'}`}>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-slate-800 truncate">{item.name}</p>
                            <p className="text-xs text-emerald-600 font-semibold">${item.precio_venta?.toFixed(2)}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeFromCart(index)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 bg-slate-100 rounded p-1">
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateCartQuantity(index, item.quantity - 1)}>
                              <Minus className="h-2 w-2" />
                            </Button>
                            <span className="w-6 text-center font-bold text-xs">{item.quantity}</span>
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateCartQuantity(index, item.quantity + 1)}>
                              <Plus className="h-2 w-2" />
                            </Button>
                          </div>
                          <p className="font-bold text-sm text-slate-800">${item.total?.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="border-t border-slate-200 bg-white p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-bold text-slate-800">${subtotal.toFixed(2)}</span>
                </div>
                {currentSale.genera_iva && (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">Neto</span>
                      <span className="font-bold text-slate-800">${neto_gravado.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">IVA 21%</span>
                      <span className="font-bold text-emerald-600">${iva_21.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right: Config & Summary */}
            <div className="flex-1 flex flex-col bg-white overflow-y-auto">
              <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                {/* Cliente */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">Cliente</Label>
                  <Select 
                    value={currentSale.client_id} 
                    onValueChange={(v) => {
                      const cliente = clients.find(c => c.id === v);
                      const shouldGenerateIVA = cliente?.tipo_iva === "RESP_INSCRIPTO" || cliente?.tipo_iva === "MONOTRIBUTO";
                      setCurrentSale({...currentSale, client_id: v, client_name: cliente?.name || "", client_tipo_iva: cliente?.tipo_iva || "", genera_iva: shouldGenerateIVA});
                      setClientSearch("");
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Consumidor Final" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="sticky top-0 bg-white p-2 border-b z-50">
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
                      <SelectItem value={null}>Consumidor Final</SelectItem>
                      {filteredClients.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.email && <span className="text-xs text-slate-400">({c.email})</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" onClick={() => setIsClientDialogOpen(true)} className="w-full h-8 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Nuevo
                  </Button>
                </div>

                {/* Configuración */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-700">Lista</Label>
                    <Select value={currentSale.tipo_lista} onValueChange={(v) => setCurrentSale({...currentSale, tipo_lista: v})}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MINORISTA">Minorista</SelectItem>
                        <SelectItem value="MAYORISTA">Mayorista</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-700">Talonario *</Label>
                    <Select value={currentSale.talonario_id} onValueChange={(v) => setCurrentSale({...currentSale, talonario_id: v})}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Sel." />
                      </SelectTrigger>
                      <SelectContent>
                        {talonarios.filter(t => {if (!t.is_active) return false; if (!currentSale.genera_iva) return t.tipo_comprobante === "X"; if (currentSale.client_tipo_iva === "RESP_INSCRIPTO") return t.tipo_comprobante === "A"; return t.tipo_comprobante === "B";}).map(t => (<SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <span className="text-xs font-semibold text-slate-700">IVA Ventas</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={currentSale.genera_iva} onChange={(e) => setCurrentSale({...currentSale, genera_iva: e.target.checked})} className="sr-only peer" />
                      <div className="w-10 h-6 bg-slate-300 peer-checked:bg-slate-600 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <span className="text-xs font-semibold text-slate-700">IIBB</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={currentSale.genera_iibb} onChange={(e) => setCurrentSale({...currentSale, genera_iibb: e.target.checked})} className="sr-only peer" />
                      <div className="w-10 h-6 bg-slate-300 peer-checked:bg-slate-600 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>
                </div>

                {/* Notas */}
                <textarea value={currentSale.notes || ""} onChange={(e) => setCurrentSale({...currentSale, notes: e.target.value})} placeholder="Notas..." className="w-full h-16 px-3 py-2 text-xs border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500" />

                {/* Total Summary */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 mt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Subtotal</span>
                      <span className="font-semibold text-slate-800">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Descuento</span>
                      <Input type="number" step="0.01" value={currentSale.discount || ""} onChange={(e) => setCurrentSale({...currentSale, discount: parseFloat(e.target.value) || 0})} className="w-24 h-7 bg-white text-right text-sm font-semibold text-slate-800 border border-slate-200 rounded" placeholder="0.00" />
                    </div>
                    {currentSale.genera_iva && (
                      <>
                        <div className="border-t border-slate-200 pt-2">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-600">Neto Gravado</span>
                            <span className="font-semibold text-slate-800">${neto_gravado.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">IVA 21%</span>
                            <span className="font-semibold text-slate-700">${iva_21.toFixed(2)}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="border-t border-slate-200 pt-3 bg-white rounded px-3 py-2">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-slate-800">TOTAL</span>
                      <Input type="number" step="0.01" value={currentSale.total_manual || total_final.toFixed(2)} onChange={(e) => setCurrentSale({...currentSale, total_manual: parseFloat(e.target.value) || total_final})} className="w-32 h-10 bg-white text-right text-2xl font-bold text-slate-800 border border-slate-300 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-3 sm:px-6 py-3 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
            <Button type="button" variant="outline" onClick={handleCloseDialog} className="w-full sm:w-auto px-4 sm:px-6 text-slate-700">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="bg-slate-700 hover:bg-slate-800 w-full sm:w-auto px-4 sm:px-6 text-white" disabled={cart.length === 0 || tieneItemsInvalidos || !currentSale.talonario_id}>
              <DollarSign className="h-4 w-4 mr-2" />
              Confirmar y Pagar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PagosDialog
        isOpen={isPagosDialogOpen}
        onClose={() => setIsPagosDialogOpen(false)}
        total={currentSale.total_manual !== null ? currentSale.total_manual : total_final}
        onConfirm={handleConfirmarPagos}
        clienteId={currentSale.client_id}
      />

      <ReportesDialog
        isOpen={isReportesDialogOpen}
        onClose={() => setIsReportesDialogOpen(false)}
        user={user}
      />

      {/* Nuevo Cliente Dialog */}
      <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                placeholder="Nombre completo"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  placeholder="261-1234567"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  placeholder="cliente@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo IVA *</Label>
              <Select 
                value={newClient.tipo_iva}
                onValueChange={(v) => setNewClient({ ...newClient, tipo_iva: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONSUMIDOR_FINAL">Consumidor Final</SelectItem>
                  <SelectItem value="RESP_INSCRIPTO">Responsable Inscripto</SelectItem>
                  <SelectItem value="MONOTRIBUTO">Monotributo</SelectItem>
                  <SelectItem value="EXENTO">Exento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(newClient.tipo_iva === "RESP_INSCRIPTO" || newClient.tipo_iva === "MONOTRIBUTO") && (
              <div className="space-y-2">
                <Label>CUIT/CUIL</Label>
                <Input
                  value={newClient.cuit_cuil}
                  onChange={(e) => setNewClient({ ...newClient, cuit_cuil: e.target.value })}
                  placeholder="20-12345678-9"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClientDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => createClientMutation.mutate(newClient)}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!newClient.name}
            >
              Crear Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket Dialog */}
      <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen}>
        <DialogContent className="max-w-md max-h-[95vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-green-600" />
              Venta Confirmada
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-green-600 mb-2">
                ¡Venta Confirmada!
              </h3>
              <p className="text-slate-600 mb-1">
                Total: ${ventaConfirmada?.total?.toFixed(2)}
              </p>
              <p className="text-sm text-slate-500">
                Cliente: {ventaConfirmada?.client_name}
              </p>
              {ventaConfirmada?.genera_iva && (
                <Badge className="bg-blue-100 text-blue-700 mt-2">
                  <FileCheck className="h-3 w-3 mr-1" />
                  Factura B generada
                </Badge>
              )}
            </div>

            {ventaConfirmada && (
              <TicketPrint 
                venta={ventaConfirmada} 
                pagos={pagosConfirmados}
              />
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t mt-0">
            <div className="w-full space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewTicketType('mobile')}
                  disabled={downloadingTicket !== null}
                  className="text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Mobile
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewTicketType('80mm')}
                  disabled={downloadingTicket !== null}
                  className="text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  80mm
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewTicketType('a4')}
                  disabled={downloadingTicket !== null}
                  className="text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  A4
                </Button>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadTicket('mobile')}
                  disabled={downloadingTicket !== null}
                  className="text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  {downloadingTicket === 'mobile' ? 'Gen...' : 'Mobile'}
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadTicket('80mm')}
                  disabled={downloadingTicket !== null}
                  className="text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  {downloadingTicket === '80mm' ? 'Gen...' : '80mm'}
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadTicket('a4')}
                  disabled={downloadingTicket !== null}
                  className="text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  {downloadingTicket === 'a4' ? 'Gen...' : 'A4'}
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowEmailTicketDialog(true);
                    setEmailTicketRecipient("");
                  }}
                  className="gap-2"
                  size="sm"
                >
                  <Mail className="h-4 w-4" />
                  Email
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setIsWhatsAppDialogOpen(true)}
                  className="gap-2"
                  size="sm"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
                <Button onClick={handleCloseTicket} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                  Cerrar
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sale Detail Dialog */}
      <SaleDetailDialog
        isOpen={isDetailDialogOpen}
        onClose={() => {
          setIsDetailDialogOpen(false);
          setSelectedSale(null);
          setSelectedSalePagos([]);
        }}
        sale={selectedSale}
        pagos={selectedSalePagos}
      />

      {/* Asignar Cuenta Dialog */}
      <AsignarCuentaDialog
        isOpen={isAsignarCuentaDialogOpen}
        onClose={() => {
          setIsAsignarCuentaDialogOpen(false);
          setVentaParaCuenta(null);
        }}
        venta={ventaParaCuenta}
      />

    </div>
  );
}