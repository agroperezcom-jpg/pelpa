import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Palette, RotateCcw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

const DEFAULT_COLORS = {
  project: "#9333ea",
  phase: "#3b82f6",
  task: "#10b981",
  freeTask: "#64748b",
  milestone: "#f59e0b",
  campaign: "#ec4899"
};

const PRESET_COLORS = [
  { name: "Púrpura", value: "#9333ea" },
  { name: "Azul", value: "#3b82f6" },
  { name: "Verde", value: "#10b981" },
  { name: "Slate", value: "#64748b" },
  { name: "Ámbar", value: "#f59e0b" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Rojo", value: "#ef4444" },
  { name: "Índigo", value: "#6366f1" },
  { name: "Esmeralda", value: "#059669" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Naranja", value: "#f97316" },
  { name: "Fucsia", value: "#d946ef" }
];

export default function CalendarSettingsDialog({ isOpen, onClose, config, onSave, projects = [] }) {
  const [colorScheme, setColorScheme] = useState(DEFAULT_COLORS);
  const [projectColors, setProjectColors] = useState({});

  useEffect(() => {
    if (config) {
      setColorScheme(config.color_scheme || DEFAULT_COLORS);
      setProjectColors(config.custom_project_colors || {});
    }
  }, [config, isOpen]);

  const handleSave = () => {
    onSave({
      color_scheme: colorScheme,
      custom_project_colors: projectColors
    });
  };

  const handleReset = () => {
    setColorScheme(DEFAULT_COLORS);
    setProjectColors({});
  };

  const updateTypeColor = (type, color) => {
    setColorScheme({ ...colorScheme, [type]: color });
  };

  const updateProjectColor = (projectId, color) => {
    setProjectColors({ ...projectColors, [projectId]: color });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Configuración Visual del Calendario
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="types" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="types">Tipos de Evento</TabsTrigger>
            <TabsTrigger value="projects">Proyectos</TabsTrigger>
          </TabsList>

          <TabsContent value="types" className="space-y-4 mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {Object.entries({
                  project: "Proyectos",
                  phase: "Fases",
                  task: "Tareas de Proyecto",
                  freeTask: "Tareas Libres",
                  milestone: "Hitos",
                  campaign: "Campañas"
                }).map(([type, label]) => (
                  <div key={type} className="space-y-2">
                    <Label className="text-sm font-medium">{label}</Label>
                    <div className="flex gap-2 flex-wrap">
                      {PRESET_COLORS.map((preset) => (
                        <button
                          key={preset.value}
                          onClick={() => updateTypeColor(type, preset.value)}
                          className="relative w-10 h-10 rounded-lg border-2 transition-all hover:scale-110"
                          style={{ 
                            backgroundColor: preset.value,
                            borderColor: colorScheme[type] === preset.value ? "#000" : "transparent"
                          }}
                          title={preset.name}
                        >
                          {colorScheme[type] === preset.value && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-3 h-3 bg-white rounded-full" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="projects" className="space-y-4 mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay proyectos disponibles
                  </p>
                ) : (
                  projects.map((project) => (
                    <div key={project.id} className="space-y-2">
                      <Label className="text-sm font-medium">{project.name}</Label>
                      <div className="flex gap-2 flex-wrap">
                        {PRESET_COLORS.map((preset) => (
                          <button
                            key={preset.value}
                            onClick={() => updateProjectColor(project.id, preset.value)}
                            className="relative w-10 h-10 rounded-lg border-2 transition-all hover:scale-110"
                            style={{ 
                              backgroundColor: preset.value,
                              borderColor: (projectColors[project.id] || project.color) === preset.value ? "#000" : "transparent"
                            }}
                            title={preset.name}
                          >
                            {(projectColors[project.id] || project.color) === preset.value && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-3 h-3 bg-white rounded-full" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restablecer
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-primary">
              Guardar Cambios
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}