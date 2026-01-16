import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Users, Plus, Edit2, Lock, Unlock, Trash2 } from "lucide-react";

export default function SettingsUsers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ full_name: "", email: "", role_id: "" });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, user: null, action: null });

  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Empleado.list("-created_date"),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: () => base44.entities.Role.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke("createEmpleado", {
        full_name: data.full_name,
        email: data.email,
        role_id: data.role_id || null,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setDialogOpen(false);
      setFormData({ full_name: "", email: "", role_id: "" });
    },
    onError: (error) => {
      alert("Error al crear empleado: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Empleado.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setDialogOpen(false);
      setEditingUser(null);
      setFormData({ full_name: "", email: "", role_id: "" });
    },
    onError: (error) => {
      alert("Error al actualizar empleado: " + error.message);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, newStatus }) =>
      base44.entities.Empleado.update(id, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setConfirmDialog({ open: false, user: null, action: null });
    },
    onError: (error) => {
      alert("Error al cambiar estado: " + error.message);
    },
  });

  const handleOpenDialog = (empleado = null) => {
    if (empleado) {
      setEditingUser(empleado);
      setFormData({ full_name: empleado.full_name, email: empleado.email, role_id: empleado.role_id || "" });
    } else {
      setEditingUser(null);
      setFormData({ full_name: "", email: "", role_id: "" });
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.full_name || !formData.email) {
      alert("Por favor completa todos los campos");
      return;
    }

    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleStatusChange = (empleado, newStatus) => {
    setConfirmDialog({
      open: true,
      user: empleado,
      action: newStatus === "blocked" ? "block" : "unblock",
    });
  };

  const confirmStatusChange = () => {
    statusMutation.mutate({
      id: confirmDialog.user.id,
      newStatus: confirmDialog.action === "block" ? "blocked" : "invited",
    });
  };

  const activeCount = employees.filter((e) => e.status === "active").length;
  const blockedCount = employees.filter((e) => e.status === "blocked").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-6 w-6" />
          Empleados
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestiona los empleados de tu empresa
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{employees.length}</p>
            <p className="text-sm text-muted-foreground">Total empleados</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
            <p className="text-sm text-muted-foreground">Activos</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-600">{blockedCount}</p>
            <p className="text-sm text-muted-foreground">Bloqueados</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Agregar Empleado
        </Button>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  No hay empleados registrados
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.full_name}</TableCell>
                  <TableCell className="text-sm">{employee.email}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        employee.status === "active"
                          ? "bg-green-100 text-green-800"
                          : employee.status === "invited"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                      }
                    >
                      {employee.status === "active" ? "Activo" : employee.status === "invited" ? "Invitado" : "Bloqueado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {employee.role_id ? (
                      <Badge variant="secondary">
                        {roles.find((r) => r.id === employee.role_id)?.name || "—"}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(employee)}
                        className="gap-1"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                            handleStatusChange(
                              employee,
                              employee.status === "active" ? "blocked" : "active"
                            )
                          }
                          disabled={employee.status === "invited"}
                          className={
                            employee.status === "active"
                              ? "text-amber-600 hover:text-amber-700"
                              : employee.status === "invited"
                              ? "text-gray-400 cursor-not-allowed"
                              : "text-green-600 hover:text-green-700"
                          }
                      >
                        {employee.status === "active" ? (
                          <Lock className="h-4 w-4" />
                        ) : (
                          <Unlock className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Editar Empleado" : "Nuevo Empleado"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre Completo *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                placeholder="Juan Pérez"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="juan@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={formData.role_id} onValueChange={(value) =>
                setFormData({ ...formData, role_id: value })
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Sin asignar</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingUser ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog({ open: false, user: null, action: null });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "block"
                ? "¿Bloquear empleado?"
                : "¿Desbloquear empleado?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "block"
                ? `Vas a bloquear a ${confirmDialog.user?.full_name}. No podrá acceder al sistema.`
                : `Vas a desbloquear a ${confirmDialog.user?.full_name}. Podrá acceder al sistema nuevamente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              className={
                confirmDialog.action === "block"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              {confirmDialog.action === "block" ? "Bloquear" : "Desbloquear"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}