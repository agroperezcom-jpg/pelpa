import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Calendar, Clock, Save, CheckCircle2 } from "lucide-react";
import { toast } from "react-hot-toast";

const TIMEZONES = [
  { value: "America/Argentina/Buenos_Aires", label: "Argentina - Buenos Aires (GMT-3)" },
  { value: "America/Montevideo", label: "Uruguay - Montevideo (GMT-3)" },
  { value: "America/Santiago", label: "Chile - Santiago (GMT-3/GMT-4)" },
  { value: "America/Sao_Paulo", label: "Brasil - São Paulo (GMT-3)" },
  { value: "America/Lima", label: "Perú - Lima (GMT-5)" },
  { value: "America/Bogota", label: "Colombia - Bogotá (GMT-5)" },
  { value: "America/Mexico_City", label: "México - Ciudad de México (GMT-6)" },
  { value: "America/New_York", label: "EE.UU. - Nueva York (GMT-5/GMT-4)" },
  { value: "America/Los_Angeles", label: "EE.UU. - Los Ángeles (GMT-8/GMT-7)" },
  { value: "Europe/Madrid", label: "España - Madrid (GMT+1/GMT+2)" },
  { value: "UTC", label: "UTC - Tiempo Universal Coordinado" }
];

export default function RegionalConfig() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState(null);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['configuracionEmpresa'],
    queryFn: () => base44.entities.ConfiguracionEmpresa.list()
  });

  useEffect(() => {
    if (configs.length > 0) {
      setConfig({
        timezone: configs[0].timezone || "America/Argentina/Buenos_Aires",
        week_starts_on: configs[0].week_starts_on ?? 1
      });
    }
  }, [configs]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (configs[0]?.id) {
        return await base44.entities.ConfiguracionEmpresa.update(configs[0].id, data);
      } else {
        return await base44.entities.ConfiguracionEmpresa.create({
          nombre_empresa: "Sistema",
          ...data
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracionEmpresa'] });
      toast.success('Configuración regional guardada');
    },
    onError: (error) => {
      toast.error('Error al guardar: ' + error.message);
    }
  });

  const handleSave = () => {
    if (!config) return;
    saveMutation.mutate(config);
  };

  if (isLoading || !config) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground mt-4">Cargando configuración...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Configuración Regional</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Configura la zona horaria y preferencias de calendario del sistema
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Zona Horaria */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-semibold">Zona Horaria</Label>
          </div>
          <Select 
            value={config.timezone} 
            onValueChange={(value) => setConfig({ ...config, timezone: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map(tz => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2 text-xs text-blue-800">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Importante:</strong> Esta zona horaria se usa para todas las fechas y horas del sistema.
                Cuando selecciones una fecha en el calendario, se guardará exactamente como la ves, sin conversiones.
              </div>
            </div>
          </div>
        </div>

        {/* Inicio de Semana */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-semibold">Inicio de Semana</Label>
          </div>
          <Select 
            value={String(config.week_starts_on)} 
            onValueChange={(value) => setConfig({ ...config, week_starts_on: Number(value) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Lunes</SelectItem>
              <SelectItem value="0">Domingo</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Define qué día debe aparecer como primer día de la semana en el calendario
          </p>
        </div>

        {/* Información Actual */}
        <div className="p-4 bg-secondary/50 rounded-lg space-y-2">
          <p className="text-xs font-semibold text-foreground">Hora actual del sistema:</p>
          <p className="text-2xl font-bold text-primary">
            {new Date().toLocaleString('es-AR', { 
              timeZone: config.timezone,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            Zona horaria: {config.timezone}
          </p>
        </div>

        {/* Botón Guardar */}
        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-primary hover:bg-primary-hover"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Guardando...' : 'Guardar Configuración'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}