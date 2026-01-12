import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import {
  Settings,
  Users,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Clock,
  Shield,
  UserPlus,
  Mail,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Building,
  Palette,
  Globe,
  Briefcase,
  Printer,
  FileText
} from "lucide-react";
import ThemeSelector from "../components/theme/ThemeSelector";
import IdentidadEmpresa from "../components/settings/IdentidadEmpresa";
import RegionalConfig from "../components/settings/RegionalConfig";
import ConfiguracionProyectos from "../components/settings/ConfiguracionProyectos";
import ConfiguracionImpresoras from "../components/settings/ConfiguracionImpresoras";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function SettingsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [currentUser, setCurrentUser] = useState(null);
  const [openSections, setOpenSections] = useState({
    users: true,
    sessions: false,
    identidad: false,
    theme: false,
    regional: false,
    proyectos: false,
    printers: false,
    fiscal: false
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: sessionLogs = [] } = useQuery({
    queryKey: ['sessionLogs'],
    queryFn: () => base44.entities.SessionLog.list('-login_time', 100)
  });

  const inviteUserMutation = useMutation({
    mutationFn: async ({ email, role }) => {
      const result = await base44.users.inviteUser(email, role);
      return result;
    },
    onSuccess: () => {
      alert("✓ Invitación enviada correctamente");
      setInviteEmail("");
      setInviteRole("user");
      setIsDialogOpen(false);
    },
    onError: (error) => {
      alert("Error al enviar invitación: " + error.message);
    }
  });

  // Check if current user is admin
  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-800">Acceso Restringido</h2>
            <p className="text-slate-500 mt-2">
              Solo los administradores pueden acceder a esta sección.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group session logs by user
  const userSessionStats = users.map(user => {
    const userLogs = sessionLogs.filter(log => log.user_email === user.email);
    const totalMinutes = userLogs.reduce((acc, log) => acc + (log.duration_minutes || 0), 0);
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
    const lastSession = userLogs[0];
    
    return {
      ...user,
      totalHours,
      sessionsCount: userLogs.length,
      lastLogin: lastSession?.login_time
    };
  });

  // Group logs by date for today
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = sessionLogs.filter(log => log.date === today);

  // Group logs by month
  const thisMonth = format(new Date(), 'yyyy-MM');
  const monthLogs = sessionLogs.filter(log => log.date?.startsWith(thisMonth));

  const handleInvite = (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      alert("Por favor ingresa un email válido");
      return;
    }
    inviteUserMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2 flex-wrap">
            <Settings className="h-5 sm:h-6 w-5 sm:w-6 text-slate-600 flex-shrink-0" />
            Configuración
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Administración de empleados y sistema
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto whitespace-nowrap">
          <UserPlus className="h-4 w-4 mr-2" />
          Invitar Usuario
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Total Usuarios</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{users.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Administradores</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
              <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                <Shield className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Sesiones Hoy</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{todayLogs.length}</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Clock className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Sesiones Mes</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{monthLogs.length}</p>
              </div>
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secciones Colapsables */}
      <div className="space-y-3">
        {/* Usuarios */}
        <Collapsible
          open={openSections.users}
          onOpenChange={(open) => setOpenSections({ ...openSections, users: open })}
        >
          <Card className="border-0 shadow-sm overflow-hidden">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-900">Usuarios</h3>
                    <p className="text-xs text-slate-500">Gestión de usuarios del sistema</p>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${openSections.users ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
            <div className="border-t">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-center">Horas Totales</TableHead>
                  <TableHead className="text-center">Sesiones</TableHead>
                  <TableHead>Último Acceso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userSessionStats.map((user) => (
                  <TableRow key={user.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium">
                          {user.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <span className="font-medium">{user.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">{user.email}</TableCell>
                    <TableCell>
                      <Badge className={user.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}>
                        {user.role === 'admin' ? 'Administrador' : 'Empleado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {user.totalHours}h
                    </TableCell>
                    <TableCell className="text-center">
                      {user.sessionsCount}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {user.lastLogin ? format(new Date(user.lastLogin), "d MMM yyyy HH:mm", { locale: es }) : 'Sin registro'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Registro de Sesiones */}
        <Collapsible
          open={openSections.sessions}
          onOpenChange={(open) => setOpenSections({ ...openSections, sessions: open })}
        >
          <Card className="border-0 shadow-sm overflow-hidden">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <Clock className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-900">Registro de Sesiones</h3>
                    <p className="text-xs text-slate-500">Historial de accesos al sistema</p>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${openSections.sessions ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
            <div className="border-t">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Usuario</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Hora Inicio</TableHead>
                  <TableHead>Hora Fin</TableHead>
                  <TableHead className="text-right">Duración</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionLogs.slice(0, 50).map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{log.user_name}</TableCell>
                    <TableCell className="text-slate-600">
                      {log.date ? format(new Date(log.date), "d MMM yyyy", { locale: es }) : '-'}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {log.login_time ? format(new Date(log.login_time), "HH:mm") : '-'}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {log.logout_time ? format(new Date(log.logout_time), "HH:mm") : (
                        <Badge className="bg-emerald-100 text-emerald-700">Activo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {log.duration_minutes ? `${Math.floor(log.duration_minutes / 60)}h ${log.duration_minutes % 60}m` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {sessionLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      No hay registros de sesiones
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Identidad Empresa */}
        <Collapsible
          open={openSections.identidad}
          onOpenChange={(open) => setOpenSections({ ...openSections, identidad: open })}
        >
          <Card className="border-0 shadow-sm overflow-hidden">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                    <Building className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-900">Identidad</h3>
                    <p className="text-xs text-slate-500">Logo y nombre de la empresa</p>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${openSections.identidad ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t p-4">
                <IdentidadEmpresa />
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Tema Visual */}
        <Collapsible
          open={openSections.theme}
          onOpenChange={(open) => setOpenSections({ ...openSections, theme: open })}
        >
          <Card className="border-0 shadow-sm overflow-hidden">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center">
                    <Palette className="h-5 w-5 text-pink-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-900">Tema Visual</h3>
                    <p className="text-xs text-slate-500">Personaliza colores y apariencia</p>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${openSections.theme ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t p-4">
                <ThemeSelector />
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Configuración Regional */}
        <Collapsible
          open={openSections.regional}
          onOpenChange={(open) => setOpenSections({ ...openSections, regional: open })}
        >
          <Card className="border-0 shadow-sm overflow-hidden">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center">
                    <Globe className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-900">Configuración Regional</h3>
                    <p className="text-xs text-slate-500">Zona horaria y calendario</p>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${openSections.regional ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t p-4">
                <RegionalConfig />
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Proyectos */}
        <Collapsible
          open={openSections.proyectos}
          onOpenChange={(open) => setOpenSections({ ...openSections, proyectos: open })}
        >
          <Card className="border-0 shadow-sm overflow-hidden">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-900">Proyectos</h3>
                    <p className="text-xs text-slate-500">Plantillas y configuración</p>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${openSections.proyectos ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t p-4">
                <ConfiguracionProyectos />
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Impresoras */}
        <Collapsible
          open={openSections.printers}
          onOpenChange={(open) => setOpenSections({ ...openSections, printers: open })}
        >
          <Card className="border-0 shadow-sm overflow-hidden">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                    <Printer className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-900">Impresoras</h3>
                    <p className="text-xs text-slate-500">Configuración de impresoras</p>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${openSections.printers ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t p-4">
                <ConfiguracionImpresoras />
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Configuración Fiscal */}
        <Collapsible
          open={openSections.fiscal}
          onOpenChange={(open) => setOpenSections({ ...openSections, fiscal: open })}
        >
          <Card className="border-0 shadow-sm overflow-hidden">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                    <FileText className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-900">Configuración Fiscal</h3>
                    <p className="text-xs text-slate-500">Datos fiscales e IVA</p>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${openSections.fiscal ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t p-4">
          <div className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Datos Fiscales de la Empresa</CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Información para comprobantes y reportes
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Razón Social</Label>
                    <Input defaultValue="Librería Papelería SRL" placeholder="Razón Social" disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>CUIT</Label>
                    <Input defaultValue="20-12345678-9" placeholder="CUIT" disabled />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Domicilio Fiscal</Label>
                    <Input defaultValue="Av. Principal 1234, CABA" placeholder="Dirección" disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Condición IVA</Label>
                    <Select defaultValue="RESP_INSCRIPTO" disabled>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RESP_INSCRIPTO">Responsable Inscripto</SelectItem>
                        <SelectItem value="MONOTRIBUTO">Monotributo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Inicio Actividades</Label>
                    <Input type="date" defaultValue="2020-01-01" disabled />
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border rounded-lg">
                  <p className="text-xs text-slate-600">
                    ℹ️ Para modificar estos datos, contacta al soporte técnico
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Configuración de IVA Ventas</CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Reglas automáticas para generación de Facturas B
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Generación Automática</h4>
                    <div className="space-y-2 text-sm text-blue-800">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-blue-600" />
                        <span>Cliente con tipo IVA: <strong>Responsable Inscripto</strong> o <strong>Monotributo</strong></span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-blue-600" />
                        <span>Venta mayor a <strong>$50.000</strong> (umbral configurable)</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Monto Mínimo para IVA Automático</Label>
                    <Input 
                      type="number" 
                      defaultValue="50000" 
                      placeholder="50000"
                      disabled
                    />
                    <p className="text-xs text-slate-500">
                      Ventas superiores a este monto generarán automáticamente Factura B
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center justify-between">
                      <span>Medios de Pago sin IVA</span>
                      <Badge className="bg-slate-100 text-slate-600">Solo Efectivo</Badge>
                    </Label>
                    <p className="text-xs text-slate-500">
                      Pagos en efectivo por debajo del umbral pueden no generar IVA
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center justify-between">
                      <span>Override Manual Habilitado</span>
                      <Badge className="bg-green-100 text-green-700">Sí</Badge>
                    </Label>
                    <p className="text-xs text-slate-500">
                      Los usuarios pueden activar/desactivar IVA manualmente desde el POS
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-800">
                      ⚠️ <strong>Importante:</strong> El IVA se decide ANTES de confirmar la venta. Una vez confirmada, no puede modificarse.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Tipos de Comprobante Habilitados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium">Ticket X - Sin IVA</p>
                      <p className="text-xs text-slate-500">Para consumidores finales y ventas sin discriminar IVA</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700">Activo</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium">Factura B - Con IVA</p>
                      <p className="text-xs text-slate-500">Para Responsables Inscriptos y Monotributistas</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700">Activo</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium">Factura A</p>
                      <p className="text-xs text-slate-500">Solo para Responsables Inscriptos con CUIT válido</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700">Activo</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Invite User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Invitar Usuario
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Empleado</SelectItem>
                  <SelectItem value="admin" disabled>Administrador (requiere plan premium)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Solo se pueden invitar empleados. Los administradores deben ser añadidos desde la configuración de la organización.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={inviteUserMutation.isPending || !inviteEmail.trim()}>
                {inviteUserMutation.isPending ? 'Enviando...' : 'Enviar Invitación'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}