import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Clock, UserPlus, Globe, Palette, Briefcase, Printer, Shield, Plus, Edit, Lock, CheckCircle2, Power, Trash2 } from "lucide-react";
import ConfiguracionProyectos from "../components/settings/ConfiguracionProyectos";
import IdentidadEmpresa from "../components/settings/IdentidadEmpresa";
import ThemeSelector from "../components/theme/ThemeSelector";
import RegionalConfig from "../components/settings/RegionalConfig";
import ConfiguracionImpresoras from "../components/settings/ConfiguracionImpresoras";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [activeView, setActiveView] = useState("usuarios");
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRol, setEditingRol] = useState(null);
  const [permisosDialogOpen, setPermisosDialogOpen] = useState(false);
  const [selectedRol, setSelectedRol] = useState(null);
  const [selectedPermisos, setSelectedPermisos] = useState({});
  const [formRol, setFormRol] = useState({ nombre: "", descripcion: "" });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [rolToDelete, setRolToDelete] = useState(null);

  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: sessionLogs = [] } = useQuery({
    queryKey: ['sessionLogs'],
    queryFn: () => base44.entities.SessionLog.list('-login_time', 100)
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Rol.list()
  });

  const { data: permisos = [] } = useQuery({
    queryKey: ['permisos'],
    queryFn: () => base44.entities.Permiso.list()
  });

  const { data: rolPermisos = [] } = useQuery({
    queryKey: ['rolPermisos'],
    queryFn: () => base44.entities.RolPermiso.list()
  });

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const inviteUserMutation = useMutation({
    mutationFn: async ({ email, role }) => {
      return await base44.users.inviteUser(email, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("user");
      alert('Usuario invitado correctamente');
    },
    onError: (error) => {
      alert('Error al invitar usuario: ' + error.message);
    }
  });

  const createRolMutation = useMutation({
    mutationFn: (data) => base44.entities.Rol.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setDialogOpen(false);
      setFormRol({ nombre: "", descripcion: "" });
    }
  });

  const updateRolMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Rol.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setDialogOpen(false);
      setEditingRol(null);
      setFormRol({ nombre: "", descripcion: "" });
    }
  });

  const savePermisosMutation = useMutation({
    mutationFn: async ({ rolId, permisosSeleccionados }) => {
      if (!rolId) throw new Error("Rol no seleccionado");
      
      console.log("Iniciando guardado de permisos para rolId:", rolId);
      console.log("Permisos seleccionados:", permisosSeleccionados);
      
      const rolPermisosExistentes = rolPermisos.filter(rp => rp.rol_id === rolId);
      console.log("Eliminando permisos existentes:", rolPermisosExistentes.length);
      
      for (const rp of rolPermisosExistentes) {
        await base44.entities.RolPermiso.delete(rp.id);
      }

      let permisosCreados = 0;
      for (const [key, isSelected] of Object.entries(permisosSeleccionados)) {
        if (!isSelected) continue;

        const parts = key.split('_');
        if (parts.length < 2) continue;
        
        const accion = parts[parts.length - 1];
        const modulo = parts.slice(0, -1).join('_');

        const permisoBD = permisos.find(p => p.modulo === modulo && p.accion === accion);
        
        let permisoId = null;
        if (permisoBD) {
          permisoId = permisoBD.id;
        } else {
          const nuevoPermiso = await base44.entities.Permiso.create({
            modulo,
            accion,
            descripcion: `${accion} en ${modulo}`
          });
          permisoId = nuevoPermiso.id;
        }

        await base44.entities.RolPermiso.create({
          rol_id: rolId,
          rol_nombre: selectedRol?.nombre || "",
          permiso_id: permisoId,
          modulo,
          accion
        });
        permisosCreados++;
      }
      console.log("Permisos creados:", permisosCreados);
    },
    onSuccess: () => {
      console.log("Guardado exitoso, invalidando queries");
      queryClient.invalidateQueries({ queryKey: ['rolPermisos'] });
      queryClient.invalidateQueries({ queryKey: ['permisos'] });
      setPermisosDialogOpen(false);
      setSelectedRol(null);
      setSelectedPermisos({});
      alert('✓ Permisos guardados correctamente');
    },
    onError: (error) => {
      console.error("Error al guardar permisos:", error);
      alert('Error al guardar permisos: ' + error.message);
    }
  });

  const deleteRolMutation = useMutation({
    mutationFn: async (rolId) => {
      const rol = roles.find(r => r.id === rolId);
      if (!rol) throw new Error("Rol no encontrado");
      
      if (rol.es_sistema) {
        throw new Error("No se pueden eliminar roles del sistema");
      }

      const usuariosAsignados = users.filter(u => u.rol_id === rolId);
      if (usuariosAsignados.length > 0) {
        throw new Error(`No se puede eliminar: hay ${usuariosAsignados.length} usuario(s) asignado(s)`);
      }

      const permisosDel = rolPermisos.filter(rp => rp.rol_id === rolId);
      for (const p of permisosDel) {
        await base44.entities.RolPermiso.delete(p.id);
      }

      await base44.entities.Rol.delete(rolId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['rolPermisos'] });
      setDeleteConfirmOpen(false);
      setRolToDelete(null);
    },
    onError: (error) => {
      alert("Error: " + error.message);
    }
  });

  const updateUserRolMutation = useMutation({
    mutationFn: ({ userId, rolId, rolNombre }) => 
      base44.entities.User.update(userId, { rol_id: rolId, rol_nombre: rolNombre }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, currentStatus }) => 
      base44.entities.User.update(userId, { activo: !currentStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const handleInvite = () => {
    if (!inviteEmail) return;
    inviteUserMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const MODULOS = [
    { id: "ventas", nombre: "Ventas", categoria: "Operativa", critico: true },
    { id: "presupuestos", nombre: "Presupuestos", categoria: "Operativa", critico: false },
    { id: "compras", nombre: "Compras", categoria: "Operativa", critico: true },
    { id: "inventario", nombre: "Inventario", categoria: "Operativa", critico: true },
    { id: "productos", nombre: "Productos", categoria: "Operativa", critico: false },
    { id: "control_stock", nombre: "Control de Stock", categoria: "Operativa", critico: false },
    { id: "tesoreria", nombre: "Tesorería", categoria: "Finanzas", critico: true },
    { id: "cheques", nombre: "Cheques", categoria: "Finanzas", critico: true },
    { id: "gastos", nombre: "Gastos", categoria: "Finanzas", critico: false },
    { id: "proyectos", nombre: "Proyectos", categoria: "Gestión", critico: false },
    { id: "calendario", nombre: "Calendario", categoria: "Gestión", critico: false },
    { id: "clientes", nombre: "Clientes", categoria: "Contactos", critico: false },
    { id: "proveedores", nombre: "Proveedores", categoria: "Contactos", critico: false },
    { id: "analytics", nombre: "Analytics", categoria: "Análisis", critico: false },
    { id: "tablero_fiscal", nombre: "Tablero Fiscal", categoria: "Análisis", critico: true },
    { id: "iva_mensual", nombre: "IVA Mensual", categoria: "Análisis", critico: true },
    { id: "ingresos_brutos", nombre: "Ingresos Brutos", categoria: "Análisis", critico: true },
    { id: "talonarios", nombre: "Talonarios", categoria: "Sistema", critico: true },
    { id: "configuracion", nombre: "Configuración", categoria: "Sistema", critico: true },
    { id: "usuarios", nombre: "Usuarios y Permisos", categoria: "Sistema", critico: true }
  ];

  const ACCIONES = [
    { id: "VIEW", nombre: "Ver", desc: "Acceder al módulo" },
    { id: "CREATE", nombre: "Crear", desc: "Crear nuevos registros" },
    { id: "EDIT", nombre: "Editar", desc: "Modificar registros" },
    { id: "DELETE", nombre: "Eliminar", desc: "Eliminar registros" },
    { id: "CONFIRM", nombre: "Confirmar", desc: "Confirmar operaciones" },
    { id: "PAY", nombre: "Pagar", desc: "Registrar pagos" },
    { id: "ANNUL", nombre: "Anular", desc: "Anular operaciones" },
    { id: "REPORT", nombre: "Reportes", desc: "Generar reportes" },
    { id: "CLOSE_PERIOD", nombre: "Cerrar períodos", desc: "Cerrar períodos fiscales" },
    { id: "DELETE_ALL", nombre: "Borrar Todo", desc: "Eliminar todos los registros" },
    { id: "ADMIN", nombre: "Administrador", desc: "Control total del módulo" }
  ];

  const handleOpenRolDialog = (rol = null) => {
    if (rol) {
      setEditingRol(rol);
      setFormRol({ nombre: rol.nombre, descripcion: rol.descripcion || "" });
    } else {
      setEditingRol(null);
      setFormRol({ nombre: "", descripcion: "" });
    }
    setDialogOpen(true);
  };

  const handleSaveRol = () => {
    if (!formRol.nombre) return;
    if (editingRol) {
      updateRolMutation.mutate({ id: editingRol.id, data: formRol });
    } else {
      createRolMutation.mutate(formRol);
    }
  };

  const handleOpenPermisos = (rol) => {
    setSelectedRol(rol);
    const permisosActuales = {};
    rolPermisos
      .filter(rp => rp.rol_id === rol.id)
      .forEach(rp => {
        permisosActuales[`${rp.modulo}_${rp.accion}`] = true;
      });
    setSelectedPermisos(permisosActuales);
    setPermisosDialogOpen(true);
  };

  const togglePermiso = (modulo, accion) => {
    const key = `${modulo}_${accion}`;
    setSelectedPermisos(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleModuloCompleto = (moduloId, value) => {
    const newPermisos = { ...selectedPermisos };
    ACCIONES.forEach(accion => {
      newPermisos[`${moduloId}_${accion.id}`] = value;
    });
    setSelectedPermisos(newPermisos);
  };

  const getRolUsers = (rolId) => users.filter(u => u.rol_id === rolId);
  const getRolPermisosCount = (rolId) => rolPermisos.filter(rp => rp.rol_id === rolId).length;

  const handleUserRoleChange = (userId, value) => {
    if (value === "none") {
      updateUserRolMutation.mutate({ userId, rolId: null, rolNombre: null });
    } else {
      const rol = roles.find(r => r.id === value);
      updateUserRolMutation.mutate({ userId, rolId: value, rolNombre: rol?.nombre });
    }
  };

  const handleToggleUserStatus = (userId, currentStatus) => {
    toggleStatusMutation.mutate({ userId, currentStatus });
  };

  const admins = users.filter(u => u.role === 'admin').length;
  const totalUsers = users.length;

  const today = new Date().toISOString().split('T')[0];
  const sessionsToday = sessionLogs.filter(log => log.login_time?.startsWith(today)).length;

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sessionsThisMonth = sessionLogs.filter(log => {
    if (!log.login_time) return false;
    const logDate = new Date(log.login_time);
    return logDate >= firstDayOfMonth;
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
        <p className="text-slate-500 text-sm mt-1">
          Gestiona usuarios, configuración del sistema y preferencias
        </p>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-slate-700">Vista:</span>
        <Select value={activeView} onValueChange={setActiveView}>
          <SelectTrigger className="w-80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="usuarios">Usuarios</SelectItem>
            <SelectItem value="sesiones">Registro de Sesiones</SelectItem>
            <SelectItem value="identidad">Identidad</SelectItem>
            <SelectItem value="tema">Tema Visual</SelectItem>
            <SelectItem value="regional">Configuración Regional</SelectItem>
            <SelectItem value="proyectos">Proyectos</SelectItem>
            <SelectItem value="impresoras">Impresoras</SelectItem>
            <SelectItem value="roles">Roles y Permisos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {user?.role === 'admin' ? (
        <div className="space-y-6">
          {activeView === "usuarios" && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-base">Usuarios del Sistema</CardTitle>
                  </div>
                  <Button onClick={() => setInviteDialogOpen(true)} size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invitar Usuario
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">Total Usuarios</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">{totalUsers}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-700">Administradores</p>
                    <p className="text-2xl font-bold text-purple-900 mt-1">{admins}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-700">Sesiones Hoy</p>
                    <p className="text-2xl font-bold text-green-900 mt-1">{sessionsToday}</p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Sesiones (mes)</TableHead>
                      <TableHead>Último Acceso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(u => {
                      const userSessions = sessionLogs.filter(log => log.user_email === u.email);
                      const monthSessions = userSessions.filter(log => {
                        if (!log.login_time) return false;
                        const logDate = new Date(log.login_time);
                        return logDate >= firstDayOfMonth;
                      }).length;
                      const lastSession = userSessions[0];

                      return (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.full_name}</TableCell>
                          <TableCell className="text-sm text-slate-600">{u.email}</TableCell>
                          <TableCell>
                            <Badge className={u.role === 'admin' ? 'bg-slate-800 text-white' : 'bg-blue-100 text-blue-700'}>
                              {u.role === 'admin' ? 'Administrador' : 'Empleado'}
                            </Badge>
                          </TableCell>
                          <TableCell>{monthSessions}</TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {lastSession ? new Date(lastSession.login_time).toLocaleString('es-AR') : 'Sin registro'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {activeView === "sesiones" && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-base">Registro de Sesiones</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-700">Sesiones Hoy</p>
                    <p className="text-2xl font-bold text-green-900 mt-1">{sessionsToday}</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">Sesiones Este Mes</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">{sessionsThisMonth}</p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Usuario</TableHead>
                      <TableHead>Inicio</TableHead>
                      <TableHead>Fin</TableHead>
                      <TableHead>Duración</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionLogs.slice(0, 50).map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.user_name}</TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {log.login_time ? new Date(log.login_time).toLocaleString('es-AR') : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {log.logout_time ? new Date(log.logout_time).toLocaleString('es-AR') : 'En sesión'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.duration_minutes ? `${log.duration_minutes} min` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {activeView === "identidad" && <IdentidadEmpresa />}

          {activeView === "tema" && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <ThemeSelector />
              </CardContent>
            </Card>
          )}

          {activeView === "regional" && <RegionalConfig />}

          {activeView === "proyectos" && <ConfiguracionProyectos />}

          {activeView === "impresoras" && <ConfiguracionImpresoras />}

          {activeView === "roles" && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-slate-700" />
                    Roles y Permisos
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Gestión centralizada de accesos y control de seguridad</p>
                </div>
                <Button onClick={() => handleOpenRolDialog()} className="bg-slate-700 hover:bg-slate-800">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Rol
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map(rol => (
                  <Card key={rol.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-4 border-b border-slate-100">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <CardTitle className="text-base font-semibold">{rol.nombre}</CardTitle>
                          <p className="text-sm text-slate-500 mt-1.5 line-clamp-2">
                            {rol.descripcion || "Sin descripción"}
                          </p>
                        </div>
                        {rol.es_sistema && (
                          <Badge className="bg-slate-100 text-slate-700 text-xs">Sistema</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="h-4 w-4 text-slate-600" />
                            <span className="text-xs text-slate-600 font-medium">Usuarios</span>
                          </div>
                          <p className="text-xl font-bold">{getRolUsers(rol.id).length}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Lock className="h-4 w-4 text-slate-600" />
                            <span className="text-xs text-slate-600 font-medium">Permisos</span>
                          </div>
                          <p className="text-xl font-bold">{getRolPermisosCount(rol.id)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenPermisos(rol)}
                          className="flex-1"
                        >
                          <Lock className="h-3.5 w-3.5 mr-1.5" />
                          Configurar
                        </Button>
                        {!rol.es_sistema && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenRolDialog(rol)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setRolToDelete(rol);
                                setDeleteConfirmOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Asignación de Roles a Usuarios</CardTitle>
                  <CardDescription className="text-xs">Asigna roles personalizados para controlar el acceso</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Usuario</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol Sistema</TableHead>
                        <TableHead>Rol Personalizado</TableHead>
                        <TableHead className="w-16">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map(u => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.full_name}</TableCell>
                          <TableCell className="text-sm text-slate-600">{u.email}</TableCell>
                          <TableCell>
                            <Badge className={u.role === 'admin' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'}>
                              {u.role === 'admin' ? 'Admin' : 'Usuario'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {u.role === 'admin' ? (
                              <span className="text-sm text-muted-foreground italic">Acceso total</span>
                            ) : (
                              <Select value={u.rol_id || "none"} onValueChange={(v) => handleUserRoleChange(u.id, v)}>
                                <SelectTrigger className="w-48">
                                  <SelectValue placeholder="Sin asignar" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Sin rol personalizado</SelectItem>
                                  {roles.filter(r => !r.es_sistema).map(rol => (
                                    <SelectItem key={rol.id} value={rol.id}>{rol.nombre}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell>
                            {u.role !== 'admin' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleUserStatus(u.id, u.activo !== false)}
                                className={u.activo !== false ? "text-green-600" : "text-red-600"}
                              >
                                <Power className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      ) : (
        <Card className="border-l-4 border-l-amber-500 bg-amber-50">
          <CardContent className="p-6">
            <p className="text-amber-800">
              ⚠️ Solo los administradores pueden acceder a esta página
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog Crear/Editar Rol */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRol ? "Editar Rol" : "Nuevo Rol"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formRol.nombre}
                onChange={(e) => setFormRol({ ...formRol, nombre: e.target.value })}
                placeholder="Ej: Vendedor, Contador..."
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formRol.descripcion}
                onChange={(e) => setFormRol({ ...formRol, descripcion: e.target.value })}
                placeholder="Descripción del rol..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveRol} disabled={!formRol.nombre}>
              {editingRol ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Permisos */}
      <Dialog open={permisosDialogOpen} onOpenChange={setPermisosDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto p-0">
          <div className="sticky top-0 z-10 bg-white border-b px-6 py-4">
            <DialogTitle className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-slate-700" />
              <div>
                <p>Permisos del Rol</p>
                <p className="text-sm font-semibold mt-0.5">{selectedRol?.nombre}</p>
              </div>
            </DialogTitle>
          </div>

          <div className="px-6 py-6 space-y-8">
            {['Operativa', 'Finanzas', 'Gestión', 'Contactos', 'Análisis', 'Sistema'].map(categoria => {
              const modulosCategoria = MODULOS.filter(m => m.categoria === categoria);
              if (modulosCategoria.length === 0) return null;

              return (
                <div key={categoria} className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase">{categoria}</h3>
                  <div className="space-y-3">
                    {modulosCategoria.map(modulo => {
                      const hasAll = ACCIONES.every(a => selectedPermisos[`${modulo.id}_${a.id}`]);
                      return (
                        <div key={modulo.id} className="border rounded-lg overflow-hidden">
                          <div className="px-4 py-3 bg-slate-50 border-b flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={hasAll}
                                onCheckedChange={(checked) => toggleModuloCompleto(modulo.id, checked)}
                              />
                              <p className="font-semibold flex items-center gap-2">
                                {modulo.nombre}
                                {modulo.critico && <Badge className="bg-red-100 text-red-700 text-xs">Crítico</Badge>}
                              </p>
                            </div>
                          </div>
                          <div className="px-4 py-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                              {ACCIONES.map(accion => (
                                <label key={accion.id} className="flex items-start gap-2.5 cursor-pointer">
                                  <Checkbox
                                    checked={selectedPermisos[`${modulo.id}_${accion.id}`] || false}
                                    onCheckedChange={() => togglePermiso(modulo.id, accion.id)}
                                    className="mt-1"
                                  />
                                  <div>
                                    <div className="font-medium text-sm">{accion.nombre}</div>
                                    <div className="text-xs text-slate-500">{accion.desc}</div>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPermisosDialogOpen(false)}>Cancelar</Button>
            <Button 
              onClick={() => savePermisosMutation.mutate({ rolId: selectedRol.id, permisosSeleccionados: selectedPermisos })}
              disabled={!selectedRol}
              className="bg-slate-700 hover:bg-slate-800"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Guardar permisos
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Eliminar Rol */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar rol "{rolToDelete?.nombre}"</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todos los permisos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRolMutation.mutate(rolToDelete?.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Invitar Usuario */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar Nuevo Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Rol en el Sistema</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Empleado</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
              {inviteRole === 'admin' && (
                <p className="text-xs text-amber-600">
                  ⚠️ Los administradores tienen acceso total al sistema
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleInvite} disabled={!inviteEmail || inviteUserMutation.isPending}>
              {inviteUserMutation.isPending ? 'Invitando...' : 'Enviar Invitación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}