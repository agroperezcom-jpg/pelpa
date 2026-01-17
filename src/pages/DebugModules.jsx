import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export default function DebugModules() {
  const { data: modules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: () => base44.entities.Module.list('order')
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => base44.entities.Permission.list()
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list()
  });

  const { data: rolePermissions = [] } = useQuery({
    queryKey: ['rolePermissions'],
    queryFn: () => base44.entities.RolePermission.list()
  });

  const { data: empleados = [] } = useQuery({
    queryKey: ['empleados'],
    queryFn: () => base44.entities.Empleado.list()
  });

  // Agrupar permisos por module_key
  const permissionsByModule = permissions.reduce((acc, p) => {
    if (!acc[p.module_key]) {
      acc[p.module_key] = [];
    }
    acc[p.module_key].push(p);
    return acc;
  }, {});

  // Contar asignaciones por rol
  const assignmentsByRole = rolePermissions.reduce((acc, rp) => {
    if (!acc[rp.role_id]) {
      acc[rp.role_id] = 0;
    }
    acc[rp.role_id]++;
    return acc;
  }, {});

  // Validar empleados
  const empleadosValidos = empleados.filter(e => {
    if (!e.role_id) return false;
    return roles.some(r => r.id === e.role_id);
  });

  const empleadosInvalidos = empleados.filter(e => {
    if (!e.role_id) return true;
    return !roles.some(r => r.id === e.role_id);
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Debug: Sistema de Módulos</h1>
        <p className="text-muted-foreground">
          Validación completa de la arquitectura Module → Permission → Role → Empleado
        </p>
      </div>

      {/* Resumen General */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{modules.length}</div>
            <p className="text-xs text-muted-foreground">Módulos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{permissions.length}</div>
            <p className="text-xs text-muted-foreground">Permisos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{roles.length}</div>
            <p className="text-xs text-muted-foreground">Roles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{empleados.length}</div>
            <p className="text-xs text-muted-foreground">Empleados</p>
          </CardContent>
        </Card>
      </div>

      {/* Validación de Empleados */}
      <Card>
        <CardHeader>
          <CardTitle>Validación de Empleados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-sm text-green-800">
              {empleadosValidos.length} empleados con rol válido
            </span>
          </div>
          
          {empleadosInvalidos.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 mb-2">
                  {empleadosInvalidos.length} empleados con problemas:
                </p>
                <div className="space-y-1">
                  {empleadosInvalidos.map(emp => (
                    <div key={emp.id} className="text-xs text-red-700 ml-2">
                      • {emp.nombre} ({emp.user_email}): {emp.role_id ? 'Rol inexistente' : 'Sin rol asignado'}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Módulos y sus Permisos */}
      <Card>
        <CardHeader>
          <CardTitle>Módulos y Permisos Asociados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {modules.map(mod => {
              const modulePerms = permissionsByModule[mod.key] || [];
              const hasPerms = modulePerms.length > 0;
              
              return (
                <div key={mod.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{mod.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {mod.key}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {mod.section}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Orden: {mod.order} • Icono: {mod.icon}
                      </p>
                    </div>
                    {hasPerms ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    )}
                  </div>
                  
                  {hasPerms ? (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {modulePerms.map(p => (
                        <Badge key={p.id} variant="secondary" className="text-xs">
                          {p.action}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600 mt-2">
                      ⚠ Sin permisos asociados
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Roles y Asignaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Roles y Cantidad de Permisos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {roles.map(role => {
              const permCount = assignmentsByRole[role.id] || 0;
              const empleadosConEsteRol = empleados.filter(e => e.role_id === role.id);
              
              return (
                <div key={role.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{role.name}</span>
                        {role.is_system && (
                          <Badge variant="outline" className="text-xs">Sistema</Badge>
                        )}
                      </div>
                      {role.description && (
                        <p className="text-xs text-muted-foreground">{role.description}</p>
                      )}
                      <div className="flex gap-4 mt-2">
                        <span className="text-xs">
                          <strong>{permCount}</strong> permisos
                        </span>
                        <span className="text-xs">
                          <strong>{empleadosConEsteRol.length}</strong> empleados
                        </span>
                      </div>
                    </div>
                    {permCount > 0 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Validaciones Críticas */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Validaciones Críticas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            {modules.some(m => m.key === 'calendar') ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span>Módulo 'calendar' existe</span>
          </div>
          
          <div className="flex items-center gap-2">
            {permissions.some(p => p.module_key === 'calendar') ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span>Permisos 'calendar.*' existen</span>
          </div>
          
          <div className="flex items-center gap-2">
            {roles.some(r => r.name === 'Administrador') ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span>Rol 'Administrador' existe</span>
          </div>
          
          <div className="flex items-center gap-2">
            {empleadosValidos.length === empleados.length ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span>Todos los empleados tienen roles válidos</span>
          </div>
          
          <div className="flex items-center gap-2">
            {modules.every(m => (permissionsByModule[m.key] || []).length > 0) ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            )}
            <span>Todos los módulos tienen permisos asociados</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}