import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Clock, Power, Mail, Building2 } from "lucide-react";

export default function SettingsUsers() {
  const [user, setUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
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

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list()
  });

  const { data: userCompanies = [] } = useQuery({
    queryKey: ['userCompanies'],
    queryFn: () => base44.entities.UserCompany.list()
  });

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

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

  const assignCompanyMutation = useMutation({
    mutationFn: async ({ userEmail, userName, companyId, companyName }) => {
      return await base44.entities.UserCompany.create({
        user_email: userEmail,
        user_name: userName,
        company_id: companyId,
        company_name: companyName,
        assigned_by: user.email,
        assigned_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userCompanies'] });
    }
  });

  const removeCompanyMutation = useMutation({
    mutationFn: async ({ userEmail, companyId }) => {
      const assignments = userCompanies.filter(
        uc => uc.user_email === userEmail && uc.company_id === companyId
      );
      for (const assignment of assignments) {
        await base44.entities.UserCompany.delete(assignment.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userCompanies'] });
    }
  });

  const getUserAssignedCompanies = (userEmail) => {
    return userCompanies
      .filter(uc => uc.user_email === userEmail)
      .map(uc => uc.company_id);
  };

  const handleOpenCompanyDialog = (userData) => {
    setSelectedUser(userData);
    setCompanyDialogOpen(true);
  };

  const handleToggleCompany = async (companyId, companyName) => {
    if (!selectedUser) return;
    
    const assignedCompanyIds = getUserAssignedCompanies(selectedUser.email);
    const isAssigned = assignedCompanyIds.includes(companyId);

    if (isAssigned) {
      // Remove assignment (but only if user has more than one company)
      if (assignedCompanyIds.length > 1) {
        await removeCompanyMutation.mutateAsync({
          userEmail: selectedUser.email,
          companyId
        });
      } else {
        alert("El usuario debe tener al menos una empresa asignada");
      }
    } else {
      // Add assignment
      await assignCompanyMutation.mutateAsync({
        userEmail: selectedUser.email,
        userName: selectedUser.full_name,
        companyId,
        companyName
      });
    }
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

  if (user?.role !== 'admin') {
    return (
      <Card className="border-l-4 border-l-amber-500 bg-amber-50">
        <CardContent className="p-6">
          <p className="text-amber-800">
            ⚠️ Solo los administradores pueden acceder a esta página
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Usuarios</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestiona usuarios, roles y asignaciones
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Usuarios</p>
            <p className="text-3xl font-bold mt-2">{totalUsers}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Administradores</p>
            <p className="text-3xl font-bold mt-2">{admins}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Sesiones Hoy</p>
            <p className="text-3xl font-bold mt-2">{sessionsToday}</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Usuarios del Sistema</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Gestión de usuarios y asignación de roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/30">
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol Sistema</TableHead>
                <TableHead>Rol Personalizado</TableHead>
                <TableHead>Empresas</TableHead>
                <TableHead className="w-16">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => {
                const assignedCompanyIds = getUserAssignedCompanies(u.email);
                const assignedCompanyNames = companies
                  .filter(c => assignedCompanyIds.includes(c.id))
                  .map(c => c.name);
                
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" />
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <Badge className={u.role === 'admin' ? 'bg-slate-800 text-white' : 'bg-blue-100 text-blue-700'}>
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenCompanyDialog(u)}
                        className="gap-2"
                      >
                        <Building2 className="h-4 w-4" />
                        {u.role === 'admin' ? (
                          <span className="text-xs">Todas</span>
                        ) : assignedCompanyNames.length > 0 ? (
                          <span className="text-xs">{assignedCompanyNames.length} empresa{assignedCompanyNames.length > 1 ? 's' : ''}</span>
                        ) : (
                          <span className="text-xs text-red-600">Sin asignar</span>
                        )}
                      </Button>
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
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Company Assignment Dialog */}
      <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Empresas asignadas
            </DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="p-3 bg-secondary/30 rounded-lg">
                <p className="text-sm font-medium">{selectedUser.full_name}</p>
                <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
              </div>

              {selectedUser.role === 'admin' ? (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Este usuario es <strong>Administrador</strong> y tiene acceso a todas las empresas del sistema.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Selecciona las empresas a las que este usuario puede acceder:
                  </p>
                  
                  {companies.map(company => {
                    const assignedCompanyIds = getUserAssignedCompanies(selectedUser.email);
                    const isAssigned = assignedCompanyIds.includes(company.id);
                    
                    return (
                      <div key={company.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-secondary/20 transition-colors">
                        <Checkbox
                          checked={isAssigned}
                          onCheckedChange={() => handleToggleCompany(company.id, company.name)}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{company.name}</p>
                          {company.legal_name && (
                            <p className="text-xs text-muted-foreground">{company.legal_name}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {getUserAssignedCompanies(selectedUser.email).length === 0 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800">
                        ⚠️ Este usuario no tiene empresas asignadas y no podrá acceder al sistema.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Session Logs */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Registro de Sesiones</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Últimas 50 sesiones de usuarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <p className="text-sm text-green-700">Sesiones Hoy</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{sessionsToday}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-700">Sesiones Este Mes</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{sessionsThisMonth}</p>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/30">
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
                  <TableCell className="text-sm text-muted-foreground">
                    {log.login_time ? new Date(log.login_time).toLocaleString('es-AR') : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
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
    </div>
  );
}