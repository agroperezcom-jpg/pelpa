import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, Power, Mail, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsUsers() {
  const [currentUser, setCurrentUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role: "staff",
    phone: "",
    job_title: "",
    notes: ""
  });
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  useEffect(() => {
    const loadUser = async () => {
      const me = await base44.auth.me();
      setCurrentUser(me);
    };
    loadUser();
  }, []);

  const createUserMutation = useMutation({
    mutationFn: (userData) => base44.entities.User.create(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDialogOpen(false);
      setFormData({ full_name: "", email: "", role: "staff", phone: "", job_title: "", notes: "" });
      toast.success("Usuario creado exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear usuario");
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDialogOpen(false);
      setEditingUser(null);
      setFormData({ full_name: "", email: "", role: "staff", phone: "", job_title: "", notes: "" });
      toast.success("Usuario actualizado exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar usuario");
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, newStatus }) =>
      base44.entities.User.update(userId, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success("Estado actualizado");
    }
  });

  const handleOpenDialog = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        phone: user.phone || "",
        job_title: user.job_title || "",
        notes: user.notes || ""
      });
    } else {
      setEditingUser(null);
      setFormData({ full_name: "", email: "", role: "staff", phone: "", job_title: "", notes: "" });
    }
    setDialogOpen(true);
  };

  const handleSaveUser = () => {
    if (!formData.full_name.trim() || !formData.email.trim()) {
      toast.error("Nombre y email son requeridos");
      return;
    }

    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data: formData });
    } else {
      createUserMutation.mutate({ ...formData, status: "active" });
    }
  };

  const handleToggleStatus = (user) => {
    const newStatus = user.status === "active" ? "disabled" : "active";
    const adminCount = users.filter(u => u.role === "admin" && u.status === "active").length;
    
    if (user.role === "admin" && adminCount === 1 && newStatus === "disabled") {
      toast.error("No puedes desactivar el último administrador");
      return;
    }

    toggleStatusMutation.mutate({ userId: user.id, newStatus });
  };

  const activeUsers = users.filter(u => u.status === "active");
  const adminCount = users.filter(u => u.role === "admin" && u.status === "active").length;
  const staffCount = users.filter(u => u.role === "staff" && u.status === "active").length;

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
          <h1 className="text-2xl font-bold text-foreground">Empleados</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona los usuarios internos de la empresa
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Empleado
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Empleados Activos</p>
            <p className="text-3xl font-bold mt-2">{activeUsers.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Administradores</p>
            <p className="text-3xl font-bold mt-2">{adminCount}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Personal</p>
            <p className="text-3xl font-bold mt-2">{staffCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Lista de Empleados</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Total: {users.length} usuario{users.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Puesto</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="w-20">Estado</TableHead>
                  <TableHead className="w-32">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      No hay empleados registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5" />
                        {user.email}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.job_title || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          user.role === "admin" ? "bg-slate-800" :
                          user.role === "staff" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-700"
                        }>
                          {user.role === "admin" ? "Admin" : 
                           user.role === "staff" ? "Personal" : 
                           "Visualizador"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          user.status === "active" 
                            ? "bg-green-100 text-green-700" 
                            : "bg-red-100 text-red-700"
                        }>
                          {user.status === "active" ? "Activo" : "Desactivado"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenDialog(user)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleStatus(user)}
                            className={user.status === "active" ? "text-red-600" : "text-green-600"}
                            title={user.status === "active" ? "Desactivar" : "Activar"}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
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

      {/* User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Editar Empleado" : "Nuevo Empleado"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Nombre Completo *</Label>
              <Input
                placeholder="Juan García"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Email *</Label>
              <Input
                type="email"
                placeholder="juan@empresa.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={editingUser ? true : false}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Rol</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="staff">Personal</SelectItem>
                  <SelectItem value="viewer">Visualizador (solo lectura)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Puesto</Label>
              <Input
                placeholder="Ej: Gerente de Ventas"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Teléfono</Label>
              <Input
                placeholder="11 2000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Notas</Label>
              <Input
                placeholder="Información adicional..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUser} disabled={createUserMutation.isPending || updateUserMutation.isPending}>
              {editingUser ? "Guardar Cambios" : "Crear Empleado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}