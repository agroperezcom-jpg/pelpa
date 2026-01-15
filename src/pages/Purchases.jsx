import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
  ShoppingBag, Plus, Search, Trash2, CheckCircle, AlertTriangle, 
  DollarSign, Receipt, TrendingUp, FileText, BarChart3, Download
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Purchases() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPagosDialogOpen, setIsPagosDialogOpen] = useState(false);
  const [compraActual, setCompraActual] = useState({
    fecha: format(new Date(), 'yyyy-MM-dd'),
    proveedor_id: "",
    tipo_comprobante: "A",
    numero_comprobante_proveedor: "",
    observaciones: ""
  });
  const [detalles, setDetalles] = useState([]);
  const [nuevoDetalle, setNuevoDetalle] = useState({
    producto_id: "",
    cantidad: "",
    costo_unitario: ""
  });
  const [pagos, setPagos] = useState([]);
  const [nuevoPago, setNuevoPago] = useState({
    medio_pago_id: "",
    importe: "",
    banco_id: "",
    caja_id: "",
    es_cheque: false,
    cheque_numero: "",
    cheque_banco_id: "",
    cheque_fecha_vencimiento: ""
  });
  const [retencionIIBB, setRetencionIIBB] = useState({
    aplica: false,
    importe_retenido: "",
    numero_comprobante: ""
  });
  const [activeTab, setActiveTab] = useState("compras");
  const [fechaReporte, setFechaReporte] = useState(format(new Date(), 'yyyy-MM'));
  const [user, setUser] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: periodosIVA = [] } = useQuery({
    queryKey: ['periodosIVA'],
    queryFn: () => base44.entities.PeriodoIVA.list('-anio,-mes', 12)
  });

  const { data: periodosIIBB = [] } = useQuery({
    queryKey: ['periodosIIBB'],
    queryFn: () => base44.entities.PeriodoIIBB.list('-anio,-mes', 12)
  });

  const { data: compras = [] } = useQuery({
    queryKey: ['compras'],
    queryFn: () => base44.entities.Compra.list('-created_date', 100)
  });

  const { data: proveedores = [] } = useQuery({
    queryKey: ['proveedores'],
    queryFn: () => base44.entities.Proveedor.list()
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: mediosPago = [] } = useQuery({
    queryKey: ['mediosPago'],
    queryFn: () => base44.entities.MedioPago.list()
  });

  const { data: bancos = [] } = useQuery({
    queryKey: ['bancos'],
    queryFn: () => base44.entities.Banco.list()
  });

  const { data: cajas = [] } = useQuery({
    queryKey: ['cajas'],
    queryFn: () => base44.entities.Caja.list()
  });

  const createCompraMutation = useMutation({
    mutationFn: async ({ compraData, detallesData, pagosData, tipoCompra, retencionIIBBData }) => {
      // PROTECCIÓN FISCAL: Verificar que el período no esté cerrado
      const periodoCompra = compraData.fecha.substring(0, 7); // YYYY-MM
      const periodoCerradoIVA = periodosIVA.find(p => p.periodo === periodoCompra && p.estado === "CERRADO");
      const periodoCerradoIIBB = periodosIIBB.find(p => p.periodo === periodoCompra && p.estado === "CERRADO");
      
      if (periodoCerradoIVA) {
        throw new Error(`⚠️ NO SE PUEDE REGISTRAR: El período IVA ${periodoCompra} está CERRADO. No se pueden registrar más compras en este período.`);
      }
      
      if (retencionIIBBData?.aplica && periodoCerradoIIBB) {
        throw new Error(`⚠️ NO SE PUEDE REGISTRAR: El período IIBB ${periodoCompra} está CERRADO. No se pueden registrar retenciones en este período.`);
      }

      if (!compraData.proveedor_id) throw new Error("Debe seleccionar un proveedor");
      if (detallesData.length === 0) throw new Error("Debe agregar al menos un artículo");
      if (!compraData.tipo_comprobante) throw new Error("Debe seleccionar tipo de comprobante");
      if (!compraData.numero_comprobante_proveedor) throw new Error("Debe ingresar número de comprobante");

      const neto_gravado = detallesData.reduce((acc, d) => acc + d.subtotal, 0);
      const iva_21 = neto_gravado * 0.21;
      const total_compra = neto_gravado + iva_21;

      const totalPagado = pagosData.reduce((acc, p) => acc + p.importe, 0);
      const saldoPendiente = total_compra - totalPagado;

      if (tipoCompra === "CONTADO" && Math.abs(saldoPendiente) > 0.01) {
        throw new Error("En compra CONTADO el total pagado debe ser igual al total");
      }

      const compra = await base44.entities.Compra.create({
        ...compraData,
        tipo_compra: tipoCompra,
        neto_gravado,
        iva_21,
        total_compra,
        saldo_pendiente: saldoPendiente,
        estado: saldoPendiente > 0.01 ? "PENDIENTE" : "PAGADA"
      });

      for (const detalle of detallesData) {
        await base44.entities.CompraDetalle.create({
          ...detalle,
          compra_id: compra.id
        });

        const producto = products.find(p => p.id === detalle.producto_id);
        const nuevoStock = producto.stock + detalle.cantidad;
        
        const costoPromedio = producto.stock > 0
          ? ((producto.stock * producto.costo_unitario) + (detalle.cantidad * detalle.costo_unitario)) / nuevoStock
          : detalle.costo_unitario;

        await base44.entities.Product.update(producto.id, {
          stock: nuevoStock,
          costo_unitario: costoPromedio
        });

        await base44.entities.InventoryMovement.create({
          product_id: producto.id,
          product_name: producto.name,
          type: 'ingreso',
          quantity: detalle.cantidad,
          previous_stock: producto.stock,
          new_stock: nuevoStock,
          reason: 'Compra',
          reference: `Compra ${compra.id} - ${compraData.numero_comprobante_proveedor}`
        });
      }

      // Registrar cheques propios emitidos
      for (const pago of pagosData) {
        if (pago.es_cheque) {
          const bancoNombre = bancos.find(b => b.id === pago.cheque_banco_id)?.nombre || "";

          await base44.entities.Check.create({
            tipo_origen: "PROPIO",
            tipo_soporte: "FISICO",
            numero_cheque: pago.cheque_numero,
            banco_id: pago.cheque_banco_id,
            banco_nombre: bancoNombre,
            fecha_emision: compraData.fecha,
            fecha_vencimiento: pago.cheque_fecha_vencimiento || "",
            importe: pago.importe,
            estado: "EMITIDO",
            titular_tipo: "PROVEEDOR",
            titular_id: compraData.proveedor_id,
            titular_nombre: compraData.proveedor_nombre,
            referencia_origen_tipo: "COMPRA",
            referencia_origen_id: compra.id,
            usuario_registro: user?.email || "",
            fecha_ultimo_cambio: new Date().toISOString(),
            usuario_ultimo_cambio: user?.email || "",
            observaciones: `Emitido en compra ${compraData.numero_comprobante_proveedor}`
          });
        }
      }

      for (const pago of pagosData) {
        await base44.entities.PagoCompra.create({
          compra_id: compra.id,
          ...pago
        });

        if (!pago.es_cheque) {
          await base44.entities.MovimientoTesoreria.create({
          fecha: compraData.fecha,
          tipo: "EGRESO",
          medio_pago_id: pago.medio_pago_id,
          medio_pago_nombre: pago.medio_pago_nombre,
          banco_id: pago.banco_id,
          banco_nombre: pago.banco_nombre,
          caja_id: pago.caja_id,
          caja_nombre: pago.caja_nombre,
          importe: pago.importe,
          referencia_tipo: "compra",
          referencia_id: compra.id,
          observaciones: `Compra ${compraData.numero_comprobante_proveedor} - ${compraData.proveedor_nombre}`
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

      // Generar movimiento CC si hay deuda pendiente
      const proveedor = proveedores.find(p => p.id === compraData.proveedor_id);
      const nuevoSaldo = (proveedor.saldo_cc || 0) + saldoPendiente;

      if (saldoPendiente > 0.01) {
        await base44.entities.MovimientoCC.create({
          tipo_entidad: "PROVEEDOR",
          entidad_id: compraData.proveedor_id,
          entidad_nombre: compraData.proveedor_nombre,
          fecha: compraData.fecha,
          concepto: `Compra ${compraData.numero_comprobante_proveedor}`,
          debe: saldoPendiente,
          haber: 0,
          saldo: nuevoSaldo,
          referencia_tipo: "compra",
          referencia_id: compra.id
          });
          }

          await base44.entities.Proveedor.update(compraData.proveedor_id, {
          saldo_cc: nuevoSaldo
          });

          // Registrar retención IIBB si aplica
          if (retencionIIBBData?.aplica && retencionIIBBData.importe_retenido > 0) {
          await base44.entities.RetencionIIBB.create({
          compra_id: compra.id,
          proveedor_id: compraData.proveedor_id,
          proveedor_nombre: compraData.proveedor_nombre,
          fecha: compraData.fecha,
          periodo: periodoCompra,
          neto_base: neto_gravado,
          importe_retenido: retencionIIBBData.importe_retenido,
          numero_comprobante: retencionIIBBData.numero_comprobante || ""
          });
          }

          return compra;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      queryClient.invalidateQueries({ queryKey: ['movimientosTesoreria'] });
      queryClient.invalidateQueries({ queryKey: ['movimientosCC'] });
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['cajas'] });
      queryClient.invalidateQueries({ queryKey: ['retencionesIIBB'] });
      queryClient.invalidateQueries({ queryKey: ['cheques'] });
      handleCloseDialog();
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const handleOpenDialog = () => {
    setCompraActual({
      fecha: format(new Date(), 'yyyy-MM-dd'),
      proveedor_id: "",
      tipo_comprobante: "A",
      numero_comprobante_proveedor: "",
      observaciones: ""
    });
    setDetalles([]);
    setPagos([]);
    setNuevoDetalle({ producto_id: "", cantidad: "", costo_unitario: "" });
    setNuevoPago({ medio_pago_id: "", importe: "", banco_id: "", caja_id: "", es_cheque: false, cheque_numero: "", cheque_banco_id: "", cheque_fecha_vencimiento: "" });
    setRetencionIIBB({ aplica: false, importe_retenido: "", numero_comprobante: "" });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setIsPagosDialogOpen(false);
    setCompraActual({
      fecha: format(new Date(), 'yyyy-MM-dd'),
      proveedor_id: "",
      tipo_comprobante: "A",
      numero_comprobante_proveedor: "",
      observaciones: ""
    });
    setDetalles([]);
    setPagos([]);
    setNuevoDetalle({ producto_id: "", cantidad: "", costo_unitario: "" });
    setNuevoPago({ medio_pago_id: "", importe: "", banco_id: "", caja_id: "", es_cheque: false, cheque_numero: "", cheque_banco_id: "", cheque_fecha_vencimiento: "" });
    setRetencionIIBB({ aplica: false, importe_retenido: "", numero_comprobante: "" });
  };

  const agregarDetalle = () => {
    if (!nuevoDetalle.producto_id || !nuevoDetalle.cantidad || !nuevoDetalle.costo_unitario) {
      alert("Complete todos los campos del artículo");
      return;
    }

    const producto = products.find(p => p.id === nuevoDetalle.producto_id);
    const cantidad = parseFloat(nuevoDetalle.cantidad);
    const costo = parseFloat(nuevoDetalle.costo_unitario);
    
    if (cantidad <= 0 || costo <= 0) {
      alert("Cantidad y costo deben ser mayores a 0");
      return;
    }

    setDetalles([...detalles, {
      producto_id: producto.id,
      producto_nombre: producto.name,
      cantidad,
      costo_unitario: costo,
      subtotal: cantidad * costo
    }]);

    setNuevoDetalle({ producto_id: "", cantidad: "", costo_unitario: "" });
  };

  const eliminarDetalle = (index) => {
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const neto_gravado = detalles.reduce((acc, d) => acc + d.subtotal, 0);
  const iva_21 = neto_gravado * 0.21;
  const total_compra = neto_gravado + iva_21;

  const handleSiguientePagos = () => {
    if (!compraActual.proveedor_id) {
      alert("Seleccione un proveedor");
      return;
    }
    if (detalles.length === 0) {
      alert("Agregue al menos un artículo");
      return;
    }
    if (!compraActual.numero_comprobante_proveedor) {
      alert("Ingrese el número de comprobante");
      return;
    }
    setIsPagosDialogOpen(true);
  };

  const agregarPago = () => {
    if (nuevoPago.es_cheque) {
      if (!nuevoPago.cheque_numero || !nuevoPago.cheque_banco_id || !nuevoPago.importe || parseFloat(nuevoPago.importe) <= 0) {
        alert("Complete todos los campos del cheque");
        return;
      }

      const banco = bancos.find(b => b.id === nuevoPago.cheque_banco_id);

      setPagos([...pagos, {
        medio_pago_id: null,
        medio_pago_nombre: `Cheque Propio ${nuevoPago.cheque_numero}`,
        importe: parseFloat(nuevoPago.importe),
        banco_id: nuevoPago.cheque_banco_id,
        banco_nombre: banco?.nombre || "",
        caja_id: null,
        caja_nombre: "",
        es_cheque: true,
        cheque_numero: nuevoPago.cheque_numero,
        cheque_banco_id: nuevoPago.cheque_banco_id,
        cheque_fecha_vencimiento: nuevoPago.cheque_fecha_vencimiento
      }]);

      setNuevoPago({
        medio_pago_id: "",
        importe: "",
        banco_id: "",
        caja_id: "",
        es_cheque: false,
        cheque_numero: "",
        cheque_banco_id: "",
        cheque_fecha_vencimiento: ""
      });
      return;
    }

    if (!nuevoPago.medio_pago_id || !nuevoPago.importe || parseFloat(nuevoPago.importe) <= 0) {
      return;
    }

    const medio = mediosPago.find(m => m.id === nuevoPago.medio_pago_id);
    
    if (medio.requiere_banco && !nuevoPago.banco_id) {
      alert("Seleccione un banco");
      return;
    }

    if (medio.requiere_caja && !nuevoPago.caja_id) {
      alert("Seleccione una caja");
      return;
    }

    const banco = bancos.find(b => b.id === nuevoPago.banco_id);
    const caja = cajas.find(c => c.id === nuevoPago.caja_id);

    setPagos([...pagos, {
      medio_pago_id: nuevoPago.medio_pago_id,
      medio_pago_nombre: medio.nombre,
      importe: parseFloat(nuevoPago.importe),
      banco_id: nuevoPago.banco_id || null,
      banco_nombre: banco?.nombre || "",
      caja_id: nuevoPago.caja_id || null,
      caja_nombre: caja?.nombre || ""
    }]);

    setNuevoPago({ medio_pago_id: "", importe: "", banco_id: "", caja_id: "" });
  };

  const eliminarPago = (index) => {
    setPagos(pagos.filter((_, i) => i !== index));
  };

  const totalPagado = pagos.reduce((acc, p) => acc + p.importe, 0);
  const saldoPendiente = total_compra - totalPagado;
  const pagoCompleto = Math.abs(saldoPendiente) < 0.01;

  const handleConfirmarCompra = () => {
    const proveedor = proveedores.find(p => p.id === compraActual.proveedor_id);

    let tipoCompra;
    const tieneCuentaCorriente = saldoPendiente > 0.01;
    const tienePagos = pagos.length > 0;

    if (tieneCuentaCorriente && !tienePagos) {
      tipoCompra = "CTA_CTE";
    } else if (tieneCuentaCorriente && tienePagos) {
      tipoCompra = "MIXTA";
    } else {
      tipoCompra = "CONTADO";
    }

    if (tipoCompra === "CONTADO" && !pagoCompleto) {
      const confirmar = window.confirm("El pago no está completo. ¿Desea dejar el saldo en cuenta corriente?");
      if (confirmar) {
        tipoCompra = "MIXTA";
      } else {
        return;
      }
    }

    createCompraMutation.mutate({
      compraData: {
        ...compraActual,
        proveedor_nombre: proveedor.nombre
      },
      detallesData: detalles,
      pagosData: pagos,
      tipoCompra,
      retencionIIBBData: retencionIIBB
    });
  };

  const filteredCompras = compras.filter(c =>
    c.proveedor_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.numero_comprobante_proveedor?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const medioSeleccionado = mediosPago.find(m => m.id === nuevoPago.medio_pago_id);

  const today = new Date().toISOString().split('T')[0];
  const comprasHoy = compras.filter(c => c.fecha === today && (c.estado === "CONFIRMADA" || c.estado === "PENDIENTE" || c.estado === "PARCIAL" || c.estado === "PAGADA"));
  const totalHoy = comprasHoy.reduce((acc, c) => acc + (c.total_compra || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-blue-600" />
            Compras
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
            Hoy: ${totalHoy.toLocaleString()} ({comprasHoy.length} compras)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            const data = compras.map(c => ({
              fecha: c.fecha,
              proveedor: c.proveedor_nombre,
              comprobante: `${c.tipo_comprobante}-${c.numero_comprobante_proveedor}`,
              neto: c.neto_gravado,
              iva: c.iva_21,
              total: c.total_compra,
              tipo: c.tipo_compra
            }));
            const csv = [
              ['Fecha', 'Proveedor', 'Comprobante', 'Neto', 'IVA', 'Total', 'Tipo'],
              ...data.map(d => [d.fecha, d.proveedor, d.comprobante, d.neto, d.iva, d.total, d.tipo])
            ].map(row => row.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `compras_${format(new Date(), 'yyyy-MM-dd')}.csv`;
            a.click();
          }}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={handleOpenDialog} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Compra
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase">Compras Hoy</p>
            <p className="text-2xl font-bold text-foreground mt-1">{comprasHoy.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase">Total Hoy</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">${totalHoy.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase">IVA Crédito</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              ${comprasHoy.reduce((acc, c) => acc + (c.iva_21 || 0), 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase">Total Histórico</p>
            <p className="text-2xl font-bold text-foreground mt-1">{compras.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-card border shadow-sm">
          <TabsTrigger value="compras">Compras</TabsTrigger>
          <TabsTrigger value="reportes">Reportes</TabsTrigger>
        </TabsList>

        <TabsContent value="compras" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por proveedor o número de comprobante..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Comprobante</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead className="text-right">IVA</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompras.map((compra) => (
                  <TableRow key={compra.id} className="hover:bg-slate-50">
                    <TableCell className="text-slate-600 text-sm">
                      {format(new Date(compra.fecha), "d MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium">{compra.proveedor_nombre}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {compra.tipo_comprobante} - {compra.numero_comprobante_proveedor}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        compra.tipo_compra === "CONTADO" ? "bg-green-100 text-green-700" :
                        compra.tipo_compra === "CTA_CTE" ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700"
                      }>
                        {compra.tipo_compra}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">${compra.neto_gravado?.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-emerald-600">${compra.iva_21?.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold text-blue-600">
                      ${compra.total_compra?.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        compra.estado === "PAGADA" ? "bg-green-100 text-green-700" :
                        compra.estado === "PENDIENTE" ? "bg-red-100 text-red-700" :
                        compra.estado === "PARCIAL" ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-700"
                      }>
                        {compra.estado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCompras.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      No hay compras registradas
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="reportes" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <Label>Período:</Label>
            <Input
              type="month"
              value={fechaReporte}
              onChange={(e) => setFechaReporte(e.target.value)}
              className="w-48"
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Compras del Mes</p>
                    <p className="text-3xl font-bold text-slate-800 mt-2">
                      {compras.filter(c => c.fecha?.startsWith(fechaReporte)).length}
                    </p>
                  </div>
                  <FileText className="h-10 w-10 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Total Comprado</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">
                      ${compras.filter(c => c.fecha?.startsWith(fechaReporte))
                        .reduce((acc, c) => acc + (c.total_compra || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <DollarSign className="h-10 w-10 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">IVA Crédito Fiscal</p>
                    <p className="text-3xl font-bold text-emerald-600 mt-2">
                      ${compras.filter(c => c.fecha?.startsWith(fechaReporte))
                        .reduce((acc, c) => acc + (c.iva_21 || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <TrendingUp className="h-10 w-10 text-emerald-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Compras por Proveedor
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-center">Compras</TableHead>
                  <TableHead className="text-right">Neto Gravado</TableHead>
                  <TableHead className="text-right">IVA 21%</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const comprasPorProveedor = {};
                  compras.filter(c => c.fecha?.startsWith(fechaReporte)).forEach(c => {
                    const prov = c.proveedor_nombre || "Sin proveedor";
                    if (!comprasPorProveedor[prov]) {
                      comprasPorProveedor[prov] = { cantidad: 0, neto: 0, iva: 0, total: 0 };
                    }
                    comprasPorProveedor[prov].cantidad += 1;
                    comprasPorProveedor[prov].neto += c.neto_gravado || 0;
                    comprasPorProveedor[prov].iva += c.iva_21 || 0;
                    comprasPorProveedor[prov].total += c.total_compra || 0;
                  });

                  return Object.entries(comprasPorProveedor)
                    .sort(([, a], [, b]) => b.total - a.total)
                    .map(([prov, data]) => (
                      <TableRow key={prov}>
                        <TableCell className="font-medium">{prov}</TableCell>
                        <TableCell className="text-center">{data.cantidad}</TableCell>
                        <TableCell className="text-right">${data.neto.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-emerald-600">${data.iva.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold text-blue-600">
                          ${data.total.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ));
                })()}
              </TableBody>
            </Table>
          </Card>

          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <Receipt className="h-5 w-5 text-emerald-600" />
                Libro IVA Compras (Crédito Fiscal)
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Comprobante</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Neto Gravado</TableHead>
                  <TableHead className="text-right">IVA 21%</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compras
                  .filter(c => c.fecha?.startsWith(fechaReporte))
                  .map((compra) => (
                    <TableRow key={compra.id}>
                      <TableCell className="text-sm text-slate-600">
                        {format(new Date(compra.fecha), "dd/MM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell className="font-medium">{compra.proveedor_nombre}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {compra.tipo_comprobante} - {compra.numero_comprobante_proveedor}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          compra.tipo_compra === "CONTADO" ? "bg-green-100 text-green-700" :
                          compra.tipo_compra === "CTA_CTE" ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        }>
                          {compra.tipo_compra}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">${compra.neto_gravado?.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                        ${compra.iva_21?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-600">
                        ${compra.total_compra?.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                {compras.filter(c => c.fecha?.startsWith(fechaReporte)).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      No hay compras en este período
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Deuda a Proveedores
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Saldo Deudor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proveedores
                  .filter(p => p.saldo_cc > 0)
                  .sort((a, b) => b.saldo_cc - a.saldo_cc)
                  .map((prov) => (
                    <TableRow key={prov.id}>
                      <TableCell className="font-medium">{prov.nombre}</TableCell>
                      <TableCell className="text-right font-bold text-red-600">
                        ${prov.saldo_cc.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                {proveedores.filter(p => p.saldo_cc > 0).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-slate-500">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p>Sin deudas pendientes</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen && !isPagosDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-blue-600" />
              Nueva Compra
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={compraActual.fecha}
                  onChange={(e) => setCompraActual({ ...compraActual, fecha: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Proveedor *</Label>
                <Select 
                  value={compraActual.proveedor_id} 
                  onValueChange={(v) => {
                    const prov = proveedores.find(p => p.id === v);
                    setCompraActual({ ...compraActual, proveedor_id: v, proveedor_nombre: prov?.nombre });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {proveedores.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo Comprobante *</Label>
                <Select 
                  value={compraActual.tipo_comprobante} 
                  onValueChange={(v) => setCompraActual({ ...compraActual, tipo_comprobante: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Factura A</SelectItem>
                    <SelectItem value="B">Factura B</SelectItem>
                    <SelectItem value="C">Factura C</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>N° Comprobante *</Label>
                <Input
                  placeholder="0001-00001234"
                  value={compraActual.numero_comprobante_proveedor}
                  onChange={(e) => setCompraActual({ ...compraActual, numero_comprobante_proveedor: e.target.value })}
                />
              </div>
            </div>

            <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm text-blue-900">Agregar Artículo</h4>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-5">
                  <Label className="text-xs">Producto *</Label>
                  <Select value={nuevoDetalle.producto_id} onValueChange={(v) => {
                    const prod = products.find(p => p.id === v);
                    setNuevoDetalle({ 
                      ...nuevoDetalle, 
                      producto_id: v,
                      costo_unitario: prod?.costo_unitario?.toString() || ""
                    });
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-3">
                  <Label className="text-xs">Cantidad *</Label>
                  <Input
                    type="number"
                    step="1"
                    value={nuevoDetalle.cantidad}
                    onChange={(e) => setNuevoDetalle({ ...nuevoDetalle, cantidad: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="col-span-3">
                  <Label className="text-xs">Costo Unit. *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={nuevoDetalle.costo_unitario}
                    onChange={(e) => setNuevoDetalle({ ...nuevoDetalle, costo_unitario: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="col-span-1 flex items-end">
                  <Button onClick={agregarDetalle} className="w-full bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {detalles.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Cantidad</TableHead>
                      <TableHead className="text-right">Costo Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalles.map((det, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{det.producto_nombre}</TableCell>
                        <TableCell className="text-center">{det.cantidad}</TableCell>
                        <TableCell className="text-right">${det.costo_unitario.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-bold">${det.subtotal.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => eliminarDetalle(idx)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-6 border-2">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Neto Gravado</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">${neto_gravado.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">IVA 21%</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">${iva_21.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Total Compra</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">${total_compra.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea
                value={compraActual.observaciones}
                onChange={(e) => setCompraActual({ ...compraActual, observaciones: e.target.value })}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
            <Button onClick={handleSiguientePagos} className="bg-blue-600 hover:bg-blue-700" disabled={detalles.length === 0}>
              <DollarSign className="h-4 w-4 mr-2" />
              Siguiente: Pagos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPagosDialogOpen} onOpenChange={setIsPagosDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              Formas de Pago
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Total Compra</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">${total_compra.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Pagado</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">${totalPagado.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Pendiente</p>
                <p className={`text-3xl font-bold mt-1 ${saldoPendiente > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                  ${Math.abs(saldoPendiente).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm text-blue-900">Agregar Pago</h4>

              <div className="flex gap-2 mb-3">
                <Button
                  size="sm"
                  variant={!nuevoPago.es_cheque ? "default" : "outline"}
                  onClick={() => setNuevoPago({ ...nuevoPago, es_cheque: false })}
                >
                  Medio de Pago
                </Button>
                <Button
                  size="sm"
                  variant={nuevoPago.es_cheque ? "default" : "outline"}
                  onClick={() => setNuevoPago({ ...nuevoPago, es_cheque: true, medio_pago_id: "" })}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Cheque Propio
                </Button>
              </div>

              {!nuevoPago.es_cheque ? (
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-4">
                    <Label className="text-xs">Medio de Pago *</Label>
                    <Select value={nuevoPago.medio_pago_id} onValueChange={(v) => setNuevoPago({ ...nuevoPago, medio_pago_id: v, banco_id: "", caja_id: "" })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {mediosPago.filter(m => m.nombre !== "Cuenta Corriente").map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-3">
                    <Label className="text-xs">Importe *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={nuevoPago.importe}
                      onChange={(e) => setNuevoPago({ ...nuevoPago, importe: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>

                  {medioSeleccionado?.requiere_banco && (
                    <div className="col-span-3">
                      <Label className="text-xs">Banco *</Label>
                      <Select value={nuevoPago.banco_id} onValueChange={(v) => setNuevoPago({ ...nuevoPago, banco_id: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {bancos.map(b => (
                            <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {medioSeleccionado?.requiere_caja && (
                    <div className="col-span-3">
                      <Label className="text-xs">Caja *</Label>
                      <Select value={nuevoPago.caja_id} onValueChange={(v) => setNuevoPago({ ...nuevoPago, caja_id: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {cajas.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className={`${medioSeleccionado?.requiere_banco || medioSeleccionado?.requiere_caja ? 'col-span-2' : 'col-span-5'} flex items-end`}>
                    <Button onClick={agregarPago} className="w-full bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-3">
                    <Label className="text-xs">Número Cheque *</Label>
                    <Input
                      value={nuevoPago.cheque_numero}
                      onChange={(e) => setNuevoPago({ ...nuevoPago, cheque_numero: e.target.value })}
                      placeholder="12345678"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Banco *</Label>
                    <Select value={nuevoPago.cheque_banco_id} onValueChange={(v) => setNuevoPago({ ...nuevoPago, cheque_banco_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {bancos.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Vencimiento</Label>
                    <Input
                      type="date"
                      value={nuevoPago.cheque_fecha_vencimiento}
                      onChange={(e) => setNuevoPago({ ...nuevoPago, cheque_fecha_vencimiento: e.target.value })}
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Importe *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={nuevoPago.importe}
                      onChange={(e) => setNuevoPago({ ...nuevoPago, importe: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-1 flex items-end">
                    <Button onClick={agregarPago} className="w-full bg-orange-600 hover:bg-orange-700">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {pagos.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Medio de Pago</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagos.map((pago, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <div className="font-medium">{pago.es_cheque ? "Cheque Propio" : pago.medio_pago_nombre}</div>
                          {pago.es_cheque && (
                            <div className="text-xs text-orange-600">Nº {pago.cheque_numero}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {pago.es_cheque && pago.cheque_banco_id && bancos.find(b => b.id === pago.cheque_banco_id)?.nombre}
                          {!pago.es_cheque && pago.banco_nombre && `🏦 ${pago.banco_nombre}`}
                          {!pago.es_cheque && pago.caja_nombre && `💵 ${pago.caja_nombre}`}
                          {!pago.es_cheque && !pago.banco_nombre && !pago.caja_nombre && "—"}
                        </TableCell>
                        <TableCell className="text-right font-bold">${pago.importe.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => eliminarPago(idx)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className={`flex items-center justify-between gap-2 p-4 rounded-lg ${
              pagoCompleto ? 'bg-green-50 border-2 border-green-300' : 'bg-amber-50 border-2 border-amber-300'
            }`}>
              <div className="flex items-center gap-2">
                {pagoCompleto ? (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <span className="text-base text-green-900 font-semibold">✓ Pago completo</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                    <div>
                      <span className="text-base text-amber-900 font-semibold block">
                        {pagos.length === 0 ? "Puede dejar en cuenta corriente" : "Pago parcial"}
                      </span>
                      {saldoPendiente > 0.01 && (
                        <span className="text-sm text-amber-700">
                          Pendiente: ${saldoPendiente.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Retención IIBB */}
            <div className="border-2 border-purple-200 bg-purple-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-purple-900">¿Sufrió Retención de IIBB?</Label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={retencionIIBB.aplica}
                    onChange={(e) => setRetencionIIBB({ ...retencionIIBB, aplica: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-slate-200 peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {retencionIIBB.aplica && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Importe Retenido *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={retencionIIBB.importe_retenido}
                      onChange={(e) => setRetencionIIBB({ ...retencionIIBB, importe_retenido: parseFloat(e.target.value) || "" })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">N° Comprobante</Label>
                    <Input
                      value={retencionIIBB.numero_comprobante}
                      onChange={(e) => setRetencionIIBB({ ...retencionIIBB, numero_comprobante: e.target.value })}
                      placeholder="Opcional"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPagosDialogOpen(false)}>
              Volver
            </Button>
            <Button onClick={handleConfirmarCompra} className="bg-blue-600 hover:bg-blue-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar Compra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}