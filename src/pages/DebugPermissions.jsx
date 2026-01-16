import React from 'react';
import { usePermissions } from '@/components/permissions/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DebugPermissions() {
  const { 
    currentUser, 
    empleado, 
    rol, 
    permisos,
    isAdmin,
    isLoading,
    debugInfo,
    hasPermission,
    canAccessModule
  } = usePermissions();

  if (isLoading) {
    return <div className="p-6">Cargando información de permisos...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">🔍 Debug: Cadena de Permisos</h1>
        <p className="text-muted-foreground">Verificar User → Empleado → Rol → Permisos</p>
      </div>

      {/* Step 1: User */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">1️⃣ Usuario Base44</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentUser ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-mono text-sm">{currentUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ID</p>
                  <p className="font-mono text-sm break-all">{currentUser.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="font-mono text-sm">{currentUser.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rol Base44</p>
                  <Badge>{currentUser.role}</Badge>
                </div>
              </div>
              {currentUser.role === 'admin' && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-sm text-blue-800">✅ Este usuario es ADMIN de Base44</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-red-600">❌ No hay usuario autenticado</p>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Empleado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">2️⃣ Empleado (vinculado a user_id)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {empleado ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="font-mono text-sm">{empleado.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-mono text-sm">{empleado.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ID</p>
                  <p className="font-mono text-sm break-all">{empleado.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">user_id</p>
                  <p className="font-mono text-sm break-all">{empleado.user_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge 
                    className={
                      empleado.status === 'active' ? 'bg-green-100 text-green-800' :
                      empleado.status === 'invited' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }
                  >
                    {empleado.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">role_id</p>
                  <p className="font-mono text-sm">{empleado.role_id || 'Sin asignar'}</p>
                </div>
              </div>
              {!empleado.role_id && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-sm text-yellow-800">⚠️ Sin rol asignado</p>
                </div>
              )}
              {empleado.status !== 'active' && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm text-red-800">❌ Usuario no está activo (status: {empleado.status})</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-red-600">❌ No se encontró Empleado para este user_id</p>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Rol */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">3️⃣ Rol</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rol ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nombre</p>
                <p className="font-mono text-sm">{rol.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ID</p>
                <p className="font-mono text-sm break-all">{rol.id}</p>
              </div>
              {rol.description && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Descripción</p>
                  <p className="text-sm">{rol.description}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-red-600">❌ No se encontró Rol</p>
          )}
        </CardContent>
      </Card>

      {/* Step 4: Permisos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">4️⃣ Permisos ({Object.keys(permisos).length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.keys(permisos).length > 0 ? (
            <div className="space-y-2">
              {Object.keys(permisos).map((key) => (
                <div key={key} className="flex items-center gap-2 p-2 bg-secondary rounded">
                  <Badge variant="outline">{key}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-amber-600">⚠️ Sin permisos asignados</p>
          )}
        </CardContent>
      </Card>

      {/* Test Cases */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🧪 Test de Permisos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <p className="font-medium">Test: canAccessModule('ventas')</p>
            <Badge className={canAccessModule('ventas') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
              {canAccessModule('ventas') ? '✅ Puede acceder' : '❌ No puede acceder'}
            </Badge>
          </div>
          <div className="space-y-2">
            <p className="font-medium">Test: hasPermission('ventas', 'view')</p>
            <Badge className={hasPermission('ventas', 'view') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
              {hasPermission('ventas', 'view') ? '✅ Puede ver' : '❌ No puede ver'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle className="text-lg">📋 Resumen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Cadena completa OK:</strong> {currentUser && empleado && rol && Object.keys(permisos).length > 0 ? '✅ SÍ' : '❌ NO'}</p>
          <p><strong>Usuario autenticado:</strong> {currentUser ? '✅ SÍ' : '❌ NO'}</p>
          <p><strong>Empleado encontrado:</strong> {empleado ? '✅ SÍ' : '❌ NO'}</p>
          <p><strong>Usuario activo:</strong> {empleado?.status === 'active' ? '✅ SÍ' : '❌ NO'}</p>
          <p><strong>Rol asignado:</strong> {rol ? '✅ SÍ' : '❌ NO'}</p>
          <p><strong>Permisos asignados:</strong> {Object.keys(permisos).length > 0 ? `✅ ${Object.keys(permisos).length}` : '❌ NINGUNO'}</p>
        </CardContent>
      </Card>
    </div>
  );
}