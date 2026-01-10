import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, FileText, Save } from "lucide-react";

export default function ConfiguracionProyectos() {
  const [plantillaId, setPlantillaId] = useState("");
  const [usarAutomaticamente, setUsarAutomaticamente] = useState(true);

  const queryClient = useQueryClient();

  const { data: configuraciones = [] } = useQuery({
    queryKey: ['configuracionProyectos'],
    queryFn: () => base44.entities.ConfiguracionProyectos.list()
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['projectTemplates'],
    queryFn: () => base44.entities.ProjectTemplate.list()
  });

  const configuracion = configuraciones[0];

  useEffect(() => {
    if (configuracion) {
      setPlantillaId(configuracion.plantilla_por_defecto_id || "");
      setUsarAutomaticamente(configuracion.usar_plantilla_automaticamente ?? true);
    }
  }, [configuracion]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (configuracion) {
        return base44.entities.ConfiguracionProyectos.update(configuracion.id, data);
      } else {
        return base44.entities.ConfiguracionProyectos.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracionProyectos'] });
      alert("✓ Configuración guardada correctamente");
    }
  });

  const handleSave = () => {
    const template = templates.find(t => t.id === plantillaId);
    saveMutation.mutate({
      plantilla_por_defecto_id: plantillaId || null,
      plantilla_por_defecto_nombre: template?.name || null,
      usar_plantilla_automaticamente: usarAutomaticamente
    });
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-purple-600" />
          Configuración de Proyectos
        </CardTitle>
        <p className="text-xs text-slate-500 mt-1">
          Define una plantilla por defecto para nuevos proyectos
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Plantilla por Defecto</Label>
          <Select value={plantillaId} onValueChange={setPlantillaId}>
            <SelectTrigger>
              <SelectValue placeholder="Ninguna - crear proyectos en blanco" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Ninguna</SelectItem>
              {templates.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t.name} ({t.phases?.length || 0} fases, {t.tasks?.length || 0} tareas)
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500">
            {plantillaId 
              ? "Esta plantilla se aplicará automáticamente al crear nuevos proyectos" 
              : "Los proyectos se crearán sin fases ni tareas predefinidas"}
          </p>
        </div>

        {plantillaId && (
          <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={usarAutomaticamente}
                onChange={(e) => setUsarAutomaticamente(e.target.checked)}
                className="w-4 h-4 rounded border-purple-300"
              />
              <Label className="text-sm font-medium cursor-pointer">
                Aplicar plantilla automáticamente
              </Label>
            </div>
          </div>
        )}

        <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 w-full">
          <Save className="h-4 w-4 mr-2" />
          Guardar Configuración
        </Button>
      </CardContent>
    </Card>
  );
}