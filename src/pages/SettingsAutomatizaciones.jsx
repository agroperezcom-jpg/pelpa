import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Zap, Save, Loader2, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsAutomatizaciones() {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  // Fetch automation settings
  const { data: config, isLoading } = useQuery({
    queryKey: ['configuracionEmpresa'],
    queryFn: async () => {
      const list = await base44.entities.ConfiguracionEmpresa.list();
      return list[0] || {};
    }
  });

  const [settings, setSettings] = useState({
    auto_create_work_order: config?.auto_create_work_order || false,
    auto_generate_remito: config?.auto_generate_remito || false,
    require_signature_on_delivery: config?.require_signature_on_delivery || false,
    lock_documents_after_delivery: config?.lock_documents_after_delivery || false,
  });

  React.useEffect(() => {
    if (config) {
      setSettings({
        auto_create_work_order: config.auto_create_work_order || false,
        auto_generate_remito: config.auto_generate_remito || false,
        require_signature_on_delivery: config.require_signature_on_delivery || false,
        lock_documents_after_delivery: config.lock_documents_after_delivery || false,
      });
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      if (config?.id) {
        return await base44.entities.ConfiguracionEmpresa.update(config.id, data);
      } else {
        return await base44.entities.ConfiguracionEmpresa.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracionEmpresa'] });
      toast.success('Configuración guardada correctamente');
      setIsSaving(false);
    },
    onError: (error) => {
      toast.error('Error al guardar configuración');
      console.error(error);
      setIsSaving(false);
    }
  });

  const handleSave = () => {
    setIsSaving(true);
    updateMutation.mutate(settings);
  };

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Automatizaciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure los procesos automáticos del sistema
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar cambios
            </>
          )}
        </Button>
      </div>

      <Separator />

      <div className="grid gap-6">
        {/* Ventas y Órdenes de Trabajo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ventas y Órdenes de Trabajo</CardTitle>
            <CardDescription>
              Automatización de procesos relacionados con ventas y órdenes de trabajo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="auto-work-order" className="font-medium">
                  Crear orden de trabajo automáticamente desde venta
                </Label>
                <p className="text-sm text-muted-foreground">
                  Al confirmar una venta, se creará automáticamente una orden de trabajo asociada
                </p>
              </div>
              <Switch
                id="auto-work-order"
                checked={settings.auto_create_work_order}
                onCheckedChange={() => handleToggle('auto_create_work_order')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Remitos y Entregas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Remitos y Entregas</CardTitle>
            <CardDescription>
              Automatización de generación de remitos y control de entregas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="auto-remito" className="font-medium">
                  Generar remito automáticamente al marcar como entregado
                </Label>
                <p className="text-sm text-muted-foreground">
                  Al marcar una orden de trabajo como entregada, se generará un remito automáticamente
                </p>
              </div>
              <Switch
                id="auto-remito"
                checked={settings.auto_generate_remito}
                onCheckedChange={() => handleToggle('auto_generate_remito')}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="require-signature" className="font-medium">
                  Requerir firma del cliente al entregar
                </Label>
                <p className="text-sm text-muted-foreground">
                  Obliga a registrar una firma digital antes de marcar como entregado
                </p>
              </div>
              <Switch
                id="require-signature"
                checked={settings.require_signature_on_delivery}
                onCheckedChange={() => handleToggle('require_signature_on_delivery')}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="lock-documents" className="font-medium">
                  Bloquear documentos después de la entrega
                </Label>
                <p className="text-sm text-muted-foreground">
                  Los documentos entregados no podrán ser modificados ni eliminados
                </p>
              </div>
              <Switch
                id="lock-documents"
                checked={settings.lock_documents_after_delivery}
                onCheckedChange={() => handleToggle('lock_documents_after_delivery')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Status Info */}
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-emerald-900">
                  Configuración lista
                </p>
                <p className="text-sm text-emerald-700">
                  Las automatizaciones se aplicarán inmediatamente después de guardar los cambios.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}