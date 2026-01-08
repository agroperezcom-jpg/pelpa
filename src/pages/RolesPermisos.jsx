import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  { id: "ventas", nombre: "Ventas", categoria: "Operativa", critico: true },
  { id: "presupuestos", nombre: "Presupuestos", categoria: "Operativa", critico: false },
  { id: "compras", nombre: "Compras", categoria: "Operativa", critico: true },
  { id: "inventario", nombre: "Inventario", categoria: "Operativa", critico: true },
  { id: "productos", nombre: "Productos", categoria: "Operativa", critico: false },
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
    mutationFn: async ({ rolId, permisos }) => {
      if (!rolId) throw new Error("Rol no seleccionado");
      
      // Eliminar permisos existentes
      const existing = rolPermisos.filter(rp => rp.rol_id === rolId);
      for (const rp of existing) {
        await base44.entities.RolPermiso.delete(rp.id);
      }

      // Crear nuevos permisos
      for (const [key, value] of Object.entries(permisos)) {
        if (value) {
          const parts = key.split('_');
          if (parts.length < 2) continue; // Skip invalid keys
          
          const accion = parts[parts.length - 1];
          const modulo = parts.slice(0, -1).join('_');
          
          const permiso = await base44.entities.Permiso.filter({ modulo, accion });
          
          if (permiso.length === 0) {
            // Crear permiso si no existe
            const nuevoPermiso = await base44.entities.Permiso.create({
              modulo,
              accion,
              descripcion: `${accion} en ${modulo}`
            });
            
            await base44.entities.RolPermiso.create({
              rol_id: rolId,
              rol_nombre: selectedRol?.nombre || "",
              permiso_id: nuevoPermiso.id,
              modulo,
              accion
            });
          } else {
            await base44.entities.RolPermiso.create({
              rol_id: rolId,
              rol_nombre: selectedRol?.nombre || "",
              permiso_id: permiso[0].id,
              modulo,
              accion
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rolPermisos'] });
      setPermisosDialogOpen(false);
      setSelectedRol(null);
      setSelectedPermisos({});
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Roles y Permisos
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gestión de accesos y control de seguridad del sistema
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-primary hover:bg-[hsl(var(--primary-hover))] w-full sm:w-auto whitespace-nowrap">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Rol
          </Button>
        </div>

        <Tabs defaultValue="roles" className="space-y-4">
          <TabsList>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
              {roles.map(rol => (
                <Card key={rol.id} className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{rol.nombre}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {rol.descripcion || "Sin descripción"}
                        </p>
                      </div>
                      {rol.es_sistema && (
                        <Badge variant="outline" className="text-xs">
                          Sistema
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Usuarios
                      </span>
                      <Badge variant="secondary">{getRolUsers(rol.id).length}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Permisos
                      </span>
                      <Badge variant="secondary">{getRolPermisosCount(rol.id)}</Badge>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenPermisos(rol)}
                        className="flex-1"
                      >
                        <Lock className="h-4 w-4 mr-1" />
                        Permisos
                      </Button>
                      {!rol.es_sistema && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenDialog(rol)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {user?.role === 'admin' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
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

          <TabsContent value="usuarios">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Asignación de Roles</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Asigna roles personalizados a usuarios para controlar su acceso
                </p>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50">
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol Sistema</TableHead>
                    <TableHead>Rol Personalizado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role === 'admin' ? 'Administrador' : 'Usuario'}
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
            </Card>
          </TabsContent>
        </Tabs>

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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Permisos: {selectedRol?.nombre}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Agrupar por categoría */}
              {['Operativa', 'Finanzas', 'Gestión', 'Contactos', 'Análisis', 'Sistema'].map(categoria => {
                const modulosCategoria = MODULOS.filter(m => m.categoria === categoria);
                if (modulosCategoria.length === 0) return null;

                return (
                  <div key={categoria} className="space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-px flex-1 bg-border"></div>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        {categoria}
                      </h3>
                      <div className="h-px flex-1 bg-border"></div>
                    </div>

                    {modulosCategoria.map(modulo => {
                      const hasAll = ACCIONES.every(a => selectedPermisos[`${modulo.id}_${a.id}`]);
                      
                      return (
                        <Card key={modulo.id} className="border-0 shadow-sm">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={hasAll}
                                  onCheckedChange={(checked) => toggleModuloCompleto(modulo.id, checked)}
                                />
                                <div>
                                  <p className="font-semibold flex items-center gap-2">
                                    {modulo.nombre}
                                    {modulo.critico && (
                                      <Badge variant="destructive" className="text-xs">Crítico</Badge>
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                              {ACCIONES.map(accion => (
                                <div key={accion.id} className="flex items-start gap-2">
                                  <Checkbox
                                    id={`${modulo.id}_${accion.id}`}
                                    checked={selectedPermisos[`${modulo.id}_${accion.id}`] || false}
                                    onCheckedChange={() => togglePermiso(modulo.id, accion.id)}
                                  />
                                  <label
                                    htmlFor={`${modulo.id}_${accion.id}`}
                                    className="text-sm cursor-pointer"
                                  >
                                    <div className="font-medium">{accion.nombre}</div>
                                    <div className="text-xs text-muted-foreground">{accion.desc}</div>
                                  </label>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setPermisosDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => savePermisosMutation.mutate({ 
                  rolId: selectedRol.id, 
                  permisos: selectedPermisos 
                })}
                disabled={savePermisosMutation.isPending || !selectedRol}
                className="bg-primary hover:bg-[hsl(var(--primary-hover))]"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {savePermisosMutation.isPending ? "Guardando..." : "Guardar permisos"}
              </Button>
            </DialogFooter>
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