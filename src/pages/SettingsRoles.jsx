import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Plus, Trash2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

const MODULES = [
  "Ventas",
  "Compras",
  "Inventario",
  "Tesorería",
  "Proyectos",
  "Calendario",
  "Analytics",
];

const ACTIONS = ["view", "create", "edit", "delete"];

const ACTION_LABELS = {
  view: "Ver",
  create: "Crear",
  edit: "Editar",
  delete: "Eliminar"
};

export default function SettingsRoles() {
  const [currentUser, setCurrentUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const queryClient = useQueryClient();

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list()
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => base44.entities.Permission.list()
  });

  useEffect(() => {
    const loadUser = async () => {
      const me = await base44.auth.me();
      setCurrentUser(me);
    };
    loadUser();
  }, []);

  const createRoleMutation = useMutation({
    mutationFn: (data) => base44.entities.Role.create({ ...data, is_system: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setDialogOpen(false);
      setFormData({ name: "", description: "" });
      toast.success("Rol creado exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear rol");
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Role.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setDialogOpen(false);
      setEditingRole(null);
      setFormData({ name: "", description: "" });
      toast.success("Rol actualizado exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar rol");
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId) => {
      await base44.entities.Role.delete(roleId);
      const rolePerms = permissions.filter(p => p.role_id === roleId);
      for (const perm of rolePerms) {
        await base44.entities.Permission.delete(perm.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      setDeleteConfirmOpen(false);
      setRoleToDelete(null);
      toast.success("Rol eliminado exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar rol");
    }
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ roleId, module, action, allowed }) => {
      const existing = permissions.find(
        p => p.role_id === roleId && p.module === module && p.action === action
      );

      if (existing) {
        return await base44.entities.Permission.update(existing.id, { allowed });
      } else {
        const role = roles.find(r => r.id === roleId);
        return await base44.entities.Permission.create({
          role_id: roleId,
          role_name: role.name,
          module,
          action,
          allowed
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    }
  });

  const handleOpenDialog = (role = null) => {
    if (role) {
      setEditingRole(role);
      setFormData({ name: role.name, description: role.description || "" });
    } else {
      setEditingRole(null);
      setFormData({ name: "", description: "" });
    }
    setDialogOpen(true);
  };

  const handleSaveRole = () => {
    if (!formData.name.trim()) {
      toast.error("El nombre del rol es requerido");
      return;
    }

    if (editingRole) {
      updateRoleMutation.mutate({ id: editingRole.id, data: formData });
    } else {
      createRoleMutation.mutate(formData);
    }
  };

  const handleOpenPermDialog = (role) => {
    setSelectedRole(role);
    setPermDialogOpen(true);
  };

  const handlePermissionToggle = (module, action, currentValue) => {
    if (!selectedRole) return;
    updatePermissionMutation.mutate({
      roleId: selectedRole.id,
      module,
      action,
      allowed: !currentValue
    });
  };

  const getRolePermissions = (roleId) => {
    return permissions.filter(p => p.role_id === roleId);
  };

  const isPermissionAllowed = (roleId, module, action) => {
    const perm = permissions.find(
      p => p.role_id === roleId && p.module === module && p.action === action
    );
    return perm ? perm.allowed : false;
  };

  if (currentUser?.role !== 'admin') {
    return (
      <Card className="border-l-4 border-l-amber-500 bg-amber-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <p className="text-amber-800">
              Solo los administradores pueden acceder a esta página
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Roles y Permisos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona roles y permisos de acceso por módulo
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Rol
        </Button>
      </div>

      {/* Roles Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Roles Disponibles</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Total: {roles.length} rol{roles.length !== 1 ? 'es' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="w-40">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      No hay roles registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map(role => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {role.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          role.is_system 
                            ? "bg-slate-100 text-slate-700" 
                            : "bg-blue-100 text-blue-700"
                        }>
                          {role.is_system ? "Sistema" : "Personalizado"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenPermDialog(role)}
                          >
                            Permisos
                          </Button>
                          {!role.is_system && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenDialog(role)}
                              >
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setRoleToDelete(role);
                                  setDeleteConfirmOpen(true);
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Role Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? "Editar Rol" : "Nuevo Rol"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Nombre *</Label>
              <Input
                placeholder="Ej: Vendedor, Contador"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Descripción</Label>
              <Input
                placeholder="Descripción del rol..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRole} disabled={createRoleMutation.isPending || updateRoleMutation.isPending}>
              {editingRole ? "Guardar Cambios" : "Crear Rol"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Permisos: {selectedRole?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 max-h-96 overflow-y-auto">
            {selectedRole?.is_system && selectedRole?.name === "Admin" ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Los administradores tienen acceso completo a todos los módulos y acciones.
                </p>
              </div>
            ) : (
              MODULES.map(module => (
                <div key={module} className="border rounded-lg p-4">
                  <h4 className="font-semibold text-sm mb-3">{module}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {ACTIONS.map(action => (
                      <div key={action} className="flex items-center gap-2">
                        <Checkbox
                          checked={isPermissionAllowed(selectedRole.id, module, action)}
                          onCheckedChange={() =>
                            handlePermissionToggle(
                              module,
                              action,
                              isPermissionAllowed(selectedRole.id, module, action)
                            )
                          }
                        />
                        <label className="text-sm cursor-pointer">
                          {ACTION_LABELS[action]}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPermDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar rol?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará "{roleToDelete?.name}" y todos sus permisos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => roleToDelete && deleteRoleMutation.mutate(roleToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}