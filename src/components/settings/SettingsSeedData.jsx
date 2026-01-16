import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import toast from 'react-hot-toast';

export default function SettingsSeedData() {
  const [seedPermissionsLoading, setSeedPermissionsLoading] = useState(false);
  const [seedPermissionsResult, setSeedPermissionsResult] = useState(null);
  const [createTestUsersLoading, setCreateTestUsersLoading] = useState(false);
  const [createTestUsersResult, setCreateTestUsersResult] = useState(null);

  const handleSeedPermissions = async () => {
    setSeedPermissionsLoading(true);
    try {
      const response = await base44.functions.invoke('seedPermissions', {});
      setSeedPermissionsResult(response.data);
      toast.success('Permisos y roles creados exitosamente');
    } catch (error) {
      toast.error(`Error: ${error.message}`);
      setSeedPermissionsResult(null);
    } finally {
      setSeedPermissionsLoading(false);
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

      {/* Seed Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>1. Crear Permisos y Roles</CardTitle>
          <CardDescription>
            Genera automáticamente 27 permisos (6 módulos × 5 acciones) y 5 roles base (Administrador, Ventas, Tesorería, Compras, Operaciones)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleSeedPermissions}
            disabled={seedPermissionsLoading}
            className="w-full"
          >
            {seedPermissionsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {seedPermissionsLoading ? 'Creando...' : 'Ejecutar Seed de Permisos'}
          </Button>

          {seedPermissionsResult && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium text-green-900">{seedPermissionsResult.message}</p>
                  <p className="text-sm text-green-700">
                    ✓ {seedPermissionsResult.permissionsCreated} permisos creados
                  </p>
                  <p className="text-sm text-green-700">
                    ✓ {seedPermissionsResult.rolesCreated} roles creados
                  </p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Roles creados:</p>
                {Object.entries(seedPermissionsResult.roles).map(([name, id]) => (
                  <p key={id} className="ml-2">• {name}</p>
                ))}
              </div>
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
          <p>✓ Ve a <strong>Debug Permisos</strong> para validar la cadena User → Empleado → Rol → Permisos</p>
          <p>✓ Testa que vendedor@test.local vea SOLO: sales.view, sales.create, inventory.view</p>
          <p>✓ Testa que tesorero@test.local vea SOLO: finance.*, sales.view</p>
        </CardContent>
      </Card>
    </div>
  );
}