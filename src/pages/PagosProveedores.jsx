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
  DollarSign,
  Plus,
  Search,
  Receipt,
  AlertTriangle,
  CheckCircle,
  Trash2,
  FileText,
  Clock,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function PagosProveedores() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [facturasPendientes, setFacturasPendientes] = useState([]);
  const [facturasSeleccionadas, setFacturasSeleccionadas] = useState([]);
  const [mediosPagoUsados, setMediosPagoUsados] = useState([]);
  const [nuevoPago, setNuevoPago] = useState({
    fecha: format(new Date(), 'yyyy-MM-dd'),
    observaciones: ""
  });
  const [nuevoMedio, setNuevoMedio] = useState({
    medio_pago_id: "",
    importe: "",
    banco_id: "",
    caja_id: "",
    tipo_pago: "MEDIO",
    cheque_id: "",
    cheque_propio_numero: "",
    cheque_propio_banco_id: "",
    cheque_propio_vencimiento: ""
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: proveedores = [] } = useQuery({
    queryKey: ['proveedores'],
    queryFn: () => base44.entities.Proveedor.list()
  });

  const { data: compras = [] } = useQuery({
    queryKey: ['compras'],
    queryFn: () => base44.entities.Compra.list('-fecha', 500)
  });

  const { data: pagos = [] } = useQuery({
    queryKey: ['pagosProveedores'],
    queryFn: () => base44.entities.PagoProveedorCabecera.list('-fecha', 200)
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

  const { data: chequesDisponibles = [] } = useQuery({
    queryKey: ['chequesDisponibles'],
    queryFn: () => base44.entities.Check.filter({
      tipo_origen: "TERCERO",
      estado: "EN_CARTERA"
    })
  });

  const confirmarPagoMutation = useMutation({
    mutationFn: async ({ pagoData, detalles, medios }) => {
      if (!pagoData.proveedor_id) throw new Error("Seleccione un proveedor");
      if (detalles.length === 0) throw new Error("Debe seleccionar al menos una factura");
      if (medios.length === 0) throw new Error("Debe agregar al menos un medio de pago");

      const totalAplicado = detalles.reduce((acc, d) => acc + d.importe_aplicado, 0);
      const totalMedios = medios.reduce((acc, m) => acc + m.importe, 0);

      if (Math.abs(totalAplicado - totalMedios) > 0.01) {
        throw new Error("El total de medios de pago debe ser igual al total aplicado");
      }

      // Buscar último número
      const pagosPrevios = await base44.entities.PagoProveedorCabecera.list();
      const ultimoNumero = pagosPrevios.reduce((max, p) => {
        const num = parseInt(p.numero_pago?.replace(/\D/g, '') || '0');
        return Math.max(max, num);
      }, 0);
      const nuevoNumero = `PP-${String(ultimoNumero + 1).padStart(5, '0')}`;

      // 1) Crear cabecera
      const pago = await base44.entities.PagoProveedorCabecera.create({
        ...pagoData,
        numero_pago: nuevoNumero,
        total_pago: totalAplicado,
        estado: "CONFIRMADO",
        fecha_confirmacion: new Date().toISOString()
      });

      // 2) Crear detalles
      for (const detalle of detalles) {
        await base44.entities.PagoProveedorDetalle.create({
          pago_cabecera_id: pago.id,
          ...detalle
        });

        // Actualizar compra
        const compra = compras.find(c => c.id === detalle.compra_id);
        const nuevoSaldo = (compra.saldo_pendiente || compra.total_compra) - detalle.importe_aplicado;
        const nuevoEstado = Math.abs(nuevoSaldo) < 0.01 ? "PAGADA" : "PARCIAL";

        await base44.entities.Compra.update(detalle.compra_id, {
          saldo_pendiente: nuevoSaldo,
          estado: nuevoEstado
        });
      }

      // 3) Crear medios de pago
      for (const medio of medios) {
        if (medio.tipo_pago === "CHEQUE_TERCERO") {
          // Entregar cheque de tercero
          await base44.entities.Check.update(medio.cheque_id, {
            estado: "ENTREGADO",
            fecha_ultimo_cambio: new Date().toISOString(),
            usuario_ultimo_cambio: user.email,
            observaciones: `Entregado a ${pagoData.proveedor_nombre} - Pago ${nuevoNumero}`
          });

          await base44.entities.PagoProveedorMedio.create({
            pago_cabecera_id: pago.id,
            medio_pago_id: null,
            medio_pago_nombre: medio.medio_pago_nombre,
            importe: medio.importe,
            banco_id: null,
            banco_nombre: medio.banco_nombre,
            caja_id: null,
            caja_nombre: ""
          });
        } else if (medio.tipo_pago === "CHEQUE_PROPIO") {
          // Emitir cheque propio
          await base44.entities.Check.create({
            tipo_origen: "PROPIO",
            tipo_soporte: "FISICO",
            numero_cheque: medio.cheque_propio_numero,
            banco_id: medio.cheque_propio_banco_id,
            banco_nombre: medio.cheque_propio_banco_nombre,
            fecha_emision: pagoData.fecha,
            fecha_vencimiento: medio.cheque_propio_vencimiento || "",
            importe: medio.importe,
            estado: "ENTREGADO",
            titular_tipo: "PROVEEDOR",
            titular_id: pagoData.proveedor_id,
            titular_nombre: pagoData.proveedor_nombre,
            referencia_origen_tipo: "PAGO",
            referencia_origen_id: pago.id,
            usuario_registro: user.email,
            fecha_ultimo_cambio: new Date().toISOString(),
            usuario_ultimo_cambio: user.email,
            observaciones: `Emitido para pago ${nuevoNumero} a ${pagoData.proveedor_nombre}`
          });

          await base44.entities.PagoProveedorMedio.create({
            pago_cabecera_id: pago.id,
            medio_pago_id: null,
            medio_pago_nombre: medio.medio_pago_nombre,
            importe: medio.importe,
            banco_id: medio.cheque_propio_banco_id,
            banco_nombre: medio.cheque_propio_banco_nombre,
            caja_id: null,
            caja_nombre: ""
          });
        } else {
          // Medio de pago normal
          await base44.entities.PagoProveedorMedio.create({
            pago_cabecera_id: pago.id,
            ...medio
          });

          // Movimiento tesorería
          await base44.entities.MovimientoTesoreria.create({
            fecha: pagoData.fecha,
            tipo: "EGRESO",
            medio_pago_id: medio.medio_pago_id,
            medio_pago_nombre: medio.medio_pago_nombre,
            banco_id: medio.banco_id,
            banco_nombre: medio.banco_nombre,
            caja_id: medio.caja_id,
            caja_nombre: medio.caja_nombre,
            importe: medio.importe,
            referencia_tipo: "pago_proveedor",
            referencia_id: pago.id,
            observaciones: `Pago ${nuevoNumero} a ${pagoData.proveedor_nombre}`
          });

          // Actualizar saldos
          if (medio.banco_id) {
            const banco = bancos.find(b => b.id === medio.banco_id);
            await base44.entities.Banco.update(medio.banco_id, {
              saldo_actual: banco.saldo_actual - medio.importe
            });
          }
          if (medio.caja_id) {
            const caja = cajas.find(c => c.id === medio.caja_id);
            await base44.entities.Caja.update(medio.caja_id, {
              saldo_actual: caja.saldo_actual - medio.importe
            });
          }
        }
      }

      // 4) Movimiento cuenta corriente
      const proveedor = proveedores.find(p => p.id === pagoData.proveedor_id);
      const nuevoSaldoProveedor = proveedor.saldo_cc - totalAplicado;

      await base44.entities.MovimientoCC.create({
        tipo_entidad: "PROVEEDOR",
        entidad_id: pagoData.proveedor_id,
        entidad_nombre: pagoData.proveedor_nombre,
        fecha: pagoData.fecha,
        concepto: `Pago ${nuevoNumero} - ${detalles.length} factura(s)`,
        debe: 0,
        haber: totalAplicado,
        saldo: nuevoSaldoProveedor,
        referencia_tipo: "pago_proveedor",
        referencia_id: pago.id
      });

      await base44.entities.Proveedor.update(pagoData.proveedor_id, {
        saldo_cc: nuevoSaldoProveedor
      });

      return pago;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagosProveedores'] });
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      queryClient.invalidateQueries({ queryKey: ['movimientosCC'] });
      queryClient.invalidateQueries({ queryKey: ['movimientosTesoreria'] });
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['cajas'] });
      handleCloseDialog();
      alert("✅ Pago confirmado exitosamente");
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const handleOpenDialog = (proveedor) => {
    if (!proveedor) return;
    
    setProveedorSeleccionado(proveedor);
    
    // Cargar facturas pendientes del proveedor
    const pendientes = compras.filter(c => 
      c.proveedor_id === proveedor.id && 
      (c.estado === "PENDIENTE" || c.estado === "PARCIAL") &&
      (c.saldo_pendiente || c.total_compra) > 0
    ).map(c => ({
      ...c,
      saldo_real: c.saldo_pendiente || c.total_compra,
      importe_a_pagar: 0,
      seleccionada: false
    }));

    setFacturasPendientes(pendientes);
    setFacturasSeleccionadas([]);
    setMediosPagoUsados([]);
    setNuevoPago({
      fecha: format(new Date(), 'yyyy-MM-dd'),
      observaciones: ""
    });
    setNuevoMedio({
      medio_pago_id: "",
      importe: "",
      banco_id: "",
      caja_id: ""
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setProveedorSeleccionado(null);
  };

  const toggleFactura = (index) => {
    const newFacturas = [...facturasPendientes];
    newFacturas[index].seleccionada = !newFacturas[index].seleccionada;
    
    if (newFacturas[index].seleccionada) {
      newFacturas[index].importe_a_pagar = newFacturas[index].saldo_real;
    } else {
      newFacturas[index].importe_a_pagar = 0;
    }
    
    setFacturasPendientes(newFacturas);
    actualizarFacturasSeleccionadas(newFacturas);
  };

  const updateImportePagar = (index, valor) => {
    const newFacturas = [...facturasPendientes];
    const importe = parseFloat(valor) || 0;
    
    if (importe > newFacturas[index].saldo_real) {
      alert("El importe no puede ser mayor al saldo pendiente");
      return;
    }
    
    newFacturas[index].importe_a_pagar = importe;
    setFacturasPendientes(newFacturas);
    actualizarFacturasSeleccionadas(newFacturas);
  };

  const actualizarFacturasSeleccionadas = (facturas) => {
    const seleccionadas = facturas
      .filter(f => f.seleccionada && f.importe_a_pagar > 0)
      .map(f => ({
        compra_id: f.id,
        compra_numero: f.numero_comprobante_proveedor,
        importe_aplicado: f.importe_a_pagar
      }));
    setFacturasSeleccionadas(seleccionadas);
  };

  const agregarMedio = () => {
    if (nuevoMedio.tipo_pago === "CHEQUE_TERCERO") {
      if (!nuevoMedio.cheque_id) {
        alert("Seleccione un cheque");
        return;
      }
      const cheque = chequesDisponibles.find(c => c.id === nuevoMedio.cheque_id);
      setMediosPagoUsados([...mediosPagoUsados, {
        tipo_pago: "CHEQUE_TERCERO",
        cheque_id: nuevoMedio.cheque_id,
        medio_pago_nombre: `Cheque ${cheque.numero_cheque}`,
        importe: cheque.importe,
        banco_nombre: cheque.banco_nombre
      }]);
    } else if (nuevoMedio.tipo_pago === "CHEQUE_PROPIO") {
      if (!nuevoMedio.cheque_propio_numero || !nuevoMedio.cheque_propio_banco_id || !nuevoMedio.importe) {
        alert("Complete todos los campos del cheque");
        return;
      }
      const banco = bancos.find(b => b.id === nuevoMedio.cheque_propio_banco_id);
      setMediosPagoUsados([...mediosPagoUsados, {
        tipo_pago: "CHEQUE_PROPIO",
        medio_pago_nombre: `Cheque Propio ${nuevoMedio.cheque_propio_numero}`,
        importe: parseFloat(nuevoMedio.importe),
        cheque_propio_numero: nuevoMedio.cheque_propio_numero,
        cheque_propio_banco_id: nuevoMedio.cheque_propio_banco_id,
        cheque_propio_banco_nombre: banco?.nombre || "",
        cheque_propio_vencimiento: nuevoMedio.cheque_propio_vencimiento
      }]);
    } else {
      if (!nuevoMedio.medio_pago_id || !nuevoMedio.importe || parseFloat(nuevoMedio.importe) <= 0) {
        alert("Complete todos los campos del medio de pago");
        return;
      }

      const medio = mediosPago.find(m => m.id === nuevoMedio.medio_pago_id);
      
      if (medio.requiere_banco && !nuevoMedio.banco_id) {
        alert("Seleccione un banco");
        return;
      }

      if (medio.requiere_caja && !nuevoMedio.caja_id) {
        alert("Seleccione una caja");
        return;
      }

      const banco = bancos.find(b => b.id === nuevoMedio.banco_id);
      const caja = cajas.find(c => c.id === nuevoMedio.caja_id);

      setMediosPagoUsados([...mediosPagoUsados, {
        tipo_pago: "MEDIO",
        medio_pago_id: nuevoMedio.medio_pago_id,
        medio_pago_nombre: medio.nombre,
        importe: parseFloat(nuevoMedio.importe),
        banco_id: nuevoMedio.banco_id || null,
        banco_nombre: banco?.nombre || "",
        caja_id: nuevoMedio.caja_id || null,
        caja_nombre: caja?.nombre || ""
      }]);
    }

    setNuevoMedio({
      medio_pago_id: "",
      importe: "",
      banco_id: "",
      caja_id: "",
      tipo_pago: "MEDIO",
      cheque_id: "",
      cheque_propio_numero: "",
      cheque_propio_banco_id: "",
      cheque_propio_vencimiento: ""
    });
  };

  const eliminarMedio = (index) => {
    setMediosPagoUsados(mediosPagoUsados.filter((_, i) => i !== index));
  };

  const handleConfirmarPago = () => {
    if (!user) {
      alert("Usuario no autenticado");
      return;
    }

    confirmarPagoMutation.mutate({
      pagoData: {
        fecha: nuevoPago.fecha,
        proveedor_id: proveedorSeleccionado.id,
        proveedor_nombre: proveedorSeleccionado.nombre,
        usuario_email: user.email,
        usuario_nombre: user.full_name,
        observaciones: nuevoPago.observaciones
      },
      detalles: facturasSeleccionadas,
      medios: mediosPagoUsados
    });
  };

  const totalAplicado = facturasSeleccionadas.reduce((acc, f) => acc + f.importe_aplicado, 0);
  const totalMedios = mediosPagoUsados.reduce((acc, m) => acc + m.importe, 0);
  const diferencia = totalAplicado - totalMedios;
  const pagoBalanceado = Math.abs(diferencia) < 0.01;

  const filteredProveedores = proveedores.filter(p => 
    (p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.cuit?.includes(searchTerm)) &&
    p.saldo_cc > 0
  );

  const medioSeleccionado = mediosPago.find(m => m.id === nuevoMedio.medio_pago_id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-emerald-600" />
            Pagos a Proveedores
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestión de pagos y cancelación de facturas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Proveedores con Deuda</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {proveedores.filter(p => p.saldo_cc > 0).length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Deuda Total</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              ${proveedores.reduce((acc, p) => acc + (p.saldo_cc || 0), 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Pagos Hoy</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {pagos.filter(p => p.fecha === format(new Date(), 'yyyy-MM-dd')).length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Total Pagado Hoy</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              ${pagos.filter(p => p.fecha === format(new Date(), 'yyyy-MM-dd'))
                .reduce((acc, p) => acc + (p.total_pago || 0), 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar proveedor con deuda..."
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
              <TableHead>Proveedor</TableHead>
              <TableHead>CUIT</TableHead>
              <TableHead>Facturas Pendientes</TableHead>
              <TableHead className="text-right">Saldo Deudor</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProveedores.map((proveedor) => {
              const facturasPendientesCount = compras.filter(c => 
                c.proveedor_id === proveedor.id && 
                (c.estado === "PENDIENTE" || c.estado === "PARCIAL")
              ).length;

              return (
                <TableRow key={proveedor.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium">{proveedor.nombre}</TableCell>
                  <TableCell className="font-mono text-sm">{proveedor.cuit || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      <FileText className="h-3 w-3" />
                      {facturasPendientesCount}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-red-600">
                    ${proveedor.saldo_cc.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleOpenDialog(proveedor)}
                    >
                      <DollarSign className="h-3 w-3 mr-1" />
                      Pagar
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredProveedores.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p>No hay proveedores con deuda pendiente</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Últimos Pagos Registrados
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Número</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagos.slice(0, 10).map((pago) => (
              <TableRow key={pago.id}>
                <TableCell className="font-mono text-sm">{pago.numero_pago}</TableCell>
                <TableCell className="text-sm text-slate-600">
                  {format(new Date(pago.fecha), "dd/MM/yyyy", { locale: es })}
                </TableCell>
                <TableCell className="font-medium">{pago.proveedor_nombre}</TableCell>
                <TableCell className="text-right font-bold text-emerald-600">
                  ${pago.total_pago.toLocaleString()}
                </TableCell>
                <TableCell className="text-sm text-slate-600">{pago.usuario_nombre}</TableCell>
                <TableCell>
                  <Badge className="bg-green-100 text-green-700">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {pago.estado}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {pagos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  No hay pagos registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              Registrar Pago - {proveedorSeleccionado?.nombre}
            </DialogTitle>
          </DialogHeader>

          {proveedorSeleccionado && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <p className="text-xs text-red-700 uppercase font-medium mb-1">Saldo Total Proveedor</p>
                  <p className="text-3xl font-bold text-red-600">
                    ${proveedorSeleccionado.saldo_cc.toLocaleString()}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Fecha del Pago</Label>
                  <Input
                    type="date"
                    value={nuevoPago.fecha}
                    onChange={(e) => setNuevoPago({ ...nuevoPago, fecha: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-blue-600" />
                  Facturas Pendientes - Seleccione para aplicar pago
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Comprobante</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Total Factura</TableHead>
                        <TableHead className="text-right">Saldo Pendiente</TableHead>
                        <TableHead className="text-right">Importe a Pagar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {facturasPendientes.map((factura, idx) => (
                        <TableRow key={idx} className={factura.seleccionada ? "bg-blue-50" : ""}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={factura.seleccionada}
                              onChange={() => toggleFactura(idx)}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {factura.tipo_comprobante} - {factura.numero_comprobante_proveedor}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {format(new Date(factura.fecha), "dd/MM/yyyy", { locale: es })}
                          </TableCell>
                          <TableCell className="text-right">${factura.total_compra.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold text-red-600">
                            ${factura.saldo_real.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              step="0.01"
                              value={factura.importe_a_pagar || ""}
                              onChange={(e) => updateImportePagar(idx, e.target.value)}
                              disabled={!factura.seleccionada}
                              className="text-right font-bold"
                              placeholder="0.00"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                      {facturasPendientes.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                            No hay facturas pendientes
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-sm text-blue-900">Agregar Medio de Pago</h4>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={nuevoMedio.tipo_pago === "MEDIO" ? "default" : "outline"}
                    onClick={() => setNuevoMedio({ ...nuevoMedio, tipo_pago: "MEDIO" })}
                  >
                    Medio de Pago
                  </Button>
                  <Button
                    size="sm"
                    variant={nuevoMedio.tipo_pago === "CHEQUE_TERCERO" ? "default" : "outline"}
                    onClick={() => setNuevoMedio({ ...nuevoMedio, tipo_pago: "CHEQUE_TERCERO" })}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Cheque de Tercero
                  </Button>
                  <Button
                    size="sm"
                    variant={nuevoMedio.tipo_pago === "CHEQUE_PROPIO" ? "default" : "outline"}
                    onClick={() => setNuevoMedio({ ...nuevoMedio, tipo_pago: "CHEQUE_PROPIO" })}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Cheque Propio
                  </Button>
                </div>

                {nuevoMedio.tipo_pago === "MEDIO" && (
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-3">
                      <Label className="text-xs">Medio de Pago *</Label>
                      <Select value={nuevoMedio.medio_pago_id} onValueChange={(v) => setNuevoMedio({ ...nuevoMedio, medio_pago_id: v, banco_id: "", caja_id: "" })}>
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

                    <div className="col-span-2">
                      <Label className="text-xs">Importe *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={nuevoMedio.importe}
                        onChange={(e) => setNuevoMedio({ ...nuevoMedio, importe: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>

                    {medioSeleccionado?.requiere_banco && (
                      <div className="col-span-3">
                        <Label className="text-xs">Banco *</Label>
                        <Select value={nuevoMedio.banco_id} onValueChange={(v) => setNuevoMedio({ ...nuevoMedio, banco_id: v })}>
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
                        <Select value={nuevoMedio.caja_id} onValueChange={(v) => setNuevoMedio({ ...nuevoMedio, caja_id: v })}>
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

                    <div className={`${medioSeleccionado?.requiere_banco || medioSeleccionado?.requiere_caja ? 'col-span-1' : 'col-span-4'} flex items-end`}>
                      <Button onClick={agregarMedio} className="w-full bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {nuevoMedio.tipo_pago === "CHEQUE_TERCERO" && (
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-10">
                      <Label className="text-xs">Cheque Disponible *</Label>
                      <Select value={nuevoMedio.cheque_id} onValueChange={(v) => setNuevoMedio({ ...nuevoMedio, cheque_id: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cheque" />
                        </SelectTrigger>
                        <SelectContent>
                          {chequesDisponibles.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              Nº {c.numero_cheque} - {c.banco_nombre} - ${c.importe.toLocaleString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 flex items-end">
                      <Button onClick={agregarMedio} className="w-full bg-purple-600 hover:bg-purple-700">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {nuevoMedio.tipo_pago === "CHEQUE_PROPIO" && (
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-3">
                      <Label className="text-xs">Número Cheque *</Label>
                      <Input
                        value={nuevoMedio.cheque_propio_numero}
                        onChange={(e) => setNuevoMedio({ ...nuevoMedio, cheque_propio_numero: e.target.value })}
                        placeholder="12345678"
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Banco *</Label>
                      <Select value={nuevoMedio.cheque_propio_banco_id} onValueChange={(v) => setNuevoMedio({ ...nuevoMedio, cheque_propio_banco_id: v })}>
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
                        value={nuevoMedio.cheque_propio_vencimiento}
                        onChange={(e) => setNuevoMedio({ ...nuevoMedio, cheque_propio_vencimiento: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Importe *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={nuevoMedio.importe}
                        onChange={(e) => setNuevoMedio({ ...nuevoMedio, importe: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="col-span-2 flex items-end">
                      <Button onClick={agregarMedio} className="w-full bg-orange-600 hover:bg-orange-700">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {mediosPagoUsados.length > 0 && (
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
                      {mediosPagoUsados.map((medio, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <div className="font-medium">{medio.medio_pago_nombre}</div>
                            {medio.tipo_pago === "CHEQUE_TERCERO" && (
                              <Badge className="bg-purple-100 text-purple-700 text-xs mt-1">Cheque Tercero</Badge>
                            )}
                            {medio.tipo_pago === "CHEQUE_PROPIO" && (
                              <Badge className="bg-orange-100 text-orange-700 text-xs mt-1">Cheque Propio</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {medio.banco_nombre && `🏦 ${medio.banco_nombre}`}
                            {medio.caja_nombre && `💵 ${medio.caja_nombre}`}
                            {!medio.banco_nombre && !medio.caja_nombre && "—"}
                          </TableCell>
                          <TableCell className="text-right font-bold">${medio.importe.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => eliminarMedio(idx)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Total Aplicado a Facturas</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">${totalAplicado.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Total Medios de Pago</p>
                  <p className="text-3xl font-bold text-emerald-600 mt-1">${totalMedios.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Diferencia</p>
                  <p className={`text-3xl font-bold mt-1 ${pagoBalanceado ? 'text-green-600' : 'text-red-600'}`}>
                    ${Math.abs(diferencia).toFixed(2)}
                  </p>
                </div>
              </div>

              {!pagoBalanceado && totalAplicado > 0 && totalMedios > 0 && (
                <div className="flex items-center gap-2 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                  <span className="text-red-900 font-semibold">
                    ⚠️ Los medios de pago deben sumar exactamente el total aplicado
                  </span>
                </div>
              )}

              {pagoBalanceado && totalAplicado > 0 && (
                <div className="flex items-center gap-2 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <span className="text-green-900 font-semibold">✓ Pago balanceado correctamente</span>
                </div>
              )}

              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Textarea
                  value={nuevoPago.observaciones}
                  onChange={(e) => setNuevoPago({ ...nuevoPago, observaciones: e.target.value })}
                  placeholder="Notas sobre el pago..."
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
            <Button 
              onClick={handleConfirmarPago}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!pagoBalanceado || facturasSeleccionadas.length === 0 || mediosPagoUsados.length === 0}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}