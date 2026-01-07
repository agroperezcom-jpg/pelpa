import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  DollarSign,
  Receipt,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  FileText,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Proveedores() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPagoDialogOpen, setIsPagoDialogOpen] = useState(false);
  const [isCCDialogOpen, setIsCCDialogOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState(null);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [currentProveedor, setCurrentProveedor] = useState({
    nombre: "",
    razon_social: "",
    cuit: "",
    tipo_iva: "RESP_INSCRIPTO",
    email: "",
    telefono: "",
    direccion: "",
    is_active: true
  });
  const [nuevoPago, setNuevoPago] = useState({
    fecha: format(new Date(), 'yyyy-MM-dd'),
    medio_pago_id: "",
    importe: "",
    banco_id: "",
    caja_id: "",
    observaciones: ""
  });
  const [activeTab, setActiveTab] = useState("lista");

  const queryClient = useQueryClient();

  const { data: proveedores = [] } = useQuery({
    queryKey: ['proveedores'],
    queryFn: () => base44.entities.Proveedor.list()
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

  const { data: movimientosCC = [] } = useQuery({
    queryKey: ['movimientosCC'],
    queryFn: () => base44.entities.MovimientoCC.list('-fecha', 500)
  });

  const createProveedorMutation = useMutation({
    mutationFn: (data) => base44.entities.Proveedor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      handleCloseDialog();
    }
  });

  const updateProveedorMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Proveedor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      handleCloseDialog();
    }
  });

  const deleteProveedorMutation = useMutation({
    mutationFn: (id) => base44.entities.Proveedor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
    }
  });

  const createPagoMutation = useMutation({
    mutationFn: async ({ pagoData }) => {
      if (!pagoData.proveedor_id) throw new Error("Seleccione un proveedor");
      if (!pagoData.medio_pago_id) throw new Error("Seleccione un medio de pago");
      if (!pagoData.importe || pagoData.importe <= 0) throw new Error("El importe debe ser mayor a 0");

      const proveedor = proveedores.find(p => p.id === pagoData.proveedor_id);
      if (pagoData.importe > proveedor.saldo_cc) {
        throw new Error("El pago no puede ser mayor al saldo deudor");
      }

      // Buscar último número
      const pagosPrevios = await base44.entities.PagoProveedorCabecera.list();
      const ultimoNumero = pagosPrevios.reduce((max, p) => {
        const num = parseInt(p.numero_pago?.replace(/\D/g, '') || '0');
        return Math.max(max, num);
      }, 0);
      const nuevoNumero = `PP-${String(ultimoNumero + 1).padStart(5, '0')}`;

      const pago = await base44.entities.PagoProveedorCabecera.create({
        fecha: pagoData.fecha,
        proveedor_id: pagoData.proveedor_id,
        proveedor_nombre: pagoData.proveedor_nombre,
        numero_pago: nuevoNumero,
        total_pago: pagoData.importe,
        estado: "CONFIRMADO",
        usuario_email: pagoData.usuario_email,
        usuario_nombre: pagoData.usuario_nombre,
        observaciones: pagoData.observaciones,
        fecha_confirmacion: new Date().toISOString()
      });

      await base44.entities.PagoProveedorMedio.create({
        pago_cabecera_id: pago.id,
        medio_pago_id: pagoData.medio_pago_id,
        medio_pago_nombre: pagoData.medio_pago_nombre,
        importe: pagoData.importe,
        banco_id: pagoData.banco_id,
        banco_nombre: pagoData.banco_nombre,
        caja_id: pagoData.caja_id,
        caja_nombre: pagoData.caja_nombre
      });

      await base44.entities.MovimientoTesoreria.create({
        fecha: pagoData.fecha,
        tipo: "EGRESO",
        medio_pago_id: pagoData.medio_pago_id,
        medio_pago_nombre: pagoData.medio_pago_nombre,
        banco_id: pagoData.banco_id,
        banco_nombre: pagoData.banco_nombre,
        caja_id: pagoData.caja_id,
        caja_nombre: pagoData.caja_nombre,
        importe: pagoData.importe,
        referencia_tipo: "pago_proveedor",
        referencia_id: pago.id,
        observaciones: `Pago ${nuevoNumero} a ${pagoData.proveedor_nombre}`
      });

      if (pagoData.banco_id) {
        const banco = bancos.find(b => b.id === pagoData.banco_id);
        await base44.entities.Banco.update(pagoData.banco_id, {
          saldo_actual: banco.saldo_actual - pagoData.importe
        });
      }
      if (pagoData.caja_id) {
        const caja = cajas.find(c => c.id === pagoData.caja_id);
        await base44.entities.Caja.update(pagoData.caja_id, {
          saldo_actual: caja.saldo_actual - pagoData.importe
        });
      }

      const nuevoSaldo = proveedor.saldo_cc - pagoData.importe;

      await base44.entities.MovimientoCC.create({
        tipo_entidad: "PROVEEDOR",
        entidad_id: pagoData.proveedor_id,
        entidad_nombre: pagoData.proveedor_nombre,
        fecha: pagoData.fecha,
        concepto: `Pago ${nuevoNumero} - ${pagoData.observaciones || "Sin concepto"}`,
        debe: 0,
        haber: pagoData.importe,
        saldo: nuevoSaldo,
        referencia_tipo: "pago_proveedor",
        referencia_id: pago.id
      });

      await base44.entities.Proveedor.update(pagoData.proveedor_id, {
        saldo_cc: nuevoSaldo
      });

      return pago;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      queryClient.invalidateQueries({ queryKey: ['movimientosCC'] });
      queryClient.invalidateQueries({ queryKey: ['movimientosTesoreria'] });
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['cajas'] });
      handleClosePagoDialog();
      alert("✅ Pago registrado exitosamente");
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const handleOpenDialog = (proveedor = null) => {
    if (proveedor) {
      setEditingProveedor(proveedor);
      setCurrentProveedor(proveedor);
    } else {
      setEditingProveedor(null);
      setCurrentProveedor({
        nombre: "",
        razon_social: "",
        cuit: "",
        tipo_iva: "RESP_INSCRIPTO",
        email: "",
        telefono: "",
        direccion: "",
        is_active: true
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProveedor(null);
  };

  const handleOpenPagoDialog = (proveedor) => {
    setProveedorSeleccionado(proveedor);
    setNuevoPago({
      fecha: format(new Date(), 'yyyy-MM-dd'),
      medio_pago_id: "",
      importe: "",
      banco_id: "",
      caja_id: "",
      observaciones: ""
    });
    setIsPagoDialogOpen(true);
  };

  const handleClosePagoDialog = () => {
    setIsPagoDialogOpen(false);
    setProveedorSeleccionado(null);
  };

  const handleOpenCCDialog = (proveedor) => {
    setProveedorSeleccionado(proveedor);
    setIsCCDialogOpen(true);
  };

  const handleCloseCCDialog = () => {
    setIsCCDialogOpen(false);
    setProveedorSeleccionado(null);
  };

  const handleSubmit = () => {
    if (!currentProveedor.nombre) {
      alert("El nombre es obligatorio");
      return;
    }

    if (editingProveedor) {
      updateProveedorMutation.mutate({
        id: editingProveedor.id,
        data: currentProveedor
      });
    } else {
      createProveedorMutation.mutate(currentProveedor);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("¿Está seguro de eliminar este proveedor?")) {
      deleteProveedorMutation.mutate(id);
    }
  };

  const handleConfirmarPago = () => {
    if (!user) {
      alert("Usuario no autenticado");
      return;
    }

    const medio = mediosPago.find(m => m.id === nuevoPago.medio_pago_id);
    const banco = bancos.find(b => b.id === nuevoPago.banco_id);
    const caja = cajas.find(c => c.id === nuevoPago.caja_id);

    if (medio.requiere_banco && !nuevoPago.banco_id) {
      alert("Seleccione un banco");
      return;
    }

    if (medio.requiere_caja && !nuevoPago.caja_id) {
      alert("Seleccione una caja");
      return;
    }

    createPagoMutation.mutate({
      pagoData: {
        proveedor_id: proveedorSeleccionado.id,
        proveedor_nombre: proveedorSeleccionado.nombre,
        fecha: nuevoPago.fecha,
        medio_pago_id: nuevoPago.medio_pago_id,
        medio_pago_nombre: medio.nombre,
        importe: parseFloat(nuevoPago.importe),
        banco_id: nuevoPago.banco_id || null,
        banco_nombre: banco?.nombre || "",
        caja_id: nuevoPago.caja_id || null,
        caja_nombre: caja?.nombre || "",
        observaciones: nuevoPago.observaciones,
        usuario_email: user.email,
        usuario_nombre: user.full_name
      }
    });
  };

  const filteredProveedores = proveedores.filter(p =>
    p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.cuit?.includes(searchTerm) ||
    p.razon_social?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const proveedoresConDeuda = proveedores.filter(p => p.saldo_cc > 0);
  const totalDeuda = proveedoresConDeuda.reduce((acc, p) => acc + p.saldo_cc, 0);

  const medioSeleccionado = mediosPago.find(m => m.id === nuevoPago.medio_pago_id);

  const movimientosProveedor = proveedorSeleccionado 
    ? movimientosCC.filter(m => m.tipo_entidad === "PROVEEDOR" && m.entidad_id === proveedorSeleccionado.id)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="h-6 w-6 text-purple-600" />
            Proveedores
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestión de proveedores y cuenta corriente
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Proveedor
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Total Proveedores</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{proveedores.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Con Deuda</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{proveedoresConDeuda.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Deuda Total</p>
            <p className="text-2xl font-bold text-red-600 mt-1">${totalDeuda.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Activos</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {proveedores.filter(p => p.is_active).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="lista">Proveedores</TabsTrigger>
          <TabsTrigger value="deudas">Deudas</TabsTrigger>
          <TabsTrigger value="aging">Antigüedad</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre, razón social o CUIT..."
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
                  <TableHead>Nombre</TableHead>
                  <TableHead>CUIT</TableHead>
                  <TableHead>Tipo IVA</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead className="text-right">Saldo CC</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProveedores.map((proveedor) => (
                  <TableRow key={proveedor.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div>
                        <p className="font-medium">{proveedor.nombre}</p>
                        {proveedor.razon_social && (
                          <p className="text-xs text-slate-500">{proveedor.razon_social}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{proveedor.cuit || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{proveedor.tipo_iva?.replace(/_/g, ' ')}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {proveedor.telefono && <div>📞 {proveedor.telefono}</div>}
                      {proveedor.email && <div>✉️ {proveedor.email}</div>}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-bold ${proveedor.saldo_cc > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                        ${(proveedor.saldo_cc || 0).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={proveedor.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}>
                        {proveedor.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenCCDialog(proveedor)}
                          title="Ver cuenta corriente"
                        >
                          <Receipt className="h-4 w-4 text-blue-600" />
                        </Button>
                        {proveedor.saldo_cc > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenPagoDialog(proveedor)}
                            title="Registrar pago"
                          >
                            <DollarSign className="h-4 w-4 text-emerald-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(proveedor)}
                        >
                          <Edit2 className="h-4 w-4 text-slate-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(proveedor.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProveedores.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      No hay proveedores registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="deudas" className="space-y-4">
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="p-4 bg-red-50 border-b border-red-200">
              <h3 className="font-semibold flex items-center gap-2 text-red-900">
                <AlertTriangle className="h-5 w-5" />
                Proveedores con Deuda Pendiente
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Proveedor</TableHead>
                  <TableHead>CUIT</TableHead>
                  <TableHead className="text-right">Saldo Deudor</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proveedoresConDeuda
                  .sort((a, b) => b.saldo_cc - a.saldo_cc)
                  .map((proveedor) => (
                    <TableRow key={proveedor.id}>
                      <TableCell className="font-medium">{proveedor.nombre}</TableCell>
                      <TableCell className="font-mono text-sm">{proveedor.cuit || "—"}</TableCell>
                      <TableCell className="text-right font-bold text-red-600">
                        ${proveedor.saldo_cc.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenCCDialog(proveedor)}
                          >
                            <Receipt className="h-3 w-3 mr-1" />
                            Ver CC
                          </Button>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleOpenPagoDialog(proveedor)}
                          >
                            <DollarSign className="h-3 w-3 mr-1" />
                            Pagar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                {proveedoresConDeuda.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p>Sin deudas pendientes</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="aging" className="space-y-4">
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                Antigüedad de Deuda (Aging)
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">0-30 días</TableHead>
                  <TableHead className="text-right">31-60 días</TableHead>
                  <TableHead className="text-right">61-90 días</TableHead>
                  <TableHead className="text-right">+90 días</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proveedoresConDeuda.map((proveedor) => {
                  const movimientos = movimientosCC.filter(
                    m => m.tipo_entidad === "PROVEEDOR" && m.entidad_id === proveedor.id && m.debe > 0
                  );

                  const hoy = new Date();
                  let dias0_30 = 0, dias31_60 = 0, dias61_90 = 0, dias90_mas = 0;

                  movimientos.forEach(mov => {
                    const fechaMov = new Date(mov.fecha);
                    const diasTranscurridos = Math.floor((hoy - fechaMov) / (1000 * 60 * 60 * 24));
                    const montoPendiente = mov.debe;

                    if (diasTranscurridos <= 30) dias0_30 += montoPendiente;
                    else if (diasTranscurridos <= 60) dias31_60 += montoPendiente;
                    else if (diasTranscurridos <= 90) dias61_90 += montoPendiente;
                    else dias90_mas += montoPendiente;
                  });

                  return (
                    <TableRow key={proveedor.id}>
                      <TableCell className="font-medium">{proveedor.nombre}</TableCell>
                      <TableCell className="text-right text-emerald-600">${dias0_30.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-amber-600">${dias31_60.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-orange-600">${dias61_90.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-600 font-bold">${dias90_mas.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold">${proveedor.saldo_cc.toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog CRUD Proveedor */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingProveedor ? "Editar Proveedor" : "Nuevo Proveedor"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={currentProveedor.nombre}
                onChange={(e) => setCurrentProveedor({ ...currentProveedor, nombre: e.target.value })}
                placeholder="Nombre comercial"
              />
            </div>

            <div className="space-y-2">
              <Label>Razón Social</Label>
              <Input
                value={currentProveedor.razon_social}
                onChange={(e) => setCurrentProveedor({ ...currentProveedor, razon_social: e.target.value })}
                placeholder="Razón social legal"
              />
            </div>

            <div className="space-y-2">
              <Label>CUIT</Label>
              <Input
                value={currentProveedor.cuit}
                onChange={(e) => setCurrentProveedor({ ...currentProveedor, cuit: e.target.value })}
                placeholder="XX-XXXXXXXX-X"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo IVA</Label>
              <Select
                value={currentProveedor.tipo_iva}
                onValueChange={(v) => setCurrentProveedor({ ...currentProveedor, tipo_iva: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESP_INSCRIPTO">Responsable Inscripto</SelectItem>
                  <SelectItem value="MONOTRIBUTO">Monotributo</SelectItem>
                  <SelectItem value="EXENTO">Exento</SelectItem>
                  <SelectItem value="NO_RESPONSABLE">No Responsable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={currentProveedor.email}
                onChange={(e) => setCurrentProveedor({ ...currentProveedor, email: e.target.value })}
                placeholder="email@ejemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={currentProveedor.telefono}
                onChange={(e) => setCurrentProveedor({ ...currentProveedor, telefono: e.target.value })}
                placeholder="+54 11 1234-5678"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Dirección</Label>
              <Input
                value={currentProveedor.direccion}
                onChange={(e) => setCurrentProveedor({ ...currentProveedor, direccion: e.target.value })}
                placeholder="Calle 123, Ciudad, Provincia"
              />
            </div>

            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentProveedor.is_active}
                  onChange={(e) => setCurrentProveedor({ ...currentProveedor, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Proveedor activo</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
            <Button onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700">
              {editingProveedor ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Pago */}
      <Dialog open={isPagoDialogOpen} onOpenChange={setIsPagoDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              Registrar Pago a Proveedor
            </DialogTitle>
          </DialogHeader>

          {proveedorSeleccionado && (
            <div className="space-y-4">
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">Proveedor: <strong>{proveedorSeleccionado.nombre}</strong></p>
                <p className="text-2xl font-bold text-red-600 mt-2">
                  Saldo: ${proveedorSeleccionado.saldo_cc.toLocaleString()}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha *</Label>
                  <Input
                    type="date"
                    value={nuevoPago.fecha}
                    onChange={(e) => setNuevoPago({ ...nuevoPago, fecha: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Importe *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={nuevoPago.importe}
                    onChange={(e) => setNuevoPago({ ...nuevoPago, importe: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Medio de Pago *</Label>
                  <Select
                    value={nuevoPago.medio_pago_id}
                    onValueChange={(v) => setNuevoPago({ ...nuevoPago, medio_pago_id: v, banco_id: "", caja_id: "" })}
                  >
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

                {medioSeleccionado?.requiere_banco && (
                  <div className="space-y-2">
                    <Label>Banco *</Label>
                    <Select
                      value={nuevoPago.banco_id}
                      onValueChange={(v) => setNuevoPago({ ...nuevoPago, banco_id: v })}
                    >
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
                  <div className="space-y-2">
                    <Label>Caja *</Label>
                    <Select
                      value={nuevoPago.caja_id}
                      onValueChange={(v) => setNuevoPago({ ...nuevoPago, caja_id: v })}
                    >
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

                <div className="col-span-2 space-y-2">
                  <Label>Observaciones</Label>
                  <Input
                    value={nuevoPago.observaciones}
                    onChange={(e) => setNuevoPago({ ...nuevoPago, observaciones: e.target.value })}
                    placeholder="Concepto del pago..."
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleClosePagoDialog}>Cancelar</Button>
            <Button onClick={handleConfirmarPago} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Cuenta Corriente */}
      <Dialog open={isCCDialogOpen} onOpenChange={setIsCCDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              Cuenta Corriente - {proveedorSeleccionado?.nombre}
            </DialogTitle>
          </DialogHeader>

          {proveedorSeleccionado && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-4 border-2">
                <p className="text-sm text-slate-600 mb-2">Saldo Actual</p>
                <p className={`text-3xl font-bold ${proveedorSeleccionado.saldo_cc > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${proveedorSeleccionado.saldo_cc.toLocaleString()}
                </p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Debe</TableHead>
                    <TableHead className="text-right">Haber</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientosProveedor.map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell className="text-sm text-slate-600">
                        {format(new Date(mov.fecha), "dd/MM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell className="text-sm">{mov.concepto}</TableCell>
                      <TableCell className="text-right text-red-600 font-bold">
                        {mov.debe > 0 ? `$${mov.debe.toLocaleString()}` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-bold">
                        {mov.haber > 0 ? `$${mov.haber.toLocaleString()}` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ${mov.saldo.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {movimientosProveedor.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        Sin movimientos
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter>
            <Button onClick={handleCloseCCDialog}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}