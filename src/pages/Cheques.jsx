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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  Download,
  Eye
} from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

export default function Cheques() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState("TODOS");
  const [filterOrigen, setFilterOrigen] = useState("TODOS");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAccionDialogOpen, setIsAccionDialogOpen] = useState(false);
  const [selectedCheque, setSelectedCheque] = useState(null);
  const [accionSeleccionada, setAccionSeleccionada] = useState(null);
  const [user, setUser] = useState(null);
  const [currentCheque, setCurrentCheque] = useState({
    tipo_origen: "TERCERO",
    tipo_soporte: "FISICO",
    numero_cheque: "",
    banco_id: "",
    banco_nombre: "",
    fecha_emision: format(new Date(), 'yyyy-MM-dd'),
    fecha_vencimiento: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    importe: "",
    titular_tipo: "CLIENTE",
    titular_id: "",
    librador: "",
    beneficiario: "",
    observaciones: ""
  });
  const [activeTab, setActiveTab] = useState("cartera");

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: cheques = [] } = useQuery({
    queryKey: ['cheques'],
    queryFn: () => base44.entities.Check.list('-created_date', 500)
  });

  const { data: bancos = [] } = useQuery({
    queryKey: ['bancos'],
    queryFn: () => base44.entities.Banco.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: proveedores = [] } = useQuery({
    queryKey: ['proveedores'],
    queryFn: () => base44.entities.Proveedor.list()
  });

  const createChequeMutation = useMutation({
    mutationFn: async (chequeData) => {
      if (!chequeData.numero_cheque) throw new Error("Ingrese número de cheque");
      if (!chequeData.importe || chequeData.importe <= 0) throw new Error("Ingrese un importe válido");
      if (!chequeData.banco_nombre) throw new Error("Ingrese el nombre del banco");

      // Definir estado inicial según tipo
      let estadoInicial;
      if (chequeData.tipo_origen === "TERCERO") {
        estadoInicial = chequeData.tipo_soporte === "FISICO" ? "EN_CARTERA" : "RECIBIDO";
      } else {
        estadoInicial = "EMITIDO";
      }

      const cheque = await base44.entities.Check.create({
        ...chequeData,
        estado: estadoInicial,
        usuario_registro: user?.email,
        fecha_ultimo_cambio: new Date().toISOString(),
        usuario_ultimo_cambio: user?.email
      });

      return cheque;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cheques'] });
      handleCloseDialog();
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const cambiarEstadoMutation = useMutation({
    mutationFn: async ({ chequeId, nuevoEstado, datos }) => {
      const cheque = cheques.find(c => c.id === chequeId);
      if (!cheque) throw new Error("Cheque no encontrado");

      // Validar transición de estado
      const transicionesValidas = getTransicionesValidas(cheque);
      if (!transicionesValidas.includes(nuevoEstado)) {
        throw new Error("Transición de estado no válida");
      }

      // Lógica según la acción
      if (nuevoEstado === "DEPOSITADO" && cheque.tipo_origen === "TERCERO") {
        // Depositar cheque de tercero
        await base44.entities.MovimientoTesoreria.create({
          fecha: format(new Date(), 'yyyy-MM-dd'),
          tipo: "INGRESO",
          medio_pago_id: null,
          medio_pago_nombre: "Depósito Cheque",
          banco_id: cheque.banco_id,
          banco_nombre: cheque.banco_nombre,
          importe: cheque.importe,
          referencia_tipo: "cheque",
          referencia_id: chequeId,
          observaciones: `Depósito cheque ${cheque.numero_cheque}`
        });

        const banco = bancos.find(b => b.id === cheque.banco_id);
        if (banco) {
          await base44.entities.Banco.update(cheque.banco_id, {
            saldo_actual: (banco.saldo_actual || 0) + cheque.importe
          });
        }
      }

      if (nuevoEstado === "COBRADO") {
        // Cobrar cheque
        const destino = datos?.destino || "BANCO";
        
        await base44.entities.MovimientoTesoreria.create({
          fecha: format(new Date(), 'yyyy-MM-dd'),
          tipo: "INGRESO",
          medio_pago_id: null,
          medio_pago_nombre: "Cobro Cheque",
          banco_id: destino === "BANCO" ? datos?.banco_id : null,
          banco_nombre: destino === "BANCO" ? datos?.banco_nombre : "",
          caja_id: destino === "CAJA" ? datos?.caja_id : null,
          caja_nombre: destino === "CAJA" ? datos?.caja_nombre : "",
          importe: cheque.importe,
          referencia_tipo: "cheque",
          referencia_id: chequeId,
          observaciones: `Cobro cheque ${cheque.numero_cheque}`
        });

        if (destino === "BANCO" && datos?.banco_id) {
          const banco = bancos.find(b => b.id === datos.banco_id);
          if (banco) {
            await base44.entities.Banco.update(datos.banco_id, {
              saldo_actual: (banco.saldo_actual || 0) + cheque.importe
            });
          }
        }
      }

      if (nuevoEstado === "ENTREGADO" && cheque.tipo_origen === "TERCERO") {
        // Entregar cheque de tercero a proveedor
        if (!datos?.proveedor_id) throw new Error("Seleccione un proveedor");
        
        const proveedor = proveedores.find(p => p.id === datos.proveedor_id);
        const nuevoSaldo = (proveedor.saldo_cc || 0) - cheque.importe;

        await base44.entities.MovimientoCC.create({
          tipo_entidad: "PROVEEDOR",
          entidad_id: datos.proveedor_id,
          entidad_nombre: proveedor.nombre,
          fecha: format(new Date(), 'yyyy-MM-dd'),
          concepto: `Pago con cheque ${cheque.numero_cheque}`,
          debe: 0,
          haber: cheque.importe,
          saldo: nuevoSaldo,
          referencia_tipo: "cheque",
          referencia_id: chequeId
        });

        await base44.entities.Proveedor.update(datos.proveedor_id, {
          saldo_cc: nuevoSaldo
        });
      }

      if (nuevoEstado === "RECHAZADO") {
        // Cheque rechazado
        if (cheque.tipo_origen === "TERCERO") {
          // Reabrir deuda del cliente
          const cliente = clients.find(c => c.id === cheque.titular_id);
          if (cliente) {
            const nuevoSaldo = (cliente.saldo_cc || 0) + cheque.importe;

            await base44.entities.MovimientoCC.create({
              tipo_entidad: "CLIENTE",
              entidad_id: cheque.titular_id,
              entidad_nombre: cheque.titular_nombre,
              fecha: format(new Date(), 'yyyy-MM-dd'),
              concepto: `Cheque rechazado ${cheque.numero_cheque}`,
              debe: cheque.importe,
              haber: 0,
              saldo: nuevoSaldo,
              referencia_tipo: "cheque",
              referencia_id: chequeId
            });

            await base44.entities.Client.update(cheque.titular_id, {
              saldo_cc: nuevoSaldo
            });
          }
        }

        // Registrar movimiento compensatorio si fue depositado
        if (cheque.estado === "DEPOSITADO") {
          await base44.entities.MovimientoTesoreria.create({
            fecha: format(new Date(), 'yyyy-MM-dd'),
            tipo: "EGRESO",
            medio_pago_id: null,
            medio_pago_nombre: "Cheque Rechazado",
            banco_id: cheque.banco_id,
            banco_nombre: cheque.banco_nombre,
            importe: cheque.importe,
            referencia_tipo: "cheque",
            referencia_id: chequeId,
            observaciones: `Rechazo cheque ${cheque.numero_cheque}`
          });

          const banco = bancos.find(b => b.id === cheque.banco_id);
          if (banco) {
            await base44.entities.Banco.update(cheque.banco_id, {
              saldo_actual: (banco.saldo_actual || 0) - cheque.importe
            });
          }
        }
      }

      // Actualizar estado del cheque
      await base44.entities.Check.update(chequeId, {
        estado: nuevoEstado,
        fecha_ultimo_cambio: new Date().toISOString(),
        usuario_ultimo_cambio: user?.email,
        observaciones: `${cheque.observaciones || ""}\n[${format(new Date(), "dd/MM/yyyy HH:mm")}] ${user?.full_name}: ${nuevoEstado}${datos?.observaciones ? ` - ${datos.observaciones}` : ""}`
      });

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cheques'] });
      queryClient.invalidateQueries({ queryKey: ['movimientosTesoreria'] });
      queryClient.invalidateQueries({ queryKey: ['movimientosCC'] });
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      setIsAccionDialogOpen(false);
      setSelectedCheque(null);
      setAccionSeleccionada(null);
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const getTransicionesValidas = (cheque) => {
    if (!cheque) return [];

    const { tipo_origen, tipo_soporte, estado } = cheque;

    if (tipo_origen === "TERCERO") {
      if (tipo_soporte === "FISICO") {
        if (estado === "EN_CARTERA") return ["DEPOSITADO", "COBRADO", "ENTREGADO", "ANULADO"];
        if (estado === "DEPOSITADO") return ["COBRADO", "RECHAZADO"];
        if (estado === "ENTREGADO") return ["RECHAZADO", "ANULADO"];
      } else {
        // ECHEQ
        if (estado === "RECIBIDO") return ["ENDOSADO", "DEPOSITADO", "ANULADO"];
        if (estado === "ENDOSADO") return ["DEPOSITADO", "RECHAZADO"];
        if (estado === "DEPOSITADO") return ["COBRADO", "RECHAZADO"];
      }
    } else {
      // PROPIO
      if (estado === "EMITIDO") return ["ENTREGADO", "ANULADO"];
      if (estado === "ENTREGADO") return ["COBRADO", "RECHAZADO"];
    }

    return [];
  };

  const handleOpenDialog = () => {
    setCurrentCheque({
      tipo_origen: "TERCERO",
      tipo_soporte: "FISICO",
      numero_cheque: "",
      banco_id: "",
      banco_nombre: "",
      fecha_emision: format(new Date(), 'yyyy-MM-dd'),
      fecha_vencimiento: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      importe: "",
      titular_tipo: "CLIENTE",
      titular_id: "",
      librador: "",
      beneficiario: "",
      observaciones: ""
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const handleSubmit = () => {
    if (!currentCheque.titular_id) {
      alert("Seleccione un titular (cliente o proveedor)");
      return;
    }

    if (!currentCheque.banco_nombre) {
      alert("Ingrese el nombre del banco");
      return;
    }

    let titular, titularNombre;

    if (currentCheque.titular_tipo === "CLIENTE") {
      titular = clients.find(c => c.id === currentCheque.titular_id);
      titularNombre = titular?.name;
    } else {
      titular = proveedores.find(p => p.id === currentCheque.titular_id);
      titularNombre = titular?.nombre;
    }

    createChequeMutation.mutate({
      ...currentCheque,
      titular_nombre: titularNombre || "",
      importe: parseFloat(currentCheque.importe) || 0
    });
  };

  const handleOpenAccion = (cheque, accion) => {
    setSelectedCheque(cheque);
    setAccionSeleccionada(accion);
    setIsAccionDialogOpen(true);
  };

  const handleConfirmarAccion = (datos = {}) => {
    cambiarEstadoMutation.mutate({
      chequeId: selectedCheque.id,
      nuevoEstado: accionSeleccionada,
      datos
    });
  };

  const filteredCheques = cheques.filter(c => {
    const matchSearch = c.numero_cheque?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.titular_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.banco_nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEstado = filterEstado === "TODOS" || c.estado === filterEstado;
    const matchOrigen = filterOrigen === "TODOS" || c.tipo_origen === filterOrigen;
    return matchSearch && matchEstado && matchOrigen;
  });

  const chequesCartera = cheques.filter(c => 
    c.tipo_origen === "TERCERO" && (c.estado === "EN_CARTERA" || c.estado === "RECIBIDO")
  );

  const chequesProxVencer = cheques.filter(c => {
    if (!c.fecha_vencimiento) return false;
    const dias = differenceInDays(new Date(c.fecha_vencimiento), new Date());
    return dias >= 0 && dias <= 7 && (c.estado === "EN_CARTERA" || c.estado === "RECIBIDO");
  });

  const chequesRechazados = cheques.filter(c => c.estado === "RECHAZADO");
  const chequesPropiosPendientes = cheques.filter(c => 
    c.tipo_origen === "PROPIO" && (c.estado === "EMITIDO" || c.estado === "ENTREGADO")
  );

  const totalCartera = chequesCartera.reduce((acc, c) => acc + (c.importe || 0), 0);

  const estadoConfig = {
    EN_CARTERA: { color: "bg-blue-100 text-blue-700", icon: Clock },
    RECIBIDO: { color: "bg-blue-100 text-blue-700", icon: Clock },
    DEPOSITADO: { color: "bg-purple-100 text-purple-700", icon: ArrowUpCircle },
    ENTREGADO: { color: "bg-amber-100 text-amber-700", icon: ArrowDownCircle },
    COBRADO: { color: "bg-green-100 text-green-700", icon: CheckCircle2 },
    RECHAZADO: { color: "bg-red-100 text-red-700", icon: XCircle },
    ANULADO: { color: "bg-slate-100 text-slate-700", icon: XCircle },
    ENDOSADO: { color: "bg-indigo-100 text-indigo-700", icon: ArrowDownCircle },
    EMITIDO: { color: "bg-orange-100 text-orange-700", icon: Clock }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-6 w-6 text-purple-600" />
            Gestión de Cheques
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Control de cheques de terceros y propios
          </p>
        </div>
        <Button onClick={handleOpenDialog} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" />
          Registrar Cheque
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">En Cartera</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{chequesCartera.length}</p>
            <p className="text-xs text-slate-500 mt-1">${totalCartera.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Por Vencer</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{chequesProxVencer.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Rechazados</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{chequesRechazados.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Propios Pend.</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{chequesPropiosPendientes.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {chequesProxVencer.length > 0 && (
        <Card className="border-0 shadow-sm bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-900">
                  {chequesProxVencer.length} cheque(s) próximos a vencer
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Revisa los cheques que vencen en los próximos 7 días
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar cheque..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterOrigen} onValueChange={setFilterOrigen}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los orígenes</SelectItem>
                <SelectItem value="TERCERO">De Terceros</SelectItem>
                <SelectItem value="PROPIO">Propios</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los estados</SelectItem>
                <SelectItem value="EN_CARTERA">En Cartera</SelectItem>
                <SelectItem value="RECIBIDO">Recibido</SelectItem>
                <SelectItem value="DEPOSITADO">Depositado</SelectItem>
                <SelectItem value="ENTREGADO">Entregado</SelectItem>
                <SelectItem value="COBRADO">Cobrado</SelectItem>
                <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                <SelectItem value="EMITIDO">Emitido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="cartera">En Cartera</TabsTrigger>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="propios">Propios</TabsTrigger>
          <TabsTrigger value="rechazados">Rechazados</TabsTrigger>
        </TabsList>

        <TabsContent value="cartera">
          <Card className="border-0 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Número</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Titular</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chequesCartera.map((cheque) => {
                  const config = estadoConfig[cheque.estado];
                  const Icon = config?.icon || Clock;
                  const diasVenc = cheque.fecha_vencimiento 
                    ? differenceInDays(new Date(cheque.fecha_vencimiento), new Date())
                    : null;
                  const transiciones = getTransicionesValidas(cheque);

                  return (
                    <TableRow key={cheque.id} className="hover:bg-slate-50">
                      <TableCell className="font-mono font-medium">{cheque.numero_cheque}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{cheque.tipo_soporte}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{cheque.banco_nombre}</TableCell>
                      <TableCell className="text-sm">{cheque.titular_nombre}</TableCell>
                      <TableCell className="text-right font-bold text-blue-600">
                        ${cheque.importe?.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {cheque.fecha_vencimiento ? (
                          <div>
                            <p className="text-sm">
                              {format(new Date(cheque.fecha_vencimiento), "d MMM yyyy", { locale: es })}
                            </p>
                            {diasVenc !== null && (
                              <Badge className={diasVenc <= 7 ? "bg-amber-100 text-amber-700 text-xs" : "bg-slate-100 text-slate-600 text-xs"}>
                                {diasVenc > 0 ? `${diasVenc}d` : "Vencido"}
                              </Badge>
                            )}
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={config?.color}>
                          <Icon className="h-3 w-3 mr-1" />
                          {cheque.estado.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {transiciones.includes("DEPOSITADO") && (
                            <Button size="sm" variant="outline" onClick={() => handleOpenAccion(cheque, "DEPOSITADO")}>
                              Depositar
                            </Button>
                          )}
                          {transiciones.includes("COBRADO") && (
                            <Button size="sm" variant="outline" onClick={() => handleOpenAccion(cheque, "COBRADO")}>
                              Cobrar
                            </Button>
                          )}
                          {transiciones.includes("ENTREGADO") && (
                            <Button size="sm" variant="outline" onClick={() => handleOpenAccion(cheque, "ENTREGADO")}>
                              Entregar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {chequesCartera.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      No hay cheques en cartera
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="todos">
          <Card className="border-0 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Número</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Titular</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCheques.map((cheque) => {
                  const config = estadoConfig[cheque.estado];
                  const Icon = config?.icon || Clock;

                  return (
                    <TableRow key={cheque.id} className="hover:bg-slate-50">
                      <TableCell className="font-mono font-medium">{cheque.numero_cheque}</TableCell>
                      <TableCell>
                        <Badge className={cheque.tipo_origen === "TERCERO" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}>
                          {cheque.tipo_origen}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{cheque.tipo_soporte}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{cheque.banco_nombre}</TableCell>
                      <TableCell className="text-sm">{cheque.titular_nombre}</TableCell>
                      <TableCell className="text-right font-bold text-blue-600">
                        ${cheque.importe?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {cheque.fecha_vencimiento 
                          ? format(new Date(cheque.fecha_vencimiento), "d MMM yyyy", { locale: es })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={config?.color}>
                          <Icon className="h-3 w-3 mr-1" />
                          {cheque.estado.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredCheques.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      No hay cheques registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="propios">
          <Card className="border-0 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Número</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Beneficiario</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cheques.filter(c => c.tipo_origen === "PROPIO").map((cheque) => {
                  const config = estadoConfig[cheque.estado];
                  const Icon = config?.icon || Clock;

                  return (
                    <TableRow key={cheque.id} className="hover:bg-slate-50">
                      <TableCell className="font-mono font-medium">{cheque.numero_cheque}</TableCell>
                      <TableCell className="text-sm">{cheque.banco_nombre}</TableCell>
                      <TableCell className="text-sm">{cheque.beneficiario || cheque.titular_nombre}</TableCell>
                      <TableCell className="text-right font-bold text-orange-600">
                        ${cheque.importe?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {cheque.fecha_vencimiento 
                          ? format(new Date(cheque.fecha_vencimiento), "d MMM yyyy", { locale: es })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={config?.color}>
                          <Icon className="h-3 w-3 mr-1" />
                          {cheque.estado.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="rechazados">
          <Card className="border-0 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Número</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Titular</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead>Observaciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chequesRechazados.map((cheque) => (
                  <TableRow key={cheque.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono font-medium">{cheque.numero_cheque}</TableCell>
                    <TableCell>
                      <Badge className={cheque.tipo_origen === "TERCERO" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}>
                        {cheque.tipo_origen}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{cheque.banco_nombre}</TableCell>
                    <TableCell className="text-sm">{cheque.titular_nombre}</TableCell>
                    <TableCell className="text-right font-bold text-red-600">
                      ${cheque.importe?.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {cheque.observaciones?.split('\n').pop() || "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {chequesRechazados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p>Sin cheques rechazados</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Nuevo Cheque */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Registrar Cheque
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origen *</Label>
                <Select 
                  value={currentCheque.tipo_origen} 
                  onValueChange={(v) => setCurrentCheque({ 
                    ...currentCheque, 
                    tipo_origen: v,
                    titular_tipo: v === "TERCERO" ? "CLIENTE" : "PROVEEDOR"
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TERCERO">De Tercero (Recibido)</SelectItem>
                    <SelectItem value="PROPIO">Propio (Emitido)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Soporte *</Label>
                <Select 
                  value={currentCheque.tipo_soporte} 
                  onValueChange={(v) => setCurrentCheque({ ...currentCheque, tipo_soporte: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FISICO">Físico</SelectItem>
                    <SelectItem value="ECHEQ">Electrónico (ECHEQ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número de Cheque *</Label>
                <Input
                  value={currentCheque.numero_cheque}
                  onChange={(e) => setCurrentCheque({ ...currentCheque, numero_cheque: e.target.value })}
                  placeholder="12345678"
                />
              </div>

              <div className="space-y-2">
                <Label>Banco *</Label>
                <Input
                  value={currentCheque.banco_nombre || ""}
                  onChange={(e) => setCurrentCheque({ ...currentCheque, banco_nombre: e.target.value, banco_id: "" })}
                  placeholder="Nombre del banco"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Emisión *</Label>
                <Input
                  type="date"
                  value={currentCheque.fecha_emision}
                  onChange={(e) => setCurrentCheque({ ...currentCheque, fecha_emision: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha Vencimiento</Label>
                <Input
                  type="date"
                  value={currentCheque.fecha_vencimiento}
                  onChange={(e) => setCurrentCheque({ ...currentCheque, fecha_vencimiento: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Importe *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={currentCheque.importe}
                  onChange={(e) => setCurrentCheque({ ...currentCheque, importe: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  {currentCheque.tipo_origen === "TERCERO" ? "Cliente *" : "Proveedor *"}
                </Label>
                <Select 
                  value={currentCheque.titular_id} 
                  onValueChange={(v) => setCurrentCheque({ ...currentCheque, titular_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentCheque.tipo_origen === "TERCERO" 
                      ? clients.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))
                      : proveedores.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Librador</Label>
                <Input
                  value={currentCheque.librador}
                  onChange={(e) => setCurrentCheque({ ...currentCheque, librador: e.target.value })}
                  placeholder="Quien emite"
                />
              </div>

              <div className="space-y-2">
                <Label>Beneficiario</Label>
                <Input
                  value={currentCheque.beneficiario}
                  onChange={(e) => setCurrentCheque({ ...currentCheque, beneficiario: e.target.value })}
                  placeholder="A favor de"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea
                value={currentCheque.observaciones}
                onChange={(e) => setCurrentCheque({ ...currentCheque, observaciones: e.target.value })}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
            <Button onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700">
              Registrar Cheque
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Acción sobre Cheque */}
      <AlertDialog open={isAccionDialogOpen} onOpenChange={setIsAccionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmar: {accionSeleccionada?.replace(/_/g, ' ')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCheque && (
                <div className="space-y-3 mt-4">
                  <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
                    <p><strong>Cheque:</strong> {selectedCheque.numero_cheque}</p>
                    <p><strong>Banco:</strong> {selectedCheque.banco_nombre}</p>
                    <p><strong>Importe:</strong> ${selectedCheque.importe?.toLocaleString()}</p>
                  </div>

                  {accionSeleccionada === "ENTREGADO" && selectedCheque.tipo_origen === "TERCERO" && (
                    <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
                      ⚠️ Al entregar este cheque a un proveedor, se cancelará su deuda en cuenta corriente.
                    </div>
                  )}

                  {accionSeleccionada === "RECHAZADO" && (
                    <div className="text-sm text-red-700 bg-red-50 p-3 rounded-lg">
                      ⚠️ El cheque fue rechazado. Se reabrirá la deuda del cliente/proveedor.
                    </div>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => handleConfirmarAccion()}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}