import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shield, Plus, Edit2, Trash2, Check } from "lucide-react";

const MODULES = [
  { key: "inventory", name: "Inventario" },
  { key: "finance", name: "Finanzas" },
  { key: "sales", name: "Ventas" },
  { key: "projects", name: "Proyectos" },
  { key: "settings", name: "Configuración" },
];

const ACTIONS = [
  { key: "view", name: "Ver" },
  { key: "create", name: "Crear" },
  { key: "edit", name: "Editar" },
  { key: "delete", name: "Eliminar" },
  { key: "approve", name: "Aprobar" },
];

export default function SettingsRoles() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, role: null });
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());

  const queryClient = useQueryClient();

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: () => base44.entities.Role.list("-created_date"),
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ["permissions"],
    queryFn: () => base44.entities.Permission.list(),
  });

  const { data: rolePermissions = [] } = useQuery({
    queryKey: ["rolePermissions"],
    queryFn: () => base44.entities.RolePermission.list(),
  });

  const createRoleMutation = useMutation({
    mutationFn: (data) => base44.entities.Role.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setDialogOpen(false);
      setFormData({ name: "", description: "" });
    },
    onError: (error) => {
      alert("Error al crear rol: " + error.message);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Role.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setDialogOpen(false);
      setEditingRole(null);
      setFormData({ name: "", description: "" });
    },
    onError: (error) => {
      alert("Error al actualizar rol: " + error.message);
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id) => base44.entities.Role.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["rolePermissions"] });
      setSelectedRole(null);
      setConfirmDialog({ open: false, role: null });
    },
    onError: (error) => {
      alert("Error al eliminar rol: " + error.message);
    },
  });

  const addPermissionMutation = useMutation({
    mutationFn: ({ role_id, permission_id }) =>
      base44.entities.RolePermission.create({ role_id, permission_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rolePermissions"] });
    },
  });

  const removePermissionMutation = useMutation({
    mutationFn: (rolePermissionId) => base44.entities.RolePermission.delete(rolePermissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rolePermissions"] });
    },
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
    if (!formData.name) {
      alert("El nombre del rol es obligatorio");
      return;
    }

    if (editingRole) {
      updateRoleMutation.mutate({ id: editingRole.id, data: formData });
    } else {
      createRoleMutation.mutate(formData);
    }
  };

  const handleSelectRole = (role) => {
    setSelectedRole(role);
    const assigned = rolePermissions
      .filter((rp) => rp.role_id === role.id)
      .map((rp) => rp.permission_id);
    setSelectedPermissions(new Set(assigned));
  };

  const handleTogglePermission = (permissionId) => {
    if (!selectedRole) return;

    const rolePermission = rolePermissions.find(
      (rp) => rp.role_id === selectedRole.id && rp.permission_id === permissionId
    );

    if (rolePermission) {
      removePermissionMutation.mutate(rolePermission.id);
    } else {
      addPermissionMutation.mutate({
        role_id: selectedRole.id,
        permission_id: permissionId,
      });
    }
  };

  const getRolePermissionCount = (roleId) =>
    rolePermissions.filter((rp) => rp.role_id === roleId).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Roles y Permisos
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Define roles y asigna permisos a módulos y acciones
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de Roles */}
        <div className="lg:col-span-1">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Roles</CardTitle>
                <Button size="sm" onClick={() => handleOpenDialog()} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Nuevo
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {roles.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No hay roles creados
                </p>
              ) : (
                roles.map((role) => (
                  <div
                    key={role.id}
                    onClick={() => handleSelectRole(role)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedRole?.id === role.id
                        ? "bg-slate-100 border-slate-400"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{role.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getRolePermissionCount(role.id)} permisos
                        </p>
                      </div>
                      {role.is_system_role && (
                        <Badge className="text-xs">Sistema</Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Panel de Permisos */}
        <div className="lg:col-span-2">
          {selectedRole ? (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedRole.name}</CardTitle>
                    {selectedRole.description && (
                      <CardDescription className="mt-1">
                        {selectedRole.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!selectedRole.is_system_role && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(selectedRole)}
                          className="gap-1"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmDialog({ open: true, role: selectedRole })}
                          className="gap-1 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {MODULES.map((module) => (
                    <div key={module.key} className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-700">
                        {module.name}
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {ACTIONS.map((action) => {
                          const permission = permissions.find(
                            (p) =>
                              p.module_key === module.key && p.action === action.key
                          );
                          const isGranted = permission &&
                            selectedPermissions.has(permission.id);

                          return (
                            <div
                              key={action.key}
                              className="flex items-center gap-2"
                            >
                              <Checkbox
                                id={`${module.key}-${action.key}`}
                                checked={isGranted || false}
                                onCheckedChange={() => {
                                  if (!permission) {
                                    // Crear el permiso primero
                                    base44.entities.Permission.create({
                                      module_key: module.key,
                                      action: action.key,
                                    }).then((newPermission) => {
                                      addPermissionMutation.mutate({
                                        role_id: selectedRole.id,
                                        permission_id: newPermission.id,
                                      });
                                    });
                                  } else {
                                    handleTogglePermission(permission.id);
                                  }
                                }}
                              />
                              <label
                                htmlFor={`${module.key}-${action.key}`}
                                className="text-sm cursor-pointer font-medium"
                              >
                                {action.name}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                <p className="text-muted-foreground">
                  Selecciona un rol para ver y editar sus permisos
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRole ? "Editar Rol" : "Nuevo Rol"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ej: Vendedor, Contador"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descripción del rol..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRole} disabled={createRoleMutation.isPending || updateRoleMutation.isPending}>
              {editingRole ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog({ open: false, role: null });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar rol "{confirmDialog.role?.name}"</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todos los permisos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRoleMutation.mutate(confirmDialog.role.id)}
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