import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SIDEBAR_STRUCTURE } from "@/components/config/sidebarStructure";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { Shield, Plus, Edit, Users, Lock, CheckCircle2, Power, Trash2 } from "lucide-react";
import PermissionGuard from "@/components/permissions/PermissionGuard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

function UserRolSelector({ user, roles }) {
  const queryClient = useQueryClient();

  const updateUserRolMutation = useMutation({
    mutationFn: ({ userId, rolId, rolNombre }) => 
      base44.entities.User.update(userId, { rol_id: rolId, rol_nombre: rolNombre }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const handleChange = (value) => {
    if (value === "none") {
      updateUserRolMutation.mutate({ userId: user.id, rolId: null, rolNombre: null });
    } else {
      const rol = roles.find(r => r.id === value);
      updateUserRolMutation.mutate({ userId: user.id, rolId: value, rolNombre: rol?.nombre });
    }
  };

  if (user.role === 'admin') {
    return <span className="text-sm text-muted-foreground italic">Acceso total</span>;
  }

  return (
    <Select value={user.rol_id || "none"} onValueChange={handleChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Sin asignar" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Sin rol personalizado</SelectItem>
        {roles.filter(r => !r.es_sistema).map(rol => (
          <SelectItem key={rol.id} value={rol.id}>
            {rol.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function UserStatusToggle({ user }) {
  const queryClient = useQueryClient();

  const toggleStatusMutation = useMutation({
    mutationFn: (userId) => 
      base44.entities.User.update(userId, { activo: user.activo === false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  if (user.role === 'admin') {
    return null; // No permitir desactivar admins
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => toggleStatusMutation.mutate(user.id)}
      className={user.activo !== false ? "text-green-600 hover:text-green-700" : "text-red-600 hover:text-red-700"}
    >
      <Power className="h-4 w-4" />
    </Button>
  );
}

const MODULOS = [
  // VENTAS - Módulos granulares por página
  { id: "sales", nombre: "Ventas", categoria: "Ventas", critico: true },
  { id: "presupuestos", nombre: "Presupuestos", categoria: "Ventas", critico: false },
  { id: "clients", nombre: "Clientes", categoria: "Ventas", critico: false },
  { id: "services", nombre: "Servicios", categoria: "Ventas", critico: false },
  { id: "talonarios", nombre: "Talonarios", categoria: "Ventas", critico: true },

  // COMPRAS - Módulos granulares por página
  { id: "purchases", nombre: "Compras", categoria: "Compras", critico: true },
  { id: "suppliers", nombre: "Proveedores", categoria: "Compras", critico: false },
  { id: "supplier_payments", nombre: "Pagos Proveedores", categoria: "Compras", critico: false },

  // INVENTARIO - Módulos granulares por página
  { id: "products", nombre: "Productos", categoria: "Inventario", critico: true },
  { id: "inventory", nombre: "Inventario", categoria: "Inventario", critico: true },
  { id: "stock_control", nombre: "Control de Stock", categoria: "Inventario", critico: false },

  // PROYECTOS - Módulos granulares por página
  { id: "projects", nombre: "Proyectos", categoria: "Proyectos", critico: false },
  { id: "work_orders", nombre: "Órdenes de Trabajo", categoria: "Proyectos", critico: false },

  // AGENDA - Módulo único
  { id: "calendar", nombre: "Calendario", categoria: "Agenda", critico: false },

  // FINANZAS - Módulos granulares por página
  { id: "treasury", nombre: "Tesorería", categoria: "Finanzas", critico: true },
  { id: "checks", nombre: "Cheques", categoria: "Finanzas", critico: true },
  { id: "expenses", nombre: "Gastos", categoria: "Finanzas", critico: false },
  { id: "financials", nombre: "Finanzas", categoria: "Finanzas", critico: false },
  { id: "income_statement", nombre: "Estado de Resultados", categoria: "Finanzas", critico: false },
  { id: "analytics", nombre: "Analytics", categoria: "Finanzas", critico: false },

  // SISTEMA
  { id: "settings", nombre: "Configuración", categoria: "Sistema", critico: true }
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

export default function RolesPermisos() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRol, setEditingRol] = useState(null);
  const [permisosDialogOpen, setPermisosDialogOpen] = useState(false);
  const [selectedRol, setSelectedRol] = useState(null);
  const [selectedPermisos, setSelectedPermisos] = useState({});
  const [formData, setFormData] = useState({ nombre: "", descripcion: "" });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [rolToDelete, setRolToDelete] = useState(null);
  const [user, setUser] = useState(null);
  
  // Force recompile - v2

  const queryClient = useQueryClient();

  // Obtener usuario actual para verificar si es admin
  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

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

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const createRolMutation = useMutation({
    mutationFn: (data) => base44.entities.Rol.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setDialogOpen(false);
      setFormData({ nombre: "", descripcion: "" });
    }
  });

  const updateRolMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Rol.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setDialogOpen(false);
      setEditingRol(null);
      setFormData({ nombre: "", descripcion: "" });
    }
  });

  const savePermisosMutation = useMutation({
    mutationFn: async ({ rolId, permisosSeleccionados }) => {
      if (!rolId) throw new Error("Rol no seleccionado");
      
      // Eliminar todos los permisos existentes del rol
      const rolPermisosExistentes = rolPermisos.filter(rp => rp.rol_id === rolId);
      for (const rp of rolPermisosExistentes) {
        await base44.entities.RolPermiso.delete(rp.id);
      }

      // Procesar los permisos seleccionados
      for (const [key, isSelected] of Object.entries(permisosSeleccionados)) {
        if (!isSelected) continue;

        // Parsear key: modulo_accion
        const parts = key.split('_');
        if (parts.length < 2) continue;
        
        const accion = parts[parts.length - 1];
        const modulo = parts.slice(0, -1).join('_');

        // Buscar el permiso en la BD
        const permisoBD = permisos.find(p => p.modulo === modulo && p.accion === accion);
        
        // Si no existe, crearlo
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

        // Crear la asignación rol-permiso
        await base44.entities.RolPermiso.create({
          rol_id: rolId,
          rol_nombre: selectedRol?.nombre || "",
          permiso_id: permisoId,
          modulo,
          accion
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rolPermisos'] });
      queryClient.invalidateQueries({ queryKey: ['permisos'] });
      setPermisosDialogOpen(false);
      setSelectedRol(null);
      setSelectedPermisos({});
      alert('✓ Permisos guardados correctamente');
    },
    onError: (error) => {
      alert("Error al guardar permisos: " + error.message);
    }
  });

  const deleteRolMutation = useMutation({
    mutationFn: async (rolId) => {
      const rol = roles.find(r => r.id === rolId);
      if (!rol) throw new Error("Rol no encontrado");
      
      if (rol.es_sistema) {
        throw new Error("No se pueden eliminar roles del sistema");
      }

      const usuariosAsignados = getRolUsers(rolId);
      if (usuariosAsignados.length > 0) {
        throw new Error(`No se puede eliminar: hay ${usuariosAsignados.length} usuario(s) asignado(s) a este rol`);
      }

      // Eliminar permisos asociados
      const permisosDel = rolPermisos.filter(rp => rp.rol_id === rolId);
      for (const p of permisosDel) {
        await base44.entities.RolPermiso.delete(p.id);
      }

      // Eliminar rol
      await base44.entities.Rol.delete(rolId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['rolPermisos'] });
      setDeleteConfirmOpen(false);
      setRolToDelete(null);
    },
    onError: (error) => {
      alert("Error al eliminar rol: " + error.message);
    }
  });

  const handleOpenDialog = (rol = null) => {
    if (rol) {
      setEditingRol(rol);
      setFormData({ nombre: rol.nombre, descripcion: rol.descripcion || "" });
    } else {
      setEditingRol(null);
      setFormData({ nombre: "", descripcion: "" });
    }
    setDialogOpen(true);
  };

  const handleSaveRol = () => {
    if (!formData.nombre) return;

    if (editingRol) {
      updateRolMutation.mutate({ id: editingRol.id, data: formData });
    } else {
      createRolMutation.mutate(formData);
    }
  };

  const handleOpenPermisos = (rol) => {
    setSelectedRol(rol);
    
    // Cargar permisos actuales
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
    setSelectedPermisos(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleModuloCompleto = (moduloId, value) => {
    const newPermisos = { ...selectedPermisos };
    ACCIONES.forEach(accion => {
      newPermisos[`${moduloId}_${accion.id}`] = value;
    });
    setSelectedPermisos(newPermisos);
  };

  const getRolUsers = (rolId) => {
    return users.filter(u => u.rol_id === rolId);
  };

  const getRolPermisosCount = (rolId) => {
    return rolPermisos.filter(rp => rp.rol_id === rolId).length;
  };

  return (
    <PermissionGuard modulo="usuarios" accion="ADMIN">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Shield className="h-6 w-6 text-slate-700" />
                  </div>
                  Roles y Permisos
                </h1>
                <p className="text-slate-500 text-sm mt-2">
                  Gestión centralizada de accesos y control de seguridad
                </p>
              </div>
              <Button onClick={() => handleOpenDialog()} className="bg-slate-700 hover:bg-slate-800 text-white whitespace-nowrap mt-2">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Rol
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <Tabs defaultValue="roles" className="space-y-8">
            <div className="flex gap-2 border-b border-slate-200">
              <TabsList className="bg-transparent border-0 gap-8">
                <TabsTrigger value="roles" className="relative text-base font-medium text-slate-600 hover:text-slate-900 border-0 pb-3 px-0 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:border-b-2 data-[state=active]:border-slate-900">
                  Roles
                </TabsTrigger>
                <TabsTrigger value="usuarios" className="relative text-base font-medium text-slate-600 hover:text-slate-900 border-0 pb-3 px-0 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:border-b-2 data-[state=active]:border-slate-900">
                  Usuarios
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="roles" className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map(rol => (
                  <Card key={rol.id} className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white rounded-lg overflow-hidden">
                    <CardHeader className="pb-4 border-b border-slate-100">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <CardTitle className="text-base font-semibold text-slate-900">{rol.nombre}</CardTitle>
                          <p className="text-sm text-slate-500 mt-1.5 line-clamp-2">
                            {rol.descripcion || "Sin descripción"}
                          </p>
                        </div>
                        {rol.es_sistema && (
                          <Badge className="bg-slate-100 text-slate-700 text-xs font-medium">Sistema</Badge>
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
                          <p className="text-xl font-bold text-slate-900">{getRolUsers(rol.id).length}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Lock className="h-4 w-4 text-slate-600" />
                            <span className="text-xs text-slate-600 font-medium">Permisos</span>
                          </div>
                          <p className="text-xl font-bold text-slate-900">{getRolPermisosCount(rol.id)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenPermisos(rol)}
                          className="flex-1 text-sm"
                        >
                          <Lock className="h-3.5 w-3.5 mr-1.5" />
                          Configurar
                        </Button>
                        {!rol.es_sistema && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenDialog(rol)}
                              className="px-2"
                            >
                              <Edit className="h-4 w-4 text-slate-600" />
                            </Button>
                            {user?.role === 'admin' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setRolToDelete(rol);
                                  setDeleteConfirmOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
          </TabsContent>

            <TabsContent value="usuarios" className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-900">Asignación de Roles</p>
                  <p className="text-xs text-slate-500 mt-1">Asigna roles personalizados a usuarios para controlar su acceso</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-200">
                      <TableHead className="font-semibold text-slate-700 h-12">Usuario</TableHead>
                      <TableHead className="font-semibold text-slate-700">Email</TableHead>
                      <TableHead className="font-semibold text-slate-700">Rol Sistema</TableHead>
                      <TableHead className="font-semibold text-slate-700">Rol Personalizado</TableHead>
                      <TableHead className="font-semibold text-slate-700 w-16">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(user => (
                      <TableRow key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <TableCell className="font-medium text-slate-900">{user.full_name}</TableCell>
                        <TableCell className="text-sm text-slate-600">{user.email}</TableCell>
                        <TableCell>
                          <Badge className={user.role === 'admin' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'}>
                            {user.role === 'admin' ? 'Admin' : 'Usuario'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <UserRolSelector user={user} roles={roles} />
                        </TableCell>
                        <TableCell>
                          <UserStatusToggle user={user} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </div>

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
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Vendedor, Contador, Operador..."
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción del rol y sus responsabilidades..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveRol} disabled={!formData.nombre}>
                {editingRol ? "Guardar cambios" : "Crear rol"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Permisos */}
        <Dialog open={permisosDialogOpen} onOpenChange={setPermisosDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto p-0">
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4">
              <DialogTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-slate-100 rounded">
                  <Shield className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <p>Permisos del Rol</p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">{selectedRol?.nombre}</p>
                </div>
              </DialogTitle>
            </div>

            <div className="px-6 py-6 space-y-8">
              {['Ventas', 'Compras', 'Inventario', 'Proyectos', 'Agenda', 'Finanzas', 'Sistema'].map(categoria => {
                const modulosCategoria = MODULOS.filter(m => m.categoria === categoria);
                if (modulosCategoria.length === 0) return null;

                return (
                  <div key={categoria} className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-1 h-6 bg-slate-700 rounded-full"></div>
                      <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                        {categoria}
                      </h3>
                      <div className="h-px flex-1 bg-slate-200"></div>
                    </div>

                    <div className="space-y-3">
                      {modulosCategoria.map(modulo => {
                        const hasAll = ACCIONES.every(a => selectedPermisos[`${modulo.id}_${a.id}`]);

                        return (
                          <div key={modulo.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white hover:border-slate-300 transition-colors">
                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={hasAll}
                                  onCheckedChange={(checked) => toggleModuloCompleto(modulo.id, checked)}
                                />
                                <div>
                                  <p className="font-semibold text-slate-900 flex items-center gap-2">
                                    {modulo.nombre}
                                    {modulo.critico && (
                                      <Badge className="bg-red-100 text-red-700 text-xs font-medium">Crítico</Badge>
                                    )}
                                  </p>
                                </div>
                              </div>
                              {hasAll && (
                                <div className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                  Todo acceso
                                </div>
                              )}
                            </div>
                            <div className="px-4 py-4">
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                {ACCIONES.map(accion => (
                                  <label key={accion.id} className="flex items-start gap-2.5 cursor-pointer group">
                                    <Checkbox
                                      id={`${modulo.id}_${accion.id}`}
                                      checked={selectedPermisos[`${modulo.id}_${accion.id}`] || false}
                                      onCheckedChange={() => togglePermiso(modulo.id, accion.id)}
                                      className="mt-1"
                                    />
                                    <div className="flex-1">
                                      <div className="font-medium text-slate-900 text-sm">{accion.nombre}</div>
                                      <div className="text-xs text-slate-500 group-hover:text-slate-600 transition-colors">{accion.desc}</div>
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

            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPermisosDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => savePermisosMutation.mutate({ 
                  rolId: selectedRol.id, 
                  permisosSeleccionados: selectedPermisos 
                })}
                disabled={savePermisosMutation.isPending || !selectedRol}
                className="bg-slate-700 hover:bg-slate-800 text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {savePermisosMutation.isPending ? "Guardando..." : "Guardar permisos"}
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
               Esta acción no se puede deshacer. Se eliminarán todos los permisos asociados a este rol.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Cancelar</AlertDialogCancel>
             <AlertDialogAction
               onClick={() => deleteRolMutation.mutate(rolToDelete?.id)}
               className="bg-red-600 hover:bg-red-700"
               disabled={deleteRolMutation.isPending}
             >
               {deleteRolMutation.isPending ? "Eliminando..." : "Eliminar"}
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
        </AlertDialog>
        </div>
        </PermissionGuard>
        );
        }