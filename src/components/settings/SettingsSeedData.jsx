import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import toast from 'react-hot-toast';

export default function SettingsSeedData() {
  const [initLoading, setInitLoading] = useState(false);
  const [initResult, setInitResult] = useState(null);
  const [createTestUsersLoading, setCreateTestUsersLoading] = useState(false);
  const [createTestUsersResult, setCreateTestUsersResult] = useState(null);

  const handleInitializeSystem = async () => {
    setInitLoading(true);
    try {
      const response = await base44.functions.invoke('initializeSystem', {});
      setInitResult(response.data);
      toast.success('Sistema inicializado correctamente');
    } catch (error) {
      toast.error(`Error: ${error.message}`);
      setInitResult(null);
    } finally {
      setInitLoading(false);
    }
  };

  const handleCreateTestUsers = async () => {
    setCreateTestUsersLoading(true);
    try {
      const response = await base44.functions.invoke('createTestUsers', {});
      setCreateTestUsersResult(response.data);
      toast.success('Usuarios de prueba creados');
    } catch (error) {
      toast.error(`Error: ${error.message}`);
      setCreateTestUsersResult(null);
    } finally {
      setCreateTestUsersLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert className="bg-amber-50 border-amber-200">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          Estas acciones deben ejecutarse <strong>una sola vez</strong> para inicializar el sistema de permisos.
        </AlertDescription>
      </Alert>

      {/* Initialize System */}
      <Card>
        <CardHeader>
          <CardTitle>1. Inicializar Sistema</CardTitle>
          <CardDescription>
            Crea todos los módulos, permisos y roles base. Arquitectura consistente: module_key técnico (calendar, sales, etc.) en toda la aplicación.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleInitializeSystem}
            disabled={initLoading}
            className="w-full bg-slate-700 hover:bg-slate-800"
          >
            {initLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initLoading ? 'Inicializando...' : 'Inicializar Sistema Completo'}
          </Button>

          {initResult && initResult.status === 'success' && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1 w-full">
                  <p className="font-medium text-green-900">{initResult.message}</p>
                  <div className="text-sm text-green-700 space-y-0.5">
                    <p>✓ {initResult.summary.modules}</p>
                    <p>✓ {initResult.summary.permissions}</p>
                    <p>✓ {initResult.summary.roles}</p>
                    <p>✓ {initResult.summary.rolePermissions}</p>
                  </div>
                </div>
              </div>

              {/* Validación crítica de calendario */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                <p className="font-medium text-blue-900 mb-1">✓ Validación Calendario:</p>
                <div className="text-blue-700 space-y-0.5 ml-2">
                  <p>• Módulo calendar: {initResult.critical.calendar_module_created}</p>
                  <p>• Permisos calendar.*: {initResult.critical.calendar_permissions_created}</p>
                  <p>• Rol Administrador: {initResult.critical.admin_role_found}</p>
                </div>
              </div>

              {initResult.details.errors.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                  <p className="font-medium text-amber-900 mb-1">⚠ Errores detectados:</p>
                  <div className="text-amber-700 space-y-0.5 ml-2 max-h-32 overflow-y-auto">
                    {initResult.details.errors.map((err, i) => (
                      <p key={i}>• {err.step}: {err.error}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Test Users */}
      <Card>
        <CardHeader>
          <CardTitle>2. Crear Usuarios de Prueba</CardTitle>
          <CardDescription>
            Crea 2 usuarios: vendedor@test.local (rol Ventas) y tesorero@test.local (rol Tesorería)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleCreateTestUsers}
            disabled={createTestUsersLoading}
            variant="secondary"
            className="w-full"
          >
            {createTestUsersLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {createTestUsersLoading ? 'Creando...' : 'Crear Usuarios de Prueba'}
          </Button>

          {createTestUsersResult && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium text-green-900">{createTestUsersResult.message}</p>
                  <p className="text-sm text-green-700">{createTestUsersResult.instructions}</p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-2">
                <p className="font-medium">Usuarios creados:</p>
                {createTestUsersResult.users.map((user) => (
                  <div key={user.id} className="ml-2 p-2 bg-slate-50 rounded border border-slate-200">
                    <p className="font-medium">{user.email}</p>
                    <p className="text-xs text-slate-600">{user.fullName} • ID: {user.id}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Próximos pasos */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base text-blue-900">3. Validar Permisos</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p className="font-semibold">Arquitectura consistente implementada:</p>
          <ul className="ml-4 space-y-1 text-xs">
            <li>✓ module_key técnico (calendar, sales, etc.) en toda la app</li>
            <li>✓ Sidebar lee desde entidad Module</li>
            <li>✓ Permisos vinculados por module_key</li>
            <li>✓ canAccessModule('calendar') funciona correctamente</li>
          </ul>
          <p className="mt-3 font-medium">Próximo paso:</p>
          <p>Ve a <strong>Debug Permisos</strong> para validar la cadena completa User → Empleado → Rol → Permisos</p>
        </CardContent>
      </Card>
    </div>
  );
}